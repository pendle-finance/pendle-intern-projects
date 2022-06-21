// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
interface IAMMFactory {
     // Events:
    event PairCreated(IERC20 indexed, IERC20 indexed, address indexed, uint256);

    // View Functions:
    function getPair(IERC20 tokenA, IERC20 tokenB) external view returns(address pair);
    function pairByIndex(uint256) external view returns (address pair);
    function allPairsLength() external view returns (uint);


    // External Functions
 function createPair(IERC20 tokenA, IERC20 tokenB) external returns (address pair);
}