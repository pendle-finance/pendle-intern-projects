// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IERC20.sol";
import "./interfaces/IFundDistribution.sol";
import "./helpers/BoringOwnable.sol";

contract FundDistribution is IFundDistribution, BoringOwnable {
  mapping(address => uint256) public ethAvailable;

  mapping(address => bool) public curTokens;
  mapping(address => mapping(address => uint256)) public tokenAvailable;
  address[] public tokens;

  constructor(address _owner) public {
    owner = _owner;
  }

  modifier OnlyNonZeroAddress(address to) {
    require(to != address(0), "Invalid address");
    _;
  }

  receive() external payable {}

  function addToken(address token)
    external
    override
    onlyOwner
    OnlyNonZeroAddress(token)
    returns (bool)
  {
    require(!curTokens[token], "Token already added");
    tokens.push(token);
    curTokens[token] = true;
    require(IERC20(token).balanceOf(address(this)) > 0, "Amount is zero");
    emit TokenIsAdded(token);
    return true;
  }

  function receiveToken(address token, uint256 amount)
    external
    override
    OnlyNonZeroAddress(token)
    returns (bool)
  {
    if (!curTokens[token]) {
      tokens.push(token);
      curTokens[token] = true;
    }
    IERC20 tokenContract = IERC20(token);
    bool res = tokenContract.transferFrom(msg.sender, address(this), amount);
    emit TokenIsAdded(token);
    return res;
  }

  function setEthAllowance(address to, uint256 amount)
    external
    override
    onlyOwner
    OnlyNonZeroAddress(to)
    returns (bool)
  {
    ethAvailable[to] = amount;
    emit EthAllowanceIsSet(to, amount);
    return true;
  }

  function setTokenAllowance(
    address to,
    address token,
    uint256 amount
  ) external override onlyOwner OnlyNonZeroAddress(to) returns (bool) {
    require(curTokens[token], "Token is not added");
    tokenAvailable[to][token] = amount;
    emit TokenAllowanceIsSet(to, token, amount);
    return true;
  }

  function claimEth() external payable override returns (bool) {
    require(ethAvailable[msg.sender] > 0, "Allowance is zero");
    require(address(this).balance > 0, "Balance is zero");
    ethAvailable[msg.sender] = 0;
    uint256 amount = _min(address(this).balance, ethAvailable[msg.sender]);
    ethAvailable[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
    emit EthIsClaimed(msg.sender, amount);
    return true;
  }

  function claimToken(address token) external override returns (bool) {
    require(tokenAvailable[msg.sender][token] > 0, "Allowance is zero");
    require(IERC20(token).balanceOf(address(this)) > 0, "Balance is zero");
    return _transferToken(msg.sender, token);
  }

  function claimAllTokens() external override returns (bool) {
    return _transferAllTokens(msg.sender);
  }

  function sendEthTo(address to) external payable override OnlyNonZeroAddress(to) returns (bool) {
    require(ethAvailable[to] > 0, "Allowance is zero");
    require(address(this).balance > 0, "Balance is zero");
    uint256 amount = _min(address(this).balance, ethAvailable[to]);
    ethAvailable[to] -= amount;
    payable(to).transfer(amount);
    emit EthIsClaimed(to, amount);
    return true;
  }

  function sendTokenTo(address to, address token)
    external
    override
    OnlyNonZeroAddress(to)
    OnlyNonZeroAddress(token)
    returns (bool)
  {
    require(tokenAvailable[to][token] > 0, "Allowance is zero");
    require(IERC20(token).balanceOf(address(this)) > 0, "Balance is zero");
    return _transferToken(to, token);
  }

  function sendAllTokensTo(address to) external override OnlyNonZeroAddress(to) returns (bool) {
    return _transferAllTokens(to);
  }

  function claimFund() external payable override returns (bool) {
    if (ethAvailable[msg.sender] > 0) {
      uint256 amount = _min(address(this).balance, ethAvailable[msg.sender]);
      ethAvailable[msg.sender] -= amount;
      payable(msg.sender).transfer(amount);
      emit EthIsClaimed(msg.sender, amount);
    }
    _transferAllTokens(msg.sender);
    emit FundIsClaimed(msg.sender);
    return true;
  }

  function sendFundTo(address to) external payable override OnlyNonZeroAddress(to) returns (bool) {
    if (ethAvailable[to] > 0) {
      uint256 amount = _min(address(this).balance, ethAvailable[to]);
      ethAvailable[to] -= amount;
      payable(to).transfer(amount);
      emit EthIsClaimed(to, amount);
    }
    _transferAllTokens(to);
    emit FundIsClaimed(to);
    return true;
  }

  function _transferAllTokens(address to) internal returns (bool) {
    for (uint256 i = 0; i < tokens.length; ++i) {
      if (tokenAvailable[to][tokens[i]] > 0) _transferToken(to, tokens[i]);
    }
    emit AllTokensAreClaimed(to);
    return true;
  }

  function _transferToken(address to, address token) internal returns (bool) {
    IERC20 tokenContract = IERC20(token);
    uint256 amount = _min(tokenAvailable[to][token], tokenContract.balanceOf(address(this)));
    if (amount == 0) return false;
    tokenAvailable[to][token] -= amount;
    tokenContract.transfer(to, amount);
    emit TokenIsClaimed(to, token, amount);
    return true;
  }

  function _min(uint256 a, uint256 b) internal pure returns (uint256) {
    return a >= b ? b : a;
  }

  function balance() external view returns (uint256) {
    return address(this).balance;
  }
}
