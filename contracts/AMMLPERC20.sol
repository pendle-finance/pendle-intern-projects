// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract AMMLPERC20 {
  string public constant name = "AMM LP";
  string public constant symbol = "AMM LP";
  uint8 public constant decimals = 18;
  uint256 private _totalSupply;
  mapping(address => uint256) private _balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  event Approval(address indexed owner, address indexed spender, uint256 value);
  event Transfer(address indexed from, address indexed to, uint256 value);

  constructor() {}

  function _mint(address to, uint256 value) internal {
    _totalSupply += value;
    _balanceOf[to] += value;
    emit Transfer(address(0), to, value);
  }

  function _burn(address from, uint256 value) internal {
    _balanceOf[from] -= value;
    _totalSupply -= value;
    emit Transfer(from, address(0), value);
  }

  function _approve(
    address owner,
    address spender,
    uint256 value
  ) private {
    allowance[owner][spender] = value;
    emit Approval(owner, spender, value);
  }

  function _transfer(
    address from,
    address to,
    uint256 value
  ) private {
    _balanceOf[from] -= value;
    _balanceOf[to] += value;
    emit Transfer(from, to, value);
  }

  function approve(address spender, uint256 value) external virtual returns (bool) {
    _approve(msg.sender, spender, value);
    return true;
  }

  function transfer(address to, uint256 value) external returns (bool) {
    _transfer(msg.sender, to, value);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 value
  ) external returns (bool) {
    if (allowance[from][msg.sender] > 0) {
      allowance[from][msg.sender] -= value;
    }
    _transfer(from, to, value);
    return true;
  }

  function totalSupply() public view returns(uint256){
    return _totalSupply;
  }

  function balanceOf(address account) public view returns(uint256){
    return _balanceOf[account];
  }
}