import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';
import hre from 'hardhat';
import { Distributor, TestERC20 } from '../typechain';

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

//   let contract = await deploy<Distributor>(deployer, "Distributor", [], true)
let distributorAddress = "0xD670d79e2f39EA3E2579E535F3624e29df184889"

// Get Contract from blockchain via forking
let distributor: Distributor = await getContractAt<Distributor>("Distributor", distributorAddress);


// Set up variables:
const amount: BigNumber = toWei(50,18);
const recipientAddress: string= "0x13A0D71FfDc9DF57efC427794ae94d0Ac6fd47EC"

// Transfer ETH to Distributor contract:
await getEth(deployer.address);
await deployer.sendTransaction({to: "0xD670d79e2f39EA3E2579E535F3624e29df184889", value: amount})
await distributor.registerPayeesForETH([recipientAddress], [100])



// Impersonate Recipient:
await getEth(recipientAddress);
let recipient: SignerWithAddress = await impersonateSomeone(recipientAddress);

// Claim for recipient
let preBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);
await distributor.connect(recipient).payoutETH(recipientAddress);
let postBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);

// Check difference in balance:
console.log("Change in Receipient Balance: +", postBalance.sub(preBalance).toString())






}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });