// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";

contract ERC20 is IERC20 {
  uint256 _totalSupply;
  uint256 _maxSupply;
  string name;
  string symbol;
  address _owner;

  mapping(address => uint256) balances;
  mapping(address => mapping(address => uint256)) allowances;

  constructor(
    string memory _name,
    string memory _symbol,
    uint256 _initialSupply
  ) {
    name = _name;
    symbol = _symbol;
    _owner = msg.sender;
    balances[msg.sender] = _initialSupply;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(to != address(0), "Address [to] is zero");
    require(balances[msg.sender] >= amount, "Insufficient balance");
    _transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowances[owner][spender];
  }

  //TODO: approve front-running attack?
  function approve(address spender, uint256 amount) external returns (bool) {
    allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    require(from != address(0), "Address [from] is zero");
    require(to != address(0), "Address [to] is zero");
    require(balances[from] >= amount, "Insufficient balance");
    require(allowances[from][to] >= amount, "Insufficient allowance");
    _transfer(from, to, amount);
    if (allowances[from][to] != type(uint256).max) {
      allowances[from][to] -= amount;
    }
    return true;
  }

  //TODO: Are there vulnerabilities with the mint and burn function other than them being public(only for now)?
  function mint(address to, uint256 amount) public {
    require(to != address(0), "Mint address is 0 address");
    balances[to] += amount;
    _totalSupply += amount;
  }

  function burn(address to, uint256 amount) public {
    require(to != address(0), "Burn address is 0 address");
    require(balances[to] >= amount, "Insufficient balance");
    balances[to] -= amount;
    _totalSupply -= amount;
  }

  //TODO: probably needa check if this is secure and whatever that is calling it is secure
  function _transfer(
    address _from,
    address _to,
    uint256 _amount
  ) private {
    balances[_from] -= _amount;
    balances[_to] += _amount;
    emit Transfer(_from, _to, _amount);
  }

  function getName() external view returns (string memory) {
    return name;
  }

  function getSymbol() external view returns (string memory) {
    return symbol;
  }
}
