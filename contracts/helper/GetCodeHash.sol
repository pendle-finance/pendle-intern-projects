pragma solidity ^0.8.0;
import "../core/Pool.sol";

contract GetCodeHash {
  function getInitHash() public pure returns (bytes32) {
    bytes memory bytecode = type(Pool).creationCode;
    return keccak256(abi.encodePacked(bytecode));
  }
}
