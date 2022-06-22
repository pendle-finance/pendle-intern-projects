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

contract AMMPair is IAMMPair, ReentrancyGuard, AMMLPERC20 {
  address public factory;
  IERC20 public token0;
  IERC20 public token1;

  uint public reserve0;
  uint public reserve1;

  uint public constant MINIMUM_LIQUIDITY = 10**3;

  constructor() AMMLPERC20(0) {
    factory = msg.sender;
  }

  
  function initialize(IERC20 _token0, IERC20 _token1) external {
    require(msg.sender == factory, "Not allowed."); // sufficient check
    token0 = _token0;
    token1 = _token1;
  }

  // @Desc: Function to update both reserve states based on the prevailing balance of both tokenA and tokenB each time an action is called upon.
  function _update(uint256 balance0, uint256 balance1) private {
    reserve0 = balance0;
    reserve1 = balance1;
  }

  // @Desc: Internal Function to mint LP tokens to Liquidity providers upon adding liquidity to the pool
  function _mintLP(address to) private nonReentrant returns (uint256 lpLiquidity) {
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
      lpLiquidity = Math.sqrt(contributedAmt0 * contributedAmt1) - MINIMUM_LIQUIDITY;
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

  // @Desc: External call to add liquidity to the pool - NOTE: requires msg.sender to approve allowance for the contract to transact on the LP's behalf
  function addLiquidity(uint desiredAmtA, uint desiredAmtB, uint minAmtA, uint minAmtB) external virtual returns(uint amountA, uint amountB, uint lpLiquidity){
    // Calculate final amount of tokenA and tokenB to deposit:
    (amountA, amountB) = _addLiquidity(desiredAmtA, desiredAmtB, minAmtA, minAmtB);

    // Transfer both tokens to the Pair contract:
    token0.transferFrom( msg.sender, address(this), amountA);
    token1.transferFrom( msg.sender, address(this), amountB);

    lpLiquidity = _mintLP(msg.sender);
  }


 
  // @Desc: Function to remove liquidity by Liquidity Provider by first specifying the amount of LP token he/she wishes to trade in for the amount of tokenA and tokenB.
  function removeLiquidity(
        uint lpLiquidity,
        uint minAmtA,
        uint minAmtB) external virtual returns(uint amountA, uint amountB){
            // Send LP Liquidity back to pair contract:
          IERC20(address(this)).transfer( address(this), lpLiquidity);

           // Burn LP Tokens to receive back proportional tokenA and tokenB
           (amountA, amountB) = _burnLP(msg.sender);

          // Since queried directly from pair contract, will always be sorted:
          require(amountA > minAmtA, "Insufficient tokenA amount");
          require(amountB > minAmtB, "Insufficient tokenB amount");
        }

    // @Desc: Internal function to calculate the 2 optimal amounts based on the underlying/prevailing reserves of the pool
   function _addLiquidity(uint desiredAmtA, uint desiredAmtB, uint minAmtA, uint minAmtB ) internal virtual returns(uint amountA, uint amountB) {

    // Retrieve reserves from the pair contract:
    (uint _reserve0, uint _reserve1) = getReserves();

    if(_reserve0 == 0  && _reserve1 == 0){
      (amountA, amountB) = (desiredAmtA, desiredAmtB);
    } else {
      // Query Optimal Amount of tokenB based on desired Amount of Token A:
      uint optimalAmtB = _quote(desiredAmtA, _reserve0, _reserve1);

      if(optimalAmtB <= desiredAmtB){
          require(optimalAmtB > minAmtB, "Insufficient B Amount");
          (amountA, amountB) = (desiredAmtA, optimalAmtB);
      } else {
        uint optimalAmtA = _quote(desiredAmtB, _reserve0, _reserve1);
        assert(optimalAmtA <= desiredAmtA);
        require(optimalAmtA > minAmtA, "Insufficient A Amount");
        (amountA, amountB) = (optimalAmtA, desiredAmtB);
      }
    }
  }

// @Desc: To quote the exact amount of each token based on a desired amount of one of the tokens
  function _quote(uint amountA, uint reserveA, uint reserveB) internal pure returns(uint opAmountB){
    require(amountA > 0, "Insufficient Amount Provided");
    require(reserveA > 0 && reserveB > 0, "Insufficient Pool Liquidity");
    opAmountB = amountA*reserveB / reserveA;
  }

  // @Desc: Function to be called inside 'removeLiquidity' where a trade-in of LPtokens (lpLiquidity) is being made in exchange for the 2 tokens
  function _burnLP(address to)
    private
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

// @Desc: Main function to swap tokens within the token pair by users
  function swap(
    uint amount0Out, 
    uint amount1Out, 
    address to 
    // bytes calldata data
    ) external {
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT_AMOUNT");
        (uint _reserve0, uint _reserve1) = getReserves(); // gas savings
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "INSUFFICIENT_LIQUIDITY");

        uint balance0;
        uint balance1;
        { // scope for _token{0,1}, avoids stack too deep errors
        IERC20 _token0 = token0;
        IERC20 _token1 = token1;
        require(to != address(_token0) && to != address(_token1), "INVALID_TO");
        if (amount0Out > 0) SafeERC20.safeTransfer(_token0, to, amount0Out); // optimistically transfer tokens
        if (amount1Out > 0) SafeERC20.safeTransfer(_token1, to, amount1Out); // optimistically transfer tokens
        // if (data.length > 0) IUniswapV2Callee(to).uniswapV2Call(msg.sender, amount0Out, amount1Out, data);
        balance0 = _token0.balanceOf(address(this));
        balance1 = _token1.balanceOf(address(this));
        }
        uint amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT_AMOUNT");

        require(balance0*balance1 >= _reserve0*_reserve1, "K");

        _update(balance0, balance1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }


  // @Desc: To return the prevailing reserve logs of the pool
  function getReserves() public view returns (uint256, uint256) {
    return (reserve0, reserve1);
  }
}
