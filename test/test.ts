import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, impersonateAccount, impersonateAccountStop, toNumber } from "./helpers/hardhat-helpers";
import { TestContract, ERC20 } from "../typechain";

describe("Test ERC20 Contract", () => {
  const [admin, a, b, c, d] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let testContract: TestContract;
  let erc20Contract: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    //testContract = await deploy<TestContract>("TestContract", []);
    //await testContract.setTotal(100);
    var tokenName = "name";
    var tokenSymbol = "tok";
    var initialSupply = 100000;
    erc20Contract = await deploy<ERC20>("ERC20",[tokenName,tokenSymbol,initialSupply]);
    await erc20Contract.mint(a.address,100);
    await erc20Contract.mint(b.address,100);
    await erc20Contract.mint(c.address,100);
    await erc20Contract.mint(d.address,100);

    await impersonateAccountStop(admin.address);
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("Basic balance tests", async () => {
    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));
    let cRemaining = await toNumber(await erc20Contract.balanceOf(c.address));
    let dRemaining = await toNumber(await erc20Contract.balanceOf(d.address));

    expect(aRemaining).to.be.eq(100);
    expect(bRemaining).to.be.eq(100);
    expect(cRemaining).to.be.eq(100);
    expect(dRemaining).to.be.eq(100);
  });

  it("Basic approval tests", async () => {
    //allowance within balance
    await erc20Contract.connect(a).approve(b.address,10);
    let aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(10);

    //allowance > balance
    await erc20Contract.connect(a).approve(b.address,1000);
    aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(1000);

    //allowance = 0
    await erc20Contract.connect(a).approve(b.address,0);
    aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(0);

    //negative allowance
    await expect(erc20Contract.connect(a).approve(b.address,-10)).to.be.reverted;
  });


  it("Basic transfer test a->b", async () => {
    await erc20Contract.connect(a).transfer(b.address,10);

    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));

    expect(aRemaining).to.be.eq(90);
    expect(bRemaining).to.be.eq(110);
  });

  it("Basic transferFrom test", async () => {
    await erc20Contract.connect(a).approve(b.address,10);
    await erc20Contract.connect(c).transferFrom(a.address,b.address,5);

    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));
    let aApprovedB = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aRemaining).to.be.eq(95);
    expect(bRemaining).to.be.eq(105);
    expect(aApprovedB).to.be.eq(5);

    await erc20Contract.connect(c).transferFrom(a.address,b.address,5);
    aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));

    expect(aRemaining).to.be.eq(90);
    expect(bRemaining).to.be.eq(110);

  });

  describe("Testing underflows & overflows ", () => {
    it("Test balance", async () => {
      
    });
  });

  describe("Testing event emitted ", () => {
    it("Test Transfer Event", async () => {
      await expect(erc20Contract.connect(a).transfer(b.address,100)).to.emit(erc20Contract, 'Transfer').withArgs(a.address, b.address, 100);
    });

    it("Test Transfer Event (from transferFrom)", async () => {
      await expect(erc20Contract.connect(a).approve(b.address,100)).to.emit(erc20Contract, 'Approval').withArgs(a.address, b.address, 100);
      await expect(erc20Contract.connect(b).transferFrom(a.address,b.address,100)).to.emit(erc20Contract, 'Transfer').withArgs(a.address, b.address, 100);
    });

    it("Test Approval Event", async () => {
      await expect(erc20Contract.connect(a).approve(b.address,100)).to.emit(erc20Contract, 'Approval').withArgs(a.address, b.address, 100);
    });
  });
});
