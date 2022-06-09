// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";

contract ERC20 is IERC20Metadata {
  string private _name;
  string private _symbol;
  uint8 private _decimals;
  uint private _totalSupply;
  address public contractOwner;
  mapping(address=>uint) private balance;
  mapping(address=>mapping(address=>uint)) private allowanceAmount;  // allowanceAmount[owner][spender] = amount possible

  constructor (string memory name, string memory symbol, uint8 decimals, uint totalSupply) 
  {
    _name = name;
    _symbol = symbol;
    _decimals = decimals;
    _totalSupply = totalSupply;  
    contractOwner = msg.sender;  
    balance[contractOwner] = totalSupply;
  }

  function name() external view returns (string memory)
  {
    return _name;
  }

  function symbol() external view returns (string memory)
  {
    return _symbol;
  }

  function decimals() external view returns (uint8){
    return _decimals;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balance[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {    
    require(owner!=address(0), "invalid owner");
    require(spender!=address(0), "invalid spender");
    return allowanceAmount[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    require(spender!=address(0), "invalid spender");
    allowanceAmount[msg.sender][spender] = amount;

    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    
    require(allowanceAmount[from][msg.sender] >= amount, "exceed the amount allowed");
    _transfer(from, to, amount);
    allowanceAmount[from][msg.sender] -= amount;   

    return true;
  }

  function _transfer(address from, address to, uint amount) internal 
  {
    require(from!=address(0), "invalid sender");
    require(to!=address(0), "invalid receiver");
    require(balance[from] >= amount, "not enough money from the owner");

    balance[from] -= amount;
    balance[to] += amount;  // Hope no overflow here! Should depend on the designer

    emit Transfer(from, to, amount);
  }

  fallback () external payable 
  {
    revert("No money here");
  }
}
