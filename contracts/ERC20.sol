// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract ERC20 is IERC20 {
  uint256 public _totalSupply;
  mapping(address => uint256) public ownership;
  mapping(address => mapping(address => uint256)) public allowances;

  constructor(uint256 initialSupply) {
    _totalSupply = initialSupply;
    ownership[msg.sender] = initialSupply;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return ownership[account];
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowances[owner][spender];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(ownership[msg.sender] >= amount, "Insufficient funds");
    require(to != address(0), "Sending to 0 address");
    ownership[msg.sender] -= amount;
    ownership[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    require(spender != address(0), "Spender cannot be 0 address");
    allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    require(allowances[from][to] >= amount, "Receiver not approved");
    require(ownership[from] >= amount, "Insufficient balance");
    require(to != address(0), "Cannot transfer to 0 address");
    require(from != address(0), "Cannot transfer from 0 address");
    ownership[from] -= amount;
    ownership[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) public {
    ownership[to] += amount;
    _totalSupply += amount;
  }

  function burn(address from, uint256 amount) public {
    ownership[from] -= amount;
    _totalSupply -= amount;
  }
}
