// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPair.sol";
import "./ERC20.sol";
import "./Math.sol";

/*
 * Contract does not protect against reentrancy because only calls to external contracts
 * are through IERC20(token{0,1}) methods, and token{0,1} are expected to be non-malicious.
 * If token{0,1} are malicious, then the pool is invalid anyway, and the damage is contained
 * to within the pool.
 */
contract Pair is IPair, ERC20 {
  uint256 public constant MINIMUM_LIQUIDITY = 1000;

  // good that you guys make these variables immutable!
  address public immutable factory;
  address public immutable token0;
  address public immutable token1;

  /// All these variable should be in the same storage space, similar to UniswapV2
  uint112 public reserve0;
  uint112 public reserve1;
  // actually we don't need blockTimestampLast because we are not implementing the accumulated price
  uint32 public blockTimestampLast;

  constructor(
    address token0_,
    address token1_,
    string memory name_,
    string memory symbol_
  ) ERC20(name_, symbol_) {
    factory = msg.sender;
    token0 = token0_;
    token1 = token1_;
  }

  function getReserves()
    public
    view
    returns (
      uint112 reserve0_,
      uint112 reserve1_,
      uint32 blockTimestampLast_
    )
  {
    reserve0_ = reserve0;
    reserve1_ = reserve1;
    blockTimestampLast_ = blockTimestampLast;
  }

  // what's the purpose of kLast here? In UniV2 the kLast is actually to help with fee minting
  function kLast() public view returns (uint256) {
    (uint256 balance0, uint256 balance1, ) = getReserves();
    return balance0 * balance1;
  }

  /// Requires user to approve transfer beforehand
  function provideLiquidity(uint256 amount0In, uint256 amount1In) public {
    address user = msg.sender;
    (uint256 balance0, uint256 balance1, ) = getReserves();

    uint256 liquidity;
    if (totalSupply == 0) {
      /// shamelessly stolen from UniswapV2 model like most things here
      liquidity = Math.sqrt(amount0In * amount1In) - MINIMUM_LIQUIDITY;
      mint(address(0), MINIMUM_LIQUIDITY);
    } else {
      liquidity = Math.min(
        (amount0In * totalSupply) / balance0,
        (amount1In * totalSupply) / balance1
      );
    }

    mint(user, liquidity);
    balance0 += amount0In;
    balance1 += amount1In;
    _updateReserve(balance0, balance1);

    IERC20(token0).transferFrom(user, address(this), amount0In);
    IERC20(token1).transferFrom(user, address(this), amount1In);
    emit ProvideLiquidity(user, amount0In, amount1In);
  }

  // this is not really how it works btw. When you remove X LP (the pool has TOTAL LP)
  // you will receive X/TOTAL * reserve0 token0, and X/TOTAL * reserve1 token1
  // => Most of the times people will remove liquidity by providing the amount of LP they want to burn
  function removeLiquidity(uint256 amount0Out, uint256 amount1Out) public {
    address user = msg.sender;
    (uint256 balance0, uint256 balance1, ) = getReserves();

    uint256 liquidity = Math.max(
      Math.ceilDiv(amount0Out * totalSupply, balance0),
      Math.ceilDiv(amount1Out * totalSupply, balance1)
    );

    burn(user, liquidity);
    balance0 -= amount0Out;
    balance1 -= amount1Out;
    _updateReserve(balance0, balance1);

    IERC20(token0).transfer(user, amount0Out);
    IERC20(token1).transfer(user, amount1Out);
    emit RemoveLiquidity(user, amount0Out, amount1Out);
  }

  /// Requires user to approve transfer beforehand
  // Hmm how can the user uses this function actually? They will have to pre-compute exactly how much they are getting
  //, which is not doable. Hence, the way to do it is to just provide the amountIn & the tokenIn, and the contract should
  // calc the amount out & transfer it out
  function swap(
    uint256 amount0In,
    uint256 amount1In,
    uint256 amount0Out,
    uint256 amount1Out
  ) public {
    address user = msg.sender;
    (uint256 balance0, uint256 balance1, ) = getReserves();

    uint256 oldK = balance0 * balance1;

    balance0 += amount0In;
    balance1 += amount1In;
    balance0 -= amount0Out;
    balance1 -= amount1Out;
    require(balance0 * balance1 >= oldK, "Pair.swap: k decreases");
    _updateReserve(balance0, balance1);

    if (amount0In > 0) IERC20(token0).transferFrom(user, address(this), amount0In);
    if (amount1In > 0) IERC20(token1).transferFrom(user, address(this), amount1In);
    if (amount0Out > 0) IERC20(token0).transfer(user, amount0Out);
    if (amount1Out > 0) IERC20(token1).transfer(user, amount1Out);
    emit Swap(user, amount0In, amount1In, amount0Out, amount1Out);
  }

  function sync() public {
    _updateReserve(
      IERC20(token0).balanceOf(address(this)),
      IERC20(token1).balanceOf(address(this))
    );
  }

  function _updateReserve(uint256 balance0, uint256 balance1) internal {
    require(
      balance0 <= type(uint112).max && balance1 <= type(uint112).max,
      "Pair._updateReserve: overflow"
    );
    reserve0 = uint112(balance0);
    reserve1 = uint112(balance1);
    blockTimestampLast = uint32(block.timestamp % (2**32));
    emit Sync(reserve0, reserve1);
  }
}
