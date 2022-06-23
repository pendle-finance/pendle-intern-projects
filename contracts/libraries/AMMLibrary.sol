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
    uint256 amountA,
    uint256 reserveA,
    uint256 reserveB
  ) internal pure returns (uint256 amountB) {
    require(amountA > 0, "AMMLibrary: INSUFFICIENT_AMOUNT");
    require(reserveA > 0 && reserveB > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    amountB = (amountA * reserveB) / reserveA;
  }

  // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
  // fee represented where 1% = 10
  function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 fee
  ) internal pure returns (uint256 amountOut) {
    require(amountIn > 0, "AMMLibrary: INSUFFICIENT_INPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    uint256 amountInWithFee = amountIn * (1000 - fee);
    uint256 numerator = amountInWithFee * (reserveOut);
    uint256 denominator = reserveIn * (1000) + (amountInWithFee);
    amountOut = numerator / denominator;
  }

  // given an output amount of an asset and pair reserves, returns a required input amount of the other asset
  function getAmountIn(
    uint256 amountOut,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 fee
  ) internal pure returns (uint256 amountIn) {
    require(amountOut > 0, "AMMLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
    require(reserveIn > 0 && reserveOut > 0, "AMMLibrary: INSUFFICIENT_LIQUIDITY");
    uint256 numerator = reserveIn * amountOut * 1000;
    uint256 denominator = reserveOut - (amountOut * (1000 - fee));
    amountIn = (numerator / denominator) + (1);
  }
}
