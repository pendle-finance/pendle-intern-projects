import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Contract, BigNumber } from 'ethers';
import { AnythingAirdrop } from "../typechain";
import * as CONSTANTS from "./helpers/Constants";
import hre from 'hardhat';
import { getEventListeners } from 'events';
import { getEth } from './helpers/hardhat-helpers';

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

export async function sendTo(sender: SignerWithAddress, toAddress: string, amount: BigNumber) {
  await sender.sendTransaction({
    to: toAddress,
    value: amount,
  })
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  //let contract = await deploy<AnythingAirdrop>(deployer, "AnythingAirdrop", [], true);
  
  await getEth(deployer.address);
  let receiveAddr = "0x182D852DB98b11c5d1628b777c4D2ec20B0264e8";
 

  let contract = await getContractAt<AnythingAirdrop>("AnythingAirdrop", "0x4ebE5837749AFB51Da11136315A9C49fE32ac797");
  let amount = toWei(50,18);

  await contract.airdrop(receiveAddr,CONSTANTS.ZERO_ADDRESS,amount,{value:amount});

  await getEth(receiveAddr);
  let receipient = await impersonateSomeone(receiveAddr);

  let preBalance = await hre.ethers.provider.getBalance(receiveAddr);
  await contract.connect(receipient).claim(receiveAddr, CONSTANTS.ZERO_ADDRESS,amount);
  let postBalance = await hre.ethers.provider.getBalance(receiveAddr);
  
  console.log(postBalance.sub(preBalance).toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });