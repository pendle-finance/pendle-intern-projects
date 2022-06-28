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
  address public override token0;
  address public override token1;

  uint256 private reserve0;
  uint256 private reserve1;

  //uint8 take same space as bool
  uint8 private unlocked = 1;
  bool public isETH;

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
    // we can just check if token0 is WETH or token1 is WETH right?
    require(isETH, "Pool: Not a ETH pool");
    _;
  }

  constructor() {
    factory = msg.sender;
    (token0, token1, isETH) = IFactory(factory).getParams();
    // Hmmm
    _mint(address(0), MINIMUM_LIQUIDITY, true);
  }

  receive() external payable {}

  // This is an interesting twist of the update function
  function _update(
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out
  ) internal {
    reserve0 = reserve0 + amount0In - amount0Out;
    reserve1 = reserve1 + amount1In - amount1Out;
  }

  // the namings of the functions are not very good, mint is a private func but doesn't have leading underscore
  // while _addLiquidity is public & has leading underscore

  // Also, the code should allowed the reader to read from top to bottom. For example, addLiquidity should on the top most
  // , then _addLiquidity & then mint

  // Or there is another convention of all the external functions first, then public, then internal, then private,
  // which is quite good as well

  function getReserves() public view override returns (uint256 _reserve0, uint256 _reserve1) {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
  }

  // This function is kinda strange. You guys have already had an addLiquidity function that calculate the
  // exact amount each token will be added, so why take the min here?
  // Also, there is a fragmentation of logic where the amount is calculated in the addLiquidity function,
  // yet the amount of LP minted is in this function
  function mint(
    address to,
    uint256 amount0,
    uint256 amount1
  ) private nonZeroAddress(to) returns (uint256 liquidity) {
    uint256 totalSupply = _totalSupply;
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    if (_totalSupply == MINIMUM_LIQUIDITY) {
      liquidity = Math.sqrt(amount0 * amount1);
    } else {
      liquidity = Math.min(
        (amount0 * totalSupply) / _reserve0,
        (amount1 * totalSupply) / _reserve1
      );
    }
    require(liquidity > 0, "Invalid liquidity");
    _mint(to, liquidity, false);
    _update(amount0, amount1, 0, 0);
    emit Mint(msg.sender, amount0, amount1);
    return liquidity;
  }

  // normally people only do underscore leading function for internal function or function callable by gov only
  // in this case, a much better name would be calcAddLiquidity
  function _addLiquidity(uint256 amount0, uint256 amount1) public view returns (uint256, uint256) {
    require(amount0 > 0, "POOL: INVALID AMOUNT0");
    require(amount1 > 0, "POOL: INVALID AMOUNT1");
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    if (_reserve0 == 0 && _reserve1 == 0) {
      return (amount0, amount1);
    }
    uint256 optimalAmount1 = uint256(AMMLibrary.quote(amount0, _reserve0, _reserve1));
    if (optimalAmount1 <= amount1) {
      return (amount0, optimalAmount1);
    } else {
      uint256 optimalAmount0 = uint256(AMMLibrary.quote(amount1, _reserve1, _reserve0));
      return (optimalAmount0, amount1);
    }
  }

  function addLiquidity(
    uint256 amount0,
    uint256 amount1,
    address to
  )
    external
    override
    nonZeroAddress(to)
    lock
    returns (
      uint256 amount0In,
      uint256 amount1In,
      uint256 liquidity
    )
  {
    (amount0In, amount1In) = _addLiquidity(amount0, amount1);
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0In);
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1In);
    liquidity = uint256(mint(to, amount0In, amount1In));
  }

  function addLiquidityEth(uint256 amount, address to)
    external
    payable
    nonZeroAddress(to)
    lock
    onlyEthPool
    returns (
      uint256 amountEth,
      uint256 amountToken,
      uint256 liquidity
    )
  {
    (amountEth, amountToken) = _addLiquidity(msg.value, amount);
    if (amountEth < msg.value) {
      payable(msg.sender).transfer(msg.value - amountEth); // nice one
    }
    IWETH(token0).deposit{value: amountEth}();
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amountToken);
    liquidity = mint(to, amountEth, amountToken);
  }

  function _removeLiquidity(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min
  ) internal returns (uint256 amount0, uint256 amount1) {
    require(liquidity > 0, "POOL: INVALID LIQUIDITY");
    // <= actually
    require(liquidity < _balances[msg.sender], "POOL: INVALID LIQUIDITY");

    uint256 totalSupply = uint256(_totalSupply);
    uint256 balance0 = uint256(IERC20(token0).balanceOf(address(this)));
    uint256 balance1 = uint256(IERC20(token1).balanceOf(address(this)));
    amount0 = (liquidity * balance0) / totalSupply;
    amount1 = (liquidity * balance1) / totalSupply;
    require(amount0 >= amount0Min, "POOl: INVALID AMOUNT0");
    require(amount1 >= amount1Min, "POOL: INVALID AMOUNT1");
    _burn(msg.sender, liquidity);
  }

  function removeLiquidity(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min,
    address to
  ) public override nonZeroAddress(to) returns (uint256 amount0, uint256 amount1) {
    // I do prefer having all the transfers in the same location for easier audit
    // Normally the calculation logic & the transfer + verification logic should be separated
    // so that each function only has 1 task

    (amount0, amount1) = _removeLiquidity(liquidity, amount0Min, amount1Min);
    TransferHelper.safeTransfer(token0, to, amount0);
    TransferHelper.safeTransfer(token1, to, amount1);
    _update(0, 0, amount0, amount1);
    emit Burn(msg.sender, amount0, amount1, to);
  }

  // Hmm do you need the withPermit for removing liquidity? since you burn the liquidity directly and hence
  // doesn't touch the allowance
  function removeLiquidityWithPermit(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min,
    address to,
    uint256 deadline,
    bool approveMax,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint256 amount0, uint256 amount1) {
    uint256 value = approveMax ? (type(uint256).max) : liquidity;
    permit(msg.sender, address(this), value, deadline, v, r, s);
    (amount0, amount1) = removeLiquidity(liquidity, amount0Min, amount1Min, to);
  }

  function removeLiquidityEth(
    uint256 liquidity,
    uint256 amountEthMin,
    uint256 amountTokenMin,
    address to
  ) public onlyEthPool nonZeroAddress(to) returns (uint256 amountEth, uint256 amountToken) {
    (amountEth, amountToken) = _removeLiquidity(liquidity, amountEthMin, amountTokenMin);
    IWETH(token0).withdraw(amountEth);
    payable(to).transfer(amountEth);
    TransferHelper.safeTransfer(token1, to, amountToken);
    _update(0, 0, uint256(amountEth), uint256(amountToken));
    emit Burn(msg.sender, amountEth, amountToken, to);
  }

  function removeLiquidityEthWithPermit(
    uint256 liquidity,
    uint256 amountEthMin,
    uint256 amountTokenMin,
    address to,
    uint256 deadline,
    bool approveMax,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external returns (uint256 amount0, uint256 amount1) {
    uint256 value = approveMax ? (type(uint256).max) : liquidity;
    permit(msg.sender, address(this), value, deadline, v, r, s);
    (amount0, amount1) = removeLiquidityEth(liquidity, amountEthMin, amountTokenMin, to);
  }

  ///@dev Your flash swap, might as well make all swaps use a flash swap since we're at it
  function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to
  ) public override lock nonZeroAddress(to) {
    // Hmmm why is this function public actually?
    // Also, this piece of logic is strange since now the calculation logic is in the contract already
    // => From the amountIn, you can directly calculate the amount out, instead of the current logic
    // where you calculate the amountOut and then call this function to once again verify the K

    require(amount0Out > 0 || amount1Out > 0, "Pool: INSUFFICIENT_OUTPUT_AMOUNT");
    (uint256 _reserve0, uint256 _reserve1) = getReserves(); // gas savings
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
      balance0 = uint256(IERC20(_token0).balanceOf(address(this)));
      balance1 = uint256(IERC20(_token1).balanceOf(address(this)));
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
    uint256 amountIn,
    address to
  ) external override nonZeroAddress(to) onlyValidToken(token) {
    (uint256 reserveIn, uint256 reserveOut, address tokenIn, address tokenOut) = _findWhichToken(
      token
    );
    // no need for the uint256 cast here
    uint256 amountOut = uint256(AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, 0));
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    if (tokenOut == token0) swap(amountOut, 0, to);
    else swap(0, amountOut, to);
  }

  //Assumption: token0 is ETH, so when you transfer to the user, always transfer token1
  function swapExactInEthForToken(address to) external payable onlyEthPool nonZeroAddress(to) {
    // don't assume but should add a requirement checking token0 is ETH in the constructor
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    uint256 amountOut = uint256(AMMLibrary.getAmountOut(msg.value, _reserve0, _reserve1, 0));
    require(amountOut < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    IWETH(token0).deposit{value: msg.value}();
    swap(0, amountOut, to);
  }

  //swap function is useless here: no multiple swap paths + need to unwrap and give ETH
  function swapExactInTokenForEth(uint256 amount, address to)
    external
    onlyEthPool
    nonZeroAddress(to)
  {
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    uint256 amountOut = uint256(AMMLibrary.getAmountOut(amount, _reserve1, _reserve0, 0));
    require(amountOut < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    _takeTokenTransferEth(to, amount, amountOut);
  }

  //approve first then call this function to swap
  function swapExactOut(
    address token,
    uint256 amountOut,
    address to
  ) external override nonZeroAddress(to) onlyValidToken(token) {
    //reverse the order because swapOut
    (uint256 reserveOut, uint256 reserveIn, address tokenOut, address tokenIn) = _findWhichToken(
      token
    );
    uint256 amountIn = AMMLibrary.getAmountIn(amountOut, reserveIn, reserveOut, 0);
    TransferHelper.safeTransferFrom(tokenIn, msg.sender, address(this), amountIn);
    if (tokenOut == token0) swap(amountOut, 0, to);
    else swap(0, amountOut, to);
  }

  function swapExactOutEthForToken(uint256 amount, address to)
    external
    payable
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    require(amount < _reserve1, "POOL: INSUFFICIENT LIQUIDITY");
    uint256 amountIn = AMMLibrary.getAmountIn(amount, _reserve0, _reserve1, 0);
    require(msg.value >= amountIn, "INSUFFICIENT ETH");
    IWETH(token0).deposit{value: amountIn}();
    if (msg.value - amountIn > 0) {
      payable(msg.sender).transfer(msg.value - amountIn);
    }
    swap(0, amount, to);
  }

  //swap function is useless here: no multiple swap paths + need to unwrap and give ETH
  function swapExactOutTokenForEth(uint256 amount, address to)
    external
    nonZeroAddress(to)
    onlyEthPool
  {
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
    require(amount < _reserve0, "POOL: INSUFFICIENT LIQUIDITY");
    uint256 amountIn = uint256(AMMLibrary.getAmountIn(amount, _reserve1, _reserve0, 0));
    _takeTokenTransferEth(to, amountIn, amount);
  }

  //Assumption: token 0 is WETH, thus token1 must be the other token
  function _takeTokenTransferEth(
    address to,
    uint256 amountIn,
    uint256 amountOut
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
      uint256 reserveIn,
      uint256 reserveOut,
      address tokenIn,
      address tokenOut
    )
  {
    (uint256 _reserve0, uint256 _reserve1) = getReserves();
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
