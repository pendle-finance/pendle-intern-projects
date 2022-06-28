// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Math.sol";
import "./Pair.sol";

/*
 * Instead of putting helper functions in the core Pair contract,
 * these function are put in a separate library to keep the Pair contract
 * succinct, in exchange extra gas for approximately 1 extra storage
 * call in getReserves() is needed (only a guess)
 */

library PairHelper {
  function provideLiquidityByToken(Pair pair, uint256 amount) external {
    uint256 totalSupply = pair.totalSupply();
    require(totalSupply > 0, "Pair.pLBT: totalSupply = 0");

    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.provideLiquidity(
      Math.ceilDiv(amount * balance0, totalSupply),
      Math.ceilDiv(amount * balance1, totalSupply)
    );
  }

  function removeLiquidityByToken(Pair pair, uint256 amount) external {
    uint256 totalSupply = pair.totalSupply();

    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.removeLiquidity((amount * balance0) / totalSupply, (amount * balance1) / totalSupply);
  }

  /*
   * Formula for optimal amount1Out:
   * balance0 * balance1 <= (balance0 + amount0In) * (balance1 + amount1Out)
   * balance0 * balance1 / (balance0 + amount0In) <= balance1 - amount1Out
   * balance1 - balance0 * balance1 / (balance0 + amount0In) >= amount1Out
   */
  function swapExactIn0(Pair pair, uint256 amount0In) external {
    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.swap(amount0In, 0, 0, balance1 - Math.ceilDiv(balance0 * balance1, balance0 + amount0In));
  }

  /// Similar to swapExactIn0
  function swapExactIn1(Pair pair, uint256 amount1In) external {
    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.swap(0, amount1In, balance0 - Math.ceilDiv(balance0 * balance1, balance1 + amount1In), 0);
  }

  /*
   * Formula for optimal amount1In:
   * balance0 * balance1 <= (balance0 - amount0Out) * (balance1 + amount1In)
   * balance0 * balance1 / (balance0 - amount0Out) <= balance1 + amount1In
   * balance0 * balance1 / (balance0 - amount0Out) - balance1 <= amount1In
   */
  function swapExactOut0(Pair pair, uint256 amount0Out) external {
    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.swap(
      0,
      Math.ceilDiv(balance0 * balance1, balance0 - amount0Out) - balance1,
      amount0Out,
      0
    );
  }

  /// Similar to swapExactOut0
  function swapExactOut1(Pair pair, uint256 amount1Out) external {
    (uint256 balance0, uint256 balance1, ) = pair.getReserves();
    pair.swap(
      Math.ceilDiv(balance0 * balance1, balance1 - amount1Out) - balance0,
      0,
      0,
      amount1Out
    );
  }
}
