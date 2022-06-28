// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PairHelper.sol";

contract PairHelperClient {
  using PairHelper for Pair;
  Pair private pair;

  constructor(address pairAddress) {
    pair = Pair(pairAddress);
    IERC20(pair.token0()).approve(pairAddress, 10**36);
    IERC20(pair.token1()).approve(pairAddress, 10**36);
  }

  function provideLiquidityByToken(uint256 amount) external {
    pair.provideLiquidityByToken(amount);
  }

  function removeLiquidityByToken(uint256 amount) external {
    pair.removeLiquidityByToken(amount);
  }

  function swapExactIn0(uint256 amount0In) external {
    pair.swapExactIn0(amount0In);
  }

  function swapExactIn1(uint256 amount1In) external {
    pair.swapExactIn1(amount1In);
  }

  function swapExactOut0(uint256 amount0Out) external {
    pair.swapExactOut0(amount0Out);
  }

  function swapExactOut1(uint256 amount1Out) external {
    pair.swapExactOut1(amount1Out);
  }
}
