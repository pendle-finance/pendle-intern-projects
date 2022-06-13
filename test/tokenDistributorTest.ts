import { expect } from "chai";
import { utils, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { TokenDistributor, ERC20 } from "../typechain";

describe("TestContract", () => {
  const [admin, alice, bob, charlie] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let distributorContract: TokenDistributor;
  let erc20: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    distributorContract = await deploy<TokenDistributor>("TokenDistributor", []);
    erc20 = await deploy<ERC20>('ERC20', [1000, "myToken", "mtk", 18]);
    // console.log("contract here", erc20.address);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
    await distributorContract.setERC20Token(erc20.address);
  });

  it("Owner set", async () => {
    const owner = await distributorContract.owner();
    expect(owner).to.be.eq(admin.address);
  });

  it("setting erc20 works", async () => {
    const setToken = await distributorContract.ERC20Contract();
    expect(setToken).to.be.eq(erc20.address);
  })

  it("updateClaimable works", async () => {
    
    await erc20.mint(admin.address, 100000);
    await erc20.transfer(distributorContract.address, 40);
    await distributorContract.updateClaimable(alice.address, 20, 40, {value:20});
    const aliceETHAllowance = await distributorContract.claimableETH(alice.address);
    const aliceERC20Allowance = await distributorContract.claimableERC20(alice.address);

    expect(aliceETHAllowance).to.be.eq(20);
    expect(aliceERC20Allowance).to.be.eq(40);

    await expect(distributorContract.updateClaimable(bob.address, 40, 0, {value:20})).to.revertedWith('Insufficient eth');

    await expect(distributorContract.connect(charlie).updateClaimable(bob.address, 40, 40, {value:40})).to.revertedWith('Only owner');

  });

  it("unauthorised claim", async () => {
    await expect(distributorContract.claim()).to.revertedWith('Invalid wallet address');
  });

  it("unauthorised updateClaimable", async () => {
    await expect(distributorContract.updateClaimable(alice.address, 20, 0)).to.revertedWith('Insufficient eth');
    await expect(distributorContract.updateClaimable(alice.address, 20, 20, {value:20})).to.revertedWith('Insufficient ERC20');
  });

  it('claim works', async () => {
    let aliceETHBalance = await ethers.provider.getBalance(alice.address);
    console.log("INITIAL: ", aliceETHBalance);

    await erc20.mint(admin.address, 100000);
    await erc20.transfer(distributorContract.address, 40);
    const amount = BigNumber.from(10).pow(18);
    await distributorContract.updateClaimable(alice.address, amount, 40, {value: amount});
    
    await distributorContract.connect(alice).claim();

    const aliceERC20Balance = await erc20.balanceOf(alice.address);
    expect(aliceERC20Balance).to.be.eq(40);

    aliceETHBalance = await ethers.provider.getBalance(alice.address);
    console.log("AFTER: ", aliceETHBalance);

  })


});
