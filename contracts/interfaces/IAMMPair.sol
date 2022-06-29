// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAMMPair {
  event Mint(address indexed sender, uint256 amount0, uint256 amount1);
  event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
  event Swap(
    address indexed sender,
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out,
    address indexed to
  );
  event Sync(uint256 reserves0, uint256 reserves1);

  // function MINIMUM_LIQUIDITY() external pure returns (uint);
  function factory() external view returns (address);

  function token0() external view returns (IERC20);

  function token1() external view returns (IERC20);

  function getReserves() external view returns (uint256, uint256);

  function addLiquidity(
    uint256 desiredAmtA,
    uint256 desiredAmtB,
    uint256 minAmtA,
    uint256 minAmtB
  )
    external
    returns (
      uint256 amountA,
      uint256 amountB,
      uint256 lpLiquidity
    );

  function removeLiquidity(
    uint256 lpLiquidity,
    uint256 minAmtA,
    uint256 minAmtB
  ) external returns (uint256 amountA, uint256 amountB);

  // function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
  // function skim(address to) external;
  // function sync() external;

  function initialize(IERC20, IERC20) external;
}
