import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "../helpers/hardhat-helpers";
import { ERC20, Router, LPFactory } from "../../typechain";
describe("Router", () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let coin1, coin2, coin3: ERC20;
  let factory: LPFactory;
  let router: Router;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    coin1 = await deploy<ERC20>("ERC20", [100, "peepeepoopoo", "PPPOPO", 1]);
    coin2 = await deploy<ERC20>("ERC20", [100, "poopoopeepee", "POPOPP", 1]);
    coin2 = await deploy<ERC20>("ERC20", [100, "peepoopeepoo", "PPOPPO", 1]);
    factory = await deploy<LPFactory>("LPFasctory", []);
    router = await deploy<Router>("router", [factory.address]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
  
});
