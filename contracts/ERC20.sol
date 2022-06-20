// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./IERC20Metadata.sol";

contract ERC20 is IERC20Metadata{

  string public name;
  string public symbol;
  uint8 public decimals;
  uint256 public totalSupply;

  function balanceOf(address account) external view returns (uint256) {
    return 0;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return 0;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    return true;
  }

  function mint(address to, uint256 amount) internal {
    
  }

  function burn(address from, uint256 amount) internal {

  }
}
