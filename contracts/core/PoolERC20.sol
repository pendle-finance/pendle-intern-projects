pragma solidity ^0.8.0;

import "../interfaces/IPoolERC20.sol";

contract Pool is IPoolERC20 {
  uint256 private _totalSupply;
  mapping(address => uint256) private _balances;
  string public name;
  string public symbol;
  uint8 public decimals;
  mapping(address => mapping(address => uint256)) private _allowances;

  constructor(
    uint256 _initialSupply,
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) public {
    name = _name;
    symbol = _symbol;
    decimals = _decimals;
    mint(msg.sender, _initialSupply);
  }

  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }

  function transfer(address to, uint256 amount) external override returns (bool) {
    // Check if the amount is greater than the balance of the sender
    require(_balances[msg.sender] >= amount, "Not enough balance");
    // Check if the recipient is not the zero address
    require(to != address(0), "Invalid recipient");
    // Decrease the sender's balance
    _balances[msg.sender] -= amount;
    // Increase the recipient's balance
    _balances[to] += amount;
    emit Transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    // Check the address is not the zero address
    require(spender != address(0), "Invalid spender");
    // Update the allowance
    _allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external override returns (bool) {
    // Check the sender's address is not the zero address
    require(from != address(0), "Invalid from");
    // Check the recipient's address is not the zero address
    require(to != address(0), "Invalid to");
    // Check if the sender has enough allowance
    require(amount <= _allowances[from][msg.sender], "Not enough allowance");
    // Check if the owner has enough balance
    require(_balances[from] >= amount, "Not enough balance");
    _balances[from] -= amount;
    _balances[to] += amount;
    // Update allowance only if the allowance is not infinity
    // if (_allowances[from][msg.sender] != MAXINT) {
    _allowances[from][msg.sender] -= amount;
    // }
    emit Transfer(from, to, amount);
    return true;
  }

  //should be internal function
  //currently public for testing purposes
  function mint(address to, uint256 amount) public returns (bool) {
    require(to != address(0), "Invalid recipient");
    //increase total supply
    _totalSupply += amount;
    //increase balance of the recipient
    _balances[to] += amount;
    emit Transfer(address(0), to, amount);
    return true;
  }

  //should be internal function
  //currently public for testing purposes
  function burn(uint256 amount) public returns (bool) {
    //check if the amount is greater than the balance of the sender
    require(_balances[msg.sender] >= amount, "Not enough balance");
    //decrease the balance of the sender
    _balances[msg.sender] -= amount;
    //decrease the total supply
    _totalSupply -= amount;
    emit Transfer(msg.sender, address(0), amount);
    return true;
  }

  //TODO: To be implemented

  function DOMAIN_SEPARATOR() external view returns (bytes32) {}

  function PERMIT_TYPEHASH() external pure returns (bytes32) {}

  function nonces(address owner) external view returns (uint256) {}

  function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {}
}
