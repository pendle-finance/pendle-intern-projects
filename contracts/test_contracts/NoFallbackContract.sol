pragma solidity ^0.8.0;

import "../TokenDistributor.sol";

contract NoFallbackContract {
  function claimEther(address tokenDistributor, uint256 amount) external {
    TokenDistributor(tokenDistributor).claimNativeToken(amount);
  }
}