// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20.sol";

contract ERC20 is IERC20 {

  uint private total;
  address public contractOwner;
  mapping(address=>uint) private balance;
  mapping(address=>mapping(address=>uint)) private allowanceAmount;  // allowanceAmount[owner][spender] = amount possible

  constructor (uint initialTotal) 
  {
    total = initialTotal;  
    contractOwner = msg.sender;  
    balance[contractOwner] = initialTotal;
  }

  function totalSupply() external view returns (uint256) {
    return total;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balance[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    require(balance[msg.sender] >= amount, "Not enough balance to transfer");
    require(to!=address(0), "invalid receiver");

    balance[msg.sender] -= amount;
    balance[to] += amount;

    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {    
    return allowanceAmount[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowanceAmount[msg.sender][spender] = amount;

    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    require(from!=address(0), "invalid sender");
    require(to!=address(0), "invalid receiver");
    require(balance[from] >= amount, "not enough money from the owner");
    require(allowanceAmount[from][msg.sender] >= amount, "exceed the amount allowed");

    // if (allowanceAmount[from][msg.sender] != 2**256-1)  // The allowanceAmount is not infinity
    // {
    //   allowanceAmount[from][msg.sender] -= amount; 
    // }
    
    allowanceAmount[from][msg.sender] -= amount; 
    balance[from] -= amount;
    balance[to] += amount;  // Hope no overflow here! Should depend on the designer

    emit Transfer(from, to, amount);

    return true;
  }
}
