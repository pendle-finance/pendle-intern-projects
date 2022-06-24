// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interface/ILPPair.sol";

contract Helper {

  function min(address tokenA, address tokenB) internal view returns (address) {
    return tokenA < tokenB ? tokenA : tokenB;
  }

  function getReserves(address factory, address tokenA, address tokenB) internal view returns (uint256, uint256) {
    address token0 = min(tokenA, tokenB);
    (uint256 reserve0, uint256 reserve1) = ILPPair(pairFor(factory, tokenA, tokenB)).getReserves();
    return tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
  }

  function calculateTrade(uint256 amountA, uint256 reserveA, uint256 reserveB) internal view returns (uint256) {
    require(amountA > 0, "stop trolling :(");
    require(reserveA > 0 && reserveB > 0, "liquid evaporated :(");
    return amountA * reserveB / reserveA;
  }

  function exactIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) internal view returns (uint256) {
    require(amountOut > 0, "stop trolling :(");
    require(reserveIn > 0 && reserveOut > 0, "liquid evaporated :(");
    return (amountOut * reserveIn / (reserveOut - amountOut)) + 1;
  }

  function exactOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal view returns (uint256) {
    require(amountIn > 0, "stop trolling :(");
    require(reserveIn > 0 && reserveOut > 0, "liquid evaporated :(");
    return amountIn * reserveOut / (reserveIn + amountIn);
  }

  function exactInPath(address factory, uint256 amountOut, address[] calldata path) internal view returns (uint256[] memory amounts) {
    uint256 pathLength = path.length;
    amounts = new uint256[](pathLength);
    amounts[amounts.length - 1] = amountOut;

    for (uint256 i = pathLength - 1; i > 0; i--) {
      (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
      amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
    }
  }

  function exactOutPath(address factory, uint256 amountIn, address[] calldata path) internal view returns (uint256[] memory amounts) {
    uint256 pathLength = path.length;
    amounts = new uint256[](pathLength);
    amounts[0] = amountIn;

    for (uint256 i = 0; i < pathLength - 1; i++) {
      (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
      amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
    }
  }
}