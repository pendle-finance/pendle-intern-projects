// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/IAMMFactory.sol";
import "./AMMPair.sol";

contract AMMFactory is IAMMFactory {
  mapping(IERC20 => mapping(IERC20 => address)) public getPair;
  address[] public allPairs;

  function allPairsLength() external view returns (uint256) {
    return allPairs.length;
  }

  function pairByIndex(uint256 index) external view returns (address pair) {
    return allPairs[index];
  }

  function createPair(IERC20 tokenA, IERC20 tokenB) external returns (address pair) {
    require(tokenA != tokenB, "UniswapV2: IDENTICAL_ADDRESSES");
    (IERC20 token0, IERC20 token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);

    require(getPair[token0][token1] == address(0), "UniswapV2: PAIR_EXISTS"); // single check is sufficient
    bytes memory bytecode = type(AMMPair).creationCode;
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    assembly {
      pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
    }
    IAMMPair(pair).initialize(token0, token1);
    getPair[token0][token1] = pair;
    getPair[token1][token0] = pair; // populate mapping in the reverse direction
    allPairs.push(pair);
    emit PairCreated(token0, token1, pair, allPairs.length);
  }
}
