// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenDistributor{
    using SafeERC20 for IERC20;
    
    address public owner;
    address[] public receivers;
    IERC20 public ERC20Contract; 
    uint public allocatedERC20 = 0;
    mapping(address => uint) public claimableETH;
    mapping(address => uint) public claimableERC20;

    event ERC20Set (address tokenAddress);
    event ClaimableUpdated (address receiverAddress, uint ethAmt, uint erc20Amt);
    event Refund (uint amount);
    event Claim (address receiver, uint ethAmt, uint erc20Amt);


    modifier onlyOwner {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor () {
        owner = msg.sender;
    }

    receive () external payable {}

    function setERC20Token (IERC20 tokenAddress) public onlyOwner {
        ERC20Contract = IERC20(tokenAddress);
        emit ERC20Set(address(tokenAddress));
    }

    function updateClaimable (address receiver, uint ethAmt, uint erc20Amt) 
        public 
        payable 
        onlyOwner {
            require(msg.value >= ethAmt, "Insufficient eth");
            require(erc20Amt >= 0, "Invalid erc20 amount");
            require(ERC20Contract.balanceOf(address(this)) - allocatedERC20 >= erc20Amt, "Insufficient ERC20");
            
            allocatedERC20 += erc20Amt;
            claimableETH[receiver] += ethAmt;
            claimableERC20[receiver] += erc20Amt;

            if (msg.value > ethAmt){
                payable(msg.sender).transfer(msg.value-ethAmt);
                emit Refund(msg.value-ethAmt);
            }
            emit ClaimableUpdated(receiver, ethAmt, erc20Amt);
    }

    function claim () public payable {
        require(claimableETH[msg.sender] > 0 || claimableERC20[msg.sender] > 0, "Invalid wallet address");
        address payable receiver = payable(msg.sender);
        
        // reset claimableETH & claimableERC20 to 0 before transfer
        // to prevent re-entrancy attacks
        uint ethAmt = claimableETH[msg.sender];
        uint erc20Amt = claimableERC20[msg.sender];
        claimableERC20[msg.sender] = 0;
        claimableETH[msg.sender] = 0;
        
        receiver.transfer(ethAmt);
        ERC20Contract.safeTransfer(msg.sender, erc20Amt);
        emit Claim(msg.sender, ethAmt, erc20Amt);
    }
}