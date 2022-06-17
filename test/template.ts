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

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  //   let contract = await deploy<ERC20>(deployer, "ERC20", ["Vuong Tung Duong", "VTD", 18, BigNumber.from(10).pow(19)], true);

  //     console.log(await contract.totalSupply());
  let contract: FundDistribution = await deploy<FundDistribution>(deployer, 'FundDistribution', []);
  // console.log(await contract.totalSupply());

  // await contract.transfer("0xD9c9935f4BFaC33F38fd3A35265a237836b30Bd1", BigNumber.from(10).pow(18));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
