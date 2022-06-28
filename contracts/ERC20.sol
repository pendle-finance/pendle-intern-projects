// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20Metadata.sol";

contract ERC20 is IERC20Metadata {
  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;
  mapping(address => uint256) private ownership;
  mapping(address => mapping(address => uint256)) private allowances;

  event Mint(address to, uint256 amount);
  event Burn(address from, uint256 amount);

  modifier validAddress(address myAddress) {
    require(myAddress != address(0), "Invalid address");
    _;
  }

  constructor(string memory _name, string memory _symbol) {
    decimals = 18;
    name = _name;
    symbol = _symbol;
  }

  function balanceOf(address account) public view returns (uint256) {
    return ownership[account];
  }

  function transfer(address to, uint256 amount) public validAddress(to) returns (bool) {
    require(ownership[msg.sender] >= amount, "Insufficient balance");
    ownership[msg.sender] -= amount;
    ownership[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) public view returns (uint256) {
    return allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) public validAddress(spender) returns (bool) {
    allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public validAddress(from) validAddress(to) returns (bool) {
    require(allowances[from][msg.sender] >= amount, "Spender not approved");
    require(ownership[from] >= amount, "Insufficient balance");
    ownership[from] -= amount;
    ownership[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) internal {
    ownership[to] += amount;
    totalSupply += amount;
    emit Mint(to, amount);
  }

  function burn(address from, uint256 amount) internal validAddress(from) {
    require(ownership[from] >= amount, "Insufficient balance");
    ownership[from] -= amount;
    totalSupply -= amount;
    emit Burn(from, amount);
  }
}
