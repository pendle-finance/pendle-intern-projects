import {expect} from 'chai';
import {utils, constants} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot, getContractAt} from './helpers/hardhat-helpers';
import {Factory, Pool, WETH, ERC20} from '../typechain';

describe('Factory', () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;
  let weth: WETH;
  let token1: ERC20;
  let token2: ERC20;
  let pool: Pool;
  let owner, addr1, addr2, addr3;
  before(async () => {
    globalSnapshotId = await evm_snapshot();
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    weth = await deploy<WETH>('WETH', []);
    token1 = await deploy<ERC20>('ERC20', [100, 'A', 'A', 18]);
    token2 = await deploy<ERC20>('ERC20', [100, 'B', 'B', 18]);

    factory = await deploy<Factory>('Factory', []);
    await factory.createPool(token1.address, token2.address);
    let poolAddresss = await factory.getPool(token1.address, token2.address);
    pool = await getContractAt<Pool>('Pool', poolAddresss);
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
      expect(await factory.allPoolLength()).to.be.eq(2);
    });
    it('should revert if pool exists', async () => {
      await expect(factory.createPool(token1.address, token2.address)).to.be.revertedWith('Pool exists');
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
    // it('should add liquidity', async () => {
    //   pool.addLiquidity(10, 10, owner.address);
    // });
  });
});
