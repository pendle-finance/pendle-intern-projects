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
  //Not used if TransferHelper is used
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes("transfer(address,uint256)")));

  address private factory;
  address private token0;
  address private token1;

  uint256 private _reserve0;
  uint256 private _reserve1;
  uint32 private _blockTimestampLast;

  constructor() {
    factory = msg.sender;
    (token0, token1) = Factory(msg.sender).params();
    //add MIN_LIQUIDITY? instead of doing it mint function?
    _mint(address(0), MINIMUM_LIQUIDITY);
  }

  function getReserves()
    public
    view
    returns (
      uint256 reserve0,
      uint256 reserve1,
      uint32 blockTimestampLast
    )
  {
    reserve0 = _reserve0;
    reserve1 = _reserve1;
    blockTimestampLast = _blockTimestampLast;
  }

  function mint(address to) external returns (uint256 liquidity) {
    //MIN_LIQUIDITY will always be minted at start
    (uint256 reserve0, uint256 reserve1, ) = getReserves();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));

    //amount0 and amount1 is the amount user deposited
    uint256 amount0 = balance0 - reserve0;
    uint256 amount1 = balance1 - reserve1;

    uint256 totalSupply = _totalSupply;
    if (totalSupply == 0) {
      liquidity = AMMLibrary.sqrt((amount0 * amount1) - MINIMUM_LIQUIDITY);
    } else {
      liquidity = AMMLibrary.min(
        (amount0 * totalSupply) / reserve0,
        (amount1 * totalSupply) / reserve1
      );
    }
    require(liquidity > 0, "Pool: INSUFFICIENT_LIQUIDITY_MINTED");
    _mint(to, liquidity);

    _update(balance0, balance1, reserve0, reserve1);
    emit Mint(msg.sender, amount0, amount1);
  }

  function _update(
    uint256 balance0,
    uint256 balance1,
    uint256 reserve0,
    uint256 reserve1
  ) private {}
}
