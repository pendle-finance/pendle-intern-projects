// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./interfaces/IAMMPair.sol";
import "./libraries/Math.sol";
import "./ERC20.sol";

contract AMMPair is IAMMPair, ERC20 {
    address public factory;
    address public token0;
    address public token1;

    uint public reserve0;
    uint public reserve1;

    constructor() ERC20(0) 
    { 
        // contractOwner = msg.sender;  
        // _totalSupply = totalSupply;
        // balance[contractOwner] = totalSupply;       
        factory = msg.sender;
    }

    function _update(uint balance0, uint balance1) private {
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
    }

    function mint(address to) external returns (uint liquidity) {
        uint _reserve0 = reserve0;
        uint _reserve1 = reserve1;

        uint balance0 = IERC20(token0).balanceOf(address(this));
        uint balance1 = IERC20(token1).balanceOf(address(this));
        uint amount0 = balance0 - _reserve0;
        uint amount1 = balance1 - _reserve1;
        uint totalSupply = _totalSupply;

        if (totalSupply == 0) 
        {
            uint MINIMUM_LIQUIDITY = 10;
            liquidity = Math.sqrt(amount0*amount1)-MINIMUM_LIQUIDITY;
           _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the first MINIMUM_LIQUIDITY tokens
        }
        else 
        {
            liquidity = Math.min(amount0*totalSupply/_reserve0, amount1*totalSupply/_reserve1);
        }

        _mint(to, liquidity);
        _update(balance0, balance1);
    }

    function burn(address to) external returns (uint amount0, uint amount1) {
        return (0, 1);
    }
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external {
        
    }

    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "UniswapV2: FORBIDDEN"); // sufficient check
        token0 = _token0;
        token1 = _token1;
    }
}