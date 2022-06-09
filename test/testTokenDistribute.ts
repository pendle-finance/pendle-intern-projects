import { expect } from "chai";
import { Contract, utils, constants } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { TokenDistribute } from "../typechain";

describe("TestTokenDistribute", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let tokenDistribute: TokenDistribute;

  const name = "VuongTungDuongv2";
  const symbol = "VTD-V2";
  const decimals = 18;
  const totalSupply = 1e10;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    tokenDistribute = await deploy<TokenDistribute>("TokenDistribute", []);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("test constructor successfully", async () => {
    expect(await tokenDistribute.contractOwner()).to.be.eq(admin.address);
    expect(await tokenDistribute.balanceOf(admin.address)).to.be.eq(totalSupply);
    expect(await tokenDistribute.totalSupply()).to.be.eq(totalSupply);
    expect(await tokenDistribute.name()).to.be.eq(name);
    expect(await tokenDistribute.symbol()).to.be.eq(symbol);
    expect(await tokenDistribute.decimals()).to.be.eq(decimals);
  });

  it("transfer successfully", async () => {
    let smallAmount = 126;  // admin transfers Alice
    let smallerAmount = 12;  // Alice transfers Bob
    let adminToAliceTransfer =  await tokenDistribute.transfer(Alice.address, smallAmount);        
    let AliceToBobTransfer =  await tokenDistribute.connect(Alice).transfer(Bob.address, smallerAmount);

    expect(adminToAliceTransfer).to.emit(tokenDistribute, 'Transfer').withArgs(admin.address, Alice.address, smallAmount);
    expect(AliceToBobTransfer).to.emit(tokenDistribute, 'Transfer').withArgs(Alice.address, Bob.address, smallerAmount);

    expect(await tokenDistribute.balanceOf(admin.address)).to.be.eq(totalSupply - smallAmount);
    expect(await tokenDistribute.balanceOf(Alice.address)).to.be.eq(smallAmount - smallerAmount);
    expect(await tokenDistribute.balanceOf(Bob.address)).to.be.eq(smallerAmount);
  });

  it("transfer failed as expected", async () => {
    let amount = totalSupply + 1;  // admin trys to transfer to Alice

    await expect(tokenDistribute.transfer(Alice.address, amount)).to.be.revertedWith("not enough money from the owner");

    await expect(tokenDistribute.transfer(constants.AddressZero, 0)).to.be.revertedWith("invalid receiver");
  });  

  it("approve successfully", async () => {
    let approveAmount = 20;
    await expect(tokenDistribute.approve(constants.AddressZero, approveAmount)).to.be.revertedWith("invalid spender");
    let approvalToAlice = await tokenDistribute.approve(Alice.address, approveAmount);
    expect(approvalToAlice).to.emit(tokenDistribute, 'Approval').withArgs(admin.address, Alice.address, approveAmount);

    await expect(tokenDistribute.allowance(admin.address, constants.AddressZero)).to.be.revertedWith("invalid spender");
    await expect(tokenDistribute.allowance(constants.AddressZero, Alice.address)).to.be.revertedWith("invalid owner");

    expect(await tokenDistribute.allowance(admin.address, Alice.address)).to.be.eq(approveAmount);
  });

  it("transferFrom successfully", async () => {
    let approveAmount = 20;
    await tokenDistribute.approve(Alice.address, approveAmount);

    let transferFromAdminToBob =  await tokenDistribute.connect(Alice).transferFrom(admin.address, Bob.address, approveAmount);
    expect(transferFromAdminToBob).to.emit(tokenDistribute, 'Transfer').withArgs(admin.address, Bob.address, approveAmount);

    expect(await tokenDistribute.balanceOf(admin.address)).to.be.eq(totalSupply - approveAmount);
    expect(await tokenDistribute.balanceOf(Bob.address)).to.be.eq(approveAmount);
    expect(await tokenDistribute.allowance(admin.address, Alice.address)).to.be.eq(0);
  });

  it("transferFrom failed as expected", async () => {
    let approveAmount = 20;
    let smallerApproveAmount = 10;
    await tokenDistribute.connect(Alice).approve(admin.address, approveAmount);  

    let smallAmount = 15;  // admin transfers Alice
    await tokenDistribute.transfer(Alice.address, smallAmount);  // Alice has 15   

    await expect(tokenDistribute.transferFrom(constants.AddressZero, Bob.address, 0)).to.be.revertedWith("invalid sender");
    await expect(tokenDistribute.transferFrom(Alice.address, constants.AddressZero, 0)).to.be.revertedWith("invalid receiver");
    await expect(tokenDistribute.transferFrom(Alice.address, Bob.address, smallAmount + 1)).to.be.revertedWith("not enough money from the owner");

    await tokenDistribute.connect(Alice).approve(admin.address, smallerApproveAmount);
    await expect(tokenDistribute.transferFrom(Alice.address, Bob.address, smallerApproveAmount + 1)).to.be.revertedWith("exceed the amount allowed");
  });

  it("distribute successfully", async () => {
    let amount = 20;
    await tokenDistribute.transferNative(Alice.address, {value: amount});
    // await tokenDistribute.transferNative(game.id, 2, { from: addr1, value: 5000 });
    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(amount);

    await expect(await tokenDistribute.connect(Alice).withdraw(Alice.address)).to.changeEtherBalance(Alice, amount);
  });
});