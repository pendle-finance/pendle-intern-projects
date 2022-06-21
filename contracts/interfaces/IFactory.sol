pragma solidity ^0.8.0;

interface IFactory {
  event PoolCreated(address indexed token0, address indexed token1, address pair, uint256);

  function getPool(address tokenA, address tokenB) external view returns (address pool);

  function allPoolLength() external view returns (uint256);

  function createPool(address tokenA, address tokenB) external returns (address pool);

  function INIT_CODE_HASH() external view returns (bytes32 initHash);

  function getParams() external view returns (address token0, address token1);
}
