// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IERC20Metadata.sol";
contract Airdrop is Ownable {
    using SafeMath for uint;

    event Setting(address receipt,string token,uint amount);
    event SettingETH(address receipt,uint amount);
    event Transfer(address receipt,string token,uint amount);
    event TransferETH(address recept,uint amount);

    //Owner to token address to amount
    mapping(address => mapping(address => uint)) private balances;

    mapping(address => uint) private ethBalances;


    // All main function
    function allowETH(address receipt,uint amount) public onlyOwner{
        ethBalances[receipt]+=amount;
        emit SettingETH(receipt , amount);
    }

    function alowERC20(address receipt,address token,uint amount) public onlyOwner {
        require(receipt!=address(0), "Invalid zero receipt");
        require(token!=address(0), "Invalid zero token address");

        IERC20Metadata erc20token = IERC20Metadata(token);
        balances[receipt][token]+=amount;

        emit Setting(receipt,erc20token.name(),amount);
    }

    function claim(address[] memory tokens,uint[] memory amounts, bool eth,uint ethAmount) public {
        for(uint i=0;i<tokens.length;i++) {
            require(_erc20transfer(msg.sender, tokens[i], amounts[i]),"Transfer token fail");
        }
        if(eth){
            require(_ethtransfer(payable(msg.sender), ethAmount),"Transfer eth fail");
        }
    }

    // Debug function
    function balanceOf(address receipt,address token) external view returns(uint) {
        return balances[receipt][token];
    }

    function balanceETH(address receipt) external view returns(uint) {
        return ethBalances[receipt];
    }


    //Internal helper function
    function _erc20transfer(address receipt, address token,uint amount) internal returns (bool){
        require(receipt!=address(0), "Invalid zero receipt");
        require(token!=address(0), "Invalid zero token address");
        require(balances[msg.sender][token]>=amount,"Insufficient balance");

        balances[msg.sender][token]-=amount;

        IERC20Metadata erc20token = IERC20Metadata(token);

        erc20token.transfer(receipt, amount);

        emit Transfer(receipt, erc20token.name(), amount);

        return true;
    }

    function _ethtransfer(address payable receipt, uint amount) internal returns (bool){
        require(receipt!=address(0), "Invalid zero receipt");
        require(ethBalances[receipt]>=amount,"Insufficient balance");

        ethBalances[receipt]-=amount;

        receipt.transfer(amount);

        emit TransferETH(msg.sender,amount);

        return true;
    }

    //fallback receive
    receive() external payable {
        
    }

}