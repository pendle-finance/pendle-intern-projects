// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./IERC20Metadata.sol";


contract TokenDistribute is IERC20 {
    string private constant _name = "VuongTungDuongv2";
    string private constant _symbol = "VTD-V2";
    uint8 private constant _decimals = 18;
    uint private _totalSupply = 1e10;
    address public contractOwner;
    mapping(address=>uint) private balance;
    mapping(address=>uint) private nativeBalance;
    mapping(address=>mapping(address=>uint)) private allowanceAmount;  // allowanceAmount[owner][spender] = amount possible
    
    // event Distribute(address to, uint256 value);

    constructor ()
    {
        contractOwner = msg.sender;  
        balance[contractOwner] = _totalSupply;
    }

    function name() external pure returns (string memory)
    {
        return _name;
    }

    function symbol() external pure returns (string memory)
    {
        return _symbol;
    }

    function decimals() external pure returns (uint8){
        return _decimals;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balance[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {    
        require(owner!=address(0), "invalid owner");
        require(spender!=address(0), "invalid spender");
        return allowanceAmount[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        require(spender!=address(0), "invalid spender");
        allowanceAmount[msg.sender][spender] = amount;

        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool) {
        
        require(allowanceAmount[from][msg.sender] >= amount, "exceed the amount allowed");
        _transfer(from, to, amount);
        allowanceAmount[from][msg.sender] -= amount;   

        return true;
    }

    function _transfer(address from, address to, uint amount) internal 
    {
        require(from!=address(0), "invalid sender");
        require(to!=address(0), "invalid receiver");
        require(balance[from] >= amount, "not enough money from the owner");

        balance[from] -= amount;
        balance[to] += amount;  // Hope no overflow here! Should depend on the designer

        emit Transfer(from, to, amount);
    }

    function nativeBalanceOf(address account) external view returns (uint256) {
        return nativeBalance[account];
    }

    function transferNative(address to) public payable
    {
        require(msg.sender==contractOwner, "only owner can distribute");
        require(to!=address(0), "invalid receiver");
        require(msg.value>0, "transfer amount = 0");

        nativeBalance[to] += msg.value;
    }

    function withdraw(address payable to) external
    {        
        require(to!=address(0), "invalid receiver");
        require(nativeBalance[to]>0, "no balance to withdraw");
        
        uint amount = nativeBalance[to];
        nativeBalance[to] = 0;
        to.transfer(amount);
    }

    receive() external payable 
    {
    }    
}
