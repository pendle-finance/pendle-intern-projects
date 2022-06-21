pragma solidity ^0.8.0;

import "./PoolERC20.sol";
import "../interfaces/IPool.sol";
import "../interfaces/IFactory.sol";
import "../libraries/AMMLibrary.sol";
import "../libraries/TransferHelper.sol";
import "../libraries/Math.sol";

contract Pool is PoolERC20, IPool {
  uint256 public constant MINIMUM_LIQUIDITY = 10**3;
  address public factory;
  address public token0;
  address public token1;

  uint112 private reserve0;
  uint112 private reserve1;
  uint32 private blockTimestampLast;

  uint256 private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, "No reentrancy");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  constructor() {
    factory = msg.sender;
    (token0, token1) = IFactory(factory).getParams();
  }

  function _update(
    uint112 amount0In,
    uint112 amount1In,
    uint112 amount0Out,
    uint112 amount1Out
  ) internal {
    reserve0 += amount0In - amount0Out;
    reserve1 += amount1In - amount1Out;
    blockTimestampLast = uint32(block.timestamp % 2**32);
  }

  function getReserves()
    public
    view
    returns (
      uint112 _reserve0,
      uint112 _reserve1,
      uint32 _blockTimestampLast
    )
  {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
    _blockTimestampLast = blockTimestampLast;
  }

  function mint(
    address to,
    uint112 amount0,
    uint112 amount1
  ) private lock returns (uint256 liquidity) {
    require(to != address(0), "Invalid address");
    uint256 totalSupply = _totalSupply;
    (uint112 _reserve0, uint256 _reserve1, ) = getReserves();
    if (_totalSupply == 0) {
      liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
      _mint(address(0), MINIMUM_LIQUIDITY);
    } else {
      liquidity = Math.min(
        (amount0 * _totalSupply) / _reserve0,
        (amount1 * _totalSupply) / _reserve1
      );
    }
    require(liquidity > 0, "Invalid liquidity");
    _mint(to, liquidity);
    _update(amount0, amount1, 0, 0);
    emit Mint(msg.sender, amount0, amount1);
    return liquidity;
  }

  function addLiquidity(
    uint256 amount0,
    uint256 amount1,
    address to
  )
    external
    returns (
      uint256 amount0In,
      uint256 amount1In,
      uint256 liquidity
    )
  {
    require(
      uint112(amount0) == uint256(amount0) && uint112(amount1) == uint256(amount1),
      "Pool: Invalid Amount Given"
    );
    (uint256 _reserve0, uint256 _reserve1, ) = getReserves();
    uint256 optimalAmount1 = AMMLibrary.quote(amount0, _reserve0, _reserve1);
    if (optimalAmount1 > amount1) {
      amount0In = amount0;
      amount1In = optimalAmount1;
    } else {
      uint256 optimalAmount0 = AMMLibrary.quote(amount1, _reserve1, _reserve0);
      amount0In = optimalAmount0;
      amount1In = amount1;
    }
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0);
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1);
    liquidity = mint(to, uint112(amount0), uint112(amount1));
  }

  function removeLiquidity(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min,
    address to
  ) external returns (uint256 amount0, uint256 amount1) {
    require(liquidity > 0, "Invalid liquidity");
    require(liquidity < _balances[msg.sender], "Invalid liquidity");
    uint256 totalSupply = _totalSupply;
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    amount0 = (liquidity / _totalSupply) * balance0;
    amount1 = (liquidity / _totalSupply) * balance1;
    require(amount0 >= amount0Min, "Invalid liquidity");
    require(amount1 >= amount1Min, "Invalid liquidity");
    _burn(msg.sender, liquidity);
    TransferHelper.safeTransfer(token0, to, amount0);
    TransferHelper.safeTransfer(token1, to, amount1);
    _update(0, 0, uint112(amount0), uint112(amount1));
    emit Burn(msg.sender, amount0, amount1, to);
  }

  ///@dev Your flash swap, might as well make all swaps use a flash swap since we're at it
  function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to,
    //bytes calldata data
  ) external {
    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT_AMOUNT");
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "Pool: INSUFFICIENT_LIQUIDITY");

    uint256 balance0;
    uint256 balance1;
    {
      // scope for _token{0,1}, avoids stack too deep errors
      address _token0 = token0;
      address _token1 = token1;
      require(to != _token0 && to != _token1, "Pool: INVALID_TO");
      if (amount0Out > 0) TransferHelper.safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
      if (amount1Out > 0) TransferHelper.safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
      // if (data.length > 0)
      //   IUniswapCallee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
      balance0 = IERC20(_token0).balanceOf(address(this));
      balance1 = IERC20(_token1).balanceOf(address(this));
    }
    uint256 amount0In = balance0 > _reserve0 - amount0Out
      ? balance0 - (_reserve0 - amount0Out)
      : 0;
    uint256 amount1In = balance1 > _reserve1 - amount1Out
      ? balance1 - (_reserve1 - amount1Out)
      : 0;
    require(amount0In > 0 || amount1In > 0, "Pool: INSUFFICIENT_INPUT_AMOUNT");
    {
      // scope for reserve{0,1}Adjusted, avoids stack too deep errors
      uint256 balance0Adjusted = balance0 * (1000) - (amount0In * (3));
      uint256 balance1Adjusted = balance1 * (1000) - (amount1In *(3));
      require(
        balance0Adjusted * (balance1Adjusted) >= uint256(_reserve0) * (_reserve1) * (1000**2),
        "Pool: K"
      );
    }

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  function swapExactIn(
    address token,
    uint256 amountIn,
    address to
  ) external {
    (uint256 _reserve0, uint256 _reserve1, ) = getReserves();
    uint256 reserveIn = (token == token0) ? _reserve0 : _reserve1;
    uint256 reserveOut = (token == token0) ? _reserve1 : _reserve0;
    address tokenIn = (token == token0) ? token0 : token1;
    address tokenOut = (token == token0) ? token1 : token0;

    uint256 amountOut = AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, 0);
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    TransferHelper.safeTransfer(tokenOut, to, amountOut);
  }

  function swapExactOut(
    address token,
    uint256 amountOut,
    uint256 to
  ) external {
    (uint256 _reserve0, uint256 _reserve1, ) = getReserves();
    uint256 reserveIn = (token == token0) ? _reserve1 : _reserve0;
    uint256 reserveOut = (token == token0) ? _reserve0 : _reserve1;
    uint256 amountIn = AMMLibrary.getAmountIn(amountOut, _reserve0, _reserve1, 0);
    address tokenIn = (token == token0) ? token1 : token0;
    address tokenOut = (token == token0) ? token0 : token1;
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    TransferHelper.safeTransfer(tokenOut, to, amountOut);
  }
}
