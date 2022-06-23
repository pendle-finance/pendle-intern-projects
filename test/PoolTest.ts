import {expect} from 'chai';
import {utils, constants} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot, getContractAt} from './helpers/hardhat-helpers';
import {Factory, Pool, WETH, ERC20, TestLibrary} from '../typechain';
import * as CONSTANTS from "./helpers/constants";
import hre from 'hardhat';

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
    factory = await deploy<Factory>('Factory', []);
    testLib = await deploy<TestLibrary>('TestLibrary', [])
    
    
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

    await token1.mint(admin.address, 10000);
    await token1.mint(a.address, 10000);
    await token0.mint(b.address, 10000);
    await token0.mint(c.address, 10000);

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
        let isETH = await pool.isETH();
        expect(isETH).to.be.false;
        isETH = await ethPool.isETH();
        expect(isETH).to.be.true;
    });

    it('Pool address is deterministic and correct', async () => {
        let pairAddress = await testLib.pairFor(factory.address,token0.address,token1.address);
        expect(pairAddress).to.be.eq(pool.address);
    });
    


  });

  describe('flash swap', () => {
    it('cannot swap without giving tokens back', async () => {
      //pool.swap()
    });
  });
});
