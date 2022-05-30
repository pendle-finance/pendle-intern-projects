import { expect } from "chai";
import { Contract, utils, constants } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TestContract } from "../typechain";

describe("TestERC20", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let erc20: ERC20;

  const initialTotal = 1000;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    erc20 = await deploy<ERC20>("ERC20", [initialTotal]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("get total successfully", async () => {

    let curTotal = await erc20.totalSupply();
    expect(curTotal).to.be.eq(initialTotal);
  });

  it("test constructor successfully", async () => {
    let owner = await erc20.contractOwner();
    expect(owner).to.be.eq(admin.address);

    let ownerBalance = await erc20.balanceOf(admin.address);
    expect(ownerBalance).to.be.eq(initialTotal);
  });

  it("transfer successfully", async () => {
    let smallAmount = 126;  // admin transfers Alice
    let smallerAmount = 12;  // Alice transfers Bob
    let adminToAliceTransfer =  await erc20.transfer(Alice.address, smallAmount);        
    let AliceToBobTransfer =  await erc20.connect(Alice).transfer(Bob.address, smallerAmount);

    expect(adminToAliceTransfer).to.emit(erc20, 'Transfer').withArgs(admin.address, Alice.address, smallAmount);
    expect(AliceToBobTransfer).to.emit(erc20, 'Transfer').withArgs(Alice.address, Bob.address, smallerAmount);

    expect(await erc20.balanceOf(admin.address)).to.be.eq(initialTotal - smallAmount);
    expect(await erc20.balanceOf(Alice.address)).to.be.eq(smallAmount - smallerAmount);
    expect(await erc20.balanceOf(Bob.address)).to.be.eq(smallerAmount);
  });

  it("transfer failed as expected", async () => {
    let amount = initialTotal + 1;  // admin trys to transfer to Alice

    await expect(erc20.transfer(Alice.address, amount)).to.be.revertedWith("Not enough balance to transfer");

    await expect(erc20.transfer(constants.AddressZero, 0)).to.be.revertedWith("invalid receiver");
  });  

  it("approve successfully", async () => {
    let approveAmount = 20;
    await erc20.approve(Alice.address, approveAmount);

    expect(await erc20.allowance(admin.address, Alice.address)).to.be.eq(approveAmount);
  });

  it("transferFrom successfully", async () => {
    let approveAmount = 20;
    await erc20.approve(Alice.address, approveAmount);

    let transferFromAdminToBob =  await erc20.connect(Alice).transferFrom(admin.address, Bob.address, approveAmount);
    expect(transferFromAdminToBob).to.emit(erc20, 'Transfer').withArgs(admin.address, Bob.address, approveAmount);

    expect(await erc20.balanceOf(admin.address)).to.be.eq(initialTotal - approveAmount);
    expect(await erc20.balanceOf(Bob.address)).to.be.eq(approveAmount);
    expect(await erc20.allowance(admin.address, Alice.address)).to.be.eq(0);
  });

  it("transferFrom failed as expected", async () => {
    let approveAmount = 20;
    let smallerApproveAmount = 10;
    await erc20.connect(Alice).approve(admin.address, approveAmount);  

    let smallAmount = 15;  // admin transfers Alice
    await erc20.transfer(Alice.address, smallAmount);  // Alice has 15   

    await expect(erc20.transferFrom(constants.AddressZero, Bob.address, 0)).to.be.revertedWith("invalid sender");
    await expect(erc20.transferFrom(Alice.address, constants.AddressZero, 0)).to.be.revertedWith("invalid receiver");
    await expect(erc20.transferFrom(Alice.address, Bob.address, smallAmount + 1)).to.be.revertedWith("not enough money from the owner");

    await erc20.connect(Alice).approve(admin.address, smallerApproveAmount);
    await expect(erc20.transferFrom(Alice.address, Bob.address, smallerApproveAmount + 1)).to.be.revertedWith("exceed the amount allowed");
  });
});
