// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20Metadata.sol";

interface IPair is IERC20Metadata {
    event ProvideLiquidity(address indexed sender, uint amount0, uint amount1);
    event RemoveLiquidity(address indexed sender, uint amount0, uint amount1);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out
    );

    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function kLast() external view returns (uint);

    function provideLiquidity(uint amount0In, uint amount1In) external;
    function removeLiquidity(uint amount0Out, uint amount1Out) external;
    function swap(uint amount0In, uint amount1In, uint amount0Out, uint amount1Out) external;
    function sync() external;
}