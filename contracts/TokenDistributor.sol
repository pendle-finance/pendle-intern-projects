pragma solidity ^0.8.0;

import "../interfaces/IERC20.sol";
import "../interfaces/BoringOwnable.sol";

/**
 * For simplicity, address(0) will be considered the address for native token.
 */
contract TokenDistributor is BoringOwnable {
  address public constant NATIVE_TOKEN_ADDRESS = address(0);

  event Deposit(address indexed tokenAddress, address indexed receivedFrom, uint256 amount);
  event Approval(address indexed tokenAddress, address indexed claimer, uint256 amount);
  event Claim(address indexed tokenAddress, address indexed claimer, uint256 amount);

  mapping(address => mapping(address => uint256)) private _allowance;
  
  constructor() {}
  
  /**
   * Although address(0) is considered to be the address for the native token.
   * external methods (allowance, balanceOf, approve, deposit, claim, etc.)
   * for ERC20s tokens and native tokens are different.
   */

  function allowanceNativeToken(address user) public view returns (uint256) {
    require(user != address(0), "User address must be non-zero");

    return _allowance[NATIVE_TOKEN_ADDRESS][user];
  }

  function balanceOfNativeToken() public view returns (uint256) {
    return address(this).balance;
  }

  function allowanceERC20(address tokenAddress, address user) public view returns (uint256) {
    require(tokenAddress != address(0), "Token address must be non-zero");
    require(user != address(0), "User address must be non-zero");

    return _allowance[tokenAddress][user];
  }

  function balanceOfERC20(address tokenAddress) public view returns (uint256) {
    require(tokenAddress != address(0), "Token address must be non-zero");

    return IERC20(tokenAddress).balanceOf(address(this));
  }

  /// Only way to deposit ethers; other ways such as call() or send() should revert
  function depositNativeToken() external payable {
    emit Deposit(NATIVE_TOKEN_ADDRESS, msg.sender, msg.value);
  }

  function approveNativeToken(address claimer, uint256 amount) external onlyOwner {
    require(claimer != address(0), "Claimer address must be non-zero");

    _approve(NATIVE_TOKEN_ADDRESS, claimer, amount);
  }

  /// Internal variables are updated before call(), thus reentrancy attack are (or should be) avoided
  function claimNativeToken(uint256 amount) external {
    address claimer = msg.sender;
    require(allowanceNativeToken(claimer) >= amount, "Amount must not exceed allowance");
    require(balanceOfNativeToken() >= amount, "Amount must not exceed balance");

    _claim(NATIVE_TOKEN_ADDRESS, claimer, amount);
  }

  /// Deposting directly through IERC20 should work fine as well
  /// Requires sender to approve transfer beforehand
  function depositERC20(address tokenAddress, uint256 amount) external {
    require(tokenAddress != address(0), "Token address must be non-zero");

    IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
    emit Deposit(tokenAddress, msg.sender, amount);
  }

  function approveERC20(address tokenAddress, address claimer, uint256 amount) external onlyOwner {
    require(tokenAddress != address(0), "Token address must be non-zero");
    require(claimer != address(0), "Claimer address must be non-zero");

    _approve(tokenAddress, claimer, amount);
  }

  function claimERC20(address tokenAddress, uint256 amount) external {
    require(tokenAddress != address(0), "Token address must be non-zero");
    address claimer = msg.sender;

    require(allowanceERC20(tokenAddress, claimer) >= amount, "Amount must not exceed allowance");
    require(balanceOfERC20(tokenAddress) >= amount, "Amount must not exceed balance");

    _claim(tokenAddress, msg.sender, amount);
  }

  function _approve(address tokenAddress, address claimer, uint256 amount) internal {
    _allowance[tokenAddress][claimer] = amount;
    emit Approval(tokenAddress, claimer, amount);
  }

  /**
   * _claim() must be called ONLY when amount does NOT exceed allowance and balance.
   * 
   * _claim() should be called AFTER every internal updates to avoid reentrancy attacks.
   */
  function _claim(address tokenAddress, address claimer, uint256 amount) internal {
    unchecked { 
      // assert(_allowance[tokenAddress][claimer] >= amount);
      _allowance[tokenAddress][claimer] -= amount;
    }

    if (tokenAddress == NATIVE_TOKEN_ADDRESS) {
      (bool success, ) = payable(claimer).call{value: amount}("");
      require(success, "Transfer unsuccessful");
    } else {
      IERC20(tokenAddress).transfer(claimer, amount);
    }

    emit Claim(tokenAddress, claimer, amount);
  }
}