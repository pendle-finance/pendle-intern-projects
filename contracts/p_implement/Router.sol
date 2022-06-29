// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interface/IERC20.sol";
import "../interface/ILPFactory.sol";
import "../interface/ILPPair.sol";

import "../p_interface/IRouter.sol";

import "./Helper.sol";
import "hardhat/console.sol";

contract Router is IRouter, Helper {
  address public immutable FACTORY;
  constructor(address _factory) {
    FACTORY = _factory;
  }

  // Add liquidity
  function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 needA,
    uint256 needB,
    uint256 minA,
    uint256 minB,
    address account
  )
    external
    returns (
      uint256 amountA,
      uint256 amountB,
      uint256 liquidity
    )
  {
    (amountA, amountB) = _getLiquidity(tokenA, tokenB, needA, needB, minA, minB);
    address pair = ILPFactory(FACTORY).getPair(tokenA, tokenB);

    IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
    IERC20(tokenB).transferFrom(msg.sender, pair, amountB);

    liquidity = ILPPair(pair).mint(account);
  }

  // Remove liquidity
  function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidity,
    uint256 minA,
    uint256 minB,
    address account
  ) external returns (uint256 amountA, uint256 amountB) {
    address pair = ILPFactory(FACTORY).getPair(tokenA, tokenB);
    //IERC20(pair).transferFrom(msg.sender, pair, liquidity);

    (uint256 amount0, uint256 amount1) = ILPPair(pair).burn(account,liquidity);
    address token0 = Helper.min(tokenA, tokenB);
    (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

    require(amountA >= minA, "why ask for so much A :(");
    require(amountB >= minB, "why ask for so much B :(");
  }

  uint256 public A;
  uint256 public B;
  // Swap
  function swapExactIn(
    uint256 amountIn,
    uint256 minOut,
    address[] calldata path,
    address swapper
  ) external returns (uint256[] memory amounts) {
    require(path.length >= 2, "wtf is this path :(");

    amounts = Helper.exactInPath(FACTORY, amountIn, path);
    require(amounts[amounts.length - 1] >= minOut, "doodoo market try again later :(");

    IERC20(path[0]).transferFrom(
      msg.sender,
      ILPFactory(FACTORY).getPair(path[0], path[1]),
      amounts[0]
    );
    _swap(amounts, path, swapper);
  }

  function swapExactOut(
    uint256 amountOut,
    uint256 maxIn,
    address[] calldata path,
    address swapper
  ) external returns (uint256[] memory amounts) {
    require(path.length >= 2, "wtf is this path :(");

    amounts = Helper.exactOutPath(FACTORY, amountOut, path);
    require(amounts[0] <= maxIn, "dude don't be a cheapskate :(");

    IERC20(path[0]).transferFrom(
      msg.sender,
      ILPFactory(FACTORY).getPair(path[0], path[1]),
      amounts[0]
    );

    A = amounts[0];
    B = amounts[1];
    _swap(amounts, path, swapper);
  }

  // Internal
  function _swap(
    uint256[] memory amounts,
    address[] calldata path,
    address swapper
  ) internal virtual {
    uint256 pathLength = path.length;
    for (uint256 i = 0; i < pathLength - 1; i++) {
      (address input, address output) = (path[i], path[i + 1]);
      address token0 = Helper.min(input, output);
      uint256 amountOut = amounts[i + 1];
      (uint256 out0, uint256 out1) = input == token0
        ? (uint256(0), amountOut)
        : (amountOut, uint256(0));
      address to = i < path.length - 2
        ? ILPFactory(FACTORY).getPair(output, path[i + 2])
        : swapper;

      ILPPair(ILPFactory(FACTORY).getPair(input, output)).swap(out0, out1, to);
    }
  }

  function _getLiquidity(
    address tokenA,
    address tokenB,
    uint256 needA,
    uint256 needB,
    uint256 minA,
    uint256 minB
  ) internal returns (uint256 amountA, uint256 amountB) {
    if (ILPFactory(FACTORY).getPair(tokenA, tokenB) == address(0)) {
      ILPFactory(FACTORY).createPair(tokenA, tokenB);
    }

    (uint256 reserveA, uint256 reserveB) = Helper.getReserves(FACTORY, tokenA, tokenB);
    if (reserveA == 0 && reserveB == 0) {
      (amountA, amountB) = (needA, needB);
    } else {
      uint256 bestA = Helper.calculateTrade(needB, reserveB, reserveA);
      uint256 bestB = Helper.calculateTrade(needA, reserveA, reserveB);

      if (bestA <= needA) {
        require(bestA >= minA, "put more A in mate :(");
        (amountA, amountB) = (bestA, needB);
      } else {
        require(bestB >= minB, "put more B in mate :(");
        (amountA, amountB) = (needA, bestB);
      }
    }
  }
}
