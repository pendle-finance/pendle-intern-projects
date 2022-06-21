import { expect } from "chai";
import { Contract, utils, constants, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, AMMFactory, AMMPair, IERC20 } from "../typechain";
// import "hardhat/console.sol";
import hre from 'hardhat';
import { Address } from "cluster";

export async function getContractAt<CType extends Contract>(abiType: string, address: string) {
    return (await hre.ethers.getContractAt(abiType, address)) as CType;
  }

describe("TestTokenDistribute", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let myFactory: AMMFactory;
  let myPair: AMMPair;

  let token0: ERC20;
  let token1: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    myFactory = await deploy<AMMFactory>("AMMFactory", []);
    token0 = await deploy<ERC20>("ERC20", [1000]);
    token1 = await deploy<ERC20>("ERC20", [1000]);
    await myFactory.createPair(token0.address, token1.address);
    myPair = await getContractAt<AMMPair>("AMMPair", await myFactory.allPairs(0)); 

    token0.transfer(Alice.address, 500);
    token1.transfer(Alice.address, 500);
    
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("Factory and a Pair created successfully", async () => {
    expect(await myFactory.allPairsLength()).to.be.eq(1);
    expect(await myFactory.allPairs(0)).to.be.eq(myPair.address);
    expect(await myFactory.getPair(token0.address, token1.address)).to.be.eq(myPair.address);  //check token0.address < token1.address first 

    expect(await myPair.factory()).to.be.eq(myFactory.address);
    expect(await myPair.token0()).to.be.eq(token0.address);
    expect(await myPair.token1()).to.be.eq(token1.address);
  });

  it("mint successfully", async () => {
    // expect(await tokenDistribute.contractOwner()).to.be.eq(admin.address);
    await token0.transfer(myPair.address, 100);
    await token1.transfer(myPair.address, 100);
    await myPair.mint(admin.address);

    await token0.connect(Alice).transfer(myPair.address, 100);
    await token1.connect(Alice).transfer(myPair.address, 100);
    await myPair.connect(Alice).mint(Alice.address);

    console.log(await myPair.balanceOf(admin.address));
    console.log(await myPair.balanceOf(Alice.address));
  });



});