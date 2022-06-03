// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IERC20.sol";
import "./IERC20Metadata.sol";

contract ERC20 is IERC20Metadata {


   /*///////////////////////////////////////////////////////////////
                        State Variables:
    //////////////////////////////////////////////////////////////*/
    uint256 private totalSupply_;
    uint256 public maxSupplyMintPerWallet = 10**18;
    uint256 public maxSupply = 100*10**18; 
    
    string private name_;
    string private symbol_;

    address private admin_;

     /*///////////////////////////////////////////////////////////////
                        Mappings:
    //////////////////////////////////////////////////////////////*/
    mapping(address => uint256) private balances;

    mapping(address => mapping(address => uint)) private allowances;

    mapping(address => uint256) private userMintTracker;


         /*///////////////////////////////////////////////////////////////
                        Events:
    //////////////////////////////////////////////////////////////*/
    event AdminTransfer(address oldAdmin, address newAdmin);

     /*///////////////////////////////////////////////////////////////
                          Modifiers
    //////////////////////////////////////////////////////////////*/

    modifier onlyAdmin() {
      require(msg.sender == admin_, "VTZY: Unauthorised user.");
      _;
    }

    modifier safeMintAmount(uint256 amount) {
      require(userMintTracker[msg.sender] + amount <= maxSupplyMintPerWallet, "VTZY: Total minting amount exceeds limit.");
      require(totalSupply_ + amount <= maxSupply, "VTZY: Total supply exceeds max supply.");
      _;
    }

         /*///////////////////////////////////////////////////////////////
                          Constructor
    //////////////////////////////////////////////////////////////*/
    constructor(string memory _name, string memory _symbol) {
      name_ = _name;
      symbol_ = _symbol;
      admin_ = msg.sender;
      _mint(msg.sender, 10**18);
    }

             /*///////////////////////////////////////////////////////////////
                          Main Functions
    //////////////////////////////////////////////////////////////*/

  function approve(address spender, uint256 amount) external returns (bool) {
      allowances[msg.sender][spender] = amount;

      emit Approval(msg.sender, spender, amount);
      return true;
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    address addressToTransfer = msg.sender;
    _transfer(addressToTransfer, to, amount);
    return true;
  }

  
  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    address spender = msg.sender;
    _allowanceExpenditure(from, spender, amount);
    _transfer(from, to, amount);

    return true;
  }

  function mint(uint256 amount) external safeMintAmount(amount){
    address owner = msg.sender;
    userMintTracker[owner] += amount;
    _mint(owner, amount);
  }

  function adminMint(uint256 amount) external onlyAdmin {
    address owner = msg.sender;
    require(totalSupply_ + amount <= maxSupply, "VTZY: Total supply exceeds max supply.");
    _mint(owner, amount);
  }

  function burn(address user, uint256 amount) external {
    if(user == msg.sender) {
      _burn(msg.sender, amount);
    } else {
      _allowanceExpenditure(user, msg.sender, amount);
      _burn(user, amount);
    }
  }

  
         /*///////////////////////////////////////////////////////////////
                          Internal/Private Functions
    //////////////////////////////////////////////////////////////*/

  function _mint(address user, uint256 amount) internal virtual {
    require(user != address(0), "VTZY: Null address not allowed.");
    
    // Update states first:
    totalSupply_ += amount;
    balances[user] += amount;
  }

  function _allowanceExpenditure(address owner, address spender, uint256 amount) internal virtual {
    uint256 givenAllowance = allowances[owner][spender];

    require(givenAllowance >= amount, "VTZY: Invalid allowance amount specified.");

    allowances[owner][spender] -= amount;

  }

  function _transfer(address from, address to, uint256 amount) internal virtual {
    require(from != address(0), "VTZY: Cannot transfer from zero address");
    require(to != address(0), "VTZY: Cannot transfer to zero address");
    uint256 userBalance = balances[from];
    require(userBalance >= amount, "VTZY: Insufficient existing funds.");

    balances[from] -= amount;
    balances[to] += amount;

    emit Transfer(from, to, amount);
  }

  function _burn(address user, uint256 amount) internal virtual {
    require(user != address(0), "VTZY: Cannot burn from null address");

    uint256 currentBalance = balances[user];

    require(amount <= currentBalance, "VTZY: Insufficient existing funds to burn");
    balances[user] -= amount;
    totalSupply_ -= amount;

    emit Transfer(user, address(0), amount);
  }

         /*///////////////////////////////////////////////////////////////
                         Admin Functions
    //////////////////////////////////////////////////////////////*/
    function transferAdminRights(address newAdmin) external onlyAdmin {
      require(newAdmin != msg.sender && newAdmin != address(0), "VTZY: Invalid admin address specified");
      admin_ = newAdmin;

      emit AdminTransfer(msg.sender, newAdmin);
    }

    function setMaxSupply(uint newMaxSupply) external onlyAdmin {
      require(newMaxSupply > totalSupply_, "VTZY: Invalid new maximum supply set");
      maxSupply = newMaxSupply;
    }

  
       /*///////////////////////////////////////////////////////////////
                Standard ERC20 Getter Functions
    //////////////////////////////////////////////////////////////*/

    function name() external view returns (string memory) {
      return name_;
    }
    
    function symbol() external view returns (string memory) {
      return symbol_;
    }

    function decimals() external pure returns (uint8) {
      return 18;
    }

   function totalSupply() external view returns (uint256) {
    return totalSupply_;
  }

  function balanceOf(address account) external view returns (uint256) {
    return balances[account];
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return allowances[owner][spender];
  }

  function admin() external view returns(address) {
    return admin_;
  }
 

}
