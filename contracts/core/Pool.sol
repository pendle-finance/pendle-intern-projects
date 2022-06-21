// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPool.sol";
import "./Factory.sol";
import "./PoolERC20.sol";
import "../libraries/AMMLibrary.sol";
import "../libraries/TransferHelper.sol";

contract Pool is IPool, PoolERC20 {
  //Constants don't take up storage slots
  uint256 public constant MINIMUM_LIQUIDITY = 10**3;

  address public factory;
  address public token0;
  address public token1;

  uint112 public reserve0;
  uint112 public reserve1;
  uint32 public blockTimestampLast;

  constructor() {
    factory = msg.sender;
    (token0, token1) = Factory(msg.sender).params();
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

  function mint(address to) external returns (uint256 liquidity) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));

    //amount0 and amount1 is the amount user deposited
    uint256 amount0 = balance0 - reserve0;
    uint256 amount1 = balance1 - reserve1;

    uint256 totalSupply = _totalSupply;
    if (totalSupply == 0) {
      _mint(address(0), MINIMUM_LIQUIDITY);
      liquidity = AMMLibrary.sqrt((amount0 * amount1) - MINIMUM_LIQUIDITY);
    } else {
      liquidity = AMMLibrary.min(
        (amount0 * totalSupply) / reserve0,
        (amount1 * totalSupply) / reserve1
      );
    }
    require(liquidity > 0, "Pool: INSUFFICIENT_LIQUIDITY_MINTED");
    _mint(to, liquidity);

    _update(balance0, balance1);
    emit Mint(msg.sender, amount0, amount1);
  }

  function burn(address to) external returns (uint256 amount0, uint256 amount1) {
    (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    uint256 liquidity = _balances[address(this)];
    uint256 totalSupply = _totalSupply;
  }

  function _update(uint256 balance0, uint256 balance1) private {
    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
  }
}
