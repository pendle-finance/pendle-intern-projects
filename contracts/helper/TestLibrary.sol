// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../libraries/AMMLibrary.sol";
import "../libraries/GetPool.sol";

contract TestLibrary {
  function sortTokens(address tokenA, address tokenB)
    public
    pure
    returns (address token0, address token1)
  {
    (token0, token1) = AMMLibrary.sortTokens(tokenA, tokenB);
  }

  function quote(
    uint112 amountA,
    uint112 reserveA,
    uint112 reserveB
  ) public pure returns (uint112 amountB) {
    amountB = AMMLibrary.quote(amountA, reserveA, reserveB);
  }

  function getAmountOut(
    uint112 amountIn,
    uint112 reserveIn,
    uint112 reserveOut,
    uint256 fee
  ) public pure returns (uint112 amountOut) {
    amountOut = AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, uint112(fee));
  }

  function getAmountIn(
    uint112 amountOut,
    uint112 reserveIn,
    uint112 reserveOut,
    uint112 fee
  ) public pure returns (uint112 amountIn) {
    amountIn = AMMLibrary.getAmountIn(amountOut, reserveIn, reserveOut, fee);
  }

  function pairFor(
    address factory,
    address tokenA,
    address tokenB
  ) public view returns (address pair) {
    pair = GetPool.pairFor(factory, tokenA, tokenB);
  }
}
