import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';
import hre from 'hardhat';
import { Airdrop, ERC20 } from '../typechain';

export async function getContractAt<CType extends Contract>(abiType: string, address: string) {
  return (await hre.ethers.getContractAt(abiType, address)) as CType;
}

export async function verifyContract(contract: string, constructor: any[]) {
  await hre.run('verify:verify', {
    address: contract,
    constructorArguments: constructor
  });
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
  //let contract:Airdrop = await deploy<Airdrop>(deployer,"Airdrop",[],true);
  // let contract = await getContractAt<ERC20>("ERC20","0x4Db6c78422A8CdD09d984096F68C705C7B479A58");
  // console.log(await contract.totalSupply());
  // await contract.transfer("0xD9c9935f4BFaC33F38fd3A35265a237836b30Bd1",10);
  // console.log(await contract.balanceOf("0xD9c9935f4BFaC33F38fd3A35265a237836b30Bd1"));
  let airDrop:Airdrop = await getContractAt<Airdrop>("Airdrop","0xF3745B5C295D8A0bE4Ec79Aeb20270E1b75DCf58");
  //0x7210Db2B5f88af3BeB5e724F425acc8F03809bD1
  // const amount:BigNumber = toWei(50,18);
  // const receiptAddress:string = "0x7210Db2B5f88af3BeB5e724F425acc8F03809bD1";

  // await deployer.sendTransaction({
  //   to: "0xF3745B5C295D8A0bE4Ec79Aeb20270E1b75DCf58",
  //   value:amount,
  // })
  
  // await airDrop.allowETH(receiptAddress,amount);

  // await getEth(receiptAddress);

  // // impersionate someone
  // let receipt:SignerWithAddress  = await impersonateSomeone(receiptAddress);

  // // check the test
  // let preBalance:BigNumber = await hre.ethers.provider.getBalance(receiptAddress);
  // await airDrop.connect(receipt).claimAll();
  // let postBalance:BigNumber = await hre.ethers.provider.getBalance(receiptAddress);

  // console.log(postBalance.sub(preBalance).toString());
  // // allow the eth
  // Anton address: 0x8Ed4389A31fe79d5EB76eF63a8477bfB0a39788b
  //await airDrop.transferOwnership("0x8Ed4389A31fe79d5EB76eF63a8477bfB0a39788b");
  await airDrop.claimAll();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });