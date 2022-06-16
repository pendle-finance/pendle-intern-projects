// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";
import "./IDistributor.sol";
import "../node_modules/hardhat/console.sol";

contract Distributor is IDistributor {

  address internal _owner;
  address internal ADDRESS_ETH = address(0);

  mapping(address=>mapping(address=>uint256)) internal _balanceToken;
  mapping(address=>uint256) internal _balanceETH;

  mapping(address=>uint256) internal _undistributedToken;
  uint256 internal _undistributedETH;

  mapping(address=>mapping(address=>bool)) internal _ifTokenOwned;
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

  function balanceToken(address tokenAddress, address account) external view returns(uint256) {
    if(account == address(0)) {
      account = msg.sender;
    }
    return _balanceToken[account][tokenAddress];
  }

  function balanceETH(address account) external view returns(uint256) {
    if(account == address(0)) {
      account = msg.sender;
    }
    return _balanceETH[account];
  }

  function undistributedToken(address tokenAddress) external view returns(uint256) {
    return _undistributedToken[tokenAddress];
  }

  function undistributedETH() external view returns(uint256) {
    return _undistributedETH;
  }

  // DEPOSIT FUNCTIONS

  function depositToken(address tokenAddress, uint256 amount) external returns(bool) {
    require(IERC20(tokenAddress).balanceOf(msg.sender) >= amount
            && IERC20(tokenAddress).allowance(msg.sender, address(this)) >= amount, "yo lyin' :(");

    IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
    _undistributedToken[tokenAddress] += amount;
    
    emit Deposited(tokenAddress, msg.sender, amount);
    return true;
  }

  function depositETH() external payable returns(bool) {
    require(msg.value != 0, "why so cheap :(");

    _undistributedETH += msg.value;

    emit Deposited(address(0), msg.sender, msg.value);
    return true;
  }

  // APPROVE FUNCTIONS

  function approveToken(address tokenAddress, address to, uint256 amount) public onlyOwner nonZero(to) returns(bool){
    require(_undistributedToken[tokenAddress] >= amount, "too poor:(");

    _balanceToken[to][tokenAddress] += amount;
    addToArray(to, tokenAddress);
    _undistributedToken[tokenAddress] -= amount;

    emit Deposited(tokenAddress, to, amount);
    return true;
  }

  function approveETH(address to, uint256 amount) public onlyOwner nonZero(to) returns(bool) {
    require(_undistributedETH >= amount, "too poor:(");

    _balanceETH[to] += amount;
    _undistributedETH -= amount;

    emit Deposited(address(0), to, amount);
    return true;
  }

  // CLAIM FUNCTIONS
  
  function claimToken(address tokenAddress, uint256 amount) external returns(bool) {        
    require(_balanceToken[msg.sender][tokenAddress] >= amount, "too poor :(");

    _balanceToken[msg.sender][tokenAddress] -= amount;
    IERC20(tokenAddress).transfer(msg.sender, amount);
    emit Claimed(tokenAddress, msg.sender, amount);

    return true;
  }

  function claimETH(uint256 amount) external returns(bool) {    
    require(_balanceETH[msg.sender] >= amount, "too poor :(");
    
    _balanceETH[msg.sender] -= amount;
    payable(msg.sender).transfer(amount);
    emit Claimed(address(0), msg.sender, amount);

    return true;
  }

  function claimAllToken(address tokenAddress) external noReentrant returns(bool) {

    if(tokenAddress == address(0)) {
      for(uint16 i = 0; i < _tokensOwned[msg.sender].length; i++) {
        address tkAddress = _tokensOwned[msg.sender][i];
        if(_balanceToken[msg.sender][tkAddress] > 0) {
          IERC20(tkAddress).transfer(msg.sender, _balanceToken[msg.sender][tkAddress]);
          emit Claimed(tkAddress, msg.sender, _balanceToken[msg.sender][tkAddress]);
          _balanceToken[msg.sender][tkAddress] = 0;
        }
      }
    }
    else if(_balanceToken[msg.sender][tokenAddress] > 0){
      IERC20(tokenAddress).transfer(msg.sender, _balanceToken[msg.sender][tokenAddress]);
      emit Claimed(tokenAddress, msg.sender, _balanceToken[msg.sender][tokenAddress]);
    }

    return true;
  }

  function claimAllETH() external noReentrant returns(bool) {

    if(_balanceETH[msg.sender] > 0){
      payable(msg.sender).transfer(_balanceETH[msg.sender]);
      emit Claimed(address(0), msg.sender, _balanceETH[msg.sender]);
      _balanceETH[msg.sender] = 0;
    }
  
    return true;
  }

// "DONATE" FUNCTION

  function gamble(uint256 luckyNumber) external payable noReentrant returns(string memory){
    if(uint256(keccak256(abi.encodePacked(block.timestamp,block.difficulty,msg.sender,"dude you are totally gonna win this")) == luckyNumber)){
      payable(_owner).transfer(msg.value);
      return "yo lost :(";
    }
    else{
      if(_undistributedETH < msg.value){
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