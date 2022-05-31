// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract ERC20 is IERC20 {
  uint256 internal _totalSupply = 0;
  mapping(address => uint256) internal _balanceOf;
  mapping(address => mapping(address => uint256)) internal _allowance;

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balanceOf[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    if (to == address(0)) return false;

    address from = msg.sender;

    if (_balanceOf[from] < amount) {
      return false;
    }
    
    _balanceOf[from] -= amount;
    _balanceOf[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return _allowance[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    if (spender == address(0)) return false;

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
    if (
      from == address(0) ||
      to == address(0) ||
      _allowance[from][sender] < amount ||
      _balanceOf[from] < amount) {
      return false;
    }

    _allowance[from][sender] -= amount;
    _balanceOf[from] -= amount;
    _balanceOf[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  // For testing purposes only
  function mint(address to, uint256 amount) external {
    require(to != address(0), "Address must be non-zero");

    _totalSupply += amount;
    _balanceOf[to] += amount;
  }
}
