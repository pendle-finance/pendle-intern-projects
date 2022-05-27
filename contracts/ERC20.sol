// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract ERC20 is IERC20 {
  uint256 public totalSupply;
  mapping(address => uint256) public ownership;
  mapping(address => mapping(address => uint256)) public allowances;

  constructor(uint256 initialSupply) {
    totalSupply = initialSupply;
    ownership[msg.sender] = initialSupply;
  }

  function getTotalSupply() external view returns (uint256) {
    return totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return ownership[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(ownership[msg.sender] >= amount, "Insufficient funds");
    ownership[msg.sender] -= amount;
    ownership[to] += amount;
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowances[msg.sender][spender] = amount;
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    require(allowances[from][to] >= amount, "Receiver not approved");
    require(ownership[from] >= amount, "Insufficient balance");
    ownership[from] -= amount;
    ownership[to] += amount;
    return true;
  }

  function mint(address to, uint256 amount) public {
    ownership[to] += amount;
    totalSupply += amount;
  }

  function burn(address from, uint256 amount) public {
    ownership[from] -= amount;
    totalSupply -= amount;
  }
}
