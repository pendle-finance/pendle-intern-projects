import { expect } from "chai";
import { BigNumber, utils, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20, TestContract, Airdrop } from "../typechain";

// describe("TestContract", () => {
//   const [admin,Alice,Bob] = waffle.provider.getWallets();
//   let globalSnapshotId;
//   let snapshotId;
//   let newERC20: ERC20;
//   let totalBalance = BigNumber.from(2).pow(255)
//   before(async () => {
//     globalSnapshotId = await evm_snapshot();

//     newERC20 = await deploy<ERC20>("ERC20", [totalBalance,"Shiro","SRO","18"]);

//     snapshotId = await evm_snapshot();
//   });

//   async function revertSnapshot() {
//     await evm_revert(snapshotId);
//     snapshotId = await evm_snapshot();
//   }

//   beforeEach(async () => {
//     await revertSnapshot();
//   });
//   //   0x6824c889f6EbBA8Dac4Dd4289746FCFaC772Ea56
//   //   0xCFf94465bd20C91C86b0c41e385052e61ed49f37
//   //   0xEBAf3e0b7dBB0Eb41d66875Dd64d9F0F314651B3
//   //   0xbFe6D5155040803CeB12a73F8f3763C26dd64a92
//   // it("increases total successfully", async () => {
//   //   await testContract.increaseTotal(100);

//   //   let curTotal = await testContract.getTotal();
//   //   expect(curTotal).to.be.eq(200);
//   // });
//   it("test get total supply",async () => {
//     let total = await newERC20.totalSupply();
//     expect(total).to.be.eq(totalBalance);
//   })
  
//   it("test get balances of admin",async () => {
//     let total = await newERC20.balanceOf(admin.address);
//     expect(total).to.be.eq(totalBalance);
//     // let owner = await newERC20.owner();
//     // console.log(owner);
//   })

//   it("test get balances of user",async () => {
//     let total = await newERC20.connect(Alice).balanceOf(Alice.address);
//     expect(total).to.be.eq(0);
//   })

//   it("test transfer",async () => {
//     await newERC20.connect(admin).transfer(Alice.address,1000);
//     let total2 = await newERC20.connect(admin).balanceOf(Alice.address);
//     expect(total2).to.be.eq(1000);
//   })
  
//   it("test allowance",async () => {
//     let allow_ori  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_ori).to.be.eq(0);
//     await newERC20.approve(Alice.address,2000);
//     let allow_after  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_after).to.be.eq(2000);
//   })

//   it("test transferFrom",async () => {
//     let allow_ori  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_ori).to.be.eq(0);
//     await newERC20.approve(Alice.address,2000);
//     let allow_after  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_after).to.be.eq(2000);
//     await newERC20.connect(Alice).transferFrom(admin.address,Alice.address,1000);
//     let ad1Balance = await newERC20.balanceOf(Alice.address);
//     expect(ad1Balance).to.be.eq(1000);
//     //console.log(admin.address,Alice.address);
//   })

//   it("test revert transfer amount",async() =>{
//     await expect(newERC20.transfer(Alice.address, totalBalance.add(1))).to.be.revertedWith("Insufficient amount");
//   })

//   it("test insufficient allowance",async() =>{
//     let allow_ori  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_ori).to.be.eq(0);
//     await newERC20.approve(Alice.address,2000);
//     let allow_after  = await newERC20.allowance(admin.address,Alice.address);
//     expect(allow_after).to.be.eq(2000);
//     //await newERC20.connect(Alice).transferFrom(admin.address,Alice.address,3000);
//     await expect(newERC20.connect(Alice).transferFrom(admin.address,Alice.address, 3000)).to.be.revertedWith("Insufficient allowance");
//   })
//   // it("decreases total successfully", async () => {
//   //   await testContract.decreaseTotal(50);

//   //   let curTotal = await testContract.getTotal();
//   //   expect(curTotal).to.be.eq(50);
//   // });
//   it("test revert",async () => {
//     let INF = BigNumber.from(2).pow(255);
//     let smallerAmount = 1000;
//     await expect(newERC20.transfer(Alice.address, smallerAmount)).to.emit(newERC20, 'Transfer').withArgs(admin.address, Alice.address, smallerAmount);
//     await expect(newERC20.transfer(Alice.address, totalBalance.add(1))).to.be.revertedWith("Insufficient amount");
//   })
// });

describe("Test Airdrop",()=>{
  const [admin,Alice,Bob] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let firstnewERC20: ERC20;
  let secondnewERC20: ERC20;
  let newAirdrop: Airdrop;
  let totalBalance = BigNumber.from(2).pow(255)
  before(async () => {
    globalSnapshotId = await evm_snapshot();

    firstnewERC20 = await deploy<ERC20>("ERC20", [totalBalance,"Shiro","SRO","18"]);

    secondnewERC20 = await deploy<ERC20>("ERC20", [totalBalance,"Kuro","KRO","18"]);

    newAirdrop = await deploy<Airdrop>("Airdrop",[]);
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
    //Set up balance
    await firstnewERC20.transfer(newAirdrop.address,100000);
    await secondnewERC20.transfer(newAirdrop.address,100000);
    await admin.sendTransaction({
      to: newAirdrop.address,
      value: BigNumber.from(10).pow(22),
    })
  });

  // TODO: allow success
  it("Test Allow", async ()=>{
    // Allow erc20 success
    await newAirdrop.alowERC20(Bob.address,firstnewERC20.address,1000);
    let BobFirstAllow = await newAirdrop.balanceOf(Bob.address,firstnewERC20.address);
    expect(BobFirstAllow).to.be.equal(1000);
    
    // Allow eth success
    await newAirdrop.allowETH(Bob.address,1000);
    let BobETHAllow = await newAirdrop.balanceETH(Bob.address)
    expect(BobETHAllow).to.be.equal(1000);
  })

  // TODO: allow claim success, not sucess
  it("Test claim one", async ()=>{
    //success
    await newAirdrop.alowERC20(Bob.address,firstnewERC20.address,1000);
    await newAirdrop.connect(Bob).claim([firstnewERC20.address],[1000],false,0);
    let BobFirstBalance = await firstnewERC20.connect(Bob).balanceOf(Bob.address);
    expect(BobFirstBalance).to.be.equal(1000);
    //Fail
    await expect(newAirdrop.connect(Bob).claim([firstnewERC20.address],[1000],false,0)).to.be.revertedWith("Insufficient balance");
  })

  // TODO: allow claim success, not sucess
  it("Test claim many", async ()=>{
    //success
    await newAirdrop.alowERC20(Bob.address,firstnewERC20.address,1000);
    await newAirdrop.alowERC20(Bob.address,secondnewERC20.address,2000);
    await newAirdrop.connect(Bob).claim([firstnewERC20.address,secondnewERC20.address],[1000,1000],false,0);

    let BobFirstBalance = await firstnewERC20.connect(Bob).balanceOf(Bob.address);
    expect(BobFirstBalance).to.be.equal(1000);

    let BobSecondBalance = await secondnewERC20.connect(Bob).balanceOf(Bob.address);
    expect(BobSecondBalance).to.be.equal(1000);
    //Fail
    await expect(newAirdrop.connect(Bob).claim([firstnewERC20.address,secondnewERC20.address],[1000,1000],false,0)).to.be.revertedWith("Insufficient balance");
  })

  it("Test claim eth", async ()=>{
    //success
    let original = await waffle.provider.getBalance(Bob.address);
    await newAirdrop.allowETH(Bob.address,BigNumber.from(10).pow(21));
    await newAirdrop.connect(Bob).claim([],[],true,BigNumber.from(10).pow(21));
    let after = await waffle.provider.getBalance(Bob.address);
    
    expect(Number(after)).to.be.greaterThan(
      Number(original)
    );
  })

  it("Test claim mix", async ()=>{
    //success
    let original = await waffle.provider.getBalance(Bob.address);
    await newAirdrop.alowERC20(Bob.address,firstnewERC20.address,1000);
    await newAirdrop.alowERC20(Bob.address,secondnewERC20.address,2000);
    await newAirdrop.allowETH(Bob.address,BigNumber.from(10).pow(21));
    await newAirdrop.connect(Bob).claim([firstnewERC20.address,secondnewERC20.address],[1000,1000],true,BigNumber.from(10).pow(21));

    let BobFirstBalance = await firstnewERC20.connect(Bob).balanceOf(Bob.address);
    expect(BobFirstBalance).to.be.equal(1000);

    let BobSecondBalance = await secondnewERC20.connect(Bob).balanceOf(Bob.address);
    expect(BobSecondBalance).to.be.equal(1000);
    let after = await waffle.provider.getBalance(Bob.address);

    expect(Number(after)).to.be.greaterThan(
      Number(original)
    );
    //Fail
    await expect(newAirdrop.connect(Bob).claim([firstnewERC20.address,secondnewERC20.address],[1000,1000],false,0)).to.be.revertedWith("Insufficient balance");
  })
});