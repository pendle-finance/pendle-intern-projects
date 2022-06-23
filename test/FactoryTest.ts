import { expect } from "chai";
import { utils, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { PRECISION, ZERO_ADDRESS } from "./helpers/Constants";
import { Factory } from "../typechain";

xdescribe("FactoryTest", () => {
  const [admin, alice, bob, charlie] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    factory = await deploy<Factory>('Factory', []);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  //!TO DO 
  it("createPair works", async () => {
    await factory.createPair("0x2ba592F78dB6436527729929AAf6c908497cB200", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    const pairAddress = await factory.getPair("0x2ba592F78dB6436527729929AAf6c908497cB200", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
    const pair = await factory.allPairs(0);
    expect(pairAddress).to.be.eq(pair);
  });

  it("cannot create same token pair", async () => {
    const creamToken = "0x2ba592F78dB6436527729929AAf6c908497cB200";
    await expect(factory.createPair(creamToken, creamToken)).to.be.revertedWith("Same token");
  })

  it("cannot create existing token pair", async () => {
    const creamToken = "0x2ba592F78dB6436527729929AAf6c908497cB200";
    const usdcToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    await factory.createPair(creamToken, usdcToken);

    await expect(factory.createPair(usdcToken, creamToken)).to.be.revertedWith("Pair exists");
    await expect(factory.createPair(creamToken, usdcToken)).to.be.revertedWith("Pair exists");
  });

  it("cannot create invalid pair", async () => {
    const creamToken = "0x2ba592F78dB6436527729929AAf6c908497cB200";
    await expect(factory.createPair(creamToken, ZERO_ADDRESS)).to.be.revertedWith("Invalid token address");
  });

  //!TO DO
  it("PairCreated emitted", async () => {
    const creamToken = "0x2ba592F78dB6436527729929AAf6c908497cB200";
    const usdcToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    // await expect(factory.createPair(creamToken, usdcToken)).to.emit(factory, "PairCreated").withArgs(creamToken, usdcToken, ???);
  });

});
