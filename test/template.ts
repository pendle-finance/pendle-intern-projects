import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {BigNumber, Contract} from 'ethers';
import hre from 'hardhat';
import {FundDistribution} from '../typechain';

export async function getContractAt<CType extends Contract>(abiType: string, address: string) {
  return (await hre.ethers.getContractAt(abiType, address)) as CType;
}

export async function verifyContract(contract: string, constructor: any[]) {
  await hre.run('verify:verify', {
    address: contract,
    constructorArguments: constructor,
  });
}

export async function deploy<CType extends Contract>(
  deployer: SignerWithAddress,
  abiType: string,
  args: any[],
  verify?: boolean,
  name?: string
) {
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
  //get the contract from the blockchain
  let distributor: FundDistribution = await getContractAt<FundDistribution>(
    'FundDistribution',
    '0xAF43450324ffa5337F3Bb069b3453782Ce6C3B27'
  );
  const amount: BigNumber = toWei(50, 18);
  const antonAddress: string = '0x8Ed4389A31fe79d5EB76eF63a8477bfB0a39788b';
  await distributor.transferOwnership(antonAddress, true, false);

  console.log((await distributor.owner()) == antonAddress);
  let anton: SignerWithAddress = await impersonateSomeone(antonAddress);

  const recipientAddress: string = '0x13A0D71FfDc9DF57efC427794ae94d0Ac6fd47EC';
  await distributor.connect(anton).depositEth({value: amount});
  await distributor.connect(anton).setEthDistribute(recipientAddress, amount);

  await getEth(recipientAddress);
  let recipicient: SignerWithAddress = await impersonateSomeone(recipientAddress);

  let preBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);
  await distributor.connect(recipicient).claimEth(true);
  let postBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);

  console.log(postBalance.sub(preBalance).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
