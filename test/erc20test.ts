import {expect} from 'chai';
import {utils} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot} from './helpers/hardhat-helpers';
import {ERC20} from '../typechain';
import { ZERO_ADDRESS } from "./helpers/Constants";

describe('ERC20 Test', () => {
  let [admin] = waffle.provider.getWallets();

  let globalSnapshotId;
  let snapshotId;
  let erc20: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    erc20 = await deploy<ERC20>('ERC20', [1000, "myToken", "mtk", 18]);
    snapshotId = await evm_snapshot();
  });

  const revertSnapshot = async () => {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  };

  beforeEach(async () => {
    await revertSnapshot();
  });

  it('getters work', async () => {
    const total = await erc20.totalSupply();
    expect(total).to.be.eq(1000);

    const name = await erc20.name();
    expect(name).to.be.eq("myToken");

    const symbol = await erc20.symbol();
    expect(symbol).to.be.eq("mtk");

    const decimal = await erc20.decimals();
    expect(decimal).to.be.eq(18);
  });

  it('approval works', async () => {
    await erc20.approve('0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9', 200);
    const allowance = await erc20.allowance(admin.address, '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9');
    expect(allowance).to.be.eq(200);
  });

  it('balanceOf works', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.transfer(testWallet, 200);
    const testWalletBalance = await erc20.balanceOf(testWallet);
    expect(testWalletBalance).to.be.eq(200);
  });

  it('transferFrom works', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.approve(admin.address, 200);
    await erc20.transferFrom(admin.address, testWallet, 200);
    const testWalletBalance = await erc20.balanceOf(testWallet);
    expect(testWalletBalance).to.be.eq(200);
  });

  it('transferring more than approved', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.approve(testWallet, 200);
    await expect(erc20.transferFrom(admin.address, testWallet, 400)).to.be.revertedWith('Receiver not approved');
  });

  it('mint works', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.mint(testWallet, 200);
    const testWalletBalance = await erc20.balanceOf(testWallet);
    const newTotalBalance = await erc20.totalSupply();
    expect(testWalletBalance).to.be.eq(200);
    expect(newTotalBalance).to.be.eq(1200);
  });

  it('burn works', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.transfer(testWallet, 200);
    await erc20.burn(testWallet, 100);
    const testWalletBalance = await erc20.balanceOf(testWallet);
    const newTotalBalance = await erc20.totalSupply();
    expect(testWalletBalance).to.be.eq(100);
    expect(newTotalBalance).to.be.eq(900);
  });

  it('transfer() emits transfer', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await expect(erc20.transfer(testWallet, 200)).to.emit(erc20, 'Transfer').withArgs(admin.address, testWallet, 200);
  });

  it('approve() emits approval', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await expect(erc20.approve(testWallet, 200)).to.emit(erc20, 'Approval').withArgs(admin.address, testWallet, 200);
  });

  it('transferFrom() emits transfer', async () => {
    const testWallet = '0x0264C3e4FA4E1eb38123A39776Ea3485179eFaC9';
    await erc20.approve(admin.address, 200);
    await expect( erc20.transferFrom(admin.address, testWallet, 200)).to.emit(erc20, 'Transfer').withArgs(admin.address, testWallet, 200);
  })

  it('transfer() to 0 address fails', async () => {
    await expect(erc20.transfer(ZERO_ADDRESS, 400)).to.be.revertedWith('Sending to 0 address');
  })

  it('transferFrom() to 0 address fails', async () => {
    await expect(erc20.approve(ZERO_ADDRESS, 200)).to.be.revertedWith("Spender cannot be 0 address");
  })


});
