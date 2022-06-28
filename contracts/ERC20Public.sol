// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ERC20.sol";

contract ERC20Public is ERC20 {
  constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {}

  function mintPublic(address to, uint256 amount) external {
    mint(to, amount);
  }

  function burnPublic(address from, uint256 amount) external {
    burn(from, amount);
  }
}
