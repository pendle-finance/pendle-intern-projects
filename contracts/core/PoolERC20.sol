pragma solidity ^0.8.0;

import "../interfaces/IPoolERC20.sol";

contract PoolERC20 is IPoolERC20 {
  //Constant -> save gas pls
  string public constant name = "LP-token";
  string public constant symbol = "LP-TOK";
  uint8 public constant decimals = 18;

  uint256 internal _totalSupply;
  mapping(address => uint256) internal _balances;
  mapping(address => mapping(address => uint256)) internal _allowances;

  mapping(address => uint256) public nonces;
  bytes32 public DOMAIN_SEPARATOR;
  // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
  bytes32 public constant PERMIT_TYPEHASH =
    0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

  constructor() {
    DOMAIN_SEPARATOR = keccak256(
      abi.encode(
        keccak256(
          "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        ),
        keccak256(bytes(name)),
        keccak256(bytes("1")),
        block.chainid,
        address(this)
      )
    );
  }

  function totalSupply() external view override returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view override returns (uint256) {
    return _balances[account];
  }

  function transfer(address to, uint256 amount) external override returns (bool) {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function allowance(address owner, address spender) external view override returns (uint256) {
    return _allowances[owner][spender];
  }

  function approve(address spender, uint256 amount) external override returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external override returns (bool) {
    // Check if the sender has enough allowance
    require(amount <= _allowances[from][msg.sender], "PE20: Not enough allowance");
    _allowances[from][msg.sender] -= amount;
    _transfer(from, to, amount);
    return true;
  }

  function _transfer(
    address from,
    address to,
    uint256 amount
  ) private {
    // Check the sender's address is not the zero address
    require(from != address(0), "PE20: Invalid from");
    // Check the recipient's address is not the zero address
    require(to != address(0), "PE20: Invalid to");
    // Check if the owner has enough balance
    require(_balances[from] >= amount, "PE20: Not enough balance");
    unchecked {
      _balances[from] -= amount;
    }
    _balances[to] += amount;
    emit Transfer(from, to, amount);
  }

  function _approve(
    address approver,
    address spender,
    uint256 amount
  ) private {
    // Check the address is not the zero address
    require(spender != address(0), "PE20: Invalid spender");
    // Update the allowance
    _allowances[approver][spender] = amount;
    emit Approval(approver, spender, amount);
  }

  function _mint(address to, uint256 amount) internal {
    //increase total supply
    _totalSupply += amount;
    //increase balance of the recipient
    _balances[to] += amount;
    emit Transfer(address(0), to, amount);
  }

  function _burn(address to, uint256 amount) internal {
    //check if the amount is greater than the balance of the sender
    require(_balances[to] >= amount, "PE20: Not enough balance");
    //decrease the total supply
    _totalSupply -= amount;
    //decrease the balance of the sender
    unchecked {
      _balances[to] -= amount;
    }
    emit Transfer(to, address(0), amount);
  }

  function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    require(deadline >= block.timestamp, "PE20: EXPIRED");
    bytes32 digest = keccak256(
      abi.encodePacked(
        "\x19\x01",
        DOMAIN_SEPARATOR,
        keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
      )
    );
    address recoveredAddress = ecrecover(digest, v, r, s);
    require(
      recoveredAddress != address(0) && recoveredAddress == owner,
      "PE20: INVALID_SIGNATURE"
    );
    _approve(owner, spender, value);
  }
}
