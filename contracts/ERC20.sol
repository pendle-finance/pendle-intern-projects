// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20.sol";

contract ERC20 is IERC20 {

  uint private totalBalance;
  
  mapping(address => uint) private balances;
  mapping(address => mapping(address => uint)) private allowBalances;
  
  constructor(){
    totalBalance = 100000;
    balances[msg.sender] = 100000;
  }
  function totalSupply() external view returns (uint256) {
    return totalBalance;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    // check enough balance
    require(balances[msg.sender]>=amount,"Insufficient amount");
    // decrease the value 
    balances[msg.sender]-=amount;
    // increase the value
    balances[to]+=amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowBalances[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowBalances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    // check balance
    require(balances[from]>=amount,"Insufficient amount");
    // check allowance
    require(allowBalances[from][to]>=amount,"Insufficient allowance");
    // decrease value
    balances[from]-=amount;
    //increase value
    balances[to]+=amount;
    emit Transfer(from, to, amount);
    return true;
  }
}
