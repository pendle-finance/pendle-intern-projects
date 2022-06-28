// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPool.sol";

library AMMLibrary {
  // returns sorted token addresses, used to handle return values from pairs sorted in this order
  function sortTokens(address tokenA, address tokenB)
    internal
    pure
    returns (address token0, address token1)
  {
    require(tokenA != tokenB, "AMMLibrary: IDENTICAL_ADDRESSES");
    (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), "AMMLibrary: ZERO_ADDRESS");
  }

  // given some amount of an asset and pair reserves, returns an equivalent amount of the other asset
  function quote(
    uint112 amountA,
    uint112 reserveA,
    uint112 reserveB
  ) internal pure returns (uint112 amountB) {
    require(amountA > 0, "AMMLibrary: INSUFFICIENT_AMOUNT");
    require(reserveA > 0 && reserveB > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    amountB = (amountA * reserveB) / reserveA;
  }

  // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
  // fee represented where 1% = 10
  function getAmountOut(
    uint112 amountIn,
    uint112 reserveIn,
    uint112 reserveOut,
    uint112 fee
  ) internal pure returns (uint112 amountOut) {
    require(amountIn > 0, "AMMLibrary: INSUFFICIENT_INPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    uint112 amountInWithFee = amountIn * (1000 - fee);
    uint112 numerator = amountInWithFee * (reserveOut);
    uint112 denominator = reserveIn * (1000) + (amountInWithFee);
    amountOut = numerator / denominator;
  }

  // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
  function getAmountIn(
    uint112 amountOut,
    uint112 reserveIn,
    uint112 reserveOut,
    uint112 fee
  ) internal pure returns (uint112 amountIn) {
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    require(amountOut > 0, "AMMLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
    uint112 numerator = reserveIn * amountOut * 1000;
    uint112 denominator = (reserveOut - amountOut) * (1000 - fee);
    amountIn = (numerator / denominator) + (1);
  }
}
