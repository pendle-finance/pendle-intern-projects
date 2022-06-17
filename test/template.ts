import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber, Contract } from 'ethers';
import hre from 'hardhat';
import { TokenDistributor } from '../typechain';

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
    let distributorAddress = "0x7210Db2B5f88af3BeB5e724F425acc8F03809bD1"

    // Get Contract from blockchain via forking
    let distributor: TokenDistributor = await getContractAt<TokenDistributor>("TokenDistributor", distributorAddress);


    // Set up variables:
    const amount: BigNumber = toWei(50,18);
    const recipientAddress: string= "0x53f8b90cdebe25a02690d19a51246ddbc27f212d"

    // Transfer ETH to Distributor contract:
    await getEth(deployer.address);
    await deployer.sendTransaction({to: "0x7210Db2B5f88af3BeB5e724F425acc8F03809bD1", value: amount})

    await distributor.connect(deployer).updateClaimable(recipientAddress, amount, 0, {value: amount})

    // Impersonate Recipient:
    await getEth(recipientAddress);
    let recipient: SignerWithAddress = await impersonateSomeone(recipientAddress);

    // Claim for recipient
    let preBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);
    await distributor.connect(recipient).claim();
    let postBalance: BigNumber = await hre.ethers.provider.getBalance(recipientAddress);

    // Check difference in balance:
    console.log("Change in Receipient Balance: ", postBalance.sub(preBalance).toString())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });