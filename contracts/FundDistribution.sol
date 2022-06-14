// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IFundDistribution.sol";
import "./helpers/BoringOwnable.sol";

contract FundDistribution is IFundDistribution, BoringOwnable {
  //address -> amount of ether
  mapping(address => uint256) public ethAvailable;
  //token address -> added or not
  mapping(address => bool) public curTokens;
  //address -> token address -> amount of token
  mapping(address => mapping(address => uint256)) public tokenAvailable;
  //all the current tokens in the contract
  address[] public tokens;

  constructor(address _owner) public {
    owner = _owner;
  }

  modifier OnlyNonZeroAddress(address to) {
    require(to != address(0), "Invalid address");
    _;
  }

  receive() external payable {}

  function addToken(address token) external override onlyOwner OnlyNonZeroAddress(token) {
    require(!curTokens[token], "Token already added");
    tokens.push(token);
    curTokens[token] = true;
    require(IERC20(token).balanceOf(address(this)) > 0, "Amount is zero");
    emit TokenIsAdded(token);
  }

  function receiveToken(address token, uint256 amount)
    external
    override
    OnlyNonZeroAddress(token)
  {
    if (!curTokens[token]) {
      tokens.push(token);
      curTokens[token] = true;
    }
    IERC20 tokenContract = IERC20(token);
    require(amount > 0, "Amount is zero");
    tokenContract.transferFrom(msg.sender, address(this), amount);
    emit TokenIsAdded(token);
  }

  function setEthApprove(address to, uint256 amount)
    external
    override
    onlyOwner
    OnlyNonZeroAddress(to)
  {
    ethAvailable[to] = amount;
    emit EthApproveIsSet(to, amount);
  }

  function setTokenApprove(
    address to,
    address token,
    uint256 amount
  ) external override onlyOwner OnlyNonZeroAddress(to) {
    require(curTokens[token], "Token is not added");
    tokenAvailable[to][token] = amount;
    emit TokenApproveIsSet(to, token, amount);
  }

  function claimEth() public payable override {
    sendEthTo(msg.sender);
  }

  function claimToken(address token) external override {
    sendTokenTo(msg.sender, token);
  }

  function claimAllFunds() external override {
    sendAllFundsTo(msg.sender);
  }

  function sendEthTo(address to) public payable override OnlyNonZeroAddress(to) {
    uint256 amount = _min(ethAvailable[to], address(this).balance);
    _transferEth(to, amount);
  }

  function sendTokenTo(address to, address token)
    public
    override
    OnlyNonZeroAddress(to)
    OnlyNonZeroAddress(token)
  {
    uint256 amount = _min(tokenAvailable[to][token], IERC20(token).balanceOf(address(this)));
    _transferToken(to, token, amount);
  }

  function sendAllFundsTo(address to) public override OnlyNonZeroAddress(to) {
    sendEthTo(to);
    for (uint256 i = 0; i < tokens.length; ++i) {
      if (tokenAvailable[to][tokens[i]] > 0) {
        uint256 curTokenBalance = IERC20(tokens[i]).balanceOf(address(this));
        _transferToken(to, tokens[i], _min(tokenAvailable[to][tokens[i]], curTokenBalance));
      }
    }
  }

  function _transferEth(address to, uint256 amount) internal {
    require(amount <= address(this).balance, "Amount is greater than balance");
    require(amount <= ethAvailable[to], "Amount is greater than available");
    ethAvailable[to] -= amount;
    payable(to).transfer(amount);
    if (ethAvailable[to] > 0) emit ClaimedEthPartial(to, amount);
    else emit EthIsClaimed(to, amount);
  }

  function _transferToken(
    address to,
    address token,
    uint256 amount
  ) internal {
    IERC20 tokenContract = IERC20(token);
    require(amount <= tokenContract.balanceOf(address(this)), "Not enough tokens");
    require(amount <= tokenAvailable[to][token], "Not enough allowed tokens");
    tokenAvailable[to][token] -= amount;
    tokenContract.transfer(to, amount);
    if (tokenAvailable[to][token] > 0) emit ClaimedPartial(to, token, amount);
    else emit TokenIsClaimed(to, token, amount);
  }

  function _min(uint256 a, uint256 b) internal pure returns (uint256) {
    if (a < b) return a;
    return b;
  }

  function balance() external view returns (uint256) {
    return address(this).balance;
  }
}
