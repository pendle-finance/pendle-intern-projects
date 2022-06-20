// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}