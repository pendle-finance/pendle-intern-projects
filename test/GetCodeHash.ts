import {expect} from 'chai';
import {utils} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot} from './helpers/hardhat-helpers';
import {Factory, Pool, WETH, ERC20, GetCodeHash} from '../typechain';

describe('Factory', () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;
  let weth: WETH;
  let token1: ERC20;
  let token2: ERC20;
  let getCode: GetCodeHash;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    // weth = await deploy<WETH>('WETH', []);
    // // token1 = await deploy<ERC20>('ERC20', [100, 'A', 'A', 18]);
    // // token2 = await deploy<ERC20>('ERC20', [100, 'B', 'B', 18]);

    // factory = await deploy<Factory>('Factory', [weth.address]);
    getCode = await deploy<GetCodeHash>('GetCodeHash', []);
    let hash = await getCode.getInitHash();
    console.log('code hash is', hash);
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
      // let pool = await factory.createPool(token1.address, token2.address);
      // expect(await factory.getPool(token1.address, token2.address)).to.be.eq(pool);
    });
  });
});
