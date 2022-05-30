// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20.sol";

contract ERC20 is IERC20 {

  address public _owner;
  uint public _totalSupply;
  
  mapping (address => uint) public balances;
  mapping (address => mapping(address => uint)) public _allowance;

  constructor(uint256 initialSupply) {
    _owner = msg.sender;
    mint(_owner, initialSupply); 
  }

  // VIEW-ONLY FUNCTIONS

  function totalSupply() external view returns(uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns(uint256) {
    return balances[account];
  }

  function allowance(address owner, address spender) external view returns(uint256) {
    return _allowance[owner][spender];
  }

  //OWNER-ONLY FUNCTIONS

  modifier onlyOwner {
    require(msg.sender == _owner, "not owner :(");
    _;
  }

  function mint(address account, uint256 amount) public onlyOwner returns(bool) {
    _totalSupply += amount;
    balances[account] += amount;
    return true;
  }

  function burn(address account, uint amount) public onlyOwner returns(bool) {
    require(balances[account] >= amount, "he got nothing left :(");
    _totalSupply -= amount;
    balances[account] -= amount;
    return true;
  }

  //IDK-WHAT-TO-CLASSIFY-THESE FUNCTIONS

  function transfer(address to, uint256 amount) external returns(bool) {
    require(balances[msg.sender] >= amount, "too poor :(");
    balances[msg.sender] -= amount;
    balances[to] += amount;
    emit Transfer(msg.sender, to , amount);
    return true; 
  }

  function approve(address spender, uint256 amount) external returns(bool) {
    _allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns(bool) {
    require(balances[from] >= amount, "sender too poor :(");
    require(_allowance[from][msg.sender] >= amount, "allowance too low :(");
    _allowance[from][msg.sender] -= amount;
    balances[from] -= amount;
    balances[to] += amount;
    emit Transfer(from, to , amount);
    return true;
  }
}
