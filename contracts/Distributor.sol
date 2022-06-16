// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Distributor is Context, Ownable {

    uint256 private _numRegisteredForETH; // Counter to track no. of registered payees for ETH
    uint256 private _totalETHShares;
    uint256 private _totalETHDistributed;


     /*///////////////////////////////////////////////////////////////
                            Mappings
    //////////////////////////////////////////////////////////////*/
   

    mapping(uint256 => address) private _payeesForETH;
    // Specification of total share for ETHER per wallet
    mapping(address => uint256) private _sharesForETH;
    // Amount of ETH paid out to the account
    mapping(address => uint256) private _distributedETH;

    mapping(IERC20 => uint256) private _numRegisteredForToken; // Counter for each ERC20 Token to track no. of registered payees
    mapping(IERC20 => mapping(uint256 => address)) private _payeesForToken; // IERC20 token -> index -> registered payee

    mapping(IERC20 => uint256) private _totalTokenShares;
    mapping(IERC20 => uint256) private _totalTokenDistributed;
    // Specification of total shares tagged to the ERC20 Token Contract Address per wallet
    mapping(IERC20 => mapping(address => uint256)) private _sharesForTokens; // IERC20 token -> account -> share
    // Amount of Token specified paid out to the account
    mapping(IERC20 => mapping(address => uint256)) private _distributedTokens; // IERC20 token -> account -> distributed Tokens


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

        /*///////////////////////////////////////////////////////////////
                            Events
    //////////////////////////////////////////////////////////////*/
    event RegisterPayeeForETH(address account, uint256 shares);
    event RegisterPayeeForToken(address account, IERC20 token, uint256 shares );
 
    event ETHFundClaimed(address account,uint256 shares);
    event TokenFundClaimed(address account, IERC20 token, uint256 shares);

    event ETHReceived(address from, uint256 amount);
    event TokenReceived(address from, IERC20 token, uint256 amount);


           /*///////////////////////////////////////////////////////////////
                            Constructor
    //////////////////////////////////////////////////////////////*/
    // @Note: SHare 
    constructor(address[] memory accounts_, uint256[] memory shares_) payable {
        require(accounts_.length == shares_.length, "Distributor: Mismatch of addresses and shares.");
        for(uint256 i = 0; i < accounts_.length; i++ ){
            _registerPayeesForETH(accounts_[i], shares_[i]);
        }
    }

     /*///////////////////////////////////////////////////////////////
                            External/Public Functions
    //////////////////////////////////////////////////////////////*/

    // @Desc: To batch register accounts with a specified share for a new ERC20 Token
    function registerPayeesForToken(address[] memory accounts_, IERC20 token_, uint256[] memory shares_) external onlyOwner {
        require(accounts_.length == shares_.length, "Distributor: Mismatch of addresses and shares.");
        for(uint256 i = 0; i < accounts_.length; i++ ){
            _registerPayeesForTokens(accounts_[i], token_, shares_[i]);
        }
    }
    
    // @Desc: Payout/Claim eligible amount of ether from contract based on shares
    function payoutETH(address payable account_) public {
        address payable account = account_;
        require(_sharesForETH[account_] > 0, "Distributor: Not registered to claim ETH.");

        uint256 ethClaimable = claimableETH(account);

        //Send ether to receipient via a low-level call function
        require(address(this).balance >= ethClaimable, "Distributor: Insufficient ETH balance in contract.");
        
        _totalETHDistributed += ethClaimable;
        _distributedETH[account] = ethClaimable;
        account.transfer(ethClaimable);

        emit ETHFundClaimed(account, ethClaimable);
    }

    function payoutToken(address account_, IERC20 token_) public {
        address account = account_;
        IERC20 token = token_;
        require(_sharesForTokens[token][account] > 0, "Distributor: Not registered to claim ERC20 token.");

        uint256 tokenAmountClaimable = claimableToken(account, token);

        // Transfer ERC20 via transfer function from SafeERC20
        require(token.balanceOf(address(this)) >= tokenAmountClaimable, "Distributor: Insufficient ERC20 token balance.");
        
        _totalTokenDistributed[token] += tokenAmountClaimable;
        _distributedTokens[token][account] += tokenAmountClaimable;
        SafeERC20.safeTransfer(token, account, tokenAmountClaimable);

        emit TokenFundClaimed(account, token, tokenAmountClaimable);
    }

    // @Desc: Convenient One-Time Function call for owner to distribute ether from contract to all registered payees
    function distributeDemAllETH() external onlyOwner {
        uint totalPayees = numRegisteredForETH();
        for(uint256 i = 0; i < totalPayees;){
            payoutETH(payable(_payeesForETH[i]));
            unchecked {i++; }
        }
    }

       // @Desc: Convenient One-Time Function call for owner to distribute a specified ERC20 Token from contract to all registered payees
    function distributeDemAllToken(IERC20 token_) external onlyOwner {
        IERC20 token = token_;
        uint totalPayees = numRegisteredForToken(token);
        for(uint256 i = 0; i < totalPayees;){
            payoutToken(_payeesForToken[token][i], token);
            unchecked {i++; }
        }
    }

      /*///////////////////////////////////////////////////////////////
                            Internal/Private Functions
    //////////////////////////////////////////////////////////////*/

    // @Desc: To register accounts as payees for token distribution.
    // @Note: tokenAddress_ to specify as Null Address to register a payee with shares for Ether.
    function _registerPayeesForETH(address account_, uint256 share_) private nonZeroAddress(account_) validShares(share_) {
        address account = account_;
        uint share = share_;

        require(_sharesForETH[account_] == 0, "Distributor: Account registered for ETH distribution.");

        // Save account as a payee in the mapping
        _payeesForETH[_numRegisteredForETH++] = account_; 
        _sharesForETH[account_] = share_;
         _totalETHShares += share_;
         
        emit RegisterPayeeForETH(account, share);
    }

    function _registerPayeesForTokens(address account_, IERC20 token_, uint256 share_) private nonZeroAddress(account_) validShares(share_) {
        address account = account_;
        uint256 share = share_;
        IERC20 token = token_;

        require(_sharesForTokens[token][account] == 0, "Distributor: Account already registered for token distribution,");

        _payeesForToken[token][_numRegisteredForToken[token]] = account;
        _numRegisteredForToken[token] += 1;
      

        _sharesForTokens[token][account] = share;
        _totalTokenShares[token] += share;

        emit RegisterPayeeForToken(account, token, share);
    }

    // @Desc: To calculate the outstanding amount for an account to claim from the contract based on how much total ether this contract received since its inception
    function outstandingETHClaim(address account_, uint256 totalReceived_, uint256 accountDistributed_) private view returns(uint256){
        return (totalReceived_ * _sharesForETH[account_]) / totalETHShares() - accountDistributed_;
    }

    // @Desc: To calculate outstanding amount of an ERC20 for an account to claim from the contract based on how much it has received since inception
    function outstandingTokenClaim(address account_, IERC20 tokenAddress_, uint totalTokenReceived_, uint256 accountTokenDistributed_) private view returns(uint256){
        return (totalTokenReceived_ * _sharesForTokens[tokenAddress_][account_]) / totalTokenShares(tokenAddress_) - accountTokenDistributed_;
    }

    
      /*///////////////////////////////////////////////////////////////
                            Pure/View Functions
    //////////////////////////////////////////////////////////////*/
    function numRegisteredForETH() public view returns(uint256){
        return _numRegisteredForETH;
    }

    function totalETHShares() public view returns(uint256){
        return _totalETHShares;
    }

    function totalETHDistributed() public view returns(uint256){
        return _totalETHDistributed;
    }

    function payeeForETH(uint256 index_) public view returns(address){
        return _payeesForETH[index_];
    }

    function sharesForETH(address account_) public view returns(uint256){
        return _sharesForETH[account_];
    }

    function distributedETH(address account_) public view returns(uint256){
        return _distributedETH[account_];
    }

    // For Tokens:
    function numRegisteredForToken(IERC20 token_) public view returns(uint256){
        return _numRegisteredForToken[token_];
    }

    function payeeForToken(uint index_, IERC20 token_) public view returns(address){
        return _payeesForToken[token_][index_];
    }

    function totalTokenShares(IERC20 tokenAddress_) public view returns(uint256){
        return _totalTokenShares[tokenAddress_];
    }
    function totalTokenDistributed(IERC20 tokenAddress_) public view returns(uint256){
        return _totalTokenDistributed[tokenAddress_];
    }

    function sharesForTokens(address account_, IERC20 tokenAddress_) public view returns(uint256){
        return _sharesForTokens[tokenAddress_][account_];
    }

    function distributedTokens(address account_,IERC20 tokenAddress_) public view returns(uint256){
        return _distributedTokens[tokenAddress_][account_];
    }

    // @Desc: To check how much ether an account is still eligible to claim
    function claimableETH(address account_) public view returns(uint256){
        uint256 totalReceived = address(this).balance + totalETHDistributed();

        return outstandingETHClaim(account_, totalReceived, distributedETH(account_));
    }

    // @Desc: To check how much an ERC20 token an account is still eligible to claim
    function claimableToken(address account_, IERC20 tokenAddress_) public view returns(uint256){
        uint totalTokenReceived = tokenAddress_.balanceOf(address(this)) + totalTokenDistributed(tokenAddress_);

        return outstandingTokenClaim(account_, tokenAddress_, totalTokenReceived, distributedTokens(account_,tokenAddress_));
    
    }

    // Fallback Function for contract to receive ETH
      receive() external payable virtual {
        emit ETHReceived(_msgSender(), msg.value);
    }
}