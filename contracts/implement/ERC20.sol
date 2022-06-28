// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interface/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ERC20 is IERC20Metadata {
  using SafeMath for uint256;

  uint256 internal totalBalance;
  //address public owner;
  mapping(address => uint256) internal balances;
  mapping(address => mapping(address => uint256)) private allowBalances;
  string public constant tokenName = "LP AMM";
  string public constant tokenSymbol = "LP";
  uint8 public constant tokenDecimal = 18;

  // function owners() external view returns (address) {
  //   return owner;
  // }

  function totalSupply() external view returns (uint256) {
    return totalBalance;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    // check enough balance
    require(balances[msg.sender] >= amount, "Insufficient amount");
    require(to != address(0), "Address should not be 0");
    // decrease the value
    balances[msg.sender] -= amount;
    // increase the value
    balances[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowBalances[owner][spender];
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    require(spender != address(0), "Address should not be 0");
    allowBalances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    require(from != address(0), "Address should not be 0");
    require(to != address(0), "Address should not be 0");
    // check balance
    require(balances[from] >= amount, "Insufficient amount");
    // check allowance
    require(allowBalances[from][msg.sender] >= amount, "Insufficient allowance");
    allowBalances[from][msg.sender] -= amount;
    // decrease value
    balances[from] -= amount;
    //increase value
    balances[to] += amount;
    emit Transfer(from, to, amount);
    return true;
  }

  function name() external pure returns (string memory) {
    return tokenName;
  }

  function symbol() external pure returns (string memory) {
    return tokenSymbol;
  }

  function decimals() external pure returns (uint8) {
    return tokenDecimal;
  }

  function _mint(address to, uint256 value) internal {
    totalBalance = totalBalance.add(value);
    balances[to] = balances[to].add(value);
    emit Transfer(address(0), to, value);
  }

  function _burn(address from, uint256 value) internal {
    balances[from] = balances[from].sub(value);
    totalBalance = totalBalance.sub(value);
    emit Transfer(from, address(0), value);
  }
}
