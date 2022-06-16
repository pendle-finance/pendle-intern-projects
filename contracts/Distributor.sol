// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Distributor is Context, Ownable {
    using SafeERC20 for IERC20;
    uint256 public totalETHShares;
    uint256 public totalETHDistributed;


     /*///////////////////////////////////////////////////////////////
                            Mappings
    //////////////////////////////////////////////////////////////*/
   
    // Specification of total share for ETHER per wallet
    mapping(address => uint256) public sharesForETH;
    // Amount of ETH paid out to the account
    mapping(address => uint256) public distributedETH;

    mapping(IERC20 => uint256) public totalTokenShares;
    mapping(IERC20 => uint256) public totalTokenDistributed;
    // Specification of total shares tagged to the ERC20 Token Contract Address per wallet
    mapping(IERC20 => mapping(address => uint256)) public sharesForTokens; // IERC20 token -> account -> share
    // Amount of Token specified paid out to the account
    mapping(IERC20 => mapping(address => uint256)) public distributedTokens; // IERC20 token -> account -> distributed Tokens


         /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    modifier nonZeroAddress(address account_) {
        require(account_ != address(0), "Distributor: Null address not allowed.");
        _;
    }

    modifier validShares(uint256 shares_) {
         require(shares_ > 0, "Distributor: Invalid shares specified.");
         _;
    }

    modifier registrationChecker(address[] memory accounts_, uint256[] memory shares_) {
        require(accounts_.length == shares_.length, "Distributor: Mismatch of addresses and shares.");
        _;
    }

        /*///////////////////////////////////////////////////////////////
                            Events
    //////////////////////////////////////////////////////////////*/
    event RegisterPayeeForETH(address account, uint256 shares);
    event RegisterPayeeForToken(address account, IERC20 token, uint256 shares );

    event AmendETHShares(address account, uint256 newShares);
    event AmendTokenShares(address account, IERC20 token, uint256 newShares);
 
    event ETHFundClaimed(address account,uint256 shares);
    event TokenFundClaimed(address account, IERC20 token, uint256 shares);

    event ETHReceived(address from, uint256 amount);
    event TokenReceived(address from, IERC20 token, uint256 amount);

  

     /*///////////////////////////////////////////////////////////////
                            External/Public Functions
    //////////////////////////////////////////////////////////////*/

   function registerPayeesForETH(address[] memory accounts_, uint256[] memory shares_) external registrationChecker(accounts_, shares_) onlyOwner {
        for(uint256 i = 0; i < accounts_.length; i++ ){
            _registerPayeesForETH(accounts_[i], shares_[i]);
        }
    }

    // @Desc: To batch register accounts with a specified share for a new ERC20 Token
    function registerPayeesForToken(address[] memory accounts_, IERC20 token_, uint256[] memory shares_) external registrationChecker(accounts_, shares_)  onlyOwner {
        require(accounts_.length == shares_.length, "Distributor: Mismatch of addresses and shares.");
        for(uint256 i = 0; i < accounts_.length; i++ ){
            _registerPayeesForTokens(accounts_[i], token_, shares_[i]);
        }
    }

    // @Desc: Amend a registered Payee's share for ETH distribution
    function amendPayeeETHShares(address account_, uint256 newShares_) external onlyOwner {
        require(sharesForETH[account_] > 0, "Distributor: Unregistered payee.");
        uint256 oldShares = sharesForETH[account_];
        sharesForETH[account_] = newShares_;
        totalETHShares = totalETHShares - oldShares + newShares_;

        emit AmendETHShares(account_, newShares_);
    }

     // @Desc: Amend a registered Payee's share for ERC20 Token distribution
     function amendPayeeTokenShares(address account_, IERC20 token_, uint256 newShares_) external onlyOwner {
        require(sharesForTokens[token_][account_] > 0, "Distributor: Unregistered payee.");
        uint256 oldShares = sharesForTokens[token_][account_];
        sharesForTokens[token_][account_] = newShares_;
        totalTokenShares[token_] = totalTokenShares[token_] - oldShares + newShares_;

        emit AmendTokenShares(account_, token_, newShares_);
     }
    
    // @Desc: Payout/Claim eligible amount of ether from contract based on shares
    function payoutETH(address payable account_) public {
        address payable account = account_;
        require(sharesForETH[account_] > 0, "Distributor: Not registered to claim ETH.");

        uint256 ethClaimable = claimableETH(account);

        //Send ether to receipient via a low-level call function
        require(address(this).balance >= ethClaimable, "Distributor: Insufficient ETH balance in contract.");
        
        totalETHDistributed += ethClaimable;
        distributedETH[account] = ethClaimable;
        account.transfer(ethClaimable);

        emit ETHFundClaimed(account, ethClaimable);
    }

    function payoutToken(address account_, IERC20 token_) public {
  
        require(sharesForTokens[token_][account_] > 0, "Distributor: Not registered to claim ERC20 token.");

        uint256 tokenAmountClaimable = claimableToken(account_, token_);

        // Transfer ERC20 via transfer function from SafeERC20
        require(token_.balanceOf(address(this)) >= tokenAmountClaimable, "Distributor: Insufficient ERC20 token balance.");
        
        totalTokenDistributed[token_] += tokenAmountClaimable;
        distributedTokens[token_][account_] += tokenAmountClaimable;
        token_.safeTransfer( account_, tokenAmountClaimable);

        emit TokenFundClaimed(account_, token_, tokenAmountClaimable);
    }


      /*///////////////////////////////////////////////////////////////
                            Internal/Private Functions
    //////////////////////////////////////////////////////////////*/

    // @Desc: To register accounts as payees for token distribution.
    // @Note: tokenAddress_ to specify as Null Address to register a payee with shares for Ether.
    function _registerPayeesForETH(address account_, uint256 share_) private nonZeroAddress(account_) validShares(share_) {

        require(sharesForETH[account_] == 0, "Distributor: Account registered for ETH distribution.");


        sharesForETH[account_] = share_;
         totalETHShares += share_;
         
        emit RegisterPayeeForETH(account_, share_);
    }

    function _registerPayeesForTokens(address account_, IERC20 token_, uint256 share_) private nonZeroAddress(account_) validShares(share_) {
        require(sharesForTokens[token_][account_] == 0, "Distributor: Account already registered for token distribution,");
      

        sharesForTokens[token_][account_] = share_;
        totalTokenShares[token_] += share_;

        emit RegisterPayeeForToken(account_, token_, share_);
    }

    // @Desc: To calculate the outstanding amount for an account to claim from the contract based on how much total ether this contract received since its inception
    function outstandingETHClaim(address account_, uint256 totalReceived_, uint256 accountDistributed_) private view returns(uint256){
        return (totalReceived_ * sharesForETH[account_]) / totalETHShares - accountDistributed_;
    }

    // @Desc: To calculate outstanding amount of an ERC20 for an account to claim from the contract based on how much it has received since inception
    function outstandingTokenClaim(address account_, IERC20 tokenAddress_, uint totalTokenReceived_, uint256 accountTokenDistributed_) private view returns(uint256){
        return (totalTokenReceived_ * sharesForTokens[tokenAddress_][account_]) / totalTokenShares[tokenAddress_] - accountTokenDistributed_;
    }

    
      /*///////////////////////////////////////////////////////////////
                            Pure/View Functions
    //////////////////////////////////////////////////////////////*/

    // @Desc: To check how much ether an account is still eligible to claim
    function claimableETH(address account_) public view returns(uint256){
        uint256 totalReceived = address(this).balance + totalETHDistributed;

        return outstandingETHClaim(account_, totalReceived, distributedETH[account_]);
    }

    // @Desc: To check how much an ERC20 token an account is still eligible to claim
    function claimableToken(address account_, IERC20 tokenAddress_) public view returns(uint256){
        uint totalTokenReceived = tokenAddress_.balanceOf(address(this)) + totalTokenDistributed[tokenAddress_];

        return outstandingTokenClaim(account_, tokenAddress_, totalTokenReceived, distributedTokens[tokenAddress_][account_]);
    
    }

    // Fallback Function for contract to receive ETH
      receive() external payable virtual {
        emit ETHReceived(_msgSender(), msg.value);
    }
}