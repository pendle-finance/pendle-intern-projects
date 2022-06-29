// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface IRouter {
  function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address account) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
  function removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address account) external returns (uint256 amountA, uint256 amountB);

  function swapExactIn(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address swapper) external returns (uint256[] memory amounts);
  function swapExactOut(uint256 amountOut, uint256 amountInMax, address[] calldata path, address swapper) external returns (uint256[] memory amounts);
}