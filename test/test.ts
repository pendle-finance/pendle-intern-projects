import {expect} from 'chai';
import {utils} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot} from './helpers/hardhat-helpers';
import {Factory, Pool, WETH, ERC20} from '../typechain';

describe('TestContract', () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let factory: Factory;
  let weth: WETH;
  let token1: ERC20;
  let token2: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    weth = await deploy<WETH>('WETH', []);
    token1 = await deploy<ERC20>('ERC20', [100, 'A', 'A', 18]);
    token2 = await deploy<ERC20>('ERC20', [100, 'B', 'B', 18]);

    factory = await deploy<Factory>('Factory', [weth.address]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
});
