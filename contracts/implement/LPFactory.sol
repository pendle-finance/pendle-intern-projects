// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../interface/ILPFactory.sol";
import "../interface/ILPPair.sol";
import "./LPPair.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract LPFactory is ILPFactory {
  mapping(address => mapping(address => address)) public getPair;
  address[] public allPairs;

  function allPairsLength() external view returns (uint256) {
    return allPairs.length;
  }

  function createPair(address tokenA, address tokenB) external returns (address pair) {
    require(tokenA != tokenB, "Identical token");
    (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    require(token0 != address(0), "Zero address");
    require(getPair[token0][token1] == address(0), "Pair already exist"); // single check is sufficient
    // Create new pair
    LPPair newPair = new LPPair(address(this));
    newPair.initialize(token0, token1);
    pair = address(newPair);

    getPair[token0][token1] = pair;
    getPair[token1][token0] = pair;
    allPairs.push(pair);
    emit PairCreated(token0, token1, pair, allPairs.length);
  }
}
