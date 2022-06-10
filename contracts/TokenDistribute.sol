// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";

contract TokenDistribute {
    address public contractOwner;
    mapping(address=>mapping(address=>uint)) private _tokenBalance;  // _tokenBalance[tokenAddress][owner]
    mapping(address=>uint) private _nativeBalance;
    mapping(address=>uint) private _distributedToken;

    constructor ()
    {
        contractOwner = msg.sender;  
    }

    function nativeBalanceOf(address account) external view returns (uint256) {
        return _nativeBalance[account];
    }

    function tokenBalanceOf(address tokenAddress, address owner) external view returns (uint256) {
        return _tokenBalance[tokenAddress][owner];
    }

    function distributedToken(address tokenAddress) external view returns (uint256) {
        return _distributedToken[tokenAddress];
    }

    function transferToken(address tokenAddress, address to, uint amount) public
    {
        require(msg.sender==contractOwner, "only owner can distribute");
        require(to!=address(0), "invalid receiver");

        require(IERC20Metadata(tokenAddress).balanceOf(address(this)) >= _distributedToken[tokenAddress] + amount, "not enough token to transfer");

        _distributedToken[tokenAddress] += amount;
        _tokenBalance[tokenAddress][to] += amount;
    }

    function transferNative(address to) public payable
    {
        require(msg.sender==contractOwner, "only owner can distribute");
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

    function withdrawToken(address tokenAddress) external
    {                
        uint amount = _tokenBalance[tokenAddress][msg.sender];
        require(amount>0, "no balance to withdraw");
        _tokenBalance[tokenAddress][msg.sender] = 0;
        _distributedToken[tokenAddress] -= amount;
        IERC20Metadata(tokenAddress).transfer(msg.sender, amount);
    }

    receive() external payable 
    {
    }    
}
