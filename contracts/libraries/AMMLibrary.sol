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

  // calculates the CREATE2 address for a pair without making any external calls
  function pairFor(
    address factory,
    address tokenA,
    address tokenB
  ) internal view returns (address pair) {
    (address token0, address token1) = sortTokens(tokenA, tokenB);
    pair = address(
      uint160(
        uint256(
          keccak256(
            abi.encodePacked(
              hex"ff",
              factory,
              keccak256(abi.encodePacked(token0, token1)),
              IPool(factory). // init code hash
            )
          )
        )
      )
    );
  }

  // fetches and sorts the reserves for a pair
  function getReserves(
    address factory,
    address tokenA,
    address tokenB
  ) internal view returns (uint256 reserveA, uint256 reserveB) {
    (address token0, ) = sortTokens(tokenA, tokenB);
    (uint256 reserve0, uint256 reserve1) = IPool(pairFor(factory, tokenA, tokenB)).getReserves();
    (reserveA, reserveB) = tokenA == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
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

  function min(uint256 amount0, uint256 amount1) internal pure returns (uint256 minAmount) {
    minAmount = amount0 < amount1 ? amount0 : amount1;
  }

  // No pathing planned to be implemented yet
  //   // performs chained getAmountOut calculations on any number of pairs
  //   function getAmountsOut(
  //     address factory,
  //     uint256 amountIn,
  //     address[] memory path
  //   ) internal view returns (uint256[] memory amounts) {
  //     require(path.length >= 2, "AMMLibrary: INVALID_PATH");
  //     amounts = new uint256[](path.length);
  //     amounts[0] = amountIn;
  //     for (uint256 i; i < path.length - 1; i++) {
  //       (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
  //       amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
  //     }
  //   }

  //   // performs chained getAmountIn calculations on any number of pairs
  //   function getAmountsIn(
  //     address factory,
  //     uint256 amountOut,
  //     address[] memory path
  //   ) internal view returns (uint256[] memory amounts) {
  //     require(path.length >= 2, "AMMLibrary: INVALID_PATH");
  //     amounts = new uint256[](path.length);
  //     amounts[amounts.length - 1] = amountOut;
  //     for (uint256 i = path.length - 1; i > 0; i--) {
  //       (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
  //       amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
  //     }
  //   }
}
