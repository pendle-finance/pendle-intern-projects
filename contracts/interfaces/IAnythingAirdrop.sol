// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAnythingAirdrop {
  event Airdrop(address indexed to, address indexed tokenAddress, uint256 dropAmount);
  event Claim(
    address indexed to,
    address indexed tokenAddress,
    uint256 amount
  );
  event Takeback(address indexed redeemFrom, address indexed redeemTo, address indexed tokenAddress, uint256 amount);
  event ShiftAround(address indexed shiftFrom, address indexed shiftTo, address indexed tokenAddress, uint256 amount);

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

  function airdropMultiUserETH(address[] calldata toAddresses, uint256[] calldata dropAmount)
    external
    payable;

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

  function takebackETH(address from, uint256 amount) external;

  function shiftAround(address shiftFrom, address shiftTo, address tokenAddress, uint256 amount) external;

  function getERC20Distribution(address userAddress, address tokenAddress)
    external
    view
    returns (uint256 allocatedAmount);
  
  function getETHDistribution(address userAddress) external view returns (uint256 allocatedAmount);
}