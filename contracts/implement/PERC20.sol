// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interface/IERC20Metadata.sol";

contract PERC20 is IERC20Metadata {

  address internal _owner;
  uint internal _totalSupply;
  string internal _name;
  string internal _symbol;
  uint8 internal _decimals;
  
  mapping (address => uint) internal balances;
  mapping (address => mapping(address => uint)) internal _allowance;

  constructor(uint256 initialSupply, string memory initialName, string memory initialSymbol, uint8 initialDecimals) {
    _owner = msg.sender;
    _name = initialName;
    _symbol = initialSymbol;
    _decimals = initialDecimals;
    mint(_owner, initialSupply  * 10**_decimals); 
  }

  // VIEW-ONLY FUNCTIONS

  function name() external view returns (string memory){
    return _name;
  }

  function symbol() external view returns (string memory){
    return _symbol;
  }

  function decimals() external view returns (uint8){
    return _decimals;
  }

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
    require(account != address(0), "account is zero :(");
    _totalSupply += amount;
    balances[account] += amount;
    return true;
  }

  function burn(address account, uint amount) public onlyOwner returns(bool) {
    require(account != address(0), "account is zero :(");
    require(balances[account] >= amount, "he got nothing left :(");
    _totalSupply -= amount;
    balances[account] -= amount;
    return true;
  }

  //IDK-WHAT-TO-CLASSIFY-THESE FUNCTIONS

  function transfer(address to, uint256 amount) external returns(bool) {
    require(to != address(0), "recipient is zero :(");
    require(balances[msg.sender] >= amount, "too poor :(");
    balances[msg.sender] -= amount;
    balances[to] += amount;
    emit Transfer(msg.sender, to , amount);
    return true; 
  }

  function approve(address spender, uint256 amount) external returns(bool) {
    require(spender != address(0), "spender is zero :(");
    _allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns(bool) {
    require(from != address(0), "sender is zero :(");
    require(to != address(0), "receiver is zero :(");
    require(balances[from] >= amount, "sender too poor :(");
    require(_allowance[from][msg.sender] >= amount, "allowance too low :(");
    _allowance[from][msg.sender] -= amount;
    balances[from] -= amount;
    balances[to] += amount;
    emit Transfer(from, to , amount);
    return true;
  }
}