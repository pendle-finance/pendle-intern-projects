import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { TestContract } from "../typechain";

describe("TestContract", () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let testContract: TestContract;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    testContract = await deploy<TestContract>("TestContract", []);
    await testContract.setTotal(100);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("increases total successfully", async () => {
    await testContract.increaseTotal(100);

    let curTotal = await testContract.getTotal();
    expect(curTotal).to.be.eq(200);
  });

  it("decreases total successfully", async () => {
    await testContract.decreaseTotal(50);

    let curTotal = await testContract.getTotal();
    expect(curTotal).to.be.eq(50);
  });
});
