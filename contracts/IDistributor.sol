// SPDX-License-Identifier: MIT
// OpenZeppelin Contracts (last updated v4.5.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.0;

interface IDistributor {

  function balanceToken(address tokenAddress, address account) external view returns(uint256);
  function balanceETH(address account) external view returns(uint256);
  function undistributedToken(address tokenAddress) external view returns(uint256);
  function undistributedETH() external view returns(uint256);

  function depositToken(address tokenAddress, uint256 amount) external;
  function depositETH() external payable;

  function approveToken(address tokenAddress, address to, uint256 amount) external;
  function approveETH(address to, uint256 amount) external;

  function claimToken(address tokenAddress, uint256 amount) external;
  function claimETH(uint256 amount) external;
  function claimAllToken(address tokenAddress) external;
  function claimAllETH() external;
  function claimEverything() external;

  event Deposited(address indexed tokenAddress, address indexed from, uint256 value);
  event Approved(address indexed tokenAddress, address indexed to, uint value);
  event Claimed(address indexed tokenAddress, address indexed to, uint256 value);  

  function gamble(uint256 luckyNumber) external payable returns(string memory);
}
