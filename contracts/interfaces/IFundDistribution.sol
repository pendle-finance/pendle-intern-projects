// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFundDistribution {
  event EthApproveIsSet(address to, uint256 amount);
  event TokenApproveIsSet(address to, address token, uint256 amount);
  event TokenIsAdded(address sender, address token, uint256 amount);
  event EthIsAdded(address sender, uint256 amount);
  event FundIsClaimed(address to);
  event EthIsClaimed(address to, uint256 amount);
  event TokenIsClaimed(address to, address token, uint256 amount);
  event AllTokensAreClaimed(address to);
  event ClaimedPartial(address to, address token, uint256 amount);
  event ClaimedEthPartial(address to, uint256 amount);

  function depositToken(address token, uint256 amount) external;

  function setEthApprove(address to, uint256 amount) external;

  function setTokenApprove(
    address to,
    address token,
    uint256 amount
  ) external;

  function claimEth() external;

  function claimToken(address token) external;

  function claimAllFunds() external;

  function sendEthTo(address to) external;

  function sendTokenTo(address to, address token) external;

  function sendAllFundsTo(address to) external;
}
