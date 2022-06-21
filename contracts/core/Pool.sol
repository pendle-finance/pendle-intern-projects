pragma solidity ^0.8.0;

import "./PoolERC20.sol";
import "../interfaces/IPool.sol";
import "../libraries/UQ112x112.sol";
import "../libraries/AMMLibrary.sol";

contract Pool is PoolERC20, IPool {
  using UQ112x112 for uint224;
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

  function mint(address to) external returns (uint256 liquidity) {}

  function addLiquidity(
    tokenA,
    tokenB,
    amountA,
    amountB,
    to,
    deadline
  ) {
    (uint256 _reserveA, uint256 _reserveB, ) = getReserves();
    uint256 optimalAmountB = AMMLibrary.quote(amountA, _reserveA, _reserveB);
  }
}
