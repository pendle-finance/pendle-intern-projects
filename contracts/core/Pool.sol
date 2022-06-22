pragma solidity ^0.8.0;

import "./PoolERC20.sol";
import "../interfaces/IPool.sol";
import "../interfaces/IFactory.sol";
import "../libraries/AMMLibrary.sol";
import "../libraries/TransferHelper.sol";
import "../libraries/Math.sol";
import "../interfaces/IWETH.sol";

contract Pool is PoolERC20 {
  uint256 public constant MINIMUM_LIQUIDITY = 10**3;
  bool public constant isETH;
  address public factory;
  address public token0;
  address public token1;

  uint112 private reserve0;
  uint112 private reserve1;
  uint32 private blockTimestampLast;

  uint8 private unlocked = 1;

  event Mint(address indexed sender, uint112 amount0, uint112 amount1);

  event Burn(address indexed sender, uint112 amount0, uint112 amount1, address indexed to);

  event Swap(
    address indexed sender,
    uint112 amount0In,
    uint112 amount1In,
    uint112 amount0Out,
    uint112 amount1Out,
    address indexed to
  );

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
    require(isETH, "Pool: Not a ETH pool");
    _;
  }

  constructor() {
    factory = msg.sender;
    (token0, token1, isETH) = IFactory(factory).getParams();
    _mint(address(0), MINIMUM_LIQUIDITY, true);
  }

  receive() external payable {}

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
  ) private lock nonZeroAddress(to) returns (uint256 liquidity) {
    uint256 totalSupply = _totalSupply;
    (uint112 _reserve0, uint256 _reserve1, ) = getReserves();
    if (_totalSupply == MINIMUM_LIQUIDITY) {
      liquidity = Math.sqrt(amount0 * amount1);
    } else {
      liquidity = Math.min(
        (amount0 * _totalSupply) / _reserve0,
        (amount1 * _totalSupply) / _reserve1
      );
    }
    require(liquidity > 0, "Invalid liquidity");
    _mint(to, liquidity, false);
    _update(amount0, amount1, 0, 0);
    emit Mint(msg.sender, amount0, amount1);
    return liquidity;
  }

  function _addLiquidity(uint112 amount0, uint112 amount1) internal returns (uint112, uint112) {
    require(amount0 > 0, "POOL: INVALID AMOUNT0");
    require(amount1 > 0, "POOL: INVALID AMOUNT1");
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint112 optimalAmount1 = uint112(AMMLibrary.quote(amount0, _reserve0, _reserve1));
    if (optimalAmount1 <= amount1) {
      return (amount0, optimalAmount1);
    } else {
      uint112 optimalAmount0 = uint112(AMMLibrary.quote(amount1, _reserve1, _reserve0));
      return (optimalAmount0, amount1);
    }
  }

  function addLiquidity(
    uint112 amount0,
    uint112 amount1,
    address to
  )
    external
    nonZeroAddress(to)
    returns (
      uint112 amount0In,
      uint112 amount1In,
      uint112 liquidity
    )
  {
    (amount0In, amount1In) = _addLiquidity(amount0, amount1);
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0In);
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1In);
    liquidity = mint(to, amount0In, amount1In);
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
      uint112 liquidity
    )
  {
    (amountEth, amountToken) = _addLiquidity(msg.value, amount);
    if (amountEth < msg.value) {
      payable(msg.sender).transfer(msg.value - amountEth);
    }
    IWETH(token0).deposit{value: amountEth}();
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amountToken);
    liquidity = mint(to, amountEth, amountToken);
  }

  function _removeLiquidity(
    uint112 liquidity,
    uint112 amount0Min,
    uint112 amount1Min
  ) internal returns (uint112 amount0, uint112 amount1) {
    require(liquidity > 0, "POOL: INVALID LIQUIDITY");
    require(liquidity < _balances[msg.sender], "POOL: INVALID LIQUIDITY");
    uint112 totalSupply = uint112(_totalSupply);
    uint112 balance0 = uint112(IERC20(token0).balanceOf(address(this)));
    uint112 balance1 = uint112(IERC20(token1).balanceOf(address(this)));
    amount0 = (liquidity / totalSupply) * balance0;
    amount1 = (liquidity / totalSupply) * balance1;
    require(amount0 >= amount0Min, "POOl: INVALID LIQUIDITY");
    require(amount1 >= amount1Min, "POOL: INVALID LIQUIDITY");
    _burn(msg.sender, liquidity);
  }

  function removeLiquidity(
    uint112 liquidity,
    uint112 amount0Min,
    uint112 amount1Min,
    address to
  ) external nonZeroAddress(to) returns (uint112 amount0, uint112 amount1) {
    (amount0, amount1) = _removeLiquidity(liquidity, amount0Min, amount1Min);
    TransferHelper.safeTransfer(token0, to, amount0);
    TransferHelper.safeTransfer(token1, to, amount1);
    _update(0, 0, uint112(amount0), uint112(amount1));
    emit Burn(msg.sender, amount0, amount1, to);
  }

  function removeLiquidityEth(
    uint112 liquidity,
    uint112 amountEthMin,
    uint112 amountTokenMin,
    address to
  ) external onlyEthPool nonZeroAddress(to) returns (uint112 amountEth, uint112 amountToken) {
    (amountEth, amountToken) = _removeLiquidity(liquidity, amountEthMin, amountTokenMin);
    IWETH(token0).withdraw(amountEth);
    payable(to).transfer(amountEth);
    TransferHelper.safeTransfer(token1, to, amountToken);
    _update(0, 0, uint112(amountEth), uint112(amountToken));
    emit Burn(msg.sender, amountEth, amountToken, to);
  }

  ///@dev Your flash swap, might as well make all swaps use a flash swap since we're at it
  function swap(
    uint112 amount0Out,
    uint112 amount1Out,
    address to
  ) external lock nonZeroAddress(to) {
    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT_AMOUNT");
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves(); // gas savings
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
    uint112 amount0In = balance0 > _reserve0 - amount0Out
      ? balance0 - (_reserve0 - amount0Out)
      : 0;
    uint112 amount1In = balance1 > _reserve1 - amount1Out
      ? balance1 - (_reserve1 - amount1Out)
      : 0;
    require(amount0In > 0 || amount1In > 0, "Pool: INSUFFICIENT_INPUT_AMOUNT");
    {
      // scope for reserve{0,1}Adjusted, avoids stack too deep errors
      uint256 balance0Adjusted = balance0 * (1000) - (amount0In * (3));
      uint256 balance1Adjusted = balance1 * (1000) - (amount1In * (3));
      require(
        balance0Adjusted * (balance1Adjusted) >= uint256(_reserve0) * (_reserve1) * (1000**2),
        "Pool: K"
      );
    }

    _update(amount0In, amount1In, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  //approve first then call this function to swap
  function swapExactIn(
    address token,
    uint112 amountIn,
    address to
  ) external nonZeroAddress(to) lock onlyValidToken(token) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint112 reserveIn = (token == token0) ? _reserve0 : _reserve1;
    uint112 reserveOut = (token == token0) ? _reserve1 : _reserve0;
    address tokenIn = (token == token0) ? token0 : token1;
    address tokenOut = (token == token0) ? token1 : token0;
    uint112 amountOut = uint112(AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, 0));
    require(amountOut < reserveOut, "POOL: INSUFFICIENT LIQUIDITY");
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    TransferHelper.safeTransfer(tokenOut, to, amountOut);
  }

  function swapExactInEthForToken(address to)
    external
    payable
    onlyEthPool
    lock
    nonZeroAddress(to)
  {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint112 amountOut = uint112(AMMLibrary.getAmountOut(msg.value, _reserve0, _reserve1, 0));
    require(amountOut < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    IWETH(token0).deposit(msg.value);
    TransferHelper.safeTransfer(token1, to, amountOut);
  }

  function swapExactInTokenForEth(uint112 amount, address to)
    external
    onlyEthPool
    lock
    nonZeroAddress(to)
  {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint112 amountOut = uint112(AMMLibrary.getAmountOut(amount, _reserve1, _reserve0, 0));
    require(amountOut < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount);
    IWETH(token0).withdraw(amountOut);
    payable(to).transfer(amountOut);
  }

  //approve first then call this function to swap
  function swapExactOut(
    address token,
    uint112 amountOut,
    address to
  ) external nonZeroAddress(to) lock onlyValidToken(token) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint112 reserveIn = (token == token0) ? _reserve1 : _reserve0;
    uint112 reserveOut = (token == token0) ? _reserve0 : _reserve1;
    require(amountOut < reserveOut, "POOL: INSUFFICIENT LIQUIDITY");
    uint112 amountIn = uint112(AMMLibrary.getAmountIn(amountOut, reserveIn, reserveOut, 0));
    address tokenIn = (token == token0) ? token1 : token0;
    address tokenOut = (token == token0) ? token0 : token1;
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    TransferHelper.safeTransfer(tokenOut, to, amountOut);
  }

  function swapExactOutEthForToken(uint112 amount, address to)
    external
    payable
    lock
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    require(amount < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    uint256 amountIn = uint112(AMMLibrary.getAmountIn(amount, _reserve0, _reserve1, 0));
    require(msg.value >= amountIn, "INSUFFICIENT ETH");
    IWETH(token0).deposit(amountIn);
    if (msg.value - amountIn > 0) {
      payable(msg.sender).transfer(msg.value - amountIn);
    }
    TransferHelper.safeTransfer(token1, to, amount);
  }

  function swapExactOutTokenForEth(uint112 amount, address to)
    external
    lock
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    require(amount < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    uint256 amountIn = uint112(AMMLibrary.getAmountIn(amount, _reserve1, _reserve0, 0));
    TransferHelper.safeTransferFrom(token1, msg.sender, to, amountIn);
    IWETH(token0).withdraw(amount);
    payable(to).transfer(amount);
  }
}
