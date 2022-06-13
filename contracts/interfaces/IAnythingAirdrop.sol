// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnythingAirdrop {
  event Airdrop(address indexed tokenAddress, address indexed userAddress, uint256 dropAmount);
  event Claim(
    address tokenAddress,
    address indexed allocatedTo,
    address indexed claimTo,
    uint256 amount
  );
  event ShiftAround();

  function airdrop(
    address to,
    address tokenAddress,
    uint256 amount
  ) external;

  function airdropETH(address to, uint256 amount) external payable;

  function airdropMultiUserOneToken(
    address[] calldata toAddresses,
    address tokenAddress,
    uint256[] calldata dropAmount
  ) external;

  function airdropOneUserMultiToken(
    address toAddress,
    address[] calldata tokenAddresses,
    uint256[] calldata dropAmount
  ) external;

  function claim(
    address to,
    address tokenAddress,
    uint256 amount
  ) external;

  function claimAll(
    address to,
    address[] calldata tokenAddresses,
    uint256[] calldata amount
  ) external;

  function takeback(
    address from,
    address tokenAddress,
    uint256 amount
  ) external;

  function shiftAround() external;

  function getERC20Distribution(address userAddress, address tokenAddress)
    external
    view
    returns (uint256 allocatedAmount);
  
  function getETHDistribution(address userAddress) external view returns (uint256 allocatedAmount);
}