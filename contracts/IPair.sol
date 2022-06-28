// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20Metadata.sol";

interface IPair is IERC20Metadata {
  event ProvideLiquidity(address indexed sender, uint256 amount0, uint256 amount1);
  event RemoveLiquidity(address indexed sender, uint256 amount0, uint256 amount1);
  event Swap(
    address indexed sender,
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out
  );

  event Sync(uint112 reserve0, uint112 reserve1);

  function MINIMUM_LIQUIDITY() external pure returns (uint256);

  function factory() external view returns (address);

  function token0() external view returns (address);

  function token1() external view returns (address);

  function getReserves()
    external
    view
    returns (
      uint112 reserve0,
      uint112 reserve1,
      uint32 blockTimestampLast
    );

  function kLast() external view returns (uint256);

  function provideLiquidity(uint256 amount0In, uint256 amount1In) external;

  function removeLiquidity(uint256 amount0Out, uint256 amount1Out) external;

  function swap(
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out
  ) external;

  function sync() external;
}
