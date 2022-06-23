import {expect} from 'chai';
import {utils} from 'ethers';
import {ethers, waffle} from 'hardhat';
import {deploy, evm_revert, evm_snapshot} from '../test/helpers/hardhat-helpers';
import {GetCodeHash} from '../typechain';

describe('Factory', () => {
  const [admin] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let getCode: GetCodeHash;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    getCode = await deploy<GetCodeHash>('GetCodeHash', []);
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });
  
  it('Print out code hash pls', async () => {
    let hash = await getCode.getInitHash();
    console.log('code hash is', hash);
  });

});