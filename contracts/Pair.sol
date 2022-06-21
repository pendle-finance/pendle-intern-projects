// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPair.sol";
import "./ERC20.sol";
import "./Math.sol";

contract Pair is IPair, ERC20 {
    // Initial LP token drop after first liquidity deposit, similar to UniswapV2
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    address public immutable factory;
    address public immutable token0;
    address public immutable token1;

    // All these variable should be in the same storage space, similar to UniswapV2;
    uint112 public reserve0;
    uint112 public reserve1;
    uint32 public blockTimestampLast;

    constructor(address token0_, address token1_, string memory name_, string memory symbol_) ERC20(name_, symbol_) {
        factory = msg.sender;
        token0 = token0_;
        token1 = token1_;
    }

    function getReserves() public view returns (uint112 reserve0_, uint112 reserve1_, uint32 blockTimestampLast_) {
        reserve0_ = reserve0;
        reserve1_ = reserve1;
        blockTimestampLast_ = blockTimestampLast;
    }

    function kLast() public view returns (uint256) {
        (uint256 balance0, uint256 balance1, ) = getReserves();
        return balance0 * balance1;
    }
  
    function mint(uint256 amount0In, uint256 amount1In) public {
        address user = msg.sender;
        (uint256 balance0, uint256 balance1, ) = getReserves(); 

        uint256 liquidity;
        if (totalSupply == 0) {
            /// shamelessly stolen from UniswapV2 model
            liquidity = Math.sqrt(amount0In * amount1In) - MINIMUM_LIQUIDITY;
            mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            liquidity = Math.min(
                amount0In * totalSupply / balance0,
                amount1In * totalSupply / balance1
            );   
        }

        mint(user, liquidity);
        balance0 += amount0In;
        balance1 += amount1In; 
        _updateReserve(balance0, balance1);

        IERC20(token0).transferFrom(user, address(this), amount0In);
        IERC20(token1).transferFrom(user, address(this), amount1In);   
        emit Mint(user, amount0In, amount1In);
    }

  
    function burn(uint256 amount0Out, uint256 amount1Out) public {
        address user = msg.sender;
        (uint256 balance0, uint256 balance1, ) = getReserves(); 

        uint256 liquidity = Math.min(
            Math.ceilDiv(amount0Out * totalSupply, balance0),
            Math.ceilDiv(amount1Out * totalSupply, balance0)
        );

        burn(user, liquidity);
        balance0 -= amount0Out;
        balance1 -= amount1Out;    
        _updateReserve(balance0, balance1);

        IERC20(token0).transfer(user, amount0Out);
        IERC20(token1).transfer(user, amount1Out);   
        emit Mint(user, amount0Out, amount1Out);
    }

    function swap(uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out) public {
        address user = msg.sender;
        (uint256 balance0, uint256 balance1, ) = getReserves(); 

        uint256 oldK = balance0 * balance1;

        balance0 += amount0Out - amount0In;
        balance1 += amount1Out - amount1In;
        require(balance0 * balance1 >= oldK, "Pair.swap: k decreases");
        _updateReserve(balance0, balance1);

        if (amount0In > 0) IERC20(token0).transferFrom(user, address(this), amount0In);
        if (amount1In > 0) IERC20(token1).transferFrom(user, address(this), amount1In);   
        if (amount0Out > 0) IERC20(token0).transfer(user, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(user, amount1Out);   
    }

    // /// Returns amount0In and amount1In transferred into contract
    // /// @param amount amount of tokens minted
    // /// Requires user to approve transfer beforehand
    // /// amountIn / balance >= amount / totalSupply guaranteed
    // function mint(uint256 amount) public returns(uint256 amount0In, uint256 amount1In) {
    //     require(totalSupply > 0, "Pair.mint: empty supply");
    //     (uint256 balance0, uint256 balance1, ) = getReserves(); 

    //     amount0In = Math.ceilDiv(balance0 * amount, totalSupply + amount);
    //     amount1In = Math.ceilDiv(balance1 * amount, totalSupply + amount);

    //     _mint(msg.sender, amount, amount0In, amount1In, balance0, balance1);
    // }
  
    // /// Returns amount0Out and amount1Out transferred out of contract
    // /// @param amount amount of tokens burned
    // /// Requires user to approve transfer beforehand
    // /// amountIn / balance >= amount / totalSupply guaranteed
    // function burn(uint256 amount) public returns(uint256 amount0In, uint256 amount1In) {
    //     require(totalSupply > 0, "Pair.mint: empty supply");
    //     (uint256 balance0, uint256 balance1, ) = getReserves(); 

    //     amount0In = Math.ceilDiv(balance0 * amount, totalSupply + amount);
    //     amount1In = Math.ceilDiv(balance1 * amount, totalSupply + amount);

    //     _mint(msg.sender, amount, amount0In, amount1In, balance0, balance1);
    // }


    // /// Returns amount actually transferred into contract
    // /// Requires user to approve transfer beforehand
    // /// May not take all of amount{0,1}In
    // /// Will take just enough to mint maximum tokens
    // /// If users are generous, they can transfer tokens directly themselves
    // function addLiquidity(uint amount0, uint amount1) public returns (uint amount0In, uint amount1In) {
    //     address user = msg.sender;
    //     (uint256 balance0, uint256 balance1, ) = getReserves(); 

    //     if (totalSupply != 0) {
    //         uint256 mintedLP = Math.min(
    //             amount0 * totalSupply / balance0,
    //             amount1 * totalSupply / balance1
    //         );

    //         (amount0In, amount1In) = mint(user, mintedLP);
    //         // assert(amount0In <= amount0);
    //         // assert(amount1In <= amount1);
    //     }

    //     // assert(totalSupply == 0);
    //     amount0In = amount0;
    //     amount1In = amount1;
    //     _mint(user, MINIMUM_LIQUIDITY, amount0In, amount1In, balance0, balance1);
    // }

    // /// May not send exactly amount{0,1}Out
    // /// Will burn just enough tokens to yield at least amount{0,1}Out
    // /// and return the corresponding amounts;
    // function removeLiquidity(uint amount0Out, uint amount1Out) public {
    //     address user = msg.sender;
    //     (uint256 balance0, uint256 balance1, ) = getReserves();

    //     uint256 burnedLP = Math.max(
    //         Math.ceilDiv(amount0Out * totalSupply, balance0),
    //         Math.ceilDiv(amount1Out * totalSupply, balance1)
    //     );

    //     burn(burnedLP);
    // }

    // function swapExactIn(uint amount0In, uint amount1In) public {

    // }

    // function swapExactOut(uint amount0Out, uint amount1Out) public {

    // }

    function sync() public {
        _updateReserve(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this))
        );
    }

    function _updateReserve(uint256 balance0, uint256 balance1) internal {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "Pair.sync: overflow");
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp % (2 ** 32));
        emit Sync(reserve0, reserve1);
    }

    // function _mint(address user, uint256 amount, uint256 amount0, uint256 amount1, uint256 balance0, uint256 balance1) internal {
    //     _mint(amount);
    //     balance0 += amount0;
    //     balance1 += amount1;    
    //     _updateReserve(balance0, balance1);

    //     IERC20(token0).transferFrom(user, address(this), amount0);
    //     IERC20(token1).transferFrom(user, address(this), amount1);   
    //     emit Mint(user, amount0, amount1);
    // }

    // function _burn(address user, uint256 amount, uint256 amount0, uint256 amount1, uint256 balance0, uint256 balance1) internal {
    //     _burn(amount);
    //     balance0 -= amount0;
    //     balance1 -= amount1;    
    //     _updateReserve(balance0, balance1);

    //     IERC20(token0).transfer(user, amount0);
    //     IERC20(token1).transfer(user, amount1);   
    //     emit Burn(user, amount0, amount1);
    // }
}