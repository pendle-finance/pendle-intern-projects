pragma solidity ^0.8.0;

import "./IPoolERC20.sol";

interface IPool is IPoolERC20 {
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

  //consider to implement this function in the future
  //   function price0CumulativeLast() external view returns (uint256);

  //   function price1CumulativeLast() external view returns (uint256);

  //   function kLast() external view returns (uint256);

  function mint(address to) external returns (uint256 liquidity);

  function burn(address to) external returns (uint256 amount0, uint256 amount1);

  function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to,
    bytes calldata data
  ) external;

  function initialize(address, address) external;

  function addLiquidity(
    uint256 amount0,
    uint256 amount1,
    address to,
    uint256 deadline
  )
    external
    returns (
      uint256 amount0In,
      uint256 amount1In,
      uint256 liquidity
    );

  function removeLiquidity(
    uint256 liquidity,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
  ) external returns (uint256 amountA, uint256 amountB);

  function swapExactIn(
    uint256 amountAIn,
    uint256 amountBIn,
    uint256 amountAOut,
    uint256 amountBOut,
    address to
  ) external returns (uint256 amountA, uint256 amountB);

  function swapExactOut(
    address token,
    uint256 amountOut,
    address to
  ) external returns (uint256 amountA, uint256 amountB);

  //May add support function for ETH
}
