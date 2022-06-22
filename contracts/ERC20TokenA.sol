// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TokenA is ERC20 {

    constructor () ERC20("TokenA", "TOKEN A"){
        _mint(msg.sender, 100000);
    }
}