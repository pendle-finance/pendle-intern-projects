import {expect} from 'chai';
import {utils, constants} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot, getContractAt} from './helpers/hardhat-helpers';
import {Factory, Pool, WETH, ERC20} from '../typechain';
import hre from 'hardhat';

describe('Factory', () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;
  let weth: WETH;
  let token1: ERC20;
  let token0: ERC20;
  let pool: Pool;
  let ethPool: Pool;
  let owner, addr1, addr2, addr3;
  before(async () => {
    globalSnapshotId = await evm_snapshot();
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    weth = await getContractAt<WETH>('WETH', '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7');
    token1 = await deploy<ERC20>('ERC20', [100, 'A', 'A', 18]);
    token0 = await deploy<ERC20>('ERC20', [100, 'B', 'B', 18]);
    await token1.mint(owner.address, 1000);
    await token1.mint(addr1.address, 1000);
    await token0.mint(owner.address, 1000);
    await token0.mint(addr1.address, 1000);
    factory = await deploy<Factory>('Factory', []);
    await factory.createPool(token1.address, token0.address);
    let poolAddresss = await factory.getPool(token1.address, token0.address);
    pool = await getContractAt<Pool>('Pool', poolAddresss);

    token0 = await getContractAt<ERC20>('ERC20', await pool.token0());
    token1 = await getContractAt<ERC20>('ERC20', await pool.token1());
    await factory.createPool(weth.address, token0.address);
    let ethPoolAddress = await factory.getPool(weth.address, token0.address);
    ethPool = await getContractAt<Pool>('Pool', ethPoolAddress);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
  describe('create pool', () => {
    it('should create pool', async () => {
      expect(await pool.factory()).to.be.eq(factory.address);
    });
    it('should create multiple pools', async () => {
      let c1 = '0xa1fc537C09f34f671f4481665642b39E82aAd0f8';
      let c2 = '0x5f97fe54AFc3Bb957feb48A859382A55e7d8A452';
      factory.createPool(c1, c2);
      expect(await factory.allPoolLength()).to.be.eq(3);
    });
    it('should revert if pool exists', async () => {
      await expect(factory.createPool(token1.address, token0.address)).to.be.revertedWith('Pool exists');
    });
    it('should revert if zero address', async () => {
      await expect(factory.createPool(constants.AddressZero, token1.address)).to.be.revertedWith(
        'AMMLibrary: ZERO_ADDRESS'
      );
    });
    it('should revert if identical addresses', async () => {
      await expect(factory.createPool(token1.address, token1.address)).to.be.revertedWith('Identical addresses');
    });
  });
  describe('addLiquidity', () => {
    it('should add liquidity', async () => {
      await token1.approve(pool.address, 10);
      await token0.approve(pool.address, 10);
      await pool.addLiquidity(10, 10, owner.address);
      let reserves = await pool.getReserves();
      expect(reserves._reserve0).to.be.eq(10);
      expect(reserves._reserve1).to.be.eq(10);
      await token1.approve(pool.address, 20);
      await token0.approve(pool.address, 10);
      await pool.addLiquidity(20, 10, owner.address);
      reserves = await pool.getReserves();
      expect(reserves._reserve0).to.be.eq(20);
      expect(reserves._reserve1).to.be.eq(20);
    });
    it('floating point', async () => {
      await token0.approve(pool.address, 7);
      await token1.approve(pool.address, 10);
      await pool.addLiquidity(7, 10, owner.address);
      let reserves = await pool.getReserves();
      expect(reserves._reserve0).to.be.eq(7);
      expect(reserves._reserve1).to.be.eq(10);

      expect(await pool.balanceOf(owner.address)).to.be.eq(8);
      // let tmp = await pool._addLiquidity(20, 20);

      await token0.approve(pool.address, 20);
      await token1.approve(pool.address, 20);
      await pool.addLiquidity(10, 11, owner.address);
      reserves = await pool.getReserves();
      expect(reserves._reserve0).to.be.eq(14);
      expect(reserves._reserve1).to.be.eq(21);
      expect(await pool.balanceOf(owner.address)).to.be.eq(17);
    });
    it('should revert', async () => {
      await expect(pool.addLiquidity(0, 10, owner.address)).to.be.revertedWith('POOL: INVALID AMOUNT0');
    });
    it('should add liquidity eth', async () => {
      await token0.approve(ethPool.address, 10);
      // await token1.approve(pool.address, 100);
      // let token: ERC20 = await getContractAt<ERC20>('ERC20', await ethPool.token1());
      // console.log(await token.balanceOf(owner.address));
      // console.log(await token.allowance(owner.address, ethPool));
      await ethPool.addLiquidityEth(10, owner.address, {value: 10});
      // console.log(await hre.ethers.provider.getBalance(ethPool.address));
      let reserves = await ethPool.getReserves();
      expect(reserves._reserve0).to.be.eq(10);
      expect(reserves._reserve1).to.be.eq(10);
    });
  });
  describe('remove liquidity', () => {
    it('should remove liquidity', async () => {
      await token0.approve(pool.address, 7);
      await token1.approve(pool.address, 10);
      await pool.addLiquidity(7, 10, owner.address);
      expect(await pool.balanceOf(owner.address)).to.be.eq(8);
      // console.log(await token0.balanceOf(pool.address));
      // console.log(await token1.balanceOf(pool.address));
      // console.log(await pool.totalSupply());
      await pool.removeLiquidity(2, 1, 1, owner.address);
      // console.log(await (await pool.getReserves())._reserve0);
      // console.log(await (await pool.getReserves())._reserve1);
      // console.log(await token0.balanceOf(pool.address));
      // console.log(await token1.balanceOf(pool.address));
      expect(await token0.balanceOf(owner.address)).to.be.eq(1094);
      expect(await token1.balanceOf(owner.address)).to.be.eq(1092);
      expect(await pool.totalSupply()).to.be.eq(7);
      expect(await pool.balanceOf(owner.address)).to.be.eq(6);
    });
    it('should remove liquidity eth', async () => {
      // let preBalance = await ethers.provider.getBalance(owner.address);
      await token0.approve(ethPool.address, 10);
      await ethPool.addLiquidityEth(10, owner.address, {value: 7});
      expect(await ethPool.balanceOf(owner.address)).to.be.eq(8);
      expect(await ethPool.removeLiquidityEth(2, 1, 1, owner.address)).to.changeEtherBalance(owner.address, 1);
      // let postBalance = await ethers.provider.getBalance(owner.address);
      expect(await token0.balanceOf(owner.address)).to.be.eq(1092);

      expect(await ethPool.totalSupply()).to.be.eq(7);
      expect(await ethPool.balanceOf(owner.address)).to.be.eq(6);
    });
  });
});
