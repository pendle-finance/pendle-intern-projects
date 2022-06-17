import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract, BigNumber } from 'ethers';
import { ERC20, Distributor } from "../typechain";
import hre from 'hardhat';

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

export async function toWei(amount: number, decimal: number) {
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
async function main() : Promise<void> {
  const [deployer] = await hre.ethers.getSigners();
  let contract : Distributor = await deploy<Distributor>(deployer, "Distributor", [], true);
}

main()
  .then(() : never => process.exit(0))
  .catch((error : any) : never => {
    console.error(error);
    process.exit(1);
  });