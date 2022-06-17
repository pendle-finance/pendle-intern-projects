// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TestERC20 is ERC20, Ownable {
    constructor() ERC20("Test", "TEST") {
        _mint(msg.sender, 100000);
    }

    function mint(uint256 amount_) external onlyOwner {
        _mint(msg.sender, amount_);
    }
}