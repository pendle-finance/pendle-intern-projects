import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, Distributor } from "../typechain";

describe("Test ERC20", () => {
  const [admin, Alice, Bob, Dd] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let coin1: ERC20;
  let coin2: ERC20;
  let dist: Distributor;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    [] = await ethers.getSigners();

    coin1 = await deploy<ERC20>("ERC20", [100, "peepeepoopoo", "PPPOPO", 5]);
    coin2 = await deploy<ERC20>("ERC20", [100, "poopoopeepee", "POPOPP", 5]);
    dist = await deploy<Distributor>("Distributor", []);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("view only functions", () => {
    it("thingy", async () => {
    });
  });
});
