// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IPool.sol";

contract GetPool {
  bytes32 constant codeHash = 0x921bfa93edd589059d4db51153fdfd77e408e4c8a7720aea2c8bec38177ba764;

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
  ) external pure returns (address pair) {
    (address token0, address token1) = sortTokens(tokenA, tokenB);
    pair = address(
      uint160(
        uint256(
          keccak256(
            abi.encodePacked(
              hex"ff",
              factory,
              keccak256(abi.encodePacked(token0, token1)),
              codeHash // init code hash
            )
          )
        )
      )
    );
  }
}
