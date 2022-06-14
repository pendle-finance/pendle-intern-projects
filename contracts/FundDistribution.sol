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
  mapping(address => bool) public distributors;
  mapping(address => bool) public funders;

  constructor(address _owner) public {
    owner = _owner;
  }

  modifier onlyNonZeroAddress(address to) {
    require(to != address(0), "Invalid address");
    _;
  }

  modifier onlyFunders() {
    require(funders[msg.sender] || msg.sender == owner, "Only funders can call this function");
    _;
  }

  modifier onlyDistributors() {
    require(
      distributors[msg.sender] || msg.sender == owner,
      "Only distributors can call this function"
    );
    _;
  }

  function addFunder(address _funder) public onlyOwner {
    funders[_funder] = true;
  }

  function addDistributor(address _distributor) public onlyOwner {
    distributors[_distributor] = true;
  }

  receive() external payable {}

  // transfer token to contract first then call addToken if Token is not added yet
  function addToken(address token) external override onlyFunders onlyNonZeroAddress(token) {
    require(!curTokens[token], "Token already added");
    tokens.push(token);
    curTokens[token] = true;
    require(IERC20(token).balanceOf(address(this)) > 0, "Amount is zero");
    emit TokenIsAdded(token);
  }

  // approve allowance first then call receiveToken to transfer token
  function receiveToken(address token, uint256 amount)
    external
    override
    onlyFunders
    onlyNonZeroAddress(token)
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

  //set the amount claimable to an address
  function setEthApprove(address to, uint256 amount)
    external
    override
    onlyDistributors
    onlyNonZeroAddress(to)
  {
    ethAvailable[to] = amount;
    emit EthApproveIsSet(to, amount);
  }

  //set the token amount claimable to an address
  function setTokenApprove(
    address to,
    address token,
    uint256 amount
  ) external override onlyDistributors onlyNonZeroAddress(to) {
    require(curTokens[token], "Token is not added");
    tokenAvailable[to][token] = amount;
    emit TokenApproveIsSet(to, token, amount);
  }

  //the sender claim his ether
  function claimEth() public override {
    sendEthTo(msg.sender);
  }

  function claimEthWithRevertIfInsufficientFunds() public payable {
    sendEthToWithRevertIfInsufficientFunds(msg.sender);
  }

  //the sender claim his token
  function claimToken(address token) external override {
    sendTokenTo(msg.sender, token);
  }

  function claimTokenWithRevertIfInsufficientFunds(address token) public payable {
    sendTokenToWithRevertIfInsufficientFunds(msg.sender, token);
  }

  //the sender claim all his funds
  function claimAllFunds() external override {
    sendAllFundsTo(msg.sender);
  }

  function claimAllFundsWithRevertIfInsufficientFunds() public payable {
    sendAllFundsToWithRevertIfInsufficientFunds(msg.sender);
  }

  //claim eth on behalf of an address
  function sendEthTo(address to) public override onlyNonZeroAddress(to) {
    uint256 amount = _min(ethAvailable[to], address(this).balance);
    _transferEth(to, amount);
  }

  function sendEthToWithRevertIfInsufficientFunds(address to) public {
    _transferEth(to, ethAvailable[to]);
  }

  //claim token on behalf of an address
  function sendTokenTo(address to, address token)
    public
    override
    onlyNonZeroAddress(to)
    onlyNonZeroAddress(token)
  {
    uint256 amount = _min(tokenAvailable[to][token], IERC20(token).balanceOf(address(this)));
    _transferToken(to, token, amount);
  }

  function sendTokenToWithRevertIfInsufficientFunds(address to, address token) public {
    _transferToken(to, token, tokenAvailable[to][token]);
  }

  //claim all funds on behalf of an address
  function sendAllFundsTo(address to) public override onlyNonZeroAddress(to) {
    sendEthTo(to);
    for (uint256 i = 0; i < tokens.length; ++i) {
      if (tokenAvailable[to][tokens[i]] > 0) {
        uint256 curTokenBalance = IERC20(tokens[i]).balanceOf(address(this));
        _transferToken(to, tokens[i], _min(tokenAvailable[to][tokens[i]], curTokenBalance));
      }
    }
  }

  function sendAllFundsToWithRevertIfInsufficientFunds(address to) public {
    sendEthToWithRevertIfInsufficientFunds(to);
    for (uint256 i = 0; i < tokens.length; ++i) {
      if (tokenAvailable[to][tokens[i]] > 0) {
        _transferToken(to, tokens[i], tokenAvailable[to][tokens[i]]);
      }
    }
  }

  //transfer eth to an address
  function _transferEth(address to, uint256 amount) internal {
    require(amount <= address(this).balance, "Not enough balance");
    require(amount <= ethAvailable[to], "Not enough allowed eth");
    ethAvailable[to] -= amount;
    payable(to).transfer(amount);
    if (ethAvailable[to] > 0) emit ClaimedEthPartial(to, amount);
    else emit EthIsClaimed(to, amount);
  }

  //transfer token to an address
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
