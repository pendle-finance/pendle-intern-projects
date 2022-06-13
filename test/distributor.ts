import { expect } from "chai";
import { utils } from "ethers";
import { BigNumber, constants } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { Distributor, TestERC20 } from "../typechain";
import { ZERO, _1E18 } from "./helpers/Constants";

describe("Fund Distributor", () => {
  const [admin, alice, bob, charlie, _] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let DistributorContract : Distributor;
  let TestERC20Contract: TestERC20;
  let distributorAddress;
  let testERC20Address;
  let initialTestERC20 = 100000;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    // Deploy respective contracts:
    TestERC20Contract = await deploy<TestERC20>("TestERC20",[]);
    DistributorContract = await deploy<Distributor>("Distributor", [[alice.address, bob.address, charlie.address],[BigNumber.from(20),BigNumber.from(30),BigNumber.from(50)]] );

    testERC20Address = TestERC20Contract.address;
    distributorAddress = DistributorContract.address;
  

    // Send both ether and TestERC20 to the Distributor contract:
    await TestERC20Contract.transfer(distributorAddress, BigNumber.from(initialTestERC20));
    await admin.sendTransaction({
      to: distributorAddress,
      value: ethers.utils.parseEther('10.0')
    })

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("Deployment Status", () => {
    it("should HAVE an ownership belonging to admin", async () => {
      let owner = await DistributorContract.owner();
      expect(owner).to.be.eq(admin.address);
    });


    it("should HAVE an initial balance of 10 ETH and 100,000 MOCK", async () => {
  
      let ethBalance = await ethers.provider.getBalance(distributorAddress)
      expect(ethBalance).to.be.eq(_1E18.mul(10));
  
      let mockBalance = await TestERC20Contract.balanceOf(distributorAddress);
      expect(mockBalance).to.be.eq(BigNumber.from(initialTestERC20));
    });
  })

  describe("ETH Initial Shares & Distribution Status", () => {

    it("should HAVE 3 payees registered for ETH distribution", async () => {
      let numEthPayees = await DistributorContract.numRegisteredForETH();
      expect(numEthPayees).to.be.eq(BigNumber.from(3));
    });
  
    it("should HAVE the respective shares (20,30,50) for the 3 initially resgistered accounts (alice, bob, charlie)", async () => {
      let aliceShare = await DistributorContract.sharesForETH(alice.address);
      expect(aliceShare).to.be.eq(BigNumber.from(20));
  
      let bobShare = await DistributorContract.sharesForETH(bob.address);
      expect(bobShare).to.be.eq(BigNumber.from(30));
  
      let charlieShare = await DistributorContract.sharesForETH(charlie.address);
      expect(charlieShare).to.be.eq(BigNumber.from(50));
    });

    it("should HAVE a total of 100 ETH shares & 0 ETH distributed initially", async () => {
      let totalETHShares = await DistributorContract.totalETHShares();
      expect(totalETHShares).to.be.eq(BigNumber.from(100));

      let totalETHDistributed = await DistributorContract.totalETHDistributed();
      expect(totalETHDistributed).to.be.eq(ZERO);

    });

    it("should REFLECT the right amount of ETH to be claimed based on the proportion of shares tagged to an account", async () => {

      let contractETHBalance = ethers.utils.parseEther('10.0');
      let totalETHShares = await DistributorContract.totalETHShares();

      let aliceShare = await DistributorContract.sharesForETH(alice.address);
      let aliceEthEntitlement = await DistributorContract.claimableETH(alice.address);
      expect(aliceEthEntitlement).to.be.eq(BigNumber.from(contractETHBalance).mul(aliceShare).div(totalETHShares));
  
      let bobShare = await DistributorContract.sharesForETH(bob.address);
      let bobEthEntitlement = await DistributorContract.claimableETH(bob.address);
      expect(bobEthEntitlement).to.be.eq(BigNumber.from(contractETHBalance).mul(bobShare).div(totalETHShares));
  
      let charlieShare = await DistributorContract.sharesForETH(charlie.address);
      let charlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);
      expect(charlieEthEntitlement).to.be.eq(BigNumber.from(contractETHBalance).mul(charlieShare).div(totalETHShares));
    });
  })

  describe("ETH Distribution Test Cases", () => {

    it("should ALLOW anyone to claim/payout claimable ETH to any registered & entitiled account", async () => {
      let charlieInitialEthBalance = await ethers.provider.getBalance(charlie.address);
      // Simulate Charlie calling the payout for himself:
      let charlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);
      await expect(DistributorContract.connect(charlie).payoutETH(charlie.address)).to.emit(DistributorContract, "ETHFundClaimed").withArgs(charlie.address, charlieEthEntitlement);

      let charlieCurEthBalance = await ethers.provider.getBalance(charlie.address);
      // expect(charlieEthEntitlement).to.be.eq(charlieCurEthBalance.sub(charlieInitialEthBalance))


      let aliceInitialEthBalance = await ethers.provider.getBalance(alice.address);
      // Simuluate Charlie calling the payout on behalf of alice:
      let aliceEthEntitlement = await DistributorContract.claimableETH(alice.address);
      await expect(DistributorContract.connect(charlie).payoutETH(alice.address)).to.emit(DistributorContract, "ETHFundClaimed").withArgs(alice.address, aliceEthEntitlement);
      let aliceCurEthBalance = await ethers.provider.getBalance(alice.address);
      expect(aliceEthEntitlement).to.be.eq(aliceCurEthBalance.sub(aliceInitialEthBalance))
    });

    it("should ALLOW owner to distribute all ETH entitlements via 'distributeDemAllETH' function", async () => {
    let aliceInitialEthBalance = await ethers.provider.getBalance(alice.address);
    let bobInitialEthBalance = await ethers.provider.getBalance(bob.address);
    let charlieInitialEthBalance = await ethers.provider.getBalance(charlie.address);

    let aliceEthEntitlement = await DistributorContract.claimableETH(alice.address);
    let bobEthEntitlement = await DistributorContract.claimableETH(bob.address);
    let charlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);

    await DistributorContract.distributeDemAllETH();

    let aliceCurEthBalance = await ethers.provider.getBalance(alice.address);
    let bobCurEthBalance = await ethers.provider.getBalance(bob.address);
    let charlieCurEthBalance = await ethers.provider.getBalance(charlie.address);

    expect(aliceEthEntitlement).to.be.eq(aliceCurEthBalance.sub(aliceInitialEthBalance))
    expect(bobEthEntitlement).to.be.eq(bobCurEthBalance.sub(bobInitialEthBalance))
    expect(charlieEthEntitlement).to.be.eq(charlieCurEthBalance.sub(charlieInitialEthBalance))
  })

  it("should UPDATE claimable ETH to ZERO once a claim has been made to a registered payee", async () => {
    let contractETHBalance = ethers.utils.parseEther('10.0');
    let totalETHShares = await DistributorContract.totalETHShares();

    let charlieShare = await DistributorContract.sharesForETH(charlie.address);
    let charlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);

    expect(charlieEthEntitlement).to.be.eq(BigNumber.from(contractETHBalance).mul(charlieShare).div(totalETHShares))
    await expect(DistributorContract.payoutETH(charlie.address)).to.emit(DistributorContract, "ETHFundClaimed").withArgs(charlie.address, charlieEthEntitlement);

    let newCharlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);
    expect(newCharlieEthEntitlement).to.be.eq(ZERO);
  })

  it("should UPDATE claimable ETH to a registered payee once a claim has been made & contract subsequently received more ETH ", async () => {
    let contractETHBalance = ethers.utils.parseEther('10.0');
    let totalETHShares = await DistributorContract.totalETHShares();

    let charlieShare = await DistributorContract.sharesForETH(charlie.address);
    let charlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);

    expect(charlieEthEntitlement).to.be.eq(BigNumber.from(contractETHBalance).mul(charlieShare).div(totalETHShares))
    await expect(DistributorContract.payoutETH(charlie.address)).to.emit(DistributorContract, "ETHFundClaimed").withArgs(charlie.address, charlieEthEntitlement);

    let newEthTopUpValue = ethers.utils.parseEther('20.0')

    // Add ETH funds to the contract from admin:
    await expect(admin.sendTransaction({
      to: distributorAddress,
      value: newEthTopUpValue
    })).to.emit(DistributorContract, "ETHReceived").withArgs(admin.address, newEthTopUpValue);

    let newCharlieEthEntitlement = await DistributorContract.claimableETH(charlie.address);
    expect(newCharlieEthEntitlement).to.be.eq(newEthTopUpValue.mul(charlieShare).div(totalETHShares));
  })
})
  

describe("ERC20 (MOCK) Token Registration, Initial Shares & Distribution Status", () => {

  beforeEach(async () => {
    await DistributorContract.registerPayeesForToken([alice.address, bob.address, charlie.address],testERC20Address, [BigNumber.from(20), BigNumber.from(30), BigNumber.from(50)] );

  })

  it("should HAVE 3 payees registered for TestERC20 distribution", async () => {
    let numTokenPayees = await DistributorContract.numRegisteredForToken(testERC20Address);
    expect(numTokenPayees).to.be.eq(BigNumber.from(3));
  });

  it("should HAVE the respective shares (20,30,50) for the 3 initially resgistered accounts (alice, bob, charlie) under TestERC20 Token", async () => {
    let aliceShare = await DistributorContract.sharesForTokens( alice.address, testERC20Address);
    expect(aliceShare).to.be.eq(BigNumber.from(20));

    let bobShare = await DistributorContract.sharesForTokens(bob.address,  testERC20Address);
    expect(bobShare).to.be.eq(BigNumber.from(30));

    let charlieShare = await DistributorContract.sharesForTokens(charlie.address,  testERC20Address);
    expect(charlieShare).to.be.eq(BigNumber.from(50));
  });

  it("should HAVE a total of 100 Tokens shares & 0 Tokens distributed initially", async () => {
    let totalTokenShares = await DistributorContract.totalTokenShares(testERC20Address);
    expect(totalTokenShares).to.be.eq(BigNumber.from(100));

    let totalTokenDistributed = await DistributorContract.totalTokenDistributed(testERC20Address)
    expect(totalTokenDistributed).to.be.eq(ZERO);

  });

  it("should REFLECT the right amount of TestERC20 Tokens to be claimed based on the proportion of shares tagged to an account", async () => {
    let contractTokenBalance = await TestERC20Contract.balanceOf(distributorAddress);

    let totalTokenShares = await DistributorContract.totalTokenShares(testERC20Address);

    let aliceShare = await DistributorContract.sharesForTokens( alice.address, testERC20Address);
    let aliceTokenEntitlement = await DistributorContract.claimableToken(alice.address,  testERC20Address);
    expect(aliceTokenEntitlement).to.be.eq(BigNumber.from(contractTokenBalance).mul(aliceShare).div(totalTokenShares));

    let bobShare = await DistributorContract.sharesForTokens( bob.address, testERC20Address);
    let bobEthEntitlement = await DistributorContract.claimableToken(bob.address,  testERC20Address);
    expect(bobEthEntitlement).to.be.eq(BigNumber.from(contractTokenBalance).mul(bobShare).div(totalTokenShares));

    let charlieShare = await DistributorContract.sharesForTokens(charlie.address, testERC20Address);
    let charlieEthEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);
    expect(charlieEthEntitlement).to.be.eq(BigNumber.from(contractTokenBalance).mul(charlieShare).div(totalTokenShares));
  });
})


describe("TestERC20 Distribution Test Cases", () => {
  let aliceInitialTokenBalance;
  let aliceCurTokenBalance;
  let bobInitialTokenBalance;
  let bobCurTokenBalance;
  let charlieInitialTokenBalance;
  let charlieCurTokenBalance;

  let totalTokenShares;


  beforeEach(async () => {
    await DistributorContract.registerPayeesForToken([alice.address, bob.address, charlie.address],testERC20Address, [BigNumber.from(20), BigNumber.from(30), BigNumber.from(50)] );

    totalTokenShares = await DistributorContract.totalTokenShares(testERC20Address);

    // Initial Balances:
    aliceInitialTokenBalance = await TestERC20Contract.balanceOf(alice.address);
    bobInitialTokenBalance = await TestERC20Contract.balanceOf(bob.address);
    charlieInitialTokenBalance = await TestERC20Contract.balanceOf(charlie.address)

  })

  it("should REFLECT that alice, bob & charlie have an initial balance of ZERO TestERC20 Tokens", async () => {
    expect(aliceInitialTokenBalance).to.be.eq(ZERO)
    expect(bobInitialTokenBalance).to.be.eq(ZERO)
    expect(charlieInitialTokenBalance).to.be.eq(ZERO)
  })

  it("should ALLOW anyone to claim/payout claimable ERC20 Token to any registered & entitiled account", async () => {
  
    // Simulate Charlie calling the payout for himself:
    let charlieTokenEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);
    await expect(DistributorContract.connect(charlie).payoutToken(charlie.address, testERC20Address)).to.emit(DistributorContract, "TokenFundClaimed").withArgs(charlie.address,testERC20Address, charlieTokenEntitlement);

    let charlieCurTokenBalance = await TestERC20Contract.balanceOf(charlie.address);
    expect(charlieTokenEntitlement).to.be.eq(charlieCurTokenBalance.sub(charlieInitialTokenBalance))


    // Simuluate Charlie calling the payout on behalf of alice:
    let aliceTokenEntitlement = await DistributorContract.claimableToken(alice.address, testERC20Address);
    await expect(DistributorContract.connect(charlie).payoutToken(alice.address, testERC20Address)).to.emit(DistributorContract, "TokenFundClaimed").withArgs(alice.address, testERC20Address, aliceTokenEntitlement);

    let aliceCurTokenBalance = await TestERC20Contract.balanceOf(alice.address)
    expect(aliceTokenEntitlement).to.be.eq(aliceCurTokenBalance.sub(aliceInitialTokenBalance))
  });

  it("should ALLOW owner to distribute all ERC20 Token entitlements via 'distributeDemAllTokens' function", async () => {


  let aliceTokenEntitlement =await DistributorContract.claimableToken(alice.address, testERC20Address);
  let bobTokenEntitlement = await DistributorContract.claimableToken(bob.address, testERC20Address);
  let charlieTokenEntitlement =await DistributorContract.claimableToken(charlie.address, testERC20Address);

  await DistributorContract.distributeDemAllToken(testERC20Address);

  let aliceCurTokenBalance = await TestERC20Contract.balanceOf(alice.address);
  let bobCurTokenBalance = await TestERC20Contract.balanceOf(bob.address);
  let charlieCurTokenBalance = await TestERC20Contract.balanceOf(charlie.address);

  expect(aliceTokenEntitlement).to.be.eq(aliceCurTokenBalance.sub(aliceInitialTokenBalance))
  expect(bobTokenEntitlement).to.be.eq(bobCurTokenBalance.sub(bobInitialTokenBalance))
  expect(charlieTokenEntitlement).to.be.eq(charlieCurTokenBalance.sub(charlieInitialTokenBalance))
})

it("should UPDATE claimable Token to ZERO once a claim has been made to a registered payee", async () => {
  let contractTokenBalance = await TestERC20Contract.balanceOf(distributorAddress)
  let totalTokenShares = await DistributorContract.totalTokenShares(testERC20Address);

  let charlieShare = await DistributorContract.sharesForTokens(charlie.address, testERC20Address);
  let charlieTokenEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);

  expect(charlieTokenEntitlement).to.be.eq(contractTokenBalance.mul(charlieShare).div(totalTokenShares))
  await expect(DistributorContract.payoutToken(charlie.address, testERC20Address)).to.emit(DistributorContract, "TokenFundClaimed").withArgs(charlie.address,testERC20Address, charlieTokenEntitlement);

  charlieTokenEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);
  expect(charlieTokenEntitlement).to.be.eq(ZERO);
})

it("should UPDATE claimable ERC20 Token to a registered payee once a claim has been made & contract subsequently received more ERC20 Token ", async () => {
  let contractTokenBalance = await TestERC20Contract.balanceOf(distributorAddress)

  let charlieShare = await DistributorContract.sharesForTokens(charlie.address, testERC20Address);
  let charlieTokenEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);

  expect(charlieTokenEntitlement).to.be.eq(contractTokenBalance.mul(charlieShare).div(totalTokenShares))

  await expect(DistributorContract.payoutToken(charlie.address, testERC20Address)).to.emit(DistributorContract, "TokenFundClaimed").withArgs(charlie.address, testERC20Address, charlieTokenEntitlement);


  // Add ERC20 Token "TEST" to the contract from admin:
  let newTESTTopUpValue = BigNumber.from(100000)
  await TestERC20Contract.mint(newTESTTopUpValue);
  await TestERC20Contract.transfer(distributorAddress, newTESTTopUpValue);

  let newCharlieTokenEntitlement = await DistributorContract.claimableToken(charlie.address, testERC20Address);
  expect(newCharlieTokenEntitlement).to.be.eq(newTESTTopUpValue.mul(charlieShare).div(totalTokenShares));
})
})


});
