pragma solidity ^0.8.0;

import "../TokenDistributor.sol";

contract FallbackRevertContract {
  function claimEther(address tokenDistributor, uint256 amount) external {
    TokenDistributor(tokenDistributor).claimNativeToken(amount);
  }

  fallback() external payable {
    revert("");
  }
}