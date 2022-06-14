// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFundDistribution {
  event EthApproveIsSet(address to, uint256 amount);
  event TokenApproveIsSet(address to, address token, uint256 amount);
  event TokenIsAdded(address token);
  event FundIsClaimed(address to);
  event EthIsClaimed(address to, uint256 amount);
  event TokenIsClaimed(address to, address token, uint256 amount);
  event AllTokensAreClaimed(address to);
  event ClaimedPartial(address to, address token, uint256 amount);
  event ClaimedEthPartial(address to, uint256 amount);

  function addToken(address token) external;

  function receiveToken(address token, uint256 amount) external;

  function setEthApprove(address to, uint256 amount) external;

  function setTokenApprove(
    address to,
    address token,
    uint256 amount
  ) external;

  function claimEth() external payable;

  function claimToken(address token) external;

  function claimAllFunds() external;

  function sendEthTo(address to) external payable;

  function sendTokenTo(address to, address token) external;

  function sendAllFundsTo(address to) external;
}
