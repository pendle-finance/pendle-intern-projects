// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPair.sol";
import "./ERC20.sol";

contract Pair is IPair, ERC20 {
    
    constructor (address tokenA, address tokenB) {

    }
}