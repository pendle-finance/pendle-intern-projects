// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PoolERC20.sol";
import "../interfaces/IPool.sol";
import "../interfaces/IFactory.sol";
import "../libraries/AMMLibrary.sol";
import "../libraries/TransferHelper.sol";
import "../libraries/Math.sol";
import "../interfaces/IWETH.sol";

contract Pool is IPool, PoolERC20 {
  uint256 public constant override MINIMUM_LIQUIDITY = 1;

  address public override factory;
  address public immutable override token0;
  address public immutable override token1;

  uint112 private reserve0;
  uint112 private reserve1;

  //uint8 take same space as bool
  uint8 private unlocked = 1;
  address public immutable WETH;

  modifier lock() {
    require(unlocked == 1, "No reentrancy");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  modifier nonZeroAddress(address addr) {
    require(addr != address(0), "Only Non Zero Address");
    _;
  }

  modifier onlyValidToken(address token) {
    require(token == token0 || token == token1, "INVALID TOKEN");
    _;
  }

  modifier onlyEthPool() {
    require(token0 == WETH, "Pool: Not an ETH pool");
    _;
  }

  constructor() {
    factory = msg.sender;
    (token0, token1, WETH) = IFactory(factory).getParams();
    _mint(address(0), MINIMUM_LIQUIDITY, true);
  }

  receive() external payable {}

  function _update(
    uint112 amount0In,
    uint112 amount1In,
    uint112 amount0Out,
    uint112 amount1Out
  ) internal {
    reserve0 = reserve0 + amount0In - amount0Out;
    reserve1 = reserve1 + amount1In - amount1Out;
  }

  function getReserves() public view override returns (uint112 _reserve0, uint112 _reserve1) {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
  }

  function _calcAddLiquidity(
    uint112 amount0,
    uint112 amount1,
    address to
  )
    private
    returns (
      uint112,
      uint112,
      uint256
    )
  {
    //calculate the optimal amounts to be added
    require(amount0 > 0, "POOL: INVALID AMOUNT0");
    require(amount1 > 0, "POOL: INVALID AMOUNT1");
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    uint112 optimalAmount0;
    uint112 optimalAmount1;
    optimalAmount0 = amount0;
    optimalAmount1 = amount1;
    if (_reserve0 > 0 && _reserve1 > 0) {
      uint112 tmp = uint112(AMMLibrary.quote(amount0, _reserve0, _reserve1));
      if (tmp <= amount1) {
        optimalAmount1 = tmp;
      } else {
        optimalAmount0 = uint112(AMMLibrary.quote(amount1, _reserve1, _reserve0));
      }
    }

    //calculate the liquidity to be minted and mint liquidity
    uint256 liquidity;
    uint256 totalSupply = _totalSupply;
    if (_totalSupply == MINIMUM_LIQUIDITY) {
      liquidity = Math.sqrt(optimalAmount0 * optimalAmount1);
    } else {
      liquidity = Math.min(
        (optimalAmount0 * totalSupply) / _reserve0,
        (optimalAmount1 * totalSupply) / _reserve1
      );
    }
    require(liquidity > 0, "Invalid liquidity");
    _mint(to, liquidity, false);
    _update(optimalAmount0, optimalAmount1, 0, 0);
    emit Mint(msg.sender, optimalAmount0, optimalAmount1);
    return (optimalAmount0, optimalAmount1, liquidity);
  }

  function addLiquidity(
    uint112 amount0,
    uint112 amount1,
    address to
  )
    external
    override
    nonZeroAddress(to)
    lock
    returns (
      uint112 amount0In,
      uint112 amount1In,
      uint256 liquidity
    )
  {
    (amount0In, amount1In, liquidity) = _calcAddLiquidity(amount0, amount1, to);
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0In);
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1In);
    // liquidity = _mintLiquidity(to, amount0In, amount1In);
  }

  function addLiquidityEth(uint112 amount, address to)
    external
    payable
    nonZeroAddress(to)
    lock
    onlyEthPool
    returns (
      uint112 amountEth,
      uint112 amountToken,
      uint256 liquidity
    )
  {
    (amountEth, amountToken, liquidity) = _calcAddLiquidity(uint112(msg.value), amount, to);
    if (amountEth < msg.value) {
      payable(msg.sender).transfer(msg.value - amountEth);
    }
    IWETH(token0).deposit{value: amountEth}();
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amountToken);
    // liquidity = _mintLiquidity(to, amountEth, amountToken);
  }

  function _removeLiquidity(
    uint256 liquidity,
    uint112 amount0Min,
    uint112 amount1Min
  ) internal returns (uint112 amount0, uint112 amount1) {
    require(liquidity > 0, "POOL: INVALID LIQUIDITY");
    require(liquidity <= _balances[msg.sender], "POOL: INVALID LIQUIDITY");
    uint112 totalSupply = uint112(_totalSupply);
    uint112 balance0 = uint112(IERC20(token0).balanceOf(address(this)));
    uint112 balance1 = uint112(IERC20(token1).balanceOf(address(this)));
    amount0 = (uint112(liquidity) * balance0) / totalSupply;
    amount1 = (uint112(liquidity) * balance1) / totalSupply;
    require(amount0 >= amount0Min, "POOl: INVALID AMOUNT0");
    require(amount1 >= amount1Min, "POOL: INVALID AMOUNT1");
    _burn(msg.sender, liquidity);
  }

  function removeLiquidity(
    uint256 liquidity,
    uint112 amount0Min,
    uint112 amount1Min,
    address to
  ) public override nonZeroAddress(to) returns (uint112 amount0, uint112 amount1) {
    (amount0, amount1) = _removeLiquidity(liquidity, amount0Min, amount1Min);
    TransferHelper.safeTransfer(token0, to, amount0);
    TransferHelper.safeTransfer(token1, to, amount1);
    _update(0, 0, amount0, amount1);
    emit Burn(msg.sender, amount0, amount1, to);
  }

  function removeLiquidityWithPermit(
    uint256 liquidity,
    uint112 amount0Min,
    uint112 amount1Min,
    address to,
    uint256 deadline,
    bool approveMax,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint112 amount0, uint112 amount1) {
    uint256 value = approveMax ? (type(uint256).max) : liquidity;
    permit(msg.sender, address(this), value, deadline, v, r, s);
    (amount0, amount1) = removeLiquidity(liquidity, amount0Min, amount1Min, to);
  }

  function removeLiquidityEth(
    uint256 liquidity,
    uint112 amountEthMin,
    uint112 amountTokenMin,
    address to
  ) public onlyEthPool nonZeroAddress(to) returns (uint112 amountEth, uint112 amountToken) {
    (amountEth, amountToken) = _removeLiquidity(liquidity, amountEthMin, amountTokenMin);
    IWETH(token0).withdraw(amountEth);
    payable(to).transfer(amountEth);
    TransferHelper.safeTransfer(token1, to, amountToken);
    _update(0, 0, amountEth, amountToken);
    emit Burn(msg.sender, amountEth, amountToken, to);
  }

  // function removeLiquidityEthWithPermit(
  //   uint256 liquidity,
  //   uint112 amountEthMin,
  //   uint112 amountTokenMin,
  //   address to,
  //   uint256 deadline,
  //   bool approveMax,
  //   uint8 v,
  //   bytes32 r,
  //   bytes32 s
  // ) external returns (uint112 amount0, uint112 amount1) {
  //   uint256 value = approveMax ? (type(uint256).max) : liquidity;
  //   permit(msg.sender, address(this), value, deadline, v, r, s);
  //   (amount0, amount1) = removeLiquidityEth(liquidity, amountEthMin, amountTokenMin, to);
  // }

  ///@dev Your flash swap, might as well make all swaps use a flash swap since we're at it
  function swap(
    uint112 amount0Out,
    uint112 amount1Out,
    address to
  ) public override lock nonZeroAddress(to) {
    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT_AMOUNT");
    (uint256 _reserve0, uint256 _reserve1) = getReserves(); // gas savings
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "Pool: INSUFFICIENT_LIQUIDITY");

    uint112 balance0;
    uint112 balance1;
    {
      // scope for _token{0,1}, avoids stack too deep errors
      address _token0 = token0;
      address _token1 = token1;
      require(to != _token0 && to != _token1, "Pool: INVALID_TO");
      if (amount0Out > 0) TransferHelper.safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
      if (amount1Out > 0) TransferHelper.safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
      // if (data.length > 0)
      //   IUniswapCallee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
      balance0 = uint112(IERC20(_token0).balanceOf(address(this)));
      balance1 = uint112(IERC20(_token1).balanceOf(address(this)));
    }
    //amountIn refers to the amount the user has deposited
    uint256 amount0In = balance0 > _reserve0 - amount0Out
      ? balance0 - (_reserve0 - amount0Out)
      : 0;
    uint256 amount1In = balance1 > _reserve1 - amount1Out
      ? balance1 - (_reserve1 - amount1Out)
      : 0;
    require(amount0In > 0 || amount1In > 0, "Pool: INSUFFICIENT_INPUT_AMOUNT");
    require(balance0 * balance1 >= _reserve0 * _reserve1, "Pool: K");

    //The change in reserve0 after a flash swap will be balance0 - reserve0, regardless of how much was optimistically "withdrawn" at the start
    //update this way means reserve0 += balance0 - reserve0 and reserve1 += balance1 - reserve1
    _update(balance0, balance1, reserve0, reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  //approve first then call this function to swap
  //no prevention of slippage and can be front run by other people
  function swapExactIn(
    address token,
    uint112 amountIn,
    address to
  ) external override nonZeroAddress(to) onlyValidToken(token) {
    (uint112 reserveIn, uint112 reserveOut, address tokenIn, address tokenOut) = _findWhichToken(
      token
    );
    uint112 amountOut = uint112(AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, 0));
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    if (tokenOut == token0) swap(amountOut, 0, to);
    else swap(0, amountOut, to);
  }

  //Assumption: token0 is ETH, so when you transfer to the user, always transfer token1
  function swapExactInEthForToken(address to) external payable onlyEthPool nonZeroAddress(to) {
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    require(msg.value < type(uint112).max, "INVALID ETH AMOUNT");
    uint112 amountOut = uint112(
      AMMLibrary.getAmountOut(uint112(msg.value), _reserve0, _reserve1, 0)
    );
    require(amountOut < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    IWETH(token0).deposit{value: msg.value}();
    swap(0, amountOut, to);
  }

  //swap function is useless here: no multiple swap paths + need to unwrap and give ETH
  function swapExactInTokenForEth(uint112 amount, address to)
    external
    onlyEthPool
    nonZeroAddress(to)
  {
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    uint112 amountOut = uint112(AMMLibrary.getAmountOut(amount, _reserve1, _reserve0, 0));
    require(amountOut < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    _takeTokenTransferEth(to, amount, amountOut);
  }

  //approve first then call this function to swap
  function swapExactOut(
    address token,
    uint112 amountOut,
    address to
  ) external override nonZeroAddress(to) onlyValidToken(token) {
    //reverse the order because swapOut
    (uint112 reserveOut, uint112 reserveIn, address tokenOut, address tokenIn) = _findWhichToken(
      token
    );
    uint112 amountIn = uint112(AMMLibrary.getAmountIn(amountOut, reserveIn, reserveOut, 0));
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    if (tokenOut == token0) swap(amountOut, 0, to);
    else swap(0, amountOut, to);
  }

  function swapExactOutEthForToken(uint112 amount, address to)
    external
    payable
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    require(amount < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    uint112 amountIn = uint112(AMMLibrary.getAmountIn(amount, _reserve0, _reserve1, 0));
    require(msg.value >= amountIn, "INSUFFICIENT ETH");
    IWETH(token0).deposit{value: amountIn}();
    if (msg.value - amountIn > 0) {
      payable(msg.sender).transfer(msg.value - amountIn);
    }
    swap(0, amount, to);
  }

  //swap function is useless here: no multiple swap paths + need to unwrap and give ETH
  function swapExactOutTokenForEth(uint112 amount, address to)
    external
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    require(amount < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    uint112 amountIn = uint112(AMMLibrary.getAmountIn(amount, _reserve1, _reserve0, 0));
    _takeTokenTransferEth(to, amountIn, amount);
  }

  //Assumption: token 0 is WETH, thus token1 must be the other token
  function _takeTokenTransferEth(
    address to,
    uint112 amountIn,
    uint112 amountOut
  ) private {
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amountIn);
    IWETH(token0).withdraw(amountOut);
    payable(to).transfer(amountOut);
    _update(0, amountIn, amountOut, 0);
  }

  function _findWhichToken(address token)
    internal
    view
    returns (
      uint112 reserveIn,
      uint112 reserveOut,
      address tokenIn,
      address tokenOut
    )
  {
    (uint112 _reserve0, uint112 _reserve1) = getReserves();
    if (token == token0) {
      reserveIn = _reserve0;
      reserveOut = _reserve1;
      tokenIn = token0;
      tokenOut = token1;
    } else {
      reserveIn = _reserve1;
      reserveOut = _reserve0;
      tokenIn = token1;
      tokenOut = token0;
    }
  }
}
