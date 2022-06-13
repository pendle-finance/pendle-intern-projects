// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract IAnythingAirdrop {
  event Airdrop(address indexed tokenAddress, address indexed userAddress, uint256 dropAmount);
  event Claim(
    address tokenAddress,
    address indexed allocatedTo,
    address indexed claimTo,
    uint256 amount
  );
  event ShiftAround();
}
