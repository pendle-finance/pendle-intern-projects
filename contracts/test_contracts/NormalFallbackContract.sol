pragma solidity ^0.8.0;

import "../TokenDistributor.sol";

contract NormalFallbackContract {
  event Received(address from, uint256 amount);

  function claimEther(address tokenDistributor, uint256 amount) external {
    TokenDistributor(tokenDistributor).claimNativeToken(amount);
  }

  fallback() external payable {
    emit Received(msg.sender, msg.value);
  }
}