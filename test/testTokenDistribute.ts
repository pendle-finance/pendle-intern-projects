import { expect } from "chai";
import { Contract, utils, constants, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TokenDistribute } from "../typechain";
// import "hardhat/console.sol";
import hre from 'hardhat';

describe("TestTokenDistribute", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let tokenDistribute: TokenDistribute;
  let erc20A: ERC20;
  let erc20B: ERC20;

  const name = "VuongTungDuongv2";
  const symbol = "VTD-V2";
  const decimals = 18;
  const totalSupply = 1000;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    tokenDistribute = await deploy<TokenDistribute>("TokenDistribute", []);
    erc20A = await deploy<ERC20>("ERC20", [name, symbol, decimals, totalSupply]);
    erc20B = await deploy<ERC20>("ERC20", [name, symbol, decimals, totalSupply]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("test constructor successfully", async () => {
    expect(await tokenDistribute.contractOwner()).to.be.eq(admin.address);
  });

  it("test owner modifier successfully", async () => {
    await expect(tokenDistribute.connect(Alice).depositErc20(erc20A.address, 0)).to.be.revertedWith("not the owner of the contract");
    await expect(tokenDistribute.connect(Alice).distributeErc20(erc20A.address, Bob.address, 0)).to.be.revertedWith("not the owner of the contract");
    await expect(tokenDistribute.connect(Alice).distributeNative(Bob.address, 0)).to.be.revertedWith("not the owner of the contract");
  });

  it("Anton approves erc20A to the contract and distribute to interns successfully", async () => {
    let totalAmount = 20;
    await erc20A.approve(tokenDistribute.address, totalAmount);
    await tokenDistribute.depositErc20(erc20A.address, totalAmount);
    expect(await erc20A.balanceOf(tokenDistribute.address)).to.be.eq(totalAmount);

    let AliceAmount = 12;
    let BobAmount = 8;

    await expect(tokenDistribute.withdrawErc20(erc20A.address, Alice.address)).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.distributeErc20(erc20A.address, constants.AddressZero, AliceAmount)).to.be.revertedWith("invalid receiver");

    await tokenDistribute.distributeErc20(erc20A.address, Alice.address, AliceAmount);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Alice.address)).to.be.eq(AliceAmount);
    expect(await tokenDistribute.distributedErc20(erc20A.address)).to.be.eq(AliceAmount);

    await expect(tokenDistribute.distributeErc20(erc20A.address, Bob.address, BobAmount+1)).to.be.revertedWith("not enough token to distribute");
    await tokenDistribute.distributeErc20(erc20A.address, Bob.address, BobAmount);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Bob.address)).to.be.eq(BobAmount);
    expect(await tokenDistribute.distributedErc20(erc20A.address)).to.be.eq(AliceAmount+BobAmount);

    await tokenDistribute.withdrawErc20(erc20A.address, Alice.address);
    expect(await erc20A.balanceOf(Alice.address)).to.be.eq(AliceAmount);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Alice.address)).to.be.eq(0);
    expect(await tokenDistribute.distributedErc20(erc20A.address)).to.be.eq(BobAmount);
  });

  it("Anton approves erc20A to the contract and distribute to interns in batch successfully", async () => {
    let totalAmount = 20;
    await erc20A.approve(tokenDistribute.address, totalAmount);
    await tokenDistribute.depositErc20(erc20A.address, totalAmount);

    await tokenDistribute.batchdistributeErc20(erc20A.address, [Alice.address, Bob.address], totalAmount/2);

    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Alice.address)).to.be.eq(totalAmount/2);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Bob.address)).to.be.eq(totalAmount/2);
  });

  it("Anton transfers ETH to the contract and distribute to the intern successfully", async () => {
    let amount = 1e10;

    await admin.sendTransaction({to: tokenDistribute.address, value: amount});

    await expect(tokenDistribute.withdrawNative(Alice.address)).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.distributeNative(constants.AddressZero, amount)).to.be.revertedWith("invalid receiver");
    await expect(tokenDistribute.distributeNative(Alice.address, amount+1)).to.be.revertedWith("not enough eth to distribute");
    
    await tokenDistribute.distributeNative(Alice.address, amount);
    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(amount); 

    await expect(await tokenDistribute.withdrawNative(Alice.address)).to.changeEtherBalance(Alice, amount);
    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(0);
  });

  it("Anton transfers ETH to the contract and batch distribute to Alice and Bob successfully", async () => {
    let amount = 1e10;

    await admin.sendTransaction({to: tokenDistribute.address, value: amount});

    await expect(tokenDistribute.batchDistributeNative([Alice.address, Bob.address], amount/2+1)).to.be.revertedWith("not enough eth to distribute");
    
    await tokenDistribute.batchDistributeNative([Alice.address, Bob.address], amount/2);

    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(amount/2); 
    expect(await tokenDistribute.nativeBalanceOf(Bob.address)).to.be.eq(amount/2);
  });

  it("Anton approves erc20A and erc20B to the contract and distribute to interns successfully", async () => {
    let ercAAmount = 20;
    let ercBAmount = 20;
    let ethAmount = 20;

    await erc20A.approve(tokenDistribute.address, ercAAmount);
    await tokenDistribute.depositErc20(erc20A.address, ercAAmount);
    await tokenDistribute.distributeErc20(erc20A.address, Alice.address, ercAAmount);

    await erc20B.approve(tokenDistribute.address, ercBAmount);
    await tokenDistribute.depositErc20(erc20B.address, ercBAmount);
    await tokenDistribute.distributeErc20(erc20B.address, Alice.address, ercBAmount);

    await admin.sendTransaction({to: tokenDistribute.address, value: ethAmount});
    await tokenDistribute.distributeNative(Alice.address, ethAmount);
    let prevBalance = await hre.ethers.provider.getBalance(Alice.address);

    await tokenDistribute.withdrawAll(Alice.address);
    expect(await erc20A.balanceOf(Alice.address)).to.be.eq(ercAAmount);
    expect(await erc20B.balanceOf(Alice.address)).to.be.eq(ercBAmount);

    expect(await hre.ethers.provider.getBalance(Alice.address)).to.be.eq(prevBalance.add(ethAmount));
  });

  it("Anton transfers ETH to the contract and distribute to interns successfully, calculated gas fee", async () => {
    let amount = 1e10;
    let prevBalance = await hre.ethers.provider.getBalance(Alice.address);

    await admin.sendTransaction({to: tokenDistribute.address, value: amount});
    await tokenDistribute.distributeNative(Alice.address, amount);

    const tx = await tokenDistribute.connect(Alice).withdrawNative(Alice.address);
    const receipt = await tx.wait();
    const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    expect(await hre.ethers.provider.getBalance(Alice.address)).to.be.eq(prevBalance.add(amount).sub(gasSpent)); // to get balance of the address 
  });
});