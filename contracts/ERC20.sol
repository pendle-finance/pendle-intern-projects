// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

<<<<<<< Updated upstream
import "./IERC20.sol";
=======
import "./IERC20Metadata.sol";

contract ERC20 is IERC20Metadata {
  string internal _name = "VuongTungDuong";
  string internal _symbol = "VTD";
  uint8 internal _decimals = 18;
  uint internal _totalSupply;
  address public contractOwner;
  mapping(address=>uint) internal balance;
  mapping(address=>mapping(address=>uint)) private _allowance;  // _allowance[owner][spender] = amount possible

  constructor (uint totalSupply_)
  {
    contractOwner = msg.sender;  
    _totalSupply = totalSupply_;
    balance[contractOwner] = totalSupply_;
  }

  function name() external view returns (string memory)
  {
    return _name;
  }

  function symbol() external view returns (string memory)
  {
    return _symbol;
  }

  function decimals() external view returns (uint8){
    return _decimals;
  }
>>>>>>> Stashed changes

contract ERC20 is IERC20 {
  function totalSupply() external view returns (uint256) {
    return 0;
  }

  function balanceOf(address account) external view returns (uint256) {
    return 0;
  }

<<<<<<< Updated upstream
  function transfer(address to, uint256 amount) external returns (bool) {
    return true;
  }

  function allowance(address owner, address spender) external view returns (uint256) {
    return 0;
=======
  function allowance(address owner, address spender) external view returns (uint256) {    
    require(owner!=address(0), "invalid owner");
    require(spender!=address(0), "invalid spender");
    return _allowance[owner][spender];
>>>>>>> Stashed changes
  }

  function transfer(address to, uint256 amount) external returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }  

  function approve(address spender, uint256 amount) external returns (bool) {
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external returns (bool) {
    return true;
  }
<<<<<<< Updated upstream
=======

  function _transfer(address from, address to, uint amount) internal 
  {
    require(from!=address(0), "invalid sender");
    require(to!=address(0), "invalid receiver");
    require(balance[from] >= amount, "not enough money from the owner");

    balance[from] -= amount;
    balance[to] += amount;  // Hope no overflow here! Should depend on the designer

    emit Transfer(from, to, amount);
  }

  function _mint(address to, uint amount) internal 
  {
    // require(to!=address(0), "invalid receiver");

    balance[to] += amount;
    _totalSupply += amount;

    emit Transfer(address(0), to, amount);
  }

  function _burn(address from, uint amount) internal 
  {
    balance[from] -= amount;
    require(balance[from] >= 0, "not enough to burn");
    _totalSupply -= amount;
    emit Transfer(from, address(0), amount);
  }
>>>>>>> Stashed changes
}
