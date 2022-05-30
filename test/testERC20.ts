import { expect } from "chai";
import { Contract, utils } from "ethers";
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
    await erc20.transfer(Alice.address, smallAmount);        
    await erc20.connect(Alice).transfer(Bob.address, smallerAmount);
    expect(await erc20.balanceOf(admin.address)).to.be.eq(initialTotal - smallAmount);
    expect(await erc20.balanceOf(Alice.address)).to.be.eq(smallAmount - smallerAmount);
    expect(await erc20.balanceOf(Bob.address)).to.be.eq(smallerAmount);
  });

  it("approve successfully", async () => {
    let approveAmount = 20;
    await erc20.approve(Alice.address, approveAmount);

    expect(await erc20.allowance(admin.address, Alice.address)).to.be.eq(approveAmount);
  });

  it("transferFrom successfully", async () => {
    let approveAmount = 20;
    await erc20.approve(Alice.address, approveAmount);

    await erc20.connect(Alice).transferFrom(admin.address, Bob.address, approveAmount);

    expect(await erc20.balanceOf(admin.address)).to.be.eq(initialTotal - approveAmount);
    expect(await erc20.balanceOf(Bob.address)).to.be.eq(approveAmount);
    expect(await erc20.allowance(admin.address, Alice.address)).to.be.eq(0);

    // await erc20.approve(Alice.address, 2**256-1);
    // console.log(2**256-1);

    // await erc20.connect(Alice).transferFrom(admin.address, Bob.address, approveAmount);

    // expect(await erc20.balanceOf(admin.address)).to.be.eq(initialTotal - approveAmount);
    // expect(await erc20.balanceOf(Bob.address)).to.be.eq(approveAmount);
    // expect(await erc20.allowance(admin.address, Alice.address)).to.be.eq(2**256-1);
  });
});
