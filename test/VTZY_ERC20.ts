import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { TestContract, ERC20 } from "../typechain";
import { ZERO_ADDRESS, _1E18 } from "./helpers/Constants";


describe("Testing VTZY ERC20 Contract", () => {
  const [admin, minter1, minter2] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let VTZYContract: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    // Deploy contract:
    VTZYContract = await deploy<ERC20>("ERC20", ["Vtzy Token", "VTZY"], true);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

 describe("Deployment Status", () => {
  it("should have a name vtzy and symbol VTZY", async () => {

    let name = await VTZYContract.name();
    expect(name).to.be.eq("Vtzy Token");

    let symbol = await VTZYContract.symbol();
    expect(symbol).to.be.eq("VTZY");
  });

  it("should have decimals of 18 by default", async () => {
    
    let decimals = await VTZYContract.decimals();
    expect(decimals).to.be.eq(18);
  })

  it("should have an initial supply of 1 ether by owner", async () => {

    let curSupply = await VTZYContract.totalSupply();
    let ownerBalance = await VTZYContract.balanceOf(admin.address);

    expect(ownerBalance).to.be.eq(_1E18)
    expect(curSupply).to.be.eq(ownerBalance);
  });
 })


 describe("Admin Rights", () => {
  it("should ALLOW admin to transfer ownership rights and EMIT AdminTransfer Event", async () => {

    let adminAddress = await VTZYContract.admin();
    expect(adminAddress).to.be.eq(admin.address)

    // Transfer ownership to minter1 and check for AdminTransfer Event:
    await expect(VTZYContract.transferAdminRights(minter1.address)).to.emit(VTZYContract, "AdminTransfer").withArgs(admin.address, minter1.address);

    // Check if the admin of the contract has been transferred to minter1:
    adminAddress = await VTZYContract.admin();
    expect(adminAddress).to.be.eq(minter1.address)
  });

  it("should ALLOW admin to set new maximum supply of tokens as long as it is greater than the existing total supply", async () => {

    let curSupply = await VTZYContract.totalSupply();
    expect(curSupply).to.be.eq(_1E18)

    // Expect default maxSupply to be 100 ether worth of tokens
    let curMaxSupply = await VTZYContract.maxSupply();
    expect(curMaxSupply).to.be.eq(_1E18.mul(100))

    // Update the new Max Supply to be 50 ether worth of tokens instead:
    let newMaxSupply = ethers.utils.parseUnits('50.0');

    await VTZYContract.setMaxSupply(newMaxSupply)

    // Expect the Max Supply to be 50 ether worth of tokens now
    curMaxSupply = await VTZYContract.maxSupply();
    expect(curMaxSupply).to.be.eq(_1E18.mul(50))


    // Since current total supply is 1 ether worth of tokens, attempt to set maxSupply < 1 ether i.e. 0.5 ether worth of token:
    let invalidNewMaxSupply = ethers.utils.parseUnits('0.5');
    await expect(VTZYContract.setMaxSupply(invalidNewMaxSupply)).to.be.revertedWith("VTZY: Invalid new maximum supply set")
  });
 })


  describe("Minting Of Tokens", () => {
    it("should ONLY ALLOW admin to mint more than 1 ether worth of tokens via adminMint Function", async () => {


      let mintAmount = ethers.utils.parseUnits("2.0")
  
      await VTZYContract.adminMint(mintAmount);
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      let curSupply = await VTZYContract.totalSupply();
  
  
      expect(ownerBalance).to.be.eq(_1E18.mul(3));
      expect(ownerBalance).to.be.eq(curSupply);
      
      // Expect revert from non-admin when calling adminMint function:
      await expect( VTZYContract.connect(minter1).adminMint(mintAmount)).to.be.revertedWith("VTZY: Unauthorised user.")
    });
  
    it("should ALLOW public to mint 1 ether worth of tokens", async () => {
  
    
      let minter1Balance = await VTZYContract.balanceOf(minter1.address);
      expect(minter1Balance).to.be.eq(0)
  
      let mintAmount = ethers.utils.parseUnits("1.0")
  
      await VTZYContract.connect(minter1).mint(mintAmount);
      minter1Balance = await VTZYContract.balanceOf(minter1.address);
      expect(minter1Balance).to.be.eq(_1E18)
  
      let curSupply = await VTZYContract.totalSupply();
      expect(curSupply).to.be.eq(_1E18.mul(2));
    });
  
    it("should REVERT if a non-admin tries to mint more than 1 ether worth of tokens", async () => {
  
    
      let minter1Balance = await VTZYContract.balanceOf(minter1.address);
      expect(minter1Balance).to.be.eq(0)
  
      let mintAmount = ethers.utils.parseUnits("1.0")
  
      await VTZYContract.connect(minter1).mint(mintAmount);
      minter1Balance = await VTZYContract.balanceOf(minter1.address);
      expect(minter1Balance).to.be.eq(_1E18)
  
      // Expect revert when user tries to mint another:
      await expect( VTZYContract.connect(minter1).mint(mintAmount)).to.be.revertedWith("VTZY: Total minting amount exceeds limit.")
  
      // Double confirm that supply remains as 2 ether worth of tokens
      let curSupply = await VTZYContract.totalSupply();
      expect(curSupply).to.be.eq(_1E18.mul(2));
    });

    it("should REVERT if an attempt to mint more than 100 ether of max supply is made", async () => {

      // Current supply is 1 ether (admin minted when deploying contract)
      let mintAmount = ethers.utils.parseUnits("100.0")
  
      await expect(VTZYContract.adminMint(mintAmount)).to.be.revertedWith("VTZY: Total supply exceeds max supply.");
    });

    
  })

  describe('Transfers & Approvals', () => { 
    it("should able to transfer tokens", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let minter1Balance = await VTZYContract.balanceOf(minter1.address)
      expect(minter1Balance).to.be.eq(0);
  
      let transferAmount = ethers.utils.parseUnits("0.5")
  
      await VTZYContract.transfer(minter1.address, transferAmount);
  
      // Query new balances:
      ownerBalance = await VTZYContract.balanceOf(admin.address);
      minter1Balance = await VTZYContract.balanceOf(minter1.address)
      expect(ownerBalance).to.be.eq(_1E18.div(2))
      expect(ownerBalance).to.be.eq(minter1Balance)
  
  
    
    });

    it("should EMIT a Transfer Event when transferring tokens", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let minter1Balance = await VTZYContract.balanceOf(minter1.address)
      expect(minter1Balance).to.be.eq(0);
  
      let transferAmount = ethers.utils.parseUnits("0.5")
  
      await expect(VTZYContract.transfer(minter1.address, transferAmount)).to.emit(VTZYContract, 'Transfer').withArgs(admin.address, minter1.address, transferAmount)

    });
  
    it("should NOT transfer tokens if insufficient funds", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let minter1Balance = await VTZYContract.balanceOf(minter1.address)
      expect(minter1Balance).to.be.eq(0);
  
      // Attempt to transfer more than existing fund (1.0 ether worth of token)
      let transferAmount = ethers.utils.parseUnits("2.0")
  
      await expect(VTZYContract.transfer(minter1.address, transferAmount)).to.be.revertedWith("VTZY: Insufficient existing funds.");
    
    });


    it("should EMIT an Approval Event should the approve function be called", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let validApproveAmount = ethers.utils.parseUnits('0.5')
  
     await expect(VTZYContract.approve(minter1.address, validApproveAmount)).to.emit(VTZYContract, "Approval").withArgs(admin.address, minter1.address, validApproveAmount);
    
    });
  
  
    it("should ALLOW transfer of funds ONLY when sufficient allowance is given to a spender", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let validApproveAmount = ethers.utils.parseUnits('0.5')
  
     await VTZYContract.approve(minter1.address, validApproveAmount);
  
     // Tranfer Admin's funds by minter1:
     await expect(VTZYContract.connect(minter1).transferFrom(admin.address, minter2.address, validApproveAmount)).to.emit(VTZYContract, 'Transfer').withArgs(admin.address, minter2.address, validApproveAmount)
  
      // Expect minter2's balance to be 0.5 ether worth of tokens
     let minter2Balance = await VTZYContract.balanceOf(minter2.address);
     ownerBalance = await VTZYContract.balanceOf(admin.address);
     expect(minter2Balance).to.be.eq(_1E18.div(2));
     expect(ownerBalance).to.be.eq(_1E18.div(2))
  
      // Attempt to transfer more than existing fund (additional 0.1 ether worth of token)
      let invalidTransferAmount = ethers.utils.parseUnits("0.1")
  
      await expect(VTZYContract.connect(minter1).transferFrom(admin.address,minter2.address, invalidTransferAmount)).to.be.revertedWith("VTZY: Invalid allowance amount specified.");
    
    });
   })

   describe("Burn Transactions", () => {
    it("should EMIT a Transfer Event when the burn function is successfully called upon", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let validBurnAmount = ethers.utils.parseUnits('0.5')
      
      // Existing balance - 1.0 ether worth of tokens, self-call burn function by admin
     await expect(VTZYContract.burn(admin.address, validBurnAmount)).to.emit(VTZYContract, "Transfer").withArgs(admin.address, ZERO_ADDRESS, validBurnAmount);

     // Balance should be updated accordingly after a successful burn transaction
     ownerBalance = await VTZYContract.balanceOf(admin.address);
     expect(ownerBalance).to.be.eq(_1E18.div(2));
    
    });

    it("should ONLY burn when an amount specified is LESS than the balance of the owner", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      // Existing balance of admin is 1.0 ether worth of tokens:
      let invalidBurnAmount = ethers.utils.parseUnits('2.0')
      
      // Should revert if an amount greater than current balance is specified to be burn
     await expect(VTZYContract.burn(admin.address, invalidBurnAmount)).to.be.revertedWith("VTZY: Insufficient existing funds to burn");
    });

    it("should ALLOW a spender to burn an amount within the allowance specified by the owner", async () => {
  
    
      let ownerBalance = await VTZYContract.balanceOf(admin.address);
      expect(ownerBalance).to.be.eq(_1E18)
  
      let validApproveAmount = ethers.utils.parseUnits('0.5')
  
      // Call approve function and expect an Approval Event to be emitted
     await expect(VTZYContract.approve(minter1.address, validApproveAmount)).to.emit(VTZYContract, "Approval").withArgs(admin.address, minter1.address, validApproveAmount);
  
     // Tranfer Admin's funds by minter1:
     await expect(VTZYContract.connect(minter1).burn(admin.address, validApproveAmount)).to.emit(VTZYContract, 'Transfer').withArgs(admin.address, ZERO_ADDRESS, validApproveAmount)
  
      // Expect admin balance to be (1 - 0.5) ether worth of tokens after minter1 burns 0.5 ether worth of tokens on behalf of admin:
     ownerBalance = await VTZYContract.balanceOf(admin.address);
     expect(ownerBalance).to.be.eq(_1E18.div(2))
  
      // Attempt to burn more than existing fund (additional 0.1 ether worth of token)
      let invalidBurnAmount = ethers.utils.parseUnits("0.1")
  
      await expect(VTZYContract.connect(minter1).transferFrom(admin.address,minter2.address, invalidBurnAmount)).to.be.revertedWith("VTZY: Invalid allowance amount specified.");
    
    });
   })
});

