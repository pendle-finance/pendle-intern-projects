import {expect} from 'chai';
import {utils, constants} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot, getContractAt} from './helpers/hardhat-helpers';

import {Factory, Pool, WETH, ERC20, TestLibrary} from '../typechain';
import * as CONSTANTS from './helpers/constants';
import hre from 'hardhat';
import {text} from 'stream/consumers';
import {BlockList} from 'net';

describe('Pool Tests for swaps', () => {
  const [admin, a, b, c] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;
  let weth: WETH;
  let token1: ERC20;
  let token0: ERC20;
  let pool: Pool;
  let ethPool: Pool;
  let testLib: TestLibrary;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    weth = await getContractAt<WETH>('WETH', '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7');
    let tokenA = await deploy<ERC20>('ERC20', [100, 'B', 'B', 18]);
    let tokenB = await deploy<ERC20>('ERC20', [100, 'A', 'A', 18]);
    factory = await deploy<Factory>('Factory', ['0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7']);
    testLib = await deploy<TestLibrary>('TestLibrary', []);
    if (tokenA.address < tokenB.address) {
      token0 = tokenA;
      token1 = tokenB;
    } else {
      token0 = tokenB;
      token1 = tokenA;
    }

    await factory.createPool(token1.address, token0.address);
    let poolAddresss = await factory.getPool(token1.address, token0.address);
    pool = await getContractAt<Pool>('Pool', poolAddresss);

    await factory.createPool(weth.address, token0.address);
    let ethPoolAddress = await factory.getPool(weth.address, token0.address);
    ethPool = await getContractAt<Pool>('Pool', ethPoolAddress);

    await token0.mint(admin.address, 10000);
    await token0.mint(a.address, 10000);
    await token0.mint(b.address, 10000);
    await token0.mint(c.address, 10000);
    await token1.mint(admin.address, 10000);
    await token1.mint(a.address, 10000);
    await token1.mint(b.address, 10000);
    await token1.mint(c.address, 10000);

    await token0.approve(pool.address, CONSTANTS.INF);
    await token1.approve(pool.address, CONSTANTS.INF);
    await token0.connect(a).approve(pool.address, CONSTANTS.INF);
    await token1.connect(a).approve(pool.address, CONSTANTS.INF);
    await token0.connect(b).approve(pool.address, CONSTANTS.INF);
    await token1.connect(b).approve(pool.address, CONSTANTS.INF);

    await token0.approve(ethPool.address, CONSTANTS.INF);
    await token0.connect(a).approve(ethPool.address, CONSTANTS.INF);
    await token0.connect(b).approve(ethPool.address, CONSTANTS.INF);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe('Check construction of pool', () => {
    it('Factory address', async () => {
      let factoryAddress = await pool.factory();
      expect(factoryAddress).to.be.eq(factory.address);

      let ethFactoryAddress = await ethPool.factory();
      expect(ethFactoryAddress).to.be.eq(factory.address);
    });

    it('Token address', async () => {
      let token0Address = await pool.token0();
      expect(token0Address).to.be.eq(token0.address);
      let token1Address = await pool.token1();
      expect(token1Address).to.be.eq(token1.address);

      token0Address = await ethPool.token0();
      expect(token0Address).to.be.eq(weth.address);
      token1Address = await ethPool.token1();
      expect(token1Address).to.be.eq(token0.address);
    });

    it('isETH', async () => {
      let token0Addr = await pool.token0();
      expect(token0Addr).to.be.not.eq(weth.address);
      token0Addr = await ethPool.token0();
      expect(token0Addr).to.be.eq(weth.address);
    });

    // it('Pool address is deterministic and correct', async () => {
    //     let pairAddress = await testLib.pairFor(factory.address,token0.address,token1.address);
    //     expect(pairAddress).to.be.eq(pool.address);
    //     pairAddress = await testLib.pairFor(factory.address,weth.address,token0.address);
    //     expect(pairAddress).to.be.eq(ethPool.address);
    //     //TODO: still need test ethPool
    // });
  });

  describe('check flash swap function', () => {
    beforeEach(async () => {
      await pool.connect(a).addLiquidity(1000, 1000, a.address);
      await pool.connect(b).addLiquidity(1000, 1000, b.address);

      await ethPool.connect(a).addLiquidityEth(1000, a.address, {value: 1000});
      await ethPool.connect(b).addLiquidityEth(1000, b.address, {value: 1000});
    });

    it('cannot swap without giving tokens back', async () => {
      await expect(pool.swap(100, 100, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_INPUT_AMOUNT');
      await expect(ethPool.swap(100, 100, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_INPUT_AMOUNT');
    });

    it('can swap as long as tokens are given & anyone can flashswap other people transfer => swap should NOT be used by itself rather everything be in 1 atomic transaction', async () => {
      let aPreBal = await token0.balanceOf(a.address);
      let bPreBal = await token0.balanceOf(b.address);
      await token0.connect(b).transfer(pool.address, 106);
      let aPostBal = await token0.balanceOf(a.address);
      let bPostBal = await token0.balanceOf(b.address);

      let aPreBal1 = await token1.balanceOf(a.address);
      let bPreBal1 = await token1.balanceOf(b.address);
      await pool.connect(a).swap(0, 100, a.address);
      let aPostBal1 = await token1.balanceOf(a.address);
      let bPostBal1 = await token1.balanceOf(b.address);

      expect(aPreBal).to.be.eq(aPostBal);
      expect(bPreBal).to.be.eq(bPostBal.add(106));
      expect(aPreBal1).to.be.eq(aPostBal1.sub(100));
      expect(bPreBal1).to.be.eq(bPostBal1);
    });

    it('swap where K remains the same', async () => {
      //TODO: getReserves
      let aPreBal = await token0.balanceOf(a.address);
      let aPreBal1 = await token1.balanceOf(a.address);
      await token0.connect(a).transfer(pool.address, 4000);
      await expect(pool.connect(a).swap(0, 1000, a.address)).to.not.be.reverted;
      let aPostBal = await token0.balanceOf(a.address);
      let aPostBal1 = await token1.balanceOf(a.address);

      expect(aPreBal).to.be.eq(aPostBal.add(4000));
      expect(aPreBal1).to.be.eq(aPostBal1.sub(1000));
    });

    it('swap where K becomes higher', async () => {
      let aPreBal = await token0.balanceOf(a.address);
      let aPreBal1 = await token1.balanceOf(a.address);
      await token0.connect(a).transfer(pool.address, 5000);
      await expect(pool.connect(a).swap(0, 1, a.address)).to.not.be.reverted;
      let aPostBal = await token0.balanceOf(a.address);
      let aPostBal1 = await token1.balanceOf(a.address);

      expect(aPreBal).to.be.eq(aPostBal.add(5000));
      expect(aPreBal1).to.be.eq(aPostBal1.sub(1));
    });

    it('cannot swap where K becomes lower', async () => {
      await token0.connect(a).transfer(pool.address, 100);
      await expect(pool.connect(a).swap(0, 100, a.address)).to.be.revertedWith('Pool: K');
    });

    it('cannot swap nothing', async () => {
      await expect(pool.swap(0, 0, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_OUTPUT_AMOUNT');
    });

    it('cannot swap amount > pool tokens/liquidity', async () => {
      await expect(pool.swap(2001, 0, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_LIQUIDITY');
      await expect(pool.swap(0, 2001, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_LIQUIDITY');
      await expect(ethPool.swap(2001, 0, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_LIQUIDITY');
      await expect(ethPool.swap(0, 2001, a.address)).to.be.revertedWith('Pool: INSUFFICIENT_LIQUIDITY');
    });

    it('to swap in an ethPool you need WETH!', async () => {
      await weth.connect(b).deposit({value: 106});
      let bPreBal = await weth.balanceOf(b.address);
      let bPreBal0 = await token0.balanceOf(b.address);
      await weth.connect(b).transfer(ethPool.address, 106);
      await expect(ethPool.swap(0, 100, b.address)).to.not.be.reverted;
      let bPostBal = await weth.balanceOf(b.address);
      let bPostBal0 = await token0.balanceOf(b.address);

      expect(bPreBal).to.be.eq(bPostBal.add(106));
      expect(bPreBal0).to.be.eq(bPostBal0.sub(100));
    });

    it('swap in an ethPool gives you WETH!', async () => {
      let bPreBal = await weth.balanceOf(b.address);
      let bPreBal0 = await token0.balanceOf(b.address);
      await token0.connect(b).transfer(ethPool.address, 106);
      await expect(ethPool.swap(100, 0, b.address)).to.not.be.reverted;
      let bPostBal = await weth.balanceOf(b.address);
      let bPostBal0 = await token0.balanceOf(b.address);

      expect(bPreBal).to.be.eq(bPostBal.sub(100));
      expect(bPreBal0).to.be.eq(bPostBal0.add(106));
    });
  });

  describe('check swapExactIn & swapExactOut function', () => {
    beforeEach(async () => {
      await pool.connect(a).addLiquidity(1000, 1000, a.address);
      await pool.connect(b).addLiquidity(1000, 1000, b.address);

      await ethPool.connect(a).addLiquidityEth(1000, a.address, {value: 1000});
      await ethPool.connect(b).addLiquidityEth(1000, b.address, {value: 1000});
    });

    //Since swapExactIn uses swap function, thus, the previous test should work for this as well
    it('swapIn either tokens', async () => {
      let PreBal0 = await token0.balanceOf(a.address);
      let PreBal1 = await token1.balanceOf(a.address);
      await pool.connect(a).swapExactIn(token0.address, 106, a.address);
      let PostBal0 = await token0.balanceOf(a.address);
      let PostBal1 = await token1.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.add(106));
      expect(PreBal1).to.be.eq(PostBal1.sub(100));

      PreBal0 = await token0.balanceOf(a.address);
      PreBal1 = await token1.balanceOf(a.address);
      await pool.connect(a).swapExactIn(token1.address, 100, a.address);
      PostBal0 = await token0.balanceOf(a.address);
      PostBal1 = await token1.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.sub(105));
      expect(PreBal1).to.be.eq(PostBal1.add(100));
    });

    it('cannot swapIn invalid/non-pool/LP tokens', async () => {
      let randaddr = '0x0c187d084f664f0b5c4dab915705148691c0651d';
      await expect(pool.connect(a).swapExactIn(randaddr, 100, a.address)).to.be.revertedWith('INVALID TOKEN');
      await expect(pool.connect(a).swapExactIn(pool.address, 100, a.address)).to.be.revertedWith('INVALID TOKEN');
      let randToken = await deploy<ERC20>('ERC20', [100, 'randToken', 'rand', 18]);
      await expect(pool.connect(a).swapExactIn(randToken.address, 100, a.address)).to.be.revertedWith('INVALID TOKEN');
    });

    it('swapOut either tokens', async () => {
      let PreBal0 = await token0.balanceOf(a.address);
      let PreBal1 = await token1.balanceOf(a.address);
      await pool.connect(a).swapExactOut(token0.address, 100, a.address);
      let PostBal0 = await token0.balanceOf(a.address);
      let PostBal1 = await token1.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.sub(100));
      expect(PreBal1).to.be.eq(PostBal1.add(106));

      PreBal0 = await token0.balanceOf(a.address);
      PreBal1 = await token1.balanceOf(a.address);
      await pool.connect(a).swapExactOut(token1.address, 105, a.address);
      PostBal0 = await token0.balanceOf(a.address);
      PostBal1 = await token1.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.add(100));
      expect(PreBal1).to.be.eq(PostBal1.sub(105));
    });

    it('cannot swapOut invalid/non-pool/LP tokens', async () => {
      let randaddr = '0x0c187d084f664f0b5c4dab915705148691c0651d';
      await expect(pool.connect(a).swapExactOut(randaddr, 100, a.address)).to.be.revertedWith('INVALID TOKEN');
      await expect(pool.connect(a).swapExactOut(pool.address, 100, a.address)).to.be.revertedWith('INVALID TOKEN');
      let randToken = await deploy<ERC20>('ERC20', [100, 'randToken', 'rand', 18]);
      await expect(pool.connect(a).swapExactOut(randToken.address, 100, a.address)).to.be.revertedWith(
        'INVALID TOKEN'
      );
    });

    it('zero address', async () => {
      await expect(pool.connect(a).swapExactIn(token0.address, 100, CONSTANTS.ZERO_ADDRESS)).to.be.revertedWith(
        'Only Non Zero Address'
      );
      await expect(pool.connect(a).swapExactOut(token0.address, 100, CONSTANTS.ZERO_ADDRESS)).to.be.revertedWith(
        'Only Non Zero Address'
      );
    });
  });

  describe('check swapExactInEthForToken & swapExactOutEthForToken function', () => {
    beforeEach(async () => {
      await ethPool.connect(a).addLiquidityEth(1000, a.address, {value: 1000});
      await ethPool.connect(b).addLiquidityEth(1000, b.address, {value: 1000});
    });

    it('swapInEth & and swapOutEth either ways', async () => {
      let ethPreBal = await a.getBalance();
      let PreBal0 = await token0.balanceOf(a.address);
      await ethPool.connect(a).swapExactInEthForToken(a.address, {value: 106});
      let ethPostBal = await a.getBalance();
      let PostBal0 = await token0.balanceOf(a.address);

      expect(ethPreBal.sub(ethPostBal)).to.be.above(106);
      expect(PreBal0).to.be.eq(PostBal0.sub(100));

      //Note the huge slippage because the Uniswap formula is not 1:1 for amountIn and amountOut, thus for low amounts (e.g powers below 5) there's a difference
      ethPreBal = await a.getBalance();
      PreBal0 = await token0.balanceOf(a.address);
      await ethPool.connect(a).swapExactOutEthForToken(100, a.address, {value: 118});
      ethPostBal = await a.getBalance();
      PostBal0 = await token0.balanceOf(a.address);

      expect(ethPreBal.sub(ethPostBal)).to.be.above(118);
      expect(PreBal0).to.be.eq(PostBal0.sub(100));
    });

    it('cannot swapInEth & swapOutEth non-ethPool', async () => {
      await pool.connect(a).addLiquidity(1000, 1000, a.address);
      await pool.connect(b).addLiquidity(1000, 1000, b.address);
      await expect(pool.connect(b).swapExactInEthForToken(a.address, {value: 100})).to.be.revertedWith(
        'Pool: Not an ETH pool'
      );
      await expect(pool.connect(b).swapExactOutEthForToken(100, a.address)).to.be.revertedWith(
        'Pool: Not an ETH pool'
      );
    });

    it('zero address', async () => {
      await expect(ethPool.connect(a).swapExactInEthForToken(CONSTANTS.ZERO_ADDRESS, {value: 100})).to.be.revertedWith(
        'Only Non Zero Address'
      );
      await expect(ethPool.connect(a).swapExactOutEthForToken(100, CONSTANTS.ZERO_ADDRESS)).to.be.revertedWith(
        'Only Non Zero Address'
      );
    });

    it('swapInEth & swapOutEth amount > owned', async () => {
      let ethBal = await a.getBalance();
      await expect(ethPool.connect(a).swapExactInEthForToken(a.address, {value: ethBal.add(1)})).to.throw;
    });
  });

  describe('check swapExactInTokenForEth & swapExactOutTokenForEth function', () => {
    beforeEach(async () => {
      await ethPool.connect(a).addLiquidityEth(1000, a.address, {value: 1000});
      await ethPool.connect(b).addLiquidityEth(1000, b.address, {value: 1000});
    });

    it('swapInForEth & and swapOutForEth either ways', async () => {
      let PreBal0 = await token0.balanceOf(a.address);
      await ethPool.connect(a).swapExactInTokenForEth(106, a.address);
      let PostBal0 = await token0.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.add(106));

      PreBal0 = await token0.balanceOf(a.address);
      await ethPool.connect(a).swapExactOutTokenForEth(100, a.address);
      PostBal0 = await token0.balanceOf(a.address);

      expect(PreBal0).to.be.eq(PostBal0.add(118));
    });

    it('cannot swapInEth & swapOutEth non-ethPool', async () => {
      await pool.connect(a).addLiquidity(1000, 1000, a.address);
      await pool.connect(b).addLiquidity(1000, 1000, b.address);
      await expect(pool.connect(b).swapExactInTokenForEth(100, a.address)).to.be.revertedWith('Pool: Not an ETH pool');
      await expect(pool.connect(b).swapExactOutTokenForEth(100, a.address)).to.be.revertedWith(
        'Pool: Not an ETH pool'
      );
    });

    it('zero address', async () => {
      await expect(ethPool.connect(a).swapExactInTokenForEth(100, CONSTANTS.ZERO_ADDRESS)).to.be.revertedWith(
        'Only Non Zero Address'
      );
      await expect(ethPool.connect(a).swapExactOutTokenForEth(100, CONSTANTS.ZERO_ADDRESS)).to.be.revertedWith(
        'Only Non Zero Address'
      );
    });

    it('swapInEth & swapOutEth amount > owned ', async () => {
      await token0.connect(a).transfer(b.address, await token0.balanceOf(a.address));
      await expect(ethPool.connect(a).swapExactInTokenForEth(10001, a.address)).to.be.revertedWith('');
      await expect(ethPool.connect(a).swapExactOutTokenForEth(100, a.address)).to.be.revertedWith('TH: STF failed');
    });
  });
});
