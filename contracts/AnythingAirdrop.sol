// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IAnythingAirdrop.sol";
import "./libraries/TransferHelper.sol";
import "./BoringOwnable.sol";

contract AnythingAirdrop is BoringOwnable, IAnythingAirdrop {
  //Please refer to IAnythingAirdrop for events emitted

  //mapping of recepientAddress => tokenAddress => claimAmount
  mapping(address => mapping(address => uint256)) private erc20Distribution;
  mapping(address => uint256) private ethDistribution;

  constructor() {}

  function airdrop(
    address to,
    address tokenAddress,
    uint256 amount
  ) public onlyOwner {
    _airdrop(to, tokenAddress, amount);
  }

  //Recommended to use WETH instead of ETH
  function airdropETH(address to, uint256 amount) external payable onlyOwner {
    require(msg.value == amount, "AnythingAirdrop: ETH given is not equal to allocation");
    _airdropETH(to, amount);
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
    for (uint256 i = 0; i < toLength; i++) {
      _airdrop(toAddresses[i], tokenAddress, dropAmount[i]);
    }
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
      _airdrop(toAddress, tokenAddresses[i], dropAmount[i]);
    }
  }

  function claim(
    address to,
    address tokenAddress,
    uint256 amount
  ) external {
    require(to != address(0), "AnythingAirdrop: claim to 0 address");
    uint256 allocatedAmount;
    if (tokenAddress == address(0)) allocatedAmount = this.getETHDistribution(to);
    else allocatedAmount = this.getERC20Distribution(to, tokenAddress);
    require(allocatedAmount >= amount, "AnythingAirdrop: claiming more than allocation");
    _claim(to, tokenAddress, amount);
    emit Claim(tokenAddress, to, to, amount);
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
    uint256 allocatedAmount;
    address tokenAddress;
    uint256 claimAmount;
    for (uint256 i = 0; i < tokenAddrLength; i++) {
      tokenAddress = tokenAddresses[i];
      claimAmount = amount[i];
      if (tokenAddress == address(0)) allocatedAmount = this.getETHDistribution(to);
      else allocatedAmount = this.getERC20Distribution(to, tokenAddress);
      require(allocatedAmount >= claimAmount, "AnythingAirdrop: claiming more than allocation");
      _claim(to, tokenAddress, claimAmount);
      emit Claim(tokenAddress, to, to, claimAmount);
    }
  }

  function takeback(
    address from,
    address tokenAddress,
    uint256 amount
  ) external onlyOwner {
    uint256 allocatedAmount;
    if (tokenAddress == address(0)) allocatedAmount = this.getETHDistribution(from);
    else allocatedAmount = this.getERC20Distribution(from, tokenAddress);
    require(allocatedAmount >= amount, "AnythingAirdrop: takeback more than allocation");
    _claim(msg.sender, tokenAddress, amount);
    emit Claim(tokenAddress, from, msg.sender, amount);
  }

  function shiftAround() external onlyOwner {}

  function _airdrop(
    address to,
    address tokenAddress,
    uint256 amount
  ) internal {
    //Should we trust that the TransferFrom function of the token smart contract will handle 0 address or do we have to enforce this?
    require(to != address(0), "AnythingAirdrop: airdrop to 0 address");
    //Is this necessary since we have transferhelper's safeTransferFrom, so it'll just revert if the address is invalid?
    //(I believe there's no token smart contracts that is a 0 address?)
    require(tokenAddress != address(0), "AnythingAirdrop: tokenAddress is 0 address");
    erc20Distribution[to][tokenAddress] += amount;
    TransferHelper.safeTransferFrom(tokenAddress, msg.sender, to, amount);
    emit Airdrop(tokenAddress, to, amount);
  }

  function _airdropETH(address to, uint256 amount) internal {
    require(to != address(0), "AnythingAirdrop: airdrop to 0 address");
    ethDistribution[to] += amount;
    emit Airdrop(address(0), to, amount);
  }

  function _claim(
    address to,
    address tokenAddress,
    uint256 amount
  ) internal {
    require(to != address(0), "AnythingAirdrop: claim to 0 address");
    if (tokenAddress == address(0)) {
      ethDistribution[to] -= amount;
      TransferHelper.safeTransferETH(to, amount);
    } else {
      erc20Distribution[to][tokenAddress] -= amount;
      TransferHelper.safeTransfer(tokenAddress, to, amount);
    }
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

  // function airdropMultiUserETH(address[] calldata toAddresses, uint256[] calldata dropAmount)
  //   public
  //   payable
  //   onlyOwner
  // {
  //   uint256 toLength = toAddresses.length;
  //   require(
  //     dropAmount.length == toLength,
  //     "AnythingAirdrop: Invalid input parameters given (Length does not match)"
  //   );
  //   uint256 totalETH = 0;
  //   uint256 rewards;
  //   for (uint256 i = 0; i < toLength; i++) {
  //     rewards = dropAmount[i];
  //     totalETH += rewards;
  //     _airdropETH(toAddresses[i], rewards);
  //   }
  //   require(msg.value == totalETH, "AnythingAirdrop: ETH given is not equal to allocation");
  // }
}
