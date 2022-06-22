// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "../libraries/AMMLibrary.sol";

import "./Pool.sol";

contract Factory is IFactory {
  address public immutable WETH = 0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB;
  struct Params {
    address token0;
    address token1;
    bool isEth;
  }
  address[] public pools;
  mapping(address => mapping(address => address)) public override getPool;
  Params public params;

  // event PoolCreated(address indexed token0, address indexed token1, address pair, uint256);

  constructor() {
    // require(_WETH != address(0), "Invalid address");
  }

  function getParams()
    public
    view
    override
    returns (
      address token0,
      address token1,
      bool isEth
    )
  {
    token0 = params.token0;
    token1 = params.token1;
    isEth = params.isEth;
  }

  function allPoolLength() external view override returns (uint256) {
    return pools.length;
  }

  function createPool(address tokenA, address tokenB) external override returns (address pool) {
    require(tokenA != tokenB, "Identical addresses");
    (address token0, address token1) = AMMLibrary.sortTokens(tokenA, tokenB);
    require(token0 != address(0), "Zero address");
    require(getPool[token0][token1] == address(0), "Pool exists");
    bytes32 salt = keccak256(abi.encodePacked(token0, token1));
    bool isETH = token0 == WETH || token1 == WETH ? true : false;
    if (isETH && token0 != WETH) {
      token1 = token0;
      token0 = WETH;
    }
    params = Params({token0: token0, token1: token1, isEth: isETH});
    pool = address(new Pool{salt: salt}());
    delete params;
    getPool[token0][token1] = pool;
    getPool[token1][token0] = pool;
    pools.push(pool);
    emit PoolCreated(token0, token1, pool, pools.length);
    return pool;
  }

  function INIT_CODE_HASH() external view override returns (bytes32 initHash) {}
}
