import { expect } from "chai";
import { utils, BigNumber as BN, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, toWei } from "./helpers/hardhat-helpers";
import { PRECISION, ZERO_ADDRESS } from "./helpers/Constants";
import { ERC20, ERC20Public, Factory, Pair } from "../typechain";
import { assert } from "console";

describe("PairTest", async() => {
  const [admin, alice, bob] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory : Factory;
  let token0, token1: ERC20Public;
  let pair: Pair;

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

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("Constructor works", async() => {
    expect(await pair.MINIMUM_LIQUIDITY()).to.be.eq(1000);
    expect(await pair.factory()).to.be.eq(factory.address);
    expect(await pair.token0()).to.be.eq(token0.address);
    expect(await pair.token1()).to.be.eq(token1.address);
    expect(await pair.reserve0()).to.be.eq(0);
    expect(await pair.reserve1()).to.be.eq(0);
    expect(await pair.blockTimestampLast()).to.be.eq(0);
  });

  it("Initial provideLiquidity() works", async() => {
    /// provides 100 TK1 & 1 TK2 -> 10 LPT (multiplied by 10**18)
    await expect(pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18)))
      .to.emit(pair, "Mint").withArgs(ZERO_ADDRESS, 1000)
      .to.emit(pair, "Mint").withArgs(alice.address, toWei(10, 18).sub(1000))
      .to.emit(pair, "ProvideLiquidity").withArgs(alice.address, toWei(100, 18), toWei(1, 18))
      .to.emit(token0, "Transfer").withArgs(alice.address, pair.address, toWei(100, 18))
      .to.emit(token1, "Transfer").withArgs(alice.address, pair.address, toWei(1, 18))
      .to.emit(pair, "Sync").withArgs(toWei(100, 18), toWei(1, 18));
    
    expect(await pair.reserve0()).to.be.eq(toWei(100, 18));
    expect(await pair.reserve1()).to.be.eq(toWei(1, 18));
    expect(await token0.balanceOf(alice.address)).to.be.eq(toWei(99900, 18));
    expect(await token1.balanceOf(alice.address)).to.be.eq(toWei(99999, 18));
    expect(await token0.balanceOf(pair.address)).to.be.eq(toWei(100, 18));
    expect(await token1.balanceOf(pair.address)).to.be.eq(toWei(1, 18));
    expect(await pair.balanceOf(ZERO_ADDRESS)).to.be.eq(1000);
    expect(await pair.balanceOf(alice.address)).to.be.eq(toWei(10, 18).sub(1000));
    expect(await pair.totalSupply()).to.be.eq(toWei(10, 18));
  });

  it("Next provideLiquidity()s works", async() => {
    /// provides 100 TK1 & 1 TK2 -> 10 LPT (multiplied by 10**18)
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    expect(await pair.totalSupply()).to.be.eq(toWei(10, 18));

    /// provides 100 TK1 & 3 TK2 -> 10 LPT (multiplied by 10**18) [token0 ratio < token1 ratio]
    await expect(pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(3, 18)))
      .to.emit(pair, "Mint").withArgs(alice.address, toWei(10, 18));
    expect(await pair.totalSupply()).to.be.eq(toWei(20, 18));

    /// provides 300 TK1 & 6 TK2 -> 30 LPT (multiplied by 10**18) [token0 ratio = token1 ratio]
    await expect(pair.connect(alice).provideLiquidity(toWei(300, 18), toWei(6, 18)))
      .to.emit(pair, "Mint").withArgs(alice.address, toWei(30, 18));
    expect(await pair.totalSupply()).to.be.eq(toWei(50, 18));

    /// provides 300 TK1 & 2 TK2 -> 10 LPT (multiplied by 10**18) [token0 ratio > token1 ratio]
    await expect(pair.connect(alice).provideLiquidity(toWei(300, 18), toWei(2, 18)))
      .to.emit(pair, "Mint").withArgs(alice.address, toWei(10, 18));
    expect(await pair.totalSupply()).to.be.eq(toWei(60, 18));
  });

  it("getReserves() works", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    let [reserve0, reserve1, blockTimestampLast] = await pair.getReserves();
    expect(reserve0).to.be.eq(await pair.reserve0());
    expect(reserve1).to.be.eq(await pair.reserve1());
    expect(blockTimestampLast).to.be.eq((await ethers.provider.getBlock("latest")).timestamp);
  });

  it("kLast() works", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    expect(await pair.kLast()).to.be.eq(toWei(100, 36));
  });

  it("sync() works", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    await token0.connect(alice).transfer(pair.address, toWei(50, 18));
    await token1.connect(alice).transfer(pair.address, toWei(5, 18));
    expect(await pair.reserve0()).to.be.eq(toWei(100, 18));
    expect(await pair.reserve1()).to.be.eq(toWei(1, 18));
    await expect(pair.sync())
      .to.emit(pair, "Sync").withArgs(toWei(150, 18), toWei(6, 18));
    expect(await pair.reserve0()).to.be.eq(toWei(150, 18));
    expect(await pair.reserve1()).to.be.eq(toWei(6, 18));
  });

  it("removeLiquidity() works", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    await expect(pair.connect(alice).removeLiquidity(toWei(60, 18), toWei(6, 17)))
      .to.emit(pair, "Burn").withArgs(alice.address, toWei(6, 18))
      .to.emit(pair, "RemoveLiquidity").withArgs(alice.address, toWei(60, 18), toWei(6, 17))
      .to.emit(token0, "Transfer").withArgs(pair.address, alice.address, toWei(60, 18))
      .to.emit(token1, "Transfer").withArgs(pair.address, alice.address, toWei(6, 17))
      .to.emit(pair, "Sync").withArgs(toWei(40, 18), toWei(4, 17));

    expect(await pair.reserve0()).to.be.eq(toWei(40, 18));
    expect(await pair.reserve1()).to.be.eq(toWei(4, 17));
    expect(await token0.balanceOf(alice.address)).to.be.eq(toWei(99960, 18));
    expect(await token1.balanceOf(alice.address)).to.be.eq(toWei(999996, 17));
    expect(await token0.balanceOf(pair.address)).to.be.eq(toWei(40, 18));
    expect(await token1.balanceOf(pair.address)).to.be.eq(toWei(4, 17));
    expect(await pair.balanceOf(ZERO_ADDRESS)).to.be.eq(1000);
    expect(await pair.balanceOf(alice.address)).to.be.eq(toWei(4, 18).sub(1000));
    expect(await pair.totalSupply()).to.be.eq(toWei(4, 18));
  });

  it("removeLiquidity() max works and more that that fails", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18).add(126), toWei(1, 18).add(923));

    let aliceLiquidity = await pair.balanceOf(alice.address);
    let totalLiquidity = await pair.totalSupply();
    let [reserve0, reserve1, ] = await pair.getReserves();

    let amount0Out = reserve0.mul(aliceLiquidity).div(totalLiquidity);
    let amount1Out = reserve1.mul(aliceLiquidity).div(totalLiquidity);
    
    await expect(pair.connect(alice).removeLiquidity(amount0Out.add(1), 0))
      .to.be.revertedWith("Insufficient balance");
    await expect(pair.connect(alice).removeLiquidity(0, amount1Out.add(1)))
      .to.be.revertedWith("Insufficient balance");
    await expect(pair.connect(alice).removeLiquidity(amount0Out.add(1), amount1Out.add(1)))
      .to.be.revertedWith("Insufficient balance");
    await pair.connect(alice).removeLiquidity(amount0Out, amount1Out);
    expect(await pair.balanceOf(alice.address)).to.be.eq(0);
  });

  it("Unable to drain the whole pool", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1, 18));
    await expect(pair.connect(alice).removeLiquidity(toWei(100, 18), toWei(1, 18))).to.be.reverted;
    await pair.connect(alice).removeLiquidity(toWei(90, 18), toWei(9, 17));
  });

  it("swap() works", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1000, 18));
    
    /// amount0In - amount0Out = 25, amount1In - amount1Out = -200 (multiplied by 10**18)
    await expect(pair.connect(alice).swap(toWei(50, 18), toWei(100, 18), toWei(25, 18), toWei(300, 18)))
      .to.emit(token0, "Transfer").withArgs(alice.address, pair.address, toWei(50, 18))
      .to.emit(token1, "Transfer").withArgs(alice.address, pair.address, toWei(100, 18))
      .to.emit(token0, "Transfer").withArgs(pair.address, alice.address, toWei(25, 18))
      .to.emit(token1, "Transfer").withArgs(pair.address, alice.address, toWei(300, 18))
      .to.emit(pair, "Swap").withArgs(alice.address, toWei(50, 18), toWei(100, 18), toWei(25, 18), toWei(300, 18))
      .to.emit(pair, "Sync").withArgs(toWei(125, 18), toWei(800, 18));

    expect(await pair.reserve0()).to.be.eq(toWei(125, 18));
    expect(await pair.reserve1()).to.be.eq(toWei(800, 18));
    expect(await token0.balanceOf(pair.address)).to.be.eq(toWei(125, 18));
    expect(await token1.balanceOf(pair.address)).to.be.eq(toWei(800, 18));
  });

  it("swap() decreases k reverted", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1000, 18));
    await expect(pair.connect(alice).swap(toWei(25, 18), 0, 0, toWei(200, 18).add(1)))
      .to.be.revertedWith("Pair.swap: k decreases");
    await expect(pair.connect(alice).swap(0, toWei(250, 18), toWei(20, 18).add(1), 0))
      .to.be.revertedWith("Pair.swap: k decreases");
    await pair.connect(alice).swap(0, toWei(250, 18), toWei(20, 18), 0);
  });

  it("swap() out all of reserve reverted", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1000, 18));
    expect(pair.connect(alice).swap(toWei(10000, 18), 0, 0, toWei(1000, 18))).to.be.reverted;
    expect(pair.connect(alice).swap(toWei(10000, 18), 0, 0, toWei(1000, 18).add(1))).to.be.reverted;
    expect(pair.connect(alice).swap(toWei(10000, 18), 0, 0, toWei(1000, 18).sub(1))).to.be.reverted;
  });

  it("swap() transfer tokens in before out successful", async() => {
    await pair.connect(alice).provideLiquidity(toWei(100, 18), toWei(1000, 18));
    await pair.connect(alice).swap(toWei(10000, 18), toWei(1000, 18).sub(1), 0, toWei(1000, 18).add(1));
  })

  it("sync() with overflow reverted", async() => {
    await pair.sync();
    await token0.mintPublic(pair.address, BN.from(2).pow(112).sub(1));
    await pair.sync();
    await token0.mintPublic(pair.address, 1);
    await expect(pair.sync()).to.be.revertedWith("Pair._updateReserve: overflow");
  });
});
