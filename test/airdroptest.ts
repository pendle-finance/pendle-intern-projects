import { expect } from "chai";
import { BigNumber, utils, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TestContract, Airdrop } from "../typechain";

describe("Test Airdrop", () => {
  const [admin, Alice, Bob, Charlie, Dave] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let firstnewERC20: ERC20;
  let secondnewERC20: ERC20;
  let newAirdrop: Airdrop;
  let totalBalance = BigNumber.from(10).pow(30);
  let DEPOSIT_AMOUNT = BigNumber.from(10).pow(22);
  let AIRDROP_AMOUNT = BigNumber.from(10).pow(18);
  before(async () => {
    globalSnapshotId = await evm_snapshot();

    firstnewERC20 = await deploy<ERC20>("ERC20", [totalBalance, "Token1", "ABC", "18"]);
    secondnewERC20 = await deploy<ERC20>("ERC20", [totalBalance, "Token2", "XYZ", "18"]);

    newAirdrop = await deploy<Airdrop>("Airdrop", []);
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  /**
   * Test description:
   * 
   * The contract is deployed
   * Two ERC tokens + some ETH are transferred here
   * Alice and Bob are allowed some tokens
   * Alice and Bob withdraw these tokens (withdraw must be done in one transaction)
   */
  it("Airdrop test", async () => {
    // contract is already deployed

    // transfer two ERC tokens + some ETH here
    await firstnewERC20.transfer(newAirdrop.address, DEPOSIT_AMOUNT);
    await secondnewERC20.transfer(newAirdrop.address, DEPOSIT_AMOUNT);
    await admin.sendTransaction({
      to: newAirdrop.address,
      value: BigNumber.from(10).pow(22),
    })
    console.log('--- Transferred two ERC + ETH ---');

    // Make an allowance for Alice + Bob on these two tokens
    // Alice
    await newAirdrop.alowERC20(Alice.address, firstnewERC20.address, AIRDROP_AMOUNT);
    await newAirdrop.alowERC20(Alice.address, secondnewERC20.address, AIRDROP_AMOUNT);
    await newAirdrop.allowETH(Alice.address, AIRDROP_AMOUNT);
    // Bob
    await newAirdrop.alowERC20(Bob.address, firstnewERC20.address, AIRDROP_AMOUNT);
    await newAirdrop.alowERC20(Bob.address, secondnewERC20.address, AIRDROP_AMOUNT);
    await newAirdrop.allowETH(Bob.address, AIRDROP_AMOUNT);

    console.log('--- Allowance made ---');

    // now they claim
    let aliceBefore = await ethers.provider.getBalance(Alice.address);
    let bobBefore = await ethers.provider.getBalance(Bob.address);

    let txA = await newAirdrop.connect(Alice).claim([firstnewERC20.address, secondnewERC20.address], [AIRDROP_AMOUNT, AIRDROP_AMOUNT], true, AIRDROP_AMOUNT);
    let receiptA = await txA.wait();
    let gasA = receiptA.gasUsed.mul(receiptA.effectiveGasPrice);

    let txB = await newAirdrop.connect(Bob).claim([firstnewERC20.address, secondnewERC20.address], [AIRDROP_AMOUNT, AIRDROP_AMOUNT], true, AIRDROP_AMOUNT);
    let receiptB = await txB.wait();
    let gasB = receiptB.gasUsed.mul(receiptB.effectiveGasPrice);

    let aliceAfter = await ethers.provider.getBalance(Alice.address);
    let bobAfter = await ethers.provider.getBalance(Bob.address);

    console.log('--- Claimed airdrop ---');

    // finally, their balance should be as intended
    let aliceBalance1 = await firstnewERC20.balanceOf(Alice.address);
    let aliceBalance2 = await secondnewERC20.balanceOf(Alice.address);
    let aliceETHClaim = aliceAfter.sub(aliceBefore).add(gasA);

    let bobBalance1 = await firstnewERC20.balanceOf(Bob.address);
    let bobBalance2 = await secondnewERC20.balanceOf(Bob.address);
    let bobETHClaim = bobAfter.sub(bobBefore).add(gasB); 

    expect(aliceBalance1).to.be.equal(AIRDROP_AMOUNT);
    expect(aliceBalance2).to.be.equal(AIRDROP_AMOUNT);
    expect(aliceETHClaim).to.be.equal(AIRDROP_AMOUNT);

    expect(bobBalance1).to.be.equal(AIRDROP_AMOUNT);
    expect(bobBalance2).to.be.equal(AIRDROP_AMOUNT);
    expect(bobETHClaim).to.be.equal(AIRDROP_AMOUNT);

    console.log('--- Balance is OK ---');
  })
});