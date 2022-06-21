import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';
import hre from 'hardhat';
import { ERC20, TokenDistribute } from "../typechain";

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
  // let amount : BigNumber = toWei(50, 18);
  // const [deployer] = await hre.ethers.getSigners();
  // await deployer.sendTransaction({
  //   to: '0x9D1B44CC12BDf9988601Bf81c603968E5ac7C786',
  //   value: amount,
  // })

    let distributor : TokenDistribute = await getContractAt<TokenDistribute>("TokenDistribute", "0x9D1B44CC12BDf9988601Bf81c603968E5ac7C786");
    // await distributor.transferOwnership('0x8Ed4389A31fe79d5EB76eF63a8477bfB0a39788b');
    // console.log(distributor.contractOwner());

    let recipient : string = "0x182D852DB98b11c5d1628b777c4D2ec20B0264e8"    

    // await distributor.distributeNative(recipient, amount);  

    let prevBalance : BigNumber = await hre.ethers.provider.getBalance(recipient);
    await distributor.withdrawNative(recipient);
    let postBalance : BigNumber = await hre.ethers.provider.getBalance(recipient);

    console.log(postBalance.sub(prevBalance).toString());

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });