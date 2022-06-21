import { expect } from "chai";
import { utils, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { PRECISION, ZERO_ADDRESS } from "./helpers/Constants";
import { ERC20 } from "../typechain";

describe("TestContract", () => {
  const [admin, alice, bob, charlie] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let erc20: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    erc20 = await deploy<ERC20>('ERC20', ["testToken", "test"]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  it("Constructor works", async () => {
    const name = await erc20.name();
    const symbol = await erc20.symbol();
    const decimals = await erc20.decimals();
    expect(name).to.be.eq("testToken");
    expect(symbol).to.be.eq("test");
    expect(decimals).to.be.eq(18);
  });

  it("Mint and burn works", async () => {
    
    const initialBalance = await erc20.balanceOf(alice.address);
    expect(initialBalance).to.be.eq(0);
    
    await erc20.mint(alice.address, BigNumber.from(10).pow(18));

    const afterMintBalance = await erc20.balanceOf(alice.address);
    expect(afterMintBalance).to.be.eq(BigNumber.from(10).pow(18));

    await erc20.burn(alice.address, BigNumber.from(10).pow(18));
    const afterBurnBalance = await erc20.balanceOf(alice.address);

    expect(afterBurnBalance).to.be.eq(0);

  });


  it('approval works', async () => {
    await erc20.approve(alice.address, 200);
    const allowance = await erc20.allowance(admin.address, alice.address);
    expect(allowance).to.be.eq(200);
  });

  it('transfer works', async () => {
    await erc20.mint(admin.address, BigNumber.from(10).pow(18));
    await erc20.transfer(alice.address, 200);
    const aliceBalance = await erc20.balanceOf(alice.address);
    expect(aliceBalance).to.be.eq(200);
  });

  it('transferFrom works', async () => {
    await erc20.mint(bob.address, BigNumber.from(10).pow(18));
    await erc20.connect(bob).approve(admin.address, 200);
    await erc20.transferFrom(bob.address, alice.address, 200);
    const aliceBalance = await erc20.balanceOf(alice.address);
    expect(aliceBalance).to.be.eq(200);
  });

  it('transferring more than available', async () => {
    await erc20.mint(admin.address, 200);
    await expect(erc20.transfer(alice.address, 201)).to.be.revertedWith("Insufficient balance");
  });

  it('transferring more than approved', async () => {
    await erc20.mint(bob.address, BigNumber.from(10).pow(18));
    await erc20.connect(bob).approve(admin.address, 200);
    await expect(erc20.transferFrom(bob.address, alice.address, 201)).to.be.revertedWith("Spender not approved");
  });

  it('transferFrom more than available', async () => {
    await erc20.mint(bob.address, 400);
    await erc20.connect(bob).approve(admin.address, 500);
    await expect(erc20.transferFrom(bob.address, alice.address, 401)).to.be.revertedWith("Insufficient balance");
  });

  it('Burning more than available', async () => {
    await erc20.mint(bob.address, 400);
    await expect(erc20.burn(bob.address, 401)).to.be.revertedWith("Insufficient balance");
  });

  it('Zero address reverts', async () => {
    await expect(erc20.approve(ZERO_ADDRESS, 401)).to.be.revertedWith("Invalid address");
    await expect(erc20.transfer(ZERO_ADDRESS, 401)).to.be.revertedWith("Invalid address");
    await expect(erc20.transferFrom(ZERO_ADDRESS, bob.address, 401)).to.be.revertedWith("Invalid address");
    await expect(erc20.transferFrom(bob.address, ZERO_ADDRESS, 401)).to.be.revertedWith("Invalid address");
    await expect(erc20.burn(ZERO_ADDRESS, 401)).to.be.revertedWith("Invalid address");
    await expect(erc20.mint(ZERO_ADDRESS, 401)).to.be.revertedWith("Invalid address");

  });

  it('transfer() emits transfer', async () => {
    await erc20.mint(admin.address, 200);
    await expect(erc20.transfer(alice.address, 200)).to.emit(erc20, 'Transfer').withArgs(admin.address, alice.address, 200);
  });

  it('approve() emits approval', async () => {
    await erc20.mint(admin.address, 200);
    await expect(erc20.approve(alice.address, 200)).to.emit(erc20, 'Approval').withArgs(admin.address, alice.address, 200);
  });

  it('transferFrom() emits transfer', async () => {
    await erc20.mint(bob.address, 200);
    await erc20.connect(bob).approve(admin.address, 200);
    await expect( erc20.transferFrom(bob.address, alice.address, 200)).to.emit(erc20, 'Transfer').withArgs(bob.address, alice.address, 200);
  })

  it('mint() and burn() emits Mint and Burn', async () => {
    await expect(erc20.mint(bob.address, 200)).to.emit(erc20, 'Mint').withArgs(bob.address, 200);
    await expect(erc20.burn(bob.address, 200)).to.emit(erc20, 'Burn').withArgs(bob.address, 200);
  })

});
