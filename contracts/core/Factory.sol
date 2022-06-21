pragma solidity ^0.8.0;
import "../libraries/AMMLibrary.sol";
import "./Pool.sol";

contract Factory is IFactory {
  struct Params {
    address token0;
    address token1;
  }
  address[] public pools;
  mapping(address => mapping(address => address)) public getPool;
  Params public params;

  function allPoolLength() external view returns (uint256) {
    return pools.length;
  }

  function createPool(address tokenA, address tokenB) external returns (address pool) {
    require(tokenA != tokenB, "Identical addresses");
    (address token0, address token1) = AMMLibrary.sortTokens(tokenA, tokenB);
    require(token0 != address(0), "Zero address");
    require(getPool[token0][token1] == address(0), "Pool exists");
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    params = Params({token0: token0, token1: token1});
    pool = address(new Pool{salt: salt}());
    delete params;
    getPool[token0][token1] = pool;
    getPool[token1][token0] = pool;
    pools.push(pool);
    emit PoolCreated(token0, token1, pool, pools.length);
  }

  function INIT_CODE_HASH() external view returns (bytes32 initHash) {}
}
