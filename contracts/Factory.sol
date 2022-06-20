// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IFactory.sol";
import "./Pair.sol";

contract Factory is IFactory {

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address newPair){
        require(tokenA != tokenB, "Same token");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Invalid token address");
        require(getPair[token0][token1] == address(0), "Pair exists");

        newPair = address(new Pair(token0, token1));
        allPairs.push(newPair);
        getPair[token0][token1] = newPair;
        getPair[token1][token0] = newPair;
        emit PairCreated(token0, token1, newPair);
    }

}
