// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";
import "./ERC20.sol";

contract TokenDistribute {
    address public contractOwner;
    address public grantedContractOwner;

    mapping(address=>mapping(address=>uint)) public erc20Balance;  // erc20Balance[tokenAddress][owner]
    mapping(address=>uint) public nativeBalance;
    mapping(address=>uint) public distributedErc20;  // Amount of erc20Token distributed in this contract but haven't withdrew by the interns
    uint internal _distributedNative;  // Amount of eth distributed in this contract but haven't withdrew by the interns
    mapping(address=>bool) internal _registered;  

    address [] public erc20Tokens;

    modifier onlyOwner() {
      if (msg.sender != contractOwner) {
        revert("not the owner of the contract");
      }    
      _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        contractOwner = newOwner;
    }

    function grantOwnership(address newOwner) public onlyOwner {
        grantedContractOwner = newOwner;
    }

    function receiveOwnership() public {
        require(msg.sender == grantedContractOwner, "not granted the Ownership yet");
        contractOwner = msg.sender;
    }

    modifier nonZeroAddress(address address_) {
        if (address_ == address(0)) {
            revert("invalid receiver");
        }
        _;
    }

    constructor () {
        contractOwner = msg.sender;
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
        require(IERC20Metadata(tokenAddress).balanceOf(address(this)) >= distributedErc20[tokenAddress] + amount, "not enough token to distribute");

        distributedErc20[tokenAddress] += amount;
        erc20Balance[tokenAddress][to] += amount;
    }

    // Alternative method, should be amount array

    function batchdistributeErc20(address tokenAddress, address[] calldata to, uint[] calldata amount) public onlyOwner{        
        uint length = to.length;
        
        for (uint i=0; i<length; i++) 
        {
            distributeErc20(tokenAddress, to[i], amount[i]);
        }
    }

    // Anton transfers ETH directly to the contract first
    function distributeNative(address to, uint amount) public onlyOwner nonZeroAddress(to)
    {
        require(address(this).balance >= _distributedNative + amount, "not enough eth to distribute");
        
        _distributedNative += amount;
        nativeBalance[to] += amount;
    }

    // Alternative method 
    function batchDistributeNative(address[] calldata to, uint[] calldata amount) public onlyOwner{    
        uint length = to.length;

        for (uint i=0; i<length; i++) 
        {
            distributeNative(to[i], amount[i]);
        }
    }

    function withdrawNative(address to) public nonZeroAddress(to) 
    {        
        require(nativeBalance[to]>0, "no balance to withdraw");
        
        uint amount = nativeBalance[to];
        _distributedNative -= amount;
        nativeBalance[to] = 0;
        payable(to).transfer(amount);
    }

    function withdrawErc20(address tokenAddress, address to) public nonZeroAddress(to) 
    {                
        require(to!=address(0), "invalid receiver");
        uint amount = erc20Balance[tokenAddress][to];
        require(amount>0, "no balance to withdraw"); 

        erc20Balance[tokenAddress][to] = 0;
        distributedErc20[tokenAddress] -= amount;
        IERC20Metadata(tokenAddress).transfer(to, amount);
    }

    function withdrawAll(address to) external nonZeroAddress(to) 
    {
        uint length = erc20Tokens.length;

        for (uint i=0; i<length; i++) 
        {
            if (erc20Balance[erc20Tokens[i]][to]>0) withdrawErc20(erc20Tokens[i], to);
        } 
        if (nativeBalance[to]>0) withdrawNative(to); 
    }

    receive() external payable {}
}
