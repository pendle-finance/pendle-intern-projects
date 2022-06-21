// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAMMPair {

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint reserves0, uint reserves1);

    // function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (IERC20);
    function token1() external view returns (IERC20);
    function getReserves() external view returns (uint, uint);

    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    // function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    // function skim(address to) external;
    // function sync() external;

    function initialize(IERC20, IERC20) external;
}