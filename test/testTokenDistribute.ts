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
    await expect(tokenDistribute.connect(Alice).transferNative(Bob.address)).to.be.revertedWith("not the owner of the contract");
  });

  // it("Anton transfers erc20A to contract successfully", async () => {
  //   let amount = 20;
  //   await erc20A.transfer(tokenDistribute.address, amount);
  //   expect(await erc20A.balanceOf(tokenDistribute.address)).to.be.eq(amount);
  // });

  it("Anton approves erc20A to the contract and distribute to interns successfully", async () => {
    let totalAmount = 20;
    await erc20A.approve(tokenDistribute.address, totalAmount);
    await tokenDistribute.depositErc20(erc20A.address, totalAmount);
    expect(await erc20A.balanceOf(tokenDistribute.address)).to.be.eq(totalAmount);

    let AliceAmount = 12;
    let BobAmount = 8;

    await expect(tokenDistribute.connect(Alice).withdrawErc20(erc20A.address)).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.distributeErc20(erc20A.address, constants.AddressZero, AliceAmount)).to.be.revertedWith("invalid receiver");

    await tokenDistribute.distributeErc20(erc20A.address, Alice.address, AliceAmount);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Alice.address)).to.be.eq(AliceAmount);
    expect(await tokenDistribute.distributedErc20(erc20A.address)).to.be.eq(AliceAmount);

    await expect(tokenDistribute.distributeErc20(erc20A.address, Bob.address, BobAmount+1)).to.be.revertedWith("not enough token to distribute");
    await tokenDistribute.distributeErc20(erc20A.address, Bob.address, BobAmount);
    expect(await tokenDistribute.erc20BalanceOf(erc20A.address, Bob.address)).to.be.eq(BobAmount);
    expect(await tokenDistribute.distributedErc20(erc20A.address)).to.be.eq(AliceAmount+BobAmount);

    await tokenDistribute.connect(Alice).withdrawErc20(erc20A.address);
    expect(await erc20A.balanceOf(Alice.address)).to.be.eq(AliceAmount);
  });

  it("Anton approves erc20A and erc20B to the contract and distribute to interns successfully", async () => {
    let ercAAmount = 20;
    let ercBAmount = 20;

    await erc20A.approve(tokenDistribute.address, ercAAmount);
    await tokenDistribute.depositErc20(erc20A.address, ercAAmount);
    await tokenDistribute.distributeErc20(erc20A.address, Alice.address, ercAAmount);

    await erc20B.approve(tokenDistribute.address, ercBAmount);
    await tokenDistribute.depositErc20(erc20B.address, ercBAmount);
    await tokenDistribute.distributeErc20(erc20B.address, Alice.address, ercBAmount);

    await tokenDistribute.connect(Alice).withdrawAllErc20();
    expect(await erc20A.balanceOf(Alice.address)).to.be.eq(ercAAmount);
    expect(await erc20B.balanceOf(Alice.address)).to.be.eq(ercBAmount);
  });
    

  it("Anton transfers ETH to the contract and distribute to interns successfully", async () => {
    let amount = 1e10;

    await expect(tokenDistribute.connect(Alice).withdrawNative()).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.transferNative(constants.AddressZero, {value: amount})).to.be.revertedWith("invalid receiver");
    await expect(tokenDistribute.transferNative(Alice.address, {value: 0})).to.be.revertedWith("transfer amount = 0");
    await expect(Alice.sendTransaction({to: tokenDistribute.address, value: amount})).to.be.revertedWith("Call transferNative() instead"); 

    await tokenDistribute.transferNative(Alice.address, {value: amount});
    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(amount);
    let prevBalance = await hre.ethers.provider.getBalance(Alice.address);

    await expect(await tokenDistribute.connect(Alice).withdrawNative()).to.changeEtherBalance(Alice, amount);
  });

  it("Anton transfers ETH to the contract and distribute to interns successfully, by Long and Lam", async () => {
    let amount = 1e10;
    let prevBalance = await hre.ethers.provider.getBalance(Alice.address);

    await tokenDistribute.transferNative(Alice.address, {value: amount});

    const tx = await tokenDistribute.connect(Alice).withdrawNative();
    const receipt = await tx.wait();
    const gasSpent = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    expect(await hre.ethers.provider.getBalance(Alice.address)).to.be.eq(prevBalance.add(amount).sub(gasSpent)); // to get balance of the address 
  });
});