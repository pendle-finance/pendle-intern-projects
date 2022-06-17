import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract, Wallet } from 'ethers';
import hre, { waffle } from 'hardhat';
import { TokenDistributor } from '../typechain';
import { ERC20 } from '../typechain/ERC20';
import { _1E18 } from './helpers/Constants';

export async function getContractAt<CType extends Contract>(abiType: string, address: string) {
  return (await hre.ethers.getContractAt(abiType, address)) as CType;
}

export async function verifyContract(contract: string, constructor: any[]) {
  await hre.run('verify:verify', {
    address: contract,
    constructorArguments: constructor
  });
}

export async function deploy<CType extends Contract>(deployer: SignerWithAddress, abiType: string, args: any[], verify?: boolean, name?: string) {
  name = name || abiType;
  console.log(`Deploying ${name}...`);
  const contractFactory = await hre.ethers.getContractFactory(abiType);
  const contract = await contractFactory.connect(deployer).deploy(...args);
  await contract.deployed();
  console.log(`${name} deployed at address: ${(await contract).address}`);

  if (verify === true) {
    await verifyContract(contract.address, args);
  }
  return contract as CType;
}

function toWei(amount: number, decimal: number) {
  return BigNumber.from(10).pow(decimal).mul(amount);
}

export async function _impersonateAccount(address: string) {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
}

export async function impersonateSomeone(user: string) {
  await _impersonateAccount(user);
  return await hre.ethers.getSigner(user);
}

export async function getEth(user: string) {
  await hre.network.provider.send('hardhat_setBalance', [user, '0x56bc75e2d63100000000000000']);
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  // let contract = await deploy<TokenDistributor>(deployer, "TokenDistributor", [], true);

  let distributor : TokenDistributor = await getContractAt<TokenDistributor>("TokenDistributor", "0x181A4DFF5818B0CE41a561349Bfa961E571D266F");

  const amount : BigNumber = toWei(50, 18);
  const recipientAddress : string = "0x06FFA0A5d417501045e0e199427e511583dD5386";
  const recipient : SignerWithAddress = await impersonateSomeone(recipientAddress);
  await getEth(recipientAddress);

  await distributor.depositNativeToken({value: amount});
  await distributor.airdropNativeToken(recipientAddress, amount);

  let preBalance : BigNumber = await hre.ethers.provider.getBalance(recipientAddress);
  await distributor.connect(recipient).claimAllNativeToken();
  let postBalance : BigNumber = await hre.ethers.provider.getBalance(recipientAddress);
  console.log(postBalance.sub(preBalance).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });