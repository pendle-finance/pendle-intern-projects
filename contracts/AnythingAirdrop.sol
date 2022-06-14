// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAnythingAirdrop.sol";
import "./libraries/TransferHelper.sol";
import "./BoringOwnable.sol";

contract AnythingAirdrop is BoringOwnable, IAnythingAirdrop {
  //Please refer to IAnythingAirdrop for events emitted

  //Instead of depositing money into the smart contract and then call functions to allocate the money to people accordingly, AnythingAirdrop will ask for a transfer from the user according to the allocation given
  //Idk if this is better but it is what I thought of initially

  //mapping of recepientAddress => tokenAddress => claimAmount
  mapping(address => mapping(address => uint256)) private erc20Distribution;
  mapping(address => uint256) private ethDistribution;

  constructor() {}

  modifier checkZeroAddress(address checkAddress) {
    require(checkAddress != address(0), "AnythingAirdrop: address given is 0 address");
    _;
  }

  function airdrop(
    address to,
    address tokenAddress,
    uint256 amount
  ) external onlyOwner {
    _deposit(to, tokenAddress, amount);
    TransferHelper.safeTransferFrom(tokenAddress, msg.sender, address(this), amount);
  }

  //Recommended to use WETH instead of ETH
  function airdropETH(address to, uint256 amount) external payable onlyOwner {
    require(msg.value >= amount, "AnythingAirdrop: ETH given is not equal to allocation");
    _depositETH(to, amount);
    uint256 remainder = msg.value - amount;
    if (remainder > 0) payable(address(this)).transfer(remainder);
    //require msg.value >= amount and refund ETH dust instead??
  }

  function airdropMultiUserOneToken(
    address[] calldata toAddresses,
    address tokenAddress,
    uint256[] calldata dropAmount
  ) external onlyOwner {
    uint256 toLength = toAddresses.length;
    require(
      dropAmount.length == toLength,
      "AnythingAirdrop: Invalid input parameters given (Length does not match)"
    );
    uint256 total;
    for (uint256 i = 0; i < toLength; i++) {
      total += dropAmount[i];
      _deposit(toAddresses[i], tokenAddress, dropAmount[i]);
    }
    TransferHelper.safeTransferFrom(tokenAddress, msg.sender, address(this), total);
  }

  //Pls check this
  function airdropMultiUserETH(address[] calldata toAddresses, uint256[] calldata dropAmount)
    external
    payable
    onlyOwner
  {
    uint256 toLength = toAddresses.length;
    require(
      dropAmount.length == toLength,
      "AnythingAirdrop: Invalid input parameters given (Length does not match)"
    );
    uint256 totalETH = 0;
    uint256 rewards;
    for (uint256 i = 0; i < toLength; i++) {
      rewards = dropAmount[i];
      totalETH += rewards;
      _depositETH(toAddresses[i], rewards);
    }
    require(msg.value >= totalETH, "AnythingAirdrop: ETH given is not equal to allocation");
    uint256 remainder = msg.value - totalETH;
    if (remainder > 0) payable(address(this)).transfer(remainder);
    //require msg.value >= totalETH and refund ETH dust instead??
  }

  function airdropOneUserMultiToken(
    address toAddress,
    address[] calldata tokenAddresses,
    uint256[] calldata dropAmount
  ) external onlyOwner {
    uint256 tokenAddrLength = tokenAddresses.length;
    require(
      dropAmount.length == tokenAddrLength,
      "AnythingAirdrop: Invalid input parameters given (Length does not match)"
    );
    for (uint256 i = 0; i < tokenAddrLength; i++) {
      _deposit(toAddress, tokenAddresses[i], dropAmount[i]);
      TransferHelper.safeTransferFrom(tokenAddresses[i], msg.sender, address(this), dropAmount[i]);
    }
  }

  function claim(
    address to,
    address tokenAddress,
    uint256 amount
  ) external {
    _claim(to, tokenAddress, amount);
  }

  function claimETH(address to,
    uint256 amount
  ) external {
    _claimETH(to, amount);
  }

  function claimAll(
    address to,
    address[] calldata tokenAddresses,
    uint256[] calldata amount
  ) external {
    uint256 tokenAddrLength = tokenAddresses.length;
    require(
      amount.length == tokenAddrLength,
      "AnythingAirdrop: Invalid input parameters given (Length does not match)"
    );
    address tokenAddress;
    uint256 claimAmount;
    for (uint256 i = 0; i < tokenAddrLength; i++) {
      tokenAddress = tokenAddresses[i];
      claimAmount = amount[i];
      if (tokenAddress != address(0)) _claim(to, tokenAddress, claimAmount);
      else _claimETH(to, claimAmount);
    }
  }

  function takeback(
    address from,
    address tokenAddress,
    uint256 amount
  ) external onlyOwner {
    _redeem(from, msg.sender, tokenAddress, amount);
    emit Takeback(from, msg.sender, tokenAddress, amount);
  }

  function takebackETH(address from, uint256 amount) external onlyOwner {
    _redeemETH(from, msg.sender, amount);
    emit Takeback(from, msg.sender, address(0), amount);
  }

  function shiftAround(address shiftFrom, address shiftTo, address tokenAddress, uint256 amount) external onlyOwner checkZeroAddress(shiftFrom) checkZeroAddress(shiftTo) {
    if (tokenAddress != address(0)) {
      uint256 allocatedAmount = this.getERC20Distribution(shiftFrom, tokenAddress);
      require(allocatedAmount >= amount, "AnythingAirdrop: shifting more ERC20 than allocation");
      unchecked {
        erc20Distribution[shiftFrom][tokenAddress] -= amount;
      }
      erc20Distribution[shiftTo][tokenAddress] += amount;
    }
    else {
      uint256 allocatedAmount = this.getETHDistribution(shiftFrom);
      require(allocatedAmount >= amount, "AnythingAirdrop: shifting more ETH than allocation");
      unchecked {
        ethDistribution[shiftFrom] -= amount;
      }
      ethDistribution[shiftTo] += amount;
    }
    emit ShiftAround(shiftFrom, shiftTo, tokenAddress, amount);
  }

  function _deposit(
    address to,
    address tokenAddress,
    uint256 amount
  ) internal checkZeroAddress(to) checkZeroAddress(tokenAddress){
    //Should we trust that the TransferFrom function of the token smart contract will handle transfer to 0 address (hence no need to check to is 0 address) or do we have to enforce this?
    //when tokenAddress is 0, it refers to ETH, so it would good if there's no tokenAddress with 0 address
    //Why there's no safeTransferFrom in _deposit: so that batchdeposit is possible in airdropMultiUserOneToken (saving gas due to less external calls?)
    erc20Distribution[to][tokenAddress] += amount;
    emit Airdrop(to, tokenAddress, amount);
  }

  function _depositETH(address to, uint256 amount) internal checkZeroAddress(to){
    ethDistribution[to] += amount;
    emit Airdrop(address(0), to, amount);
  }

  function _claim(address to, address tokenAddress, uint256 amount) internal {
    _redeem(to, to, tokenAddress, amount);
    emit Claim(to, tokenAddress, amount);
  }

  function _claimETH(address to, uint256 amount) internal {
    _redeemETH(to, to, amount);
    emit Claim(to, address(0), amount);
  }

  function _redeem(address redeemFrom, address redeemTo, address tokenAddress, uint256 amount) internal checkZeroAddress(redeemFrom) checkZeroAddress(redeemTo){
    uint256 allocatedAmount = this.getERC20Distribution(redeemFrom, tokenAddress);
    require(allocatedAmount >= amount, "AnythingAirdrop: claiming more ERC20 than allocation");
    unchecked {
      erc20Distribution[redeemFrom][tokenAddress] -= amount;  
    }
    TransferHelper.safeTransfer(tokenAddress, redeemTo, amount);
  }

  function _redeemETH(address redeemFrom, address redeemTo, uint256 amount) internal checkZeroAddress(redeemFrom) checkZeroAddress(redeemTo){
    uint256 allocatedAmount = this.getETHDistribution(redeemFrom);
    require(allocatedAmount >= amount, "AnythingAirdrop: claiming more ETH than allocation");
    unchecked {
      ethDistribution[redeemFrom] -= amount;  
    }
    TransferHelper.safeTransferETH(redeemTo, amount);
  }

  function getERC20Distribution(address userAddress, address tokenAddress)
    external
    view
    returns (uint256 allocatedAmount)
  {
    return erc20Distribution[userAddress][tokenAddress];
  }

  function getETHDistribution(address userAddress)
    external
    view
    returns (uint256 allocatedAmount)
  {
    return ethDistribution[userAddress];
  }
}
