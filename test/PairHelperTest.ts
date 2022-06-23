import { expect } from "chai";
import { utils, BigNumber as BN, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, toWei } from "./helpers/hardhat-helpers";
import { PRECISION, ZERO_ADDRESS } from "./helpers/Constants";
import { ERC20, ERC20Public, Factory, Pair, PairHelperClient } from "../typechain";
import { assert } from "console";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";

describe("PairHelperTest", async() => {
  const [admin, alice, bob] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory : Factory;
  let token0, token1: ERC20Public;
  let pair: Pair;
  let client: PairHelperClient;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    factory = await deploy<Factory>('Factory', []);
    token0 = await deploy<ERC20Public>('ERC20Public', ['Token 0', 'TK0']);
    token1 = await deploy<ERC20Public>('ERC20Public', ['Token 1', 'TK1']);

    await factory.createPair(token0.address, token1.address);
    let pairAddress = await factory.getPair(token0.address, token1.address);
    pair = (await ethers.getContractAt("Pair", pairAddress)) as Pair;

    if (token0.address > token1.address) {
      [token0, token1] = [token1, token0];
    }

    await token0.mintPublic(alice.address, toWei(100000, 18));
    await token1.mintPublic(alice.address, toWei(100000, 18));

    await token0.connect(alice).approve(pair.address, toWei(100000, 18));
    await token1.connect(alice).approve(pair.address, toWei(100000, 18));

    let helperFactory = await ethers.getContractFactory("PairHelper");
    let helper = await helperFactory.deploy();
    await helper.deployed();

    let testFactory = await ethers.getContractFactory("PairHelperClient", {
      libraries: {
        PairHelper: helper.address
      }
    });
    client = await testFactory.deploy(pair.address);
    await client.deployed();

    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1000, 18));
    await token0.mintPublic(client.address, toWei(100000, 18));
    await token1.mintPublic(client.address, toWei(100000, 18));

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("provideLiquidityByToken() works", async() => {
    await expect(client.provideLiquidityByToken(toWei(9, 18)))
      .to.emit(pair, "Mint").withArgs(client.address, toWei(9, 18));
  });

  it("removeLiquidityByToken() works", async() => {
    await client.provideLiquidityByToken(toWei(9, 18));
    await expect(client.removeLiquidityByToken(toWei(7, 18)))
      .to.emit(pair, "Burn").withArgs(client.address, toWei(7, 18));
  });

  it("swapExactIn0() works", async() => {
    await expect(client.swapExactIn0(toWei(6, 18)))
      .to.emit(token0, "Transfer").withArgs(client.address, pair.address, toWei(6, 18));
  });

  it("swapExactOut0() works", async() => {
    await expect(client.swapExactOut0(toWei(6, 18)))
      .to.emit(token0, "Transfer").withArgs(pair.address, client.address, toWei(6, 18));
  });

  it("swapExactIn1() works", async() => {
    await expect(client.swapExactIn1(toWei(6, 18)))
      .to.emit(token1, "Transfer").withArgs(client.address, pair.address, toWei(6, 18));
  });

  it("swapExactOut1() works", async() => {
    await expect(client.swapExactOut1(toWei(6, 18)))
      .to.emit(token1, "Transfer").withArgs(pair.address, client.address, toWei(6, 18));
  });
});
