// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";
import "./ERC20.sol";

contract TokenDistribute {
    address public contractOwner;
    mapping(address=>mapping(address=>uint)) private _erc20Balance;  // _erc20Balance[tokenAddress][owner]
    mapping(address=>uint) private _nativeBalance;
    mapping(address=>uint) private _distributedErc20;  // Amount of erc20Token distributed in this contract but haven't withdrew by the interns
    mapping(address=>bool) private _registered;  

    address [] public erc20Tokens;

    modifier onlyOwner() {
      if (msg.sender != contractOwner) {
        revert("not the owner of the contract");
      }    
      _;
    }

    constructor ()
    {
        contractOwner = msg.sender;  
    }

    function nativeBalanceOf(address account) external view returns (uint256) {
        return _nativeBalance[account];
    }

    function erc20BalanceOf(address tokenAddress, address owner) external view returns (uint256) {
        return _erc20Balance[tokenAddress][owner];
    }

    function distributedErc20(address tokenAddress) external view returns (uint256) {
        return _distributedErc20[tokenAddress];
    }

    // Anton approves Token to the contract first, then call this function to deposit Token to the contract
    function depositErc20(address tokenAddress, uint amount) public onlyOwner
    {
        ERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        if (!_registered[tokenAddress])
        {
            erc20Tokens.push(tokenAddress);
        }
    }

    // Distribute 
    function distributeErc20(address tokenAddress, address to, uint amount) public onlyOwner
    {
        require(to!=address(0), "invalid receiver");

        require(IERC20Metadata(tokenAddress).balanceOf(address(this)) >= _distributedErc20[tokenAddress] + amount, "not enough token to distribute");

        _distributedErc20[tokenAddress] += amount;
        _erc20Balance[tokenAddress][to] += amount;
    }

    // Anton transfers ETH directly to interns by calling this function with the amount of ETH
    function transferNative(address to) public onlyOwner payable
    {
        // require(msg.sender==contractOwner, "only owner can distribute");
        require(to!=address(0), "invalid receiver");
        require(msg.value>0, "transfer amount = 0");

        _nativeBalance[to] += msg.value;
    }

    function withdrawNative() external
    {        
        require(_nativeBalance[msg.sender]>0, "no balance to withdraw");
        
        uint amount = _nativeBalance[msg.sender];
        _nativeBalance[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    function withdrawErc20(address tokenAddress) external
    {                
        _transferErc20(tokenAddress, msg.sender);
    }

    function withdrawAllErc20() external
    {
        for (uint i=0; i<erc20Tokens.length; i++) 
        {
            _transferErc20(erc20Tokens[i], msg.sender);
        } 
    }

    function _transferErc20(address tokenAddress, address to) private 
    {
        require(to!=address(0), "invalid receiver");
        uint amount = _erc20Balance[tokenAddress][to];
        require(amount>0, "no balance to withdraw");
        _erc20Balance[tokenAddress][to] = 0;
        _distributedErc20[tokenAddress] -= amount;
        IERC20Metadata(tokenAddress).transfer(to, amount);
    }

    receive() external payable 
    {
        revert("Call transferNative() instead");
    }    
}
