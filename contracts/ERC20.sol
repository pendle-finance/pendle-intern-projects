// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract ERC20 is IERC20 {
  uint256 constant MAXINT = 2**256 - 1;
  uint256 public _totalSupply;
  mapping(address => uint256) public _balances;
  mapping(address => mapping(address => uint256)) public _allowances;

  constructor(uint256 _initialSupply) {
    mint(msg.sender, _initialSupply);
  }

  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }

  function transfer(address to, uint256 amount) external override returns (bool) {
    require(_balances[msg.sender] >= amount, "Not enough balance");
    require(to != address(0), "Invalid recipient");
    _balances[msg.sender] -= amount;
    _balances[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    require(spender != address(0), "Invalid spender");
    _allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external override returns (bool) {
    require(from != address(0), "Invalid from");
    require(to != address(0), "Invalid to");
    require(amount <= _allowances[from][msg.sender], "Not enough allowance");
    require(_balances[from] >= amount, "Not enough balance");
    _balances[from] -= amount;
    _balances[to] += amount;
    if (_allowances[from][msg.sender] != MAXINT) {
      _allowances[from][msg.sender] -= amount;
    }
    emit Transfer(from, to, amount);
    return true;
  }

  function mint(address to, uint256 amount) public returns (bool) {
    require(to != address(0), "Invalid recipient");
    _totalSupply += amount;
    _balances[to] += amount;
    emit Transfer(address(0), to, amount);
    return true;
  }

  function burn(uint256 amount) public returns (bool) {
    require(_balances[msg.sender] >= amount, "Not enough balance");
    _balances[msg.sender] -= amount;
    emit Transfer(msg.sender, address(0), amount);
    return true;
  }
}
