// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "../interface/IERC20Metadata.sol";
import "../interface/ILPPair.sol";
import "./ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
contract LPPair is ERC20, ILPPair {
    using SafeMath for uint;
    using SafeMath for uint128;
    address public factory;
    address public token0;
    address public token1;

    uint128 private reserve0;          
    uint128 private reserve1;    


    function getReserves() external view returns (uint128 _reserve0, uint128 _reserve1) {

    }

    // Update contract state
    function mint(address to) external returns (uint liquidity) {

    }
    function burn(address to) external returns (uint amount0, uint amount1) {

    }
    function swap(uint amount0Out, uint amount1Out, address to) external {

    }
    function skim(address to) external {

    }
    function initialize(address, address) external {

    }

}