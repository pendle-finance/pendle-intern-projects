import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, toWei } from "./helpers/hardhat-helpers";
import { ERC20, PERC20, Router, LPFactory, LPPair, ILPPair } from "../typechain";
import { Address } from "cluster";
describe("Router", () => {
  const [admin, Alice, Bob, Dd] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let coin1, coin2, coin3: PERC20;
  let pair1, pair2: LPPair
  let factory: LPFactory;
  let router: Router;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    coin1 = await deploy<PERC20>("PERC20", [100, "peepeepoopoo", "PPPOPO", 1]);
    coin2 = await deploy<PERC20>("PERC20", [100, "poopoopeepee", "POPOPP", 1]);
    coin3 = await deploy<PERC20>("PERC20", [100, "peepoopeepoo", "PPOPPO", 1]);

    await coin1.mint(Alice.address, 1000000);
    await coin2.mint(Alice.address, 1000000);
    await coin3.mint(Alice.address, 1000000);

    await coin1.mint(Bob.address, 1000000);
    await coin2.mint(Bob.address, 1000000);
    await coin3.mint(Bob.address, 1000000);

    factory = await deploy<LPFactory>("LPFactory", []);
    router = await deploy<Router>("Router", [factory.address]);
    await factory.deployed();

    await factory.createPair(coin1.address, coin2.address);
    await factory.createPair(coin2.address, coin3.address);

    let pair1Address = await factory.getPair(coin1.address, coin2.address);
    let pair2Address = await factory.getPair(coin2.address, coin3.address);

    pair1 = await ethers.getContractAt("LPPair", pair1Address);
    pair2 = await ethers.getContractAt("LPPair", pair2Address);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
  describe('test factory', () => { 
    it("trigger identical address",async () => {
        await expect(factory.createPair(coin1.address,coin1.address)).to.be.revertedWith('Identical token');
    })
    it("Trigger already create pair",async () => {
        await expect(factory.createPair(coin1.address,coin2.address)).to.be.revertedWith("Pair already exist");
    })
    it('Test length function',async () => {
        await factory.createPair(coin1.address,coin3.address);
        let len = await factory.allPairsLength();
        expect(len).to.be.equal(3);
    })
  })
  describe("tets pair scpecial case", async () => {
    it("test add liquidity",async () => {
      await coin1.connect(Alice).approve(pair1.address, 1000);
      await coin2.connect(Alice).approve(pair1.address, 10);
      await pair1.connect(Alice).addLiquidity(1000,10);
      expect(await coin2.balanceOf(Alice.address)).to.be.equal(1000000-10);
      expect(await coin1.balanceOf(Alice.address)).to.be.equal(1000000-1000);

      // add token with different ratio
      await coin1.connect(Bob).approve(pair1.address, 2000);
      await coin2.connect(Bob).approve(pair1.address, 10);
      await pair1.connect(Bob).addLiquidity(2000,10);
      expect(await coin2.balanceOf(Bob.address)).to.be.equal(1000000-10);
      expect(await coin1.balanceOf(Bob.address)).to.be.equal(1000000-1000);
    })  
    //direct contact with pair
    it("add liquidity",async () => {
      await coin1.connect(Alice).approve(pair1.address, 1000);
      await coin2.connect(Alice).approve(pair1.address, 10);
      await pair1.connect(Alice).addLiquidity(1000,10);
      expect(await pair1.balanceOf(Alice.address)).to.be.equal(100);
    });
    it("remove liquidity",async () => {
      await coin1.connect(Alice).approve(pair1.address, 1000);
      await coin2.connect(Alice).approve(pair1.address, 10);
      await pair1.connect(Alice).addLiquidity(1000,10);
      expect(await pair1.balanceOf(Alice.address)).to.be.equal(100);
      await pair1.connect(Alice).burn(Alice.address,100);
      expect(await pair1.balanceOf(Alice.address)).to.be.eq(0);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(1000000);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(1000000);

    });
    it("swap",async() => {
      await coin1.connect(Alice).approve(pair1.address, 1000);
      await coin2.connect(Alice).approve(pair1.address, 10);
      await pair1.connect(Alice).addLiquidity(1000,10);

      await coin2.connect(Alice).approve(pair1.address, 10);
      await pair1.connect(Alice).swapToken(coin2.address,10);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(1000000-20);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(1000000-500);

    })
  })
  describe("add liquidity", () => { 

    it("test addliquidity: standard", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(100);

      
    });

    it("test addliquidity: multi", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(100);

      await coin1.connect(Bob).approve(router.address, 1000);
      await coin2.connect(Bob).approve(router.address, 1000);

      await router.connect(Bob).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Bob.address);

      expect(await pair1.balanceOf(Bob.address)).to.be.eq(100);

    });

    it("test addliquidity: emit", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      expect(await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address))
        .to.emit(pair1, 'Mint')
        .withArgs(router.address, 100, 100);

    });

  });

  //currently incorrect rate. core need fixing.
  describe("remove liquidity", () => {  

    it("test removeliquidity: standard", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(100);

      await pair1.connect(Alice).approve(router.address, 100);

      expect(await router.connect(Alice).removeLiquidity(coin1.address, coin2.address,100, 99, 99, Alice.address));

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(0);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(1000000);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(1000000);

    });

    it("test removeliquidity: multi", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(100);

      await coin1.connect(Bob).approve(router.address, 1000);
      await coin2.connect(Bob).approve(router.address, 1000);

      await router.connect(Bob).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Bob.address);

      expect(await pair1.balanceOf(Bob.address)).to.be.eq(100);

      await pair1.connect(Bob).approve(router.address, 100);
      await router.connect(Bob).removeLiquidity(coin1.address, coin2.address,100, 99, 99, Bob.address);

      expect(await pair1.balanceOf(Bob.address)).to.be.eq(0);
      expect(await coin1.balanceOf(Bob.address)).to.be.eq(1000000);
      expect(await coin2.balanceOf(Bob.address)).to.be.eq(1000000);

      await pair1.connect(Alice).approve(router.address, 10000);
      await router.connect(Alice).removeLiquidity(coin1.address, coin2.address,100, 99, 99, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(0);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(1000000);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(1000000);

    });

    it("test removeliquidity: emit", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 100, 0, 0, Alice.address);

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(100);

      await pair1.connect(Alice).approve(router.address, 100);

      expect(await router.connect(Alice).removeLiquidity(coin1.address, coin2.address,100, 99, 99, Alice.address))
        .to.emit(pair1, 'Burn')
        .withArgs(router.address, 100, 100, Alice.address);;

      expect(await pair1.balanceOf(Alice.address)).to.be.eq(0);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(1000000);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(1000000);

    });

  });

  describe("swap exact in", () => { 

    it("test swapexactin: single", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);
      await coin3.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 200, 0, 0, Alice.address);
      await router.connect(Alice).addLiquidity(coin2.address, coin3.address, 100, 200, 0, 0, Alice.address);

      let coins : Array<string> = [coin1.address, coin2.address];
      await coin1.connect(Bob).approve(router.address, 100);
      expect(await router.connect(Bob).swapExactIn(100, 99, coins, Bob.address));

      expect(await coin1.balanceOf(Bob.address)).to.be.eq(999900);
      expect(await coin2.balanceOf(Bob.address)).to.be.eq(1000100);

    });

    it("test swapexactin: multi", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);
      await coin3.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 200, 0, 0, Alice.address);
      await router.connect(Alice).addLiquidity(coin2.address, coin3.address, 100, 200, 0, 0, Alice.address);

      let coins : Array<string> = [coin1.address, coin2.address, coin3.address];
      await coin1.connect(Bob).approve(router.address, 100);
      expect(await router.connect(Bob).swapExactIn(100, 99, coins, Bob.address));

      expect(await coin1.balanceOf(Bob.address)).to.be.eq(999900);
      expect(await coin3.balanceOf(Bob.address)).to.be.eq(1000100);

    });

  });

  describe("swap exact out", () => { 

    it("test swapexactout: single", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);
      await coin3.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 200, 0, 0, Alice.address);
      await router.connect(Alice).addLiquidity(coin2.address, coin3.address, 100, 200, 0, 0, Alice.address);

      let coins : Array<string> = [coin1.address, coin2.address];
      await coin1.connect(Bob).approve(router.address, 1000);
      expect(await router.connect(Bob).swapExactOut(100, 101, coins, Bob.address));

      expect(await coin1.balanceOf(Bob.address)).to.be.eq(999899);
      expect(await coin2.balanceOf(Bob.address)).to.be.eq(1000100);

    });

    it("test swapexactout: multi", async () =>{

      await coin1.connect(Alice).approve(router.address, 1000);
      await coin2.connect(Alice).approve(router.address, 1000);
      await coin3.connect(Alice).approve(router.address, 1000);

      await router.connect(Alice).addLiquidity(coin1.address, coin2.address, 100, 200, 0, 0, Alice.address);
      await router.connect(Alice).addLiquidity(coin2.address, coin3.address, 100, 200, 0, 0, Alice.address);

      let coins : Array<string> = [coin1.address, coin2.address, coin3.address];
      await coin1.connect(Bob).approve(router.address, 1000);
      expect(await router.connect(Bob).swapExactOut(100, 105, coins, Bob.address));

      expect(await coin1.balanceOf(Bob.address)).to.be.eq(999897);
      expect(await coin3.balanceOf(Bob.address)).to.be.eq(1000100);

    });

  });
});
