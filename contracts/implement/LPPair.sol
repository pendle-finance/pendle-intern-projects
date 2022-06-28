// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../interface/IERC20Metadata.sol";
import "../interface/ILPPair.sol";
import "./ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LPPair is ERC20, ILPPair {
  using SafeMath for uint256;
  using SafeMath for uint128;
  address public factory;
  address public token0;
  address public token1;

  uint128 private reserve0;
  uint128 private reserve1;

  constructor(address _factory) {
    factory = _factory;
  }

  function getReserves() public view returns (uint128 _reserve0, uint128 _reserve1) {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
  }

  // Update contract state
  function initialize(address _token0, address _token1) external {
    require(msg.sender == factory, "Only factory");
    token0 = _token0;
    token1 = _token1;
  }

  function addLiquidity(uint128 amountToken0, uint128 amountToken1)
    external
    returns (uint256 liquidity)
  {
    (uint128 _addAmount0, uint128 _addAmount1) = _addLiquidity(amountToken0, amountToken1);
    IERC20(token0).transferFrom(msg.sender, address(this), _addAmount0);
    IERC20(token1).transferFrom(msg.sender, address(this), _addAmount1);
    liquidity = mint(msg.sender);
  }

  function swapToken(address tokenIn, uint128 amountIn) external {
    require(tokenIn == token0 || tokenIn == token1, "Invalid swap token");
    require(amountIn > 0, "Invalid in amount");
    (uint128 _reserve0, uint128 _reserve1) = getReserves();
    if (tokenIn == token0) {
      IERC20(token0).transferFrom(msg.sender, address(this), amountIn);
      uint256 balance0 = IERC20(token0).balanceOf(address(this));
      uint256 balance1 = IERC20(token1).balanceOf(address(this));
      uint128 amountOut = uint128(balance1 - (_reserve0.mul(_reserve1)).div(balance0));
      IERC20(token1).transfer(msg.sender, amountOut);
      _update(balance0, balance1, _reserve0, _reserve1);
    } else {
      IERC20(token1).transferFrom(msg.sender, address(this), amountIn);
      uint256 balance0 = IERC20(token0).balanceOf(address(this));
      uint256 balance1 = IERC20(token1).balanceOf(address(this));
      uint128 amountOut = uint128(balance0 - (_reserve0.mul(_reserve1)).div(balance1));
      IERC20(token0).transfer(msg.sender, amountOut);
      _update(balance0, balance1, _reserve0, _reserve1);
    }
  }

  function mint(address to) public returns (uint256 liquidity) {
    (uint128 _reserve0, uint128 _reserve1) = getReserves();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    uint256 amount0 = balance0.sub(_reserve0);
    uint256 amount1 = balance1.sub(_reserve1);

    if (totalBalance == 0) {
      liquidity = amount1.mul(amount0);
    } else {
      liquidity = balance0.mul(balance1).sub(_reserve0.mul(_reserve1));
    }
    require(liquidity > 0, "Insuficient liquidity mint");
    _mint(to, liquidity);
    _update(balance0, balance1, _reserve0, _reserve1);

    emit Mint(msg.sender, amount0, amount1);
  }

  // This is remove liquidity
  function burn(address to) external returns (uint256 amount0, uint256 amount1) {
    (uint128 _reserve0, uint128 _reserve1) = getReserves();
    address _token0 = token0;
    address _token1 = token1;
    uint256 balance0 = IERC20(_token0).balanceOf(address(this));
    uint256 balance1 = IERC20(_token1).balanceOf(address(this));
    uint256 liquidity = balances[address(this)];

    amount0 = balance0.mul(liquidity) / totalBalance;
    amount1 = balance1.mul(liquidity) / totalBalance;

    //Transfer token to address
    ERC20(_token0).transfer(to, amount0);
    ERC20(_token1).transfer(to, amount1);

    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Burn(msg.sender, amount0, amount1, to);
  }

  function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to
  ) external {
    require(amount0Out > 0 || amount1Out > 0, "Insufficient amount");
    (uint128 _reserve0, uint128 _reserve1) = getReserves(); // gas savings
    require(amount0Out < _reserve0 && amount1Out < _reserve1, "Insufficient Liquidity");

    uint256 balance0;
    uint256 balance1;

    address _token0 = token0;
    address _token1 = token1;
    require(to != _token0 && to != _token1, "Invalid to address");

    // Transfer
    if (amount0Out > 0) ERC20(_token0).transfer(to, amount0Out);
    if (amount1Out > 0) ERC20(_token1).transfer(to, amount1Out);

    balance0 = IERC20(_token0).balanceOf(address(this));
    balance1 = IERC20(_token1).balanceOf(address(this));

    uint256 amount0In = balance0 > _reserve0 - amount0Out
      ? balance0 - (_reserve0 - amount0Out)
      : 0;
    uint256 amount1In = balance1 > _reserve1 - amount1Out
      ? balance1 - (_reserve1 - amount1Out)
      : 0;
    require(amount0In > 0 || amount1In > 0, "Invalid input amount");

    _update(balance0, balance1, _reserve0, _reserve1);
    emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
  }

  function skim(address to) external {
    address _token0 = token0; // gas savings
    address _token1 = token1; // gas savings
    ERC20(_token0).transfer(to, IERC20(_token0).balanceOf(address(this)).sub(reserve0));
    ERC20(_token1).transfer(to, IERC20(_token1).balanceOf(address(this)).sub(reserve1));
  }

  //Private & internal function
  function _update(
    uint256 balance0,
    uint256 balance1,
    uint128 _reserve0,
    uint128 _reserve1
  ) private {
    require(balance0 <= type(uint128).max && balance1 <= type(uint128).max, "Overflow");
    reserve0 = uint128(balance0);
    reserve1 = uint128(balance1);
    emit Update(_reserve0, _reserve1, balance0, balance1);
  }

  function _addLiquidity(uint128 amountADesired, uint128 amountBDesired)
    internal
    virtual
    returns (uint128 amountA, uint128 amountB)
  {
    (uint128 _reserve0, uint128 _reserve1) = getReserves();
    if (_reserve0 == 0 && _reserve1 == 0) {
      (amountA, amountB) = (amountADesired, amountBDesired);
    } else {
      uint128 amountBOptimal = uint128(amountADesired.mul(_reserve1).div(_reserve0));
      if (amountBOptimal <= amountBDesired) {
        (amountA, amountB) = (amountADesired, amountBOptimal);
      } else {
        uint128 amountAOptimal = uint128(amountBDesired.mul(_reserve0).div(_reserve1));
        assert(amountAOptimal <= amountADesired);
        (amountA, amountB) = (amountAOptimal, amountBDesired);
      }
    }
  }
}
