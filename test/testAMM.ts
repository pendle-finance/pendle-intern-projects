import { expect } from "chai";
import { Contract, utils, constants, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { AMMLPERC20, AMMFactory, AMMPair, TokenA, TokenB, IERC20 } from "../typechain";
// import "hardhat/console.sol";
import hre from 'hardhat';
import { Address } from "cluster";

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

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    myFactory = await deploy<AMMFactory>("AMMFactory", []);
    token0 = await deploy<TokenA>("TokenA", []);
    token1 = await deploy<TokenB>("TokenB", []);
    await myFactory.createPair(token0.address, token1.address);
    myPair = await getContractAt<AMMPair>("AMMPair", await myFactory.allPairs(0)); 

   
    // admin will receive 100,000 of tokenA and tokenB when both contracts are deployed, transfer 1000 to Alice and Bob each
    await token0.transfer(Alice.address, 1000)
    await token0.transfer(Bob.address, 1000)

    await token1.transfer(Alice.address, 1000);
    await token1.transfer(Bob.address, 1000);
    
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

  // describe("AMM Pair Contract", () => {
  //   it("mint successfully", async () => {
  //     // admin first mints
  //     await token0.transfer(myPair.address, 100);
  //     await token1.transfer(myPair.address, 100);
  //     await myPair.mint(admin.address);
  
  //     console.log(await myPair.reserve0(), await myPair.reserve1());
  
  //     // Alice mints
  //     await token0.connect(Alice).transfer(myPair.address, 100);
  //     await token1.connect(Alice).transfer(myPair.address, 100);
  //     await myPair.connect(Alice).mint(Alice.address);
      
  //     console.log(await myPair.reserve0(), await myPair.reserve1());
  
  //     console.log(await myPair.balanceOf(admin.address));
  //     console.log(await myPair.balanceOf(Alice.address));
  //   });
  
  //   it("burn successfully", async () => {
  //     await myPair.connect(Alice).transfer(myPair.address, 100);
  //     await myPair.connect(Alice).burn(Alice.address);
  
  //     console.log(await token0.balanceOf(Alice.address), await token1.balanceOf(Alice.address));
  //   });
  
  //   it("swap successfully", async () => {
  //     await token0.connect(Bob).transfer(myPair.address, 10);
  //     await myPair.connect(Bob).swap(0, 5, Bob.address);
  
  //     console.log(await token0.balanceOf(Alice.address), await token1.balanceOf(Alice.address));
  //   });
  // })


});