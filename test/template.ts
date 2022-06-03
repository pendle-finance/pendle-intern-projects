import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract, BigNumber } from 'ethers';
import { ERC20, VTZYERC20 } from "../typechain";
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

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  //let contract = await deploy<ERC20>(deployer, "ERC20", ["Secretly SecretRY", "SRY", 18, BigNumber.from(10).pow(19)], true);

  let contract = await getContractAt<VTZYERC20>("VTZYERC20", "0x96Eeb57b305Af0A8061b5f23Acd672A57Ee2D86c");
  await contract.mint(BigNumber.from(10).pow(18));

  console.log(await contract.balanceOf("0x06FFA0A5d417501045e0e199427e511583dD5386"));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });