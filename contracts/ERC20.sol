// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IERC20Metadata.sol";

contract ERC20 is IERC20Metadata {
  string internal _name;
  string internal _symbol;
  uint8 internal _decimals;
  uint256 internal _totalSupply;
  mapping(address => uint256) internal _balanceOf;
  mapping(address => mapping(address => uint256)) internal _allowance;

  constructor(
    string memory newName, 
    string memory newSymbol) {
    _name = newName;
    _symbol = newSymbol;
    _decimals = 18;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balanceOf[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(to != address(0), "Address to must be non-zero");

    address from = msg.sender;
    require(_balanceOf[from] >= amount, "Amount must not exceed balance");
    
    _balanceOf[from] -= amount;
    _balanceOf[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return _allowance[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    require(spender != address(0), "Address spender must be non-zero");

    address owner = msg.sender;
    _allowance[owner][spender] = amount;
    emit Approval(owner, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    address sender = msg.sender;
    require(from != address(0), "Address from must be non-zero");
    require(to != address(0), "Address to must be non-zero");
    require(_allowance[from][sender] >= amount, "Amount must not exceed allowance");
    require(_balanceOf[from] >= amount, "Amount must not exceed balance");

    _allowance[from][sender] -= amount;
    _balanceOf[from] -= amount;
    _balanceOf[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) external {
    require(to != address(0), "Address to must be non-zero");

    _totalSupply += amount;
    _balanceOf[to] += amount;
  }

  function burn(address from, uint256 amount) external {
    require(from != address(0), "Address from must be non-zero");
    require(_balanceOf[from] >= amount, "Amount must not exceed balance");

    _totalSupply -= amount;
    _balanceOf[from] -= amount;
  }

  function name() external view returns (string memory) {
    return _name;
  }

  function symbol() external view returns (string memory) {
    return _symbol;
  }

  function decimals() external view returns (uint8) {
    return _decimals;
  }
}
