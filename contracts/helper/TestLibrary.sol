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
    uint256 amountA,
    uint256 reserveA,
    uint256 reserveB
  ) public pure returns (uint256 amountB) {
    amountB = AMMLibrary.quote(amountA, reserveA, reserveB);
  }

  function getAmountOut(
    uint256 amountIn,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 fee
  ) public pure returns (uint256 amountOut) {
    amountOut = AMMLibrary.getAmountOut(amountIn, reserveIn, reserveOut, fee);
  }

  function getAmountIn(
    uint256 amountOut,
    uint256 reserveIn,
    uint256 reserveOut,
    uint256 fee
  ) public pure returns (uint256 amountIn) {
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
