import { expect } from "chai";
import { Contract, utils, constants, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { AMMLPERC20, AMMFactory, AMMPair, TokenA, TokenB, IERC20 } from "../typechain";
// import "hardhat/console.sol";
import hre from 'hardhat';
import { Address } from "cluster";
import { ZERO } from "./helpers/Constants";

export async function getContractAt<CType extends Contract>(abiType: string, address: string) {
    return (await hre.ethers.getContractAt(abiType, address)) as CType;
  }

describe("AMM Test", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let myFactory: AMMFactory;
  let myPair: AMMPair;

  let token0: TokenA;
  let token1: TokenB;
  let aliceBalance;
  let bobBalance;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    myFactory = await deploy<AMMFactory>("AMMFactory", []);
    token0 = await deploy<TokenA>("TokenA", []);
    token1 = await deploy<TokenB>("TokenB", []);
    await myFactory.createPair(token0.address, token1.address);
    myPair = await getContractAt<AMMPair>("AMMPair", await myFactory.allPairs(0)); 

   
    // admin will receive 100,000 of tokenA and tokenB when both contracts are deployed, transfer 10,000 to Alice and Bob each
    await token0.transfer(Alice.address, 10000)
    await token0.transfer(Bob.address, 10000)

    await token1.transfer(Alice.address, 10000);
    await token1.transfer(Bob.address, 10000);
    
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

 describe("AMM Factory Contract Test",()=> {
  it("Factory and a Pair created successfully", async () => {
    expect(await myFactory.allPairsLength()).to.be.eq(1);
    expect(await myFactory.allPairs(0)).to.be.eq(myPair.address);
    expect(await myFactory.getPair(token0.address, token1.address)).to.be.eq(myPair.address);  //check token0.address < token1.address first 

    expect(await myPair.factory()).to.be.eq(myFactory.address);
    expect(await myPair.token0()).to.be.eq(token0.address);
    expect(await myPair.token1()).to.be.eq(token1.address);
  });

 })

 describe("TokenA & TokenB Pre-Initialisation Status",()=> {
  it("should TRANSFER both Alice and Bob 10,000 worth of Token A", async () => {
      aliceBalance = await token0.balanceOf(Alice.address);
      bobBalance = await token0.balanceOf(Bob.address);

      expect(aliceBalance).to.be.eq(BigNumber.from(10000));
      expect(bobBalance).to.be.eq(BigNumber.from(10000));
  });

  it("should TRANSFER both Alice and Bob 10,000 worth of Token B", async () => {
    aliceBalance = await token1.balanceOf(Alice.address);
    bobBalance = await token1.balanceOf(Bob.address);

    expect(aliceBalance).to.be.eq(BigNumber.from(10000));
    expect(bobBalance).to.be.eq(BigNumber.from(10000));
});

 })

 describe("AMM Pair Contract Initialisation Status", () => {
  it("should REGISTER token A and token B as token0 and token1", async () => {
    let token0Addr = await myPair.token0()
    expect(token0Addr).to.be.eq(token0.address);

    let token1Addr = await myPair.token1();
    expect(token1Addr).to.be.eq(token1.address);

 })

 it("should INITIALISE both reserves as empty", async () => {
  let reserve0Amt = await myPair.reserve0();
  expect(reserve0Amt).to.be.eq(ZERO);

  let reserve1Amt = await myPair.reserve1();
  expect(reserve1Amt).to.be.eq(ZERO);
})
})

  describe("AMM Pair Contract Liquidity Provision", () => {
    it("should ALLOW Liquidity Provider to successfully add liquidity (10,000 tokenA, 10,000 tokenB) and receive (10,000 - 1000 = 9000) LP tokens", async () => {
      await token0.approve(myPair.address, 100000);
      await token1.approve(myPair.address, 100000);
      await myPair.addLiquidity(10000,10000,10000,10000);

    });

    it("should EMIT Mint event when a liquidity provider successfully adds liquidity to the pool", async () => {
      await token0.approve(myPair.address, 100000);
      await token1.approve(myPair.address, 100000);
      await expect(myPair.addLiquidity(10000,10000,10000,10000)).to.emit(myPair, 'Mint').withArgs(admin.address, 10000, 10000);

    });

    it("should REVERT when a Liquidity Provider to successfully add liquidity (1000 tokenA, 1000 tokenB) since its lower than the minimum liquidity threshold.", async () => {
      await token0.approve(myPair.address, 100000);
      await token1.approve(myPair.address, 100000);
     
     await expect(myPair.addLiquidity(1000,1000,1000,1000)).to.be.revertedWith("Insufficient liquidity");
    });

    it("should MINT LP Tokens proportional to the contribution of the pool after liquidity has been added.", async () => {
      await token0.approve(myPair.address, 100000);
      await token1.approve(myPair.address, 100000);
     
      await expect(myPair.addLiquidity(10000,10000,10000,10000)).to.emit(myPair, 'Mint').withArgs(admin.address, 10000, 10000);

      await token0.connect(Alice).approve(myPair.address, 100000);
      await token1.connect(Alice).approve(myPair.address, 100000);
     
      await expect(myPair.connect(Alice).addLiquidity(10000,10000,9000,9000)).to.emit(myPair, 'Mint').withArgs(Alice.address, 10000, 10000);
           console.log("Alice LP Balance",await myPair.balanceOf(Alice.address));
    });
  })


  describe("AMM Pair Contract Liquidity Removal", () => {

    beforeEach(async () => {
      // Admin contributes 10,000 tokenA and tokenB
      await token0.approve(myPair.address, 100000);
      await token1.approve(myPair.address, 100000);
      await myPair.addLiquidity(10000,10000,10000,10000);

      // Alice contributes 10,000 tokenA and tokenB
      await token0.connect(Alice).approve(myPair.address, 100000);
      await token1.connect(Alice).approve(myPair.address, 100000);
      await myPair.connect(Alice).addLiquidity(10000,10000,9000,9000);

       // Bob contributes 10,000 tokenA and tokenB
       await token0.connect(Bob).approve(myPair.address, 100000);
       await token1.connect(Bob).approve(myPair.address, 100000);
       await myPair.connect(Bob).addLiquidity(10000,10000,9000,9000);
    })

    it("should MINT 9,000 LP tokens to Admin, 10,000 LP tokens to Alice and 10,000 LP tokens to Bob.", async () => {
      let adminBalance = await myPair.balanceOf(admin.address);
      aliceBalance = await myPair.balanceOf(Alice.address);
      bobBalance = await myPair.balanceOf(Bob.address);

      expect(adminBalance).to.be.eq(BigNumber.from(9000));
      expect(aliceBalance).to.be.eq(BigNumber.from(10000))
      expect(bobBalance).to.be.eq(BigNumber.from(10000))
    })

    it("should ALLOW Liquidity Provider to successfully remove liquidity by trading in LP Tokens and receive tokenA & tokenB proportionally.", async () => {
      let initialToken0AdminBalance = await token0.balanceOf(admin.address);
      let initialToken1AdminBalance = await token1.balanceOf(admin.address);
      await myPair.removeLiquidity(9000, 0,0)

      let postToken0AdminBalance = await token0.balanceOf(admin.address);
      let postToken1AdminBalance = await token1.balanceOf(admin.address);
      
      expect(postToken0AdminBalance.sub(initialToken0AdminBalance)).to.be.eq(9000);
      expect(postToken1AdminBalance.sub(initialToken1AdminBalance)).to.be.eq(9000);


      let initialToken0AliceBalance = await token0.balanceOf(Alice.address);
      let initialToken1AliceBalance = await token1.balanceOf(Alice.address);
      await myPair.connect(Alice).removeLiquidity(5000,0,0)
      let postToken0AliceBalance = await token0.balanceOf(Alice.address);
      let postToken1AliceBalance = await token1.balanceOf(Alice.address);


      expect(postToken0AliceBalance.sub(initialToken0AliceBalance)).to.be.eq(5000);
      expect(postToken1AliceBalance.sub(initialToken1AliceBalance)).to.be.eq(5000);
      // console.log("Alice token0 Balance",await token0.balanceOf(Alice.address));
      // console.log("Alice token1 Balance",await token1.balanceOf(Alice.address));
    })
  })


});