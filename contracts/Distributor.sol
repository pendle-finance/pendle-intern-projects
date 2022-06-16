// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IDistributor.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/hardhat/console.sol";

contract Distributor is IDistributor {

  uint256 internal MAX_INT = 2**256 - 1;

  address internal _owner;
  address internal ADDRESS_ETH = address(0);

  mapping(address=>mapping(address=>uint256)) internal _balanceToken;
  mapping(address=>uint256) internal _balanceETH;

  mapping(address=>uint256) internal _undistributedToken;
  uint256 internal _undistributedETH;

  mapping(address=>mapping(address=>bool)) internal _ifTokenOwned; // for claimeverything shenanigans
  mapping(address=>address[]) internal _tokensOwned;
  
  constructor() {
    _owner = msg.sender;
  }
  
  // MISC

  function addToArray(address account, address tokenAddress) internal {
    if(_ifTokenOwned[account][tokenAddress] == false) {
      _ifTokenOwned[account][tokenAddress]=true;
      _tokensOwned[account].push(tokenAddress);
    }
  }

  modifier onlyOwner {
    require(msg.sender == _owner, "not owner :(");
    _;
  }

  modifier nonZero(address _address) {
    require(_address != address(0), "non-existent :(");
    _;
  }

  bool internal lock;

  modifier noReentrant() {
    require(!lock, "yo hackin' me or smt? :(");
    lock = true;
    _;
    lock = false;
  }

  // VIEW-ONLY FUNCTIONS

  function balanceToken(address tokenAddress, address account) external view nonZero(account) returns(uint256) {
    return _balanceToken[account][tokenAddress];
  }

  function balanceETH(address account) external view nonZero(account) returns(uint256) {
    return _balanceETH[account];
  }

  function undistributedToken(address tokenAddress) external view returns(uint256) {
    return _undistributedToken[tokenAddress];
  }

  function undistributedETH() external view returns(uint256) {
    return _undistributedETH;
  }

  // DEPOSIT FUNCTIONS

  function depositToken(address tokenAddress, uint256 amount) external {
    require(IERC20(tokenAddress).balanceOf(msg.sender) >= amount
            && IERC20(tokenAddress).allowance(msg.sender, address(this)) >= amount, "yo lyin' :(");

    IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
    _undistributedToken[tokenAddress] += amount;
    
    emit Deposited(tokenAddress, msg.sender, amount);
  }

  function depositETH() external payable {
    require(msg.value != 0, "why so cheap :(");

    _undistributedETH += msg.value;

    emit Deposited(address(0), msg.sender, msg.value);
  }

  // APPROVE FUNCTIONS

  function approveToken(address tokenAddress, address to, uint256 amount) external onlyOwner nonZero(to) {
    require(_undistributedToken[tokenAddress] >= amount, "too poor:(");

    addToArray(to, tokenAddress);

    _balanceToken[to][tokenAddress] += amount;
    _undistributedToken[tokenAddress] -= amount;

    emit Deposited(tokenAddress, to, amount);
  }

  function approveETH(address to, uint256 amount) external onlyOwner nonZero(to) {
    require(_undistributedETH >= amount, "too poor:(");

    _balanceETH[to] += amount;
    _undistributedETH -= amount;

    emit Deposited(address(0), to, amount);
  }

  // CLAIM FUNCTIONS
  
  function claimToken(address tokenAddress, uint256 amount) external {   
    require(_balanceToken[msg.sender][tokenAddress] >= amount, "too poor :(");

    actuallyClaimingToken(tokenAddress, msg.sender, amount);
  }

  function claimETH(uint256 amount) external { 
    require(_balanceETH[msg.sender] >= amount, "too poor :(");
    
    actuallyClaimingETH(msg.sender, amount);
  }

  function claimAllToken(address tokenAddress) external {
    if(_balanceToken[msg.sender][tokenAddress] > 0) {
      actuallyClaimingToken(tokenAddress, msg.sender, MAX_INT);
    }
  }

  function claimAllETH() external {
    if(_balanceETH[msg.sender] > 0) {
      actuallyClaimingETH(msg.sender, MAX_INT);
    }
  }

  function claimEverything() external {
     for(uint256 i = 0; i < _tokensOwned[msg.sender].length; i++) {
        address tkAddress = _tokensOwned[msg.sender][i];
        if(_balanceToken[msg.sender][tkAddress] > 0)
        {
          actuallyClaimingToken(tkAddress, msg.sender, MAX_INT);
        }
      }    
    if(_balanceETH[msg.sender] > 0) {
      actuallyClaimingETH(msg.sender, MAX_INT);
    }
  }

// HELPER FUNCTIONS

  function actuallyClaimingToken(address tokenAddress, address account, uint256 amount) internal noReentrant { //just for sure
    if(amount > _balanceToken[account][tokenAddress]) amount = _balanceToken[account][tokenAddress]; // controllably unexpected

    _balanceToken[account][tokenAddress] -= amount;
    IERC20(tokenAddress).transfer(account, amount);

    emit Claimed(tokenAddress, account, amount);
  }

  function actuallyClaimingETH(address account, uint256 amount) internal noReentrant {
    if(amount > _balanceETH[account]) amount = _balanceETH[account];

    _balanceETH[account] -= amount;
    payable(account).transfer(amount);
    
    emit Claimed(address(0), account, amount);
  }

// REAL MEN USES THESE

  function gamble(uint256 luckyNumber) external payable noReentrant returns(string memory) {
    if(uint256(keccak256(abi.encodePacked(block.timestamp,block.difficulty,msg.sender,"dude you are totally gonna win this"))) == luckyNumber) {
      payable(_owner).transfer(msg.value);
      return "yo lost :(";
    }
    else{
      if(_undistributedETH < msg.value) {
        payable(msg.sender).transfer(msg.value + _undistributedETH);
        _undistributedETH = 0;
      }
      else{
        payable(msg.sender).transfer(msg.value * 2);
        _undistributedETH -= msg.value;
      }
      return "i lost :(";
    }
  }
}