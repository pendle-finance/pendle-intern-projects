import {expect} from 'chai';
import {utils} from 'ethers';
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
  });
});
