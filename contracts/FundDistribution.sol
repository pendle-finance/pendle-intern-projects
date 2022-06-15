// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IFundDistribution.sol";
import "./helpers/BoringOwnable.sol";

contract FundDistribution is BoringOwnable {
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

  event EthApproveIsSet(address to, uint256 amount);
  event TokenApproveIsSet(address to, address token, uint256 amount);
  event NewTokenAdded(address sender, address token, uint256 balance);
  event TokenIsAdded(address sender, address token, uint256 amount);
  event EthIsAdded(address sender, uint256 amount);
  event FundIsClaimed(address to);
  event EthIsClaimed(address to, uint256 amount);
  event TokenIsClaimed(address to, address token, uint256 amount);
  event AllTokensAreClaimed(address to);
  event ClaimedPartial(address to, address token, uint256 amount);
  event ClaimedEthPartial(address to, uint256 amount);

  constructor(address _owner) public {
    owner = _owner;
  }

  modifier onlyNonZeroAmount(uint256 amount) {
    require(amount > 0, "Invalid amount");
    _;
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

  receive() external payable onlyFunders onlyNonZeroAmount(msg.value) {
    emit EthIsAdded(msg.sender, msg.value);
  }

  //don't emit an event as receive() already emitted it
  function depositEth() public payable onlyFunders onlyNonZeroAmount(msg.value) {}

  function depositEthAndApprove(address to) public payable {
    depositEth();
    setEthApprove(to, msg.value);
  }

  //transfer token to this contract first and then call this function
  function addTokenAfterTransfer(address token) public onlyFunders onlyNonZeroAddress(token) {
    require(!curTokens[token], "Token already added");
    curTokens[token] = true;
    tokens.push(token);
    uint256 amount = IERC20(token).balanceOf(address(this));
    require(amount > 0, "Token has no balance");
    emit TokenIsAdded(msg.sender, token, amount);
  }

  // approve allowance first then call receiveToken to transfer token
  function depositToken(address token, uint256 amount)
    public
    onlyFunders
    onlyNonZeroAddress(token)
    onlyNonZeroAmount(amount)
  {
    if (!curTokens[token]) {
      tokens.push(token);
      curTokens[token] = true;
    }
    IERC20 tokenContract = IERC20(token);
    tokenContract.transferFrom(msg.sender, address(this), amount);
    emit TokenIsAdded(msg.sender, token, amount);
  }

  function depositTokenAndApprove(
    address token,
    address to,
    uint256 amount
  ) external {
    depositToken(token, amount);
    setTokenApprove(to, token, amount);
  }

  //set the amount claimable to an address
  function setEthApprove(address to, uint256 amount)
    public
    onlyDistributors
    onlyNonZeroAddress(to)
  {
    ethAvailable[to] = amount;
    emit EthApproveIsSet(to, amount);
  }

  function setEthApproveMultiple(address[] calldata tos, uint256[] calldata amounts) external {
    require(tos.length == amounts.length, "Invalid array lengths");
    for (uint256 i = 0; i < tos.length; i++) {
      setEthApprove(tos[i], amounts[i]);
    }
  }

  //set the token amount claimable to an address
  function setTokenApprove(
    address to,
    address token,
    uint256 amount
  ) public onlyDistributors onlyNonZeroAddress(to) {
    require(curTokens[token], "Token is not added");
    tokenAvailable[to][token] = amount;
    emit TokenApproveIsSet(to, token, amount);
  }

  function setTokenApproveMultiple(
    address[] calldata tos,
    address tokensApprove,
    uint256[] calldata amounts
  ) external {
    require(tos.length == amounts.length, "Invalid array lengths");
    for (uint256 i = 0; i < tos.length; i++) {
      setTokenApprove(tos[i], tokensApprove, amounts[i]);
    }
  }

  //the sender claim his ether, not revert if insufficient ether
  function claimEth() public {
    sendEthTo(msg.sender);
  }

  function claimEthWithRevertIfInsufficientFunds() public payable {
    sendEthToWithRevertIfInsufficientFunds(msg.sender);
  }

  //the sender claim his token, not revert if insufficient funds
  function claimToken(address token) external {
    sendTokenTo(msg.sender, token);
  }

  function claimTokenWithRevertIfInsufficientFunds(address token) public payable {
    sendTokenToWithRevertIfInsufficientFunds(msg.sender, token);
  }

  //the sender claim all his funds, not revert if insufficient funds
  function claimAllFunds() external {
    sendAllFundsTo(msg.sender);
  }

  function claimAllFundsWithRevertIfInsufficientFunds() public payable {
    sendAllFundsToWithRevertIfInsufficientFunds(msg.sender);
  }

  //claim eth on behalf of an address, not revert if insufficient funds
  function sendEthTo(address to) public onlyNonZeroAddress(to) {
    uint256 amount = _min(ethAvailable[to], address(this).balance);
    _transferEth(to, amount);
  }

  function sendEthToWithRevertIfInsufficientFunds(address to) public {
    _transferEth(to, ethAvailable[to]);
  }

  //claim token on behalf of an address, not revert if insufficient funds
  function sendTokenTo(address to, address token)
    public
    onlyNonZeroAddress(to)
    onlyNonZeroAddress(token)
  {
    uint256 amount = _min(tokenAvailable[to][token], IERC20(token).balanceOf(address(this)));
    _transferToken(to, token, amount);
  }

  function sendTokenToWithRevertIfInsufficientFunds(address to, address token) public {
    _transferToken(to, token, tokenAvailable[to][token]);
  }

  //claim all funds on behalf of an address, not revert if insufficient funds
  function sendAllFundsTo(address to) public onlyNonZeroAddress(to) {
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
    require(amount <= ethAvailable[to], "Not enough allowed eth");
    ethAvailable[to] -= amount;
    //auto revert if not enough balance
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
    require(amount <= tokenAvailable[to][token], "Not enough allowed tokens");
    tokenAvailable[to][token] -= amount;
    //auto revert if not enough balance
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
