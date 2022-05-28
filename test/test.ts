import { expect } from "chai";
import { utils, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TestContract } from "../typechain";

describe("TestContract", () => {
  const [admin,addr1,addr2] = waffle.provider.getWallets();
  //Wallet;
  let globalSnapshotId;
  let snapshotId;
  let newERC20: ERC20;
  before(async () => {
    globalSnapshotId = await evm_snapshot();

    newERC20 = await deploy<ERC20>("ERC20", []);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
  //   0x6824c889f6EbBA8Dac4Dd4289746FCFaC772Ea56
  //   0xCFf94465bd20C91C86b0c41e385052e61ed49f37
  //   0xEBAf3e0b7dBB0Eb41d66875Dd64d9F0F314651B3
  //   0xbFe6D5155040803CeB12a73F8f3763C26dd64a92
  // it("increases total successfully", async () => {
  //   await testContract.increaseTotal(100);

  //   let curTotal = await testContract.getTotal();
  //   expect(curTotal).to.be.eq(200);
  // });
  it("test get total supply",async () => {
    let total = await newERC20.totalSupply();
    expect(total).to.be.eq(100000);
  })
  
  it("test get balances of admin",async () => {
    let total = await newERC20.balanceOf(admin.address);
    expect(total).to.be.eq(100000);
  })

  it("test get balances of user",async () => {
    let total = await newERC20.connect(addr1).balanceOf(addr1.address);
    expect(total).to.be.eq(0);
  })

  it("test transfer",async () => {
    await newERC20.connect(admin).transfer(addr1.address,1000);
    let total2 = await newERC20.connect(admin).balanceOf(addr1.address);
    expect(total2).to.be.eq(1000);
  })
  
  it("test allowance",async () => {
    let allow_ori  = await newERC20.allowance(admin.address,addr1.address);
    expect(allow_ori).to.be.eq(0);
    await newERC20.approve(addr1.address,2000);
    let allow_after  = await newERC20.allowance(admin.address,addr1.address);
    expect(allow_after).to.be.eq(2000);
  })

  it("test transferFrom",async () => {
    let allow_ori  = await newERC20.allowance(admin.address,addr1.address);
    expect(allow_ori).to.be.eq(0);
    await newERC20.approve(addr1.address,2000);
    let allow_after  = await newERC20.allowance(admin.address,addr1.address);
    expect(allow_after).to.be.eq(2000);
    await newERC20.connect(addr1).transferFrom(admin.address,addr1.address,1000);
    let ad1Balance = await newERC20.balanceOf(addr1.address);
    expect(ad1Balance).to.be.eq(1000);
  })
  // it("decreases total successfully", async () => {
  //   await testContract.decreaseTotal(50);

  //   let curTotal = await testContract.getTotal();
  //   expect(curTotal).to.be.eq(50);
  // });
});
