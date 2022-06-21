pragma solidity ^0.8.0;

import "./PoolERC20.sol";
import "../interfaces/IPool.sol";
import "../libraries/UQ112x112.sol";
import "../libraries/AMMLibrary.sol";
import "../libraries/TransferHelper.sol";

contract Pool is PoolERC20, IPool {
  using UQ112x112 for uint224;
  uint256 public constant MINIMUM_LIQUIDITY = 10**3;
  address public factory;
  address public token0;
  address public token1;

  uint112 private reserve0;
  uint112 private reserve1;
  uint32 private blockTimestampLast;

  uint256 private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, "No reentrancy");
    unlocked = 0;
    _;
    unlocked = 1;
  }

  constructor() {
    factory = msg.sender;
    (token0, token1) = factory.params;
  }

  function _update(
    uint112 amount0In,
    uint112 amount1In,
    uint112 amount0Out,
    uint112 amount1Out
  ) internal {
    reserve0 += amount0In - amount0Out;
    reserve1 += amount1In - amount1Out;
    blockTimestampLast = block.timestamp;
  }

  function getReserves()
    public
    view
    returns (
      uint112 _reserve0,
      uint112 _reserve1,
      uint32 _blockTimestampLast
    )
  {
    _reserve0 = reserve0;
    _reserve1 = reserve1;
    _blockTimestampLast = blockTimestampLast;
  }

  function mint(
    address to,
    uint256 amount0,
    uint256 amount1
  ) private lock returns (uint256 liquidity) {
    require(to != address(0), "Invalid address");
    uint256 _totalSupply = totalSupply();
    (uint112 _reserve0, uint256 _reserve1) = getReserves();
    if (_totalSupply == 0) {
      liquidity = Math.sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
      _mint(address(0), MINIMUM_LIQUIDITY());
    } else {
      liquidity = Math.min(
        (amount0 * _totalSupply) / _reserve0,
        (amount1 * _totalSupply) / _reserve1
      );
    }
    require(liquidity > 0, "Invalid liquidity");
    _mint(to, liquidity);
    _update(amount0, amount1, 0, 0);
    emit Mint(msg.sender, amount0, amount1);
    return liquidity;
  }

  function addLiquidity(
    amount0,
    amount1,
    to,
    deadline
  )
    returns (
      uint256 amount0In,
      uint256 amount1In,
      uint256 liquidity
    )
  {
    (uint256 _reserve0, uint256 _reserve1, ) = getReserves();
    uint256 optimalAmount1 = AMMLibrary.quote(amount0, _reserve0, _reserve1);
    if (optimalAmount1 > amount1) {
      amount0In = amount0;
      amount1In = optimalAmount1;
    } else {
      uint256 optimalAmount0 = AMMLibrary.quote(amount1, _reserve1, _reserve0);
      amount0In = optimalAmount0;
      amount1In = amount1;
    }
    TransferHelper.safeTransferFrom(token0, msg.sender, address(this), amount0);
    TransferHelper.safeTransferFrom(token1, msg.sender, address(this), amount1);
    liquidity = mint(to);
  }

  function removeLiquidity(
    uint256 liquidity,
    uint256 amount0Min,
    uint256 amount1Min,
    address to,
    uint256 deadline
  ) external returns (uint256 amount0, uint256 amount1) {
    require(liquidity > 0, "Invalid liquidity");
    require(liquidity < balanceOf(msg.sender), "Invalid liquidity");
    uint256 _totalSupply = totalSupply();
    uint256 balance0 = IERC20(token0).balanceOf(address(this));
    uint256 balance1 = IERC20(token1).balanceOf(address(this));
    amount0 = (liquidity / _totalSupply) * balance0;
    amount1 = (liquidity / _totalSupply) * balance1;
    require(amount0 >= amount0Min, "Invalid liquidity");
    require(amount1 >= amount1Min, "Invalid liquidity");
    _burn(msg.sender, liquidity);
    TransferHelper.safeTransfer(token0, to, amount0);
    TransferHelper.safeTransfer(token1, to, amount1);
    _update(0, 0, amount0, amount1);
    emit Burn(msg.sender, amount0, amount1, to);
  }

  function swapExactIn(
    uint256 amountAIn,
    uint256 amountBIn,
    address to
  ) {}
}
