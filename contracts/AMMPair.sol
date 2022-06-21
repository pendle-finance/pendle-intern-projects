// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

// Re-entrancy Guard
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
// SafeERC20
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
// AMM LP ERC20:
import "./AMMLPERC20.sol";
import "./interfaces/IAMMPair.sol";
import "./libraries/Math.sol";
import "./ERC20.sol";

contract AMMPair is IAMMPair, ReentrancyGuard, AMMLPERC20 {
  address public factory;
  IERC20 public token0;
  IERC20 public token1;

  uint public reserve0;
  uint public reserve1;

  uint public constant MINIMUM_LIQUIDITY = 10**3;

  constructor() {
    factory = msg.sender;
  }

  function _update(uint256 balance0, uint256 balance1) private {
    reserve0 = balance0;
    reserve1 = balance1;
  }

  function mint(address to) external nonReentrant returns (uint256 lpLiquidity) {
    // Retrieve reserve states and store in local variable (reduce no. of SLOADs)
    (uint256 _reserves0, uint256 _reserves1) = getReserves();

    // Get the 2 new balances from providing Liquidity:
    uint256 newBalance0 = token0.balanceOf(address(this));
    uint256 newBalance1 = token1.balanceOf(address(this));

    uint256 contributedAmt0 = newBalance0 - _reserves0;
    uint256 contributedAmt1 = newBalance1 - _reserves1;

    // Fetch total supply of LP tokens from AMMERC20:
    uint256 curtotalSupply = totalSupply;

    // Lock up Minimum Liquidty:

    if (curtotalSupply == 0) {
      lpLiquidity = contributedAmt0 * contributedAmt1 - MINIMUM_LIQUIDITY;
      _mint(address(0), MINIMUM_LIQUIDITY);
    } else {
      uint256 lpAmount0 = (contributedAmt0 * curtotalSupply) / _reserves0;
      uint256 lpAmount1 = (contributedAmt1 * curtotalSupply) / _reserves1;
      lpLiquidity = lpAmount0 < lpAmount1 ? lpAmount0 : lpAmount1;
    }

    require(lpLiquidity > 0, "Insufficient liquidity");
    _mint(to, lpLiquidity);

    // Update pool states:
    _update(newBalance0, newBalance1);

    emit Mint(msg.sender, contributedAmt0, contributedAmt1);
  }

  // @Desc: Function to be called inside 'removeLiquidity' where a trade-in of LPtokens (lpLiquidity) is being made in exchange for the 2 tokens
  function burn(address to)
    external
    nonReentrant
    returns (uint256 contributedAmt0, uint256 contributedAmt1)
  {
    IERC20 _token0 = token0;
    IERC20 _token1 = token1;

    uint256 curBalance0 = _token0.balanceOf(address(this));
    uint256 curBalance1 = _token1.balanceOf(address(this));

    // Store the LPLiquidity transferred in from external call 'removeLiquidity'
    uint256 lpLiquidity = balanceOf[address(this)];

    uint256 curTotalSupply = totalSupply; // Total supply of LP tokens

    // Distribute proportionally based on how much LP tokens are traded in relative to the total supply:
    contributedAmt0 = (lpLiquidity * curBalance0) / curTotalSupply;
    contributedAmt1 = (lpLiquidity * curBalance1) / curTotalSupply;

    require(contributedAmt0 > 0 && contributedAmt1 > 0, "Insufficient liquidity burnt");
    _burn(address(this), lpLiquidity);
    SafeERC20.safeTransfer(_token0, to, contributedAmt0);
    SafeERC20.safeTransfer(_token1, to, contributedAmt1);

    _update(curBalance0 - contributedAmt0, curBalance1 - contributedAmt1);

    emit Burn(msg.sender, contributedAmt0, contributedAmt1, to);
  }

  function swap(
    uint256 amount0Out,
    uint256 amount1Out,
    address to,
    bytes calldata data
  ) external {}

  function initialize(IERC20 _token0, IERC20 _token1) external {
    require(msg.sender == factory, "UniswapV2: FORBIDDEN"); // sufficient check
    token0 = _token0;
    token1 = _token1;
  }

  function getReserves() public view returns (uint256, uint256) {
    return (reserve0, reserve1);
  }
}
