import { expect } from "chai";
import { Contract, utils, constants } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TokenDistribute } from "../typechain";

describe("TestTokenDistribute", () => {
  const [admin, Alice, Bob] = waffle.provider.getWallets();
//   const [Alice] = waffle.provider.getWallets();
//   const [Bob] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let tokenDistribute: TokenDistribute;
  let erc20: ERC20;

  const name = "VuongTungDuongv2";
  const symbol = "VTD-V2";
  const decimals = 18;
  const totalSupply = 1000;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    tokenDistribute = await deploy<TokenDistribute>("TokenDistribute", []);
    erc20 = await deploy<ERC20>("ERC20", [name, symbol, decimals, totalSupply]);

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
    await expect(tokenDistribute.connect(Alice).transferToken(erc20.address, Bob.address, 0)).to.be.revertedWith("not the owner of the contract");
    await expect(tokenDistribute.connect(Alice).transferNative(Bob.address)).to.be.revertedWith("not the owner of the contract");
  });

  // it("Anton transfers ERC20 to contract successfully", async () => {
  //   let amount = 20;
  //   await erc20.transfer(tokenDistribute.address, amount);
  //   expect(await erc20.balanceOf(tokenDistribute.address)).to.be.eq(amount);
  // });

  it("Anton transfers ERC20 to the contract and distribute to interns successfully", async () => {
    let totalAmount = 20;
    await erc20.transfer(tokenDistribute.address, totalAmount);
    expect(await erc20.balanceOf(tokenDistribute.address)).to.be.eq(totalAmount);

    let AliceAmount = 12;
    let BobAmount = 8;

    await expect(tokenDistribute.connect(Alice).withdrawToken(erc20.address)).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.transferToken(erc20.address, constants.AddressZero, AliceAmount)).to.be.revertedWith("invalid receiver");

    await tokenDistribute.transferToken(erc20.address, Alice.address, AliceAmount);
    expect(await tokenDistribute.tokenBalanceOf(erc20.address, Alice.address)).to.be.eq(AliceAmount);
    expect(await tokenDistribute.distributedToken(erc20.address)).to.be.eq(AliceAmount);

    await expect(tokenDistribute.transferToken(erc20.address, Bob.address, BobAmount+1)).to.be.revertedWith("not enough token to transfer");
    await tokenDistribute.transferToken(erc20.address, Bob.address, BobAmount);
    expect(await tokenDistribute.tokenBalanceOf(erc20.address, Bob.address)).to.be.eq(BobAmount);
    expect(await tokenDistribute.distributedToken(erc20.address)).to.be.eq(AliceAmount+BobAmount);

    await tokenDistribute.connect(Alice).withdrawToken(erc20.address);
    expect(await erc20.balanceOf(Alice.address)).to.be.eq(AliceAmount);
  });
    

  it("Anton transfers ETH to the contract and distribute to interns successfully", async () => {
    let amount = 20;

    await expect(tokenDistribute.connect(Alice).withdrawNative()).to.be.revertedWith("no balance to withdraw");
    await expect(tokenDistribute.transferNative(constants.AddressZero, {value: amount})).to.be.revertedWith("invalid receiver");
    await expect(tokenDistribute.transferNative(Alice.address, {value: 0})).to.be.revertedWith("transfer amount = 0");
    // await expect(Alice.sendTransaction({to: erc20.address, value: amount})).to.be.revertedWith("Call transferNative() instead");

    await tokenDistribute.transferNative(Alice.address, {value: amount});
    expect(await tokenDistribute.nativeBalanceOf(Alice.address)).to.be.eq(amount);

    await expect(await tokenDistribute.connect(Alice).withdrawNative()).to.changeEtherBalance(Alice, amount);
  });
});