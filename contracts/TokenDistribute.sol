// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";
import "./ERC20.sol";

contract TokenDistribute {
    address public contractOwner;
    mapping(address=>mapping(address=>uint)) private _erc20Balance;  // _erc20Balance[tokenAddress][owner]
    mapping(address=>uint) private _nativeBalance;
    mapping(address=>uint) private _distributedErc20;  // Amount of erc20Token distributed in this contract but haven't withdrew by the interns
    uint private _distributedNative;  // Amount of eth distributed in this contract but haven't withdrew by the interns
    mapping(address=>bool) private _registered;  

    address [] public erc20Tokens;

    modifier onlyOwner() {
      if (msg.sender != contractOwner) {
        revert("not the owner of the contract");
      }    
      _;
    }

    modifier nonZeroAddress(address address_) {
        if (address_ == address(0)) {
            revert("invalid receiver");
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

    function distributeErc20(address tokenAddress, address to, uint amount) public onlyOwner nonZeroAddress(to)
    {
        require(IERC20Metadata(tokenAddress).balanceOf(address(this)) >= _distributedErc20[tokenAddress] + amount, "not enough token to distribute");

        _distributedErc20[tokenAddress] += amount;
        _erc20Balance[tokenAddress][to] += amount;
    }

    // // Alternative method 
    function batchdistributeErc20(address tokenAddress, address[] calldata to, uint amount) public onlyOwner{        
        for (uint i=0; i<to.length; i++) 
        {
            distributeErc20(tokenAddress, to[i], amount);
        }
    }

    // Anton transfers ETH directly to the contract first
    function distributeNative(address to, uint amount) public onlyOwner nonZeroAddress(to)
    {
        require(address(this).balance >= _distributedNative + amount, "not enough eth to distribute");
        
        _distributedNative += amount;
        _nativeBalance[to] += amount;
    }

    // Alternative method 
    function batchDistributeNative(address[] calldata to, uint amount) public onlyOwner{        
        for (uint i=0; i<to.length; i++) 
        {
            distributeNative(to[i], amount);
        }
    }

    function withdrawNative(address to) public nonZeroAddress(to) 
    {        
        require(_nativeBalance[to]>0, "no balance to withdraw");
        
        uint amount = _nativeBalance[to];
        _distributedNative -= amount;
        _nativeBalance[to] = 0;
        payable(to).transfer(amount);
    }

    function withdrawErc20(address tokenAddress, address to) external nonZeroAddress(to) 
    {                
        _transferErc20(tokenAddress, to);
    }

    function withdrawAll(address to) external nonZeroAddress(to) 
    {
        for (uint i=0; i<erc20Tokens.length; i++) 
        {
            _transferErc20(erc20Tokens[i], to);
        } 
        if (_nativeBalance[to]>0) withdrawNative(to); 
    }

    function _transferErc20(address tokenAddress, address to) private nonZeroAddress(to)  
    {
        require(to!=address(0), "invalid receiver");
        uint amount = _erc20Balance[tokenAddress][to];
        require(amount>0, "no balance to withdraw");
        _erc20Balance[tokenAddress][to] = 0;
        _distributedErc20[tokenAddress] -= amount;
        IERC20Metadata(tokenAddress).transfer(to, amount);
    }

    receive() external payable {}
}
