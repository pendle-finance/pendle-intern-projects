import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract } from 'ethers';
import hre from 'hardhat';
import { ERC20 } from '../typechain';

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

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  //let contract = await deploy<ERC20>(deployer,"ERC20",["100000","Shiro","SRO",18]);
  let contract = await getContractAt<ERC20>("ERC20","0x4Db6c78422A8CdD09d984096F68C705C7B479A58");
  console.log(await contract.totalSupply());
  await contract.transfer("0xD9c9935f4BFaC33F38fd3A35265a237836b30Bd1",10);
  console.log(await contract.balanceOf("0xD9c9935f4BFaC33F38fd3A35265a237836b30Bd1"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });