import { expect } from "chai";
import { providers, utils, BigNumber } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, toNumber } from "./helpers/hardhat-helpers";
import * as CONSTANTS from "./helpers/Constants";
import { AnythingAirdrop, ERC20 } from "../typechain";

describe("TestContract", () => {
  const [admin, a, b, c] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let airdropContract: AnythingAirdrop;
  let erc20Contract: ERC20;
  let erc20Contract1: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();

    airdropContract = await deploy<AnythingAirdrop>("AnythingAirdrop", []);
    erc20Contract = await deploy<ERC20>("ERC20",["name","token",18, 10000]);
    erc20Contract1 = await deploy<ERC20>("ERC20",["name1","token1",18, 10000]);
    
    erc20Contract.approve(airdropContract.address,CONSTANTS.INF);
    erc20Contract1.approve(airdropContract.address,CONSTANTS.INF);

    await erc20Contract.mint(a.address, 10000);
    await erc20Contract.mint(b.address, 10000);
    await erc20Contract.mint(c.address, 10000);

    await erc20Contract1.mint(a.address, 10000);
    await erc20Contract1.mint(b.address, 10000);
    await erc20Contract1.mint(c.address, 10000);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("Check entire setup is correct", () => {
    it("Everyone has 10000 tokens", async () => {
      let adminBal = await erc20Contract.balanceOf(admin.address);
      expect(adminBal).to.be.eq(10000);
      let aBal = await erc20Contract.balanceOf(a.address);
      expect(aBal).to.be.eq(10000);
      let bBal = await erc20Contract.balanceOf(b.address);
      expect(bBal).to.be.eq(10000);
      let cBal = await erc20Contract.balanceOf(c.address);
      expect(cBal).to.be.eq(10000);
      adminBal = await erc20Contract1.balanceOf(admin.address);
      expect(adminBal).to.be.eq(10000);
      aBal = await erc20Contract1.balanceOf(a.address);
      expect(aBal).to.be.eq(10000);
      bBal = await erc20Contract1.balanceOf(b.address);
      expect(bBal).to.be.eq(10000);
      cBal = await erc20Contract1.balanceOf(c.address);
      expect(cBal).to.be.eq(10000);
    });

    it("Everyone has ETH for gas, etc", async () => {
      let wei = utils.parseEther('1000.0');
      expect(parseInt(utils.formatEther(wei))).to.be.eq(1000);
      let adminETH = await admin.getBalance();
      expect(parseInt(utils.formatEther(adminETH))).to.not.be.eq(0);
      let aETH = await admin.getBalance();
      expect(parseInt(utils.formatEther(aETH))).to.not.be.eq(0);
      let bETH = await admin.getBalance();
      expect(parseInt(utils.formatEther(bETH))).to.not.be.eq(0);
      let cETH = await admin.getBalance();
      expect(parseInt(utils.formatEther(cETH))).to.not.be.eq(0);
    });

    it("Smart contract is approved to spend ERC20 tokens", async () => {
      let allowance = await erc20Contract.allowance(admin.address,airdropContract.address);
      expect(allowance).to.be.eq(CONSTANTS.INF);
      allowance = await erc20Contract1.allowance(admin.address,airdropContract.address);
      expect(allowance).to.be.eq(CONSTANTS.INF);
    });
  });

  describe("Check construction of airdrop contract", () => {
    it("Ownership belongs to admin", async () => {
      let owner = await airdropContract.owner();
      expect(owner).to.be.eq(admin.address);
    });

    it("No one should have been allocated any ERC20", async () => {
      let adminAmount = await airdropContract.getERC20Distribution(admin.address, erc20Contract.address);
      expect(adminAmount).to.be.eq(0);
      let aAmount = await airdropContract.getERC20Distribution(a.address, erc20Contract.address);
      expect(aAmount).to.be.eq(0);
      let bAmount = await airdropContract.getERC20Distribution(b.address, erc20Contract.address);
      expect(bAmount).to.be.eq(0);
      let cAmount = await airdropContract.getERC20Distribution(c.address, erc20Contract.address);
      expect(cAmount).to.be.eq(0);
    });

    it("No one should have been allocated any ETH", async () => {
      let adminAmount = await airdropContract.getETHDistribution(admin.address);
      expect(adminAmount).to.be.eq(0);
      let aAmount = await airdropContract.getETHDistribution(admin.address);
      expect(aAmount).to.be.eq(0);
      let bAmount = await airdropContract.getETHDistribution(admin.address);
      expect(bAmount).to.be.eq(0);
      let cAmount = await airdropContract.getETHDistribution(admin.address);
      expect(cAmount).to.be.eq(0);
    });

    it("Smart contract should not have any ETH or ERC20", async () => {
      let ethAmount = await ethers.provider.getBalance(airdropContract.address);
      expect(ethAmount).to.be.eq(0);
      let erc20Amount = await erc20Contract.balanceOf(airdropContract.address);
      expect(erc20Amount).to.be.eq(0);
    });
  });

  describe("Test ERC20 airdrop functions", () => {
    it("ERC20 Airdrop -> airdrop multiple times, different tokens, airdrop to multiple people & can airdrop up to owned amount", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      let aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(1000);
      await airdropContract.airdrop(a.address,erc20Contract.address,3000);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(4000);
      await airdropContract.airdrop(b.address,erc20Contract.address,5000);
      let bAmount = await airdropContract.getERC20Distribution(b.address,erc20Contract.address);
      expect(bAmount).to.be.eq(5000);
      await airdropContract.airdrop(c.address,erc20Contract.address,1000);
      let cAmount = await airdropContract.getERC20Distribution(c.address,erc20Contract.address);
      expect(cAmount).to.be.eq(1000);
      await airdropContract.airdrop(a.address,erc20Contract1.address,1000);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract1.address);
      expect(aAmount).to.be.eq(1000);
    });

    it("ERC20 Airdrop gives smart contract the tokens", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      let adminBal = await erc20Contract.balanceOf(admin.address);
      expect(adminBal).to.be.eq(9000);
      let aBal = await erc20Contract.balanceOf(a.address);
      expect(aBal).to.be.eq(10000);
      let contractBal = await erc20Contract.balanceOf(airdropContract.address);
      expect(contractBal).to.be.eq(1000);
    });

    it("ERC20 Airdrop amount > owned (Case 1)", async () => {
      await expect(airdropContract.airdrop(a.address,erc20Contract.address,10001)).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
      let aAmount = await airdropContract.getERC20Distribution(a.address, erc20Contract.address);
      expect(aAmount).to.be.eq(0);
      let adminBal = await erc20Contract.balanceOf(admin.address);
      expect(adminBal).to.be.eq(10000);
      let contractBal = await erc20Contract.balanceOf(erc20Contract.address);
      expect(contractBal).to.be.eq(0);
    });

    it("ERC20 Airdrop amount > owned (Case 2)", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      let aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(1000);
      await airdropContract.airdrop(a.address,erc20Contract.address,3000);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(4000);
      await expect(airdropContract.airdrop(b.address,erc20Contract.address,6001)).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
    });

    it("Airdrop 1 User Multiple Tokens -> airdrop to same person more than once, airdrop to multiple people & airdrop up to owned amount", async () => {
      await airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[2000,4000]);
      let aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(2000);
      let aAmount1 = await airdropContract.getERC20Distribution(a.address,erc20Contract1.address);
      expect(aAmount1).to.be.eq(4000);
      await airdropContract.airdropOneUserMultiToken(b.address,[erc20Contract.address,erc20Contract1.address],[5000,5000]);
      let bAmount = await airdropContract.getERC20Distribution(b.address,erc20Contract.address);
      expect(bAmount).to.be.eq(5000);
      let bAmount1 = await airdropContract.getERC20Distribution(b.address,erc20Contract1.address);
      expect(bAmount1).to.be.eq(5000);
      await airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[3000,1000]);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(5000);
      aAmount1 = await airdropContract.getERC20Distribution(a.address,erc20Contract1.address);
      expect(aAmount1).to.be.eq(5000);
    });

    it("Airdrop 1 User Multiple Tokens gives smart contract the tokens", async () => {
      await airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[2000,4000]);
      let adminBal = await erc20Contract.balanceOf(admin.address);
      expect(adminBal).to.be.eq(8000);
      adminBal = await erc20Contract1.balanceOf(admin.address);
      expect(adminBal).to.be.eq(6000);
      let contractBal = await erc20Contract.balanceOf(airdropContract.address);
      expect(contractBal).to.be.eq(2000);
      contractBal = await erc20Contract1.balanceOf(airdropContract.address);
      expect(contractBal).to.be.eq(4000);
    });

    it("Airdrop 1 User Multiple Tokens amount > owned", async () => {
      await expect(airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[10001,1000])).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
      await expect(airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[1000,10001])).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
      await airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address,erc20Contract1.address],[2000,2000]);
      await airdropContract.airdropOneUserMultiToken(b.address,[erc20Contract.address,erc20Contract1.address],[2000,2000]);
      await expect(airdropContract.airdropOneUserMultiToken(c.address,[erc20Contract.address,erc20Contract1.address],[6001,4000])).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
      await expect(airdropContract.airdropOneUserMultiToken(c.address,[erc20Contract.address,erc20Contract1.address],[4000,6001])).to.be.revertedWith("TransferHelper::transferFrom: transferFrom failed");
    });

    it("Airdrop Multi User 1 Token -> airdrop to same person more than once, different tokens & airdrop up to owned amount", async () => {
      await airdropContract.airdropMultiUserOneToken([a.address,b.address],erc20Contract.address,[2000,2000]);
      let aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(2000);
      let bAmount = await airdropContract.getERC20Distribution(b.address,erc20Contract.address);
      expect(bAmount).to.be.eq(2000);
      await airdropContract.airdropMultiUserOneToken([a.address,c.address],erc20Contract.address,[2000,1000]);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(4000);
      let cAmount = await airdropContract.getERC20Distribution(c.address,erc20Contract.address);
      expect(cAmount).to.be.eq(1000);
      await airdropContract.airdropMultiUserOneToken([a.address,c.address],erc20Contract.address,[2000,1000]);
      aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      expect(aAmount).to.be.eq(6000);
      cAmount = await airdropContract.getERC20Distribution(c.address,erc20Contract.address);
      expect(cAmount).to.be.eq(2000);

      await airdropContract.airdropMultiUserOneToken([a.address,c.address],erc20Contract1.address,[5000,5000]);
      let aAmount1 = await airdropContract.getERC20Distribution(a.address,erc20Contract1.address);
      expect(aAmount1).to.be.eq(5000);
      let cAmount1 = await airdropContract.getERC20Distribution(c.address,erc20Contract1.address);
      expect(cAmount1).to.be.eq(5000);
    });       
  });
  //TODO: 0 address
  //TODO: claim functions
  //TODO: event emission
  //TODO: invalid inputs
  //TODO: send more ETH than usual
  
  function WeiconvertToETH(amountWei) {
    return parseInt(utils.formatEther(amountWei));
  }

  describe("Test ETH airdrop functions", () => {
    it("ETH Airdrop -> airdrop multiple times & to multiple people", async () => {
      await airdropContract.airdropETH(a.address,utils.parseEther("1000"),{ value: utils.parseEther("1000") });
      let aAmount = await airdropContract.getETHDistribution(a.address);
      expect(WeiconvertToETH(aAmount)).to.be.eq(1000); 
      await airdropContract.airdropETH(a.address,utils.parseEther("500000"),{ value: utils.parseEther("500000") });
      aAmount = await airdropContract.getETHDistribution(a.address);
      expect(WeiconvertToETH(aAmount)).to.be.eq(501000); 
      await airdropContract.airdropETH(b.address,utils.parseEther("1000"),{ value: utils.parseEther("1000") });
      let bAmount = await airdropContract.getETHDistribution(b.address);
      expect(WeiconvertToETH(bAmount)).to.be.eq(1000); 
    });

    it("ETH Airdrop amount > owned", async () => {
      //InvalidInputError -> not enough funds to pay gas
      await expect(airdropContract.airdropETH(a.address,utils.parseEther("1000000000000000001"),{ value: utils.parseEther("1000000000000000001") })).to.Throw;
    });

    it("ETH Airdrop amount != msg.value", async () => {
      await expect(airdropContract.airdropETH(a.address,utils.parseEther("1000"),{ value: utils.parseEther("1") })).to.be.revertedWith("AnythingAirdrop: ETH given is not equal to allocation");
    });

    it("ETH Airdrop > amount gives contract funds and refunds dust", async () => {
      let amount = utils.parseEther("1000");
      let total = utils.parseEther("1001");
      await airdropContract.airdropETH(a.address, amount, { value: total });
      let contractETH = await ethers.provider.getBalance(airdropContract.address);
      expect(contractETH).to.be.eq(amount);
    });

    it("ETH Airdrop Multi User", async () => {
      let amount = utils.parseEther("1000");
      let amount1 = utils.parseEther("5000");
      let total = utils.parseEther("6000");
      await airdropContract.airdropMultiUserETH([a.address,b.address],[amount, amount1],{ value: total });
      let aAmount = await airdropContract.getETHDistribution(a.address);
      expect(WeiconvertToETH(aAmount)).to.be.eq(1000);
      let bAmount = await airdropContract.getETHDistribution(b.address);
      expect(WeiconvertToETH(bAmount)).to.be.eq(5000);
      await airdropContract.airdropMultiUserETH([a.address,c.address],[amount1, amount],{ value: total });
      aAmount = await airdropContract.getETHDistribution(a.address);
      expect(WeiconvertToETH(aAmount)).to.be.eq(6000);
      let cAmount = await airdropContract.getETHDistribution(c.address);
      expect(WeiconvertToETH(cAmount)).to.be.eq(1000);
    });

    it("ETH Airdrop Multi User amount > owned", async () => {
      let amount = utils.parseEther("1000000000000000000");
      let amount1 = utils.parseEther("1");
      let total = utils.parseEther("1000000000000000001");
      await expect(airdropContract.airdropMultiUserETH([a.address,b.address],[amount, amount1],{ value: total })).to.Throw;
    });

    it("ETH Airdrop Multi User amount != msg.value", async () => {
      let amount = utils.parseEther("1000");
      let amount1 = utils.parseEther("5000");
      await expect(airdropContract.airdropMultiUserETH([a.address,b.address],[amount, amount1],{ value: utils.parseEther("1") })).to.be.revertedWith("AnythingAirdrop: ETH given is not equal to allocation");
    });

    it("ETH Airdrop Multi User amount > msg.value gives contract funds and refunds dust", async () => {
      let amount = utils.parseEther("1000");
      let amount1 = utils.parseEther("5000");
      let total = utils.parseEther("6001");
      let actualTotal = utils.parseEther("6000")
      await airdropContract.airdropMultiUserETH([a.address,b.address],[amount, amount1],{ value: total });
      let contractETH = await ethers.provider.getBalance(airdropContract.address);
      expect(contractETH).to.be.eq(actualTotal);
    });
  });

  describe("Test ERC20 claim functions", () => {
    beforeEach(async () => {
      await airdropContract.airdropMultiUserOneToken([a.address,b.address,c.address],erc20Contract.address,[1000,2000,3000]);
      await airdropContract.airdropMultiUserOneToken([a.address,b.address,c.address],erc20Contract1.address,[3000,1000,2000]);
      let amount = utils.parseEther("1000");
      let amount1 = utils.parseEther("5000");
      let amount2 = utils.parseEther("10000");
      let total = utils.parseEther("16000");
      await airdropContract.airdropMultiUserETH([a.address,b.address,c.address],[amount,amount1,amount2],{ value: total });
    });
    
    it("Amount transferred from smart contract to user", async () => {
      let aPrev = await erc20Contract.balanceOf(a.address);
      let contractPrev = await erc20Contract.balanceOf(airdropContract.address);
      await airdropContract.connect(a).claim(a.address,erc20Contract.address,1000);
      let aCur = await erc20Contract.balanceOf(a.address);
      let contractCur = await erc20Contract.balanceOf(airdropContract.address);
      let aDiff = await toNumber(aCur) - await toNumber(aPrev);
      let contractDiff = await toNumber(contractPrev) - await toNumber(contractCur);
      expect(aDiff).to.be.eq(1000);
      expect(contractDiff).to.be.eq(1000);   
    });

    it("For claim ETH, Amount transferred from smart contract to user", async () => {
      let aETH = await a.getBalance();
      let contractETH = await ethers.provider.getBalance(airdropContract.address);
      await airdropContract.claimETH(a.address,utils.parseEther("1000"));
      let aETHCur = await a.getBalance();
      let contractETHCur = await ethers.provider.getBalance(airdropContract.address);
      expect(WeiconvertToETH(aETHCur.sub(aETH))).to.be.eq(1000);
      expect(WeiconvertToETH(contractETH.sub(contractETHCur))).to.be.eq(1000);   
    });

    it("Claim by different user goes to the airdropTo", async () => {
      let aPrev = await erc20Contract.balanceOf(a.address);
      let bPrev = await erc20Contract.balanceOf(b.address);
      await airdropContract.connect(b).claim(a.address,erc20Contract.address,1000);
      let aCur = await erc20Contract.balanceOf(a.address);
      let bCur = await erc20Contract.balanceOf(b.address);
      let aDiff = await toNumber(aCur) - await toNumber(aPrev);
      let bDiff = await toNumber(bCur) - await toNumber(bPrev);
      expect(aDiff).to.be.eq(1000);
      expect(bDiff).to.be.eq(0);   
    });

    it("Test claim multiple times, multiple people", async () => {
      let aPrev = await erc20Contract.balanceOf(a.address);
      let bPrev = await erc20Contract.balanceOf(b.address);
      await airdropContract.claim(a.address,erc20Contract.address,500);
      let aCur = await erc20Contract.balanceOf(a.address);
      let aDiff = await toNumber(aCur) - await toNumber(aPrev);
      expect(aDiff).to.be.eq(500);
      await airdropContract.claim(b.address,erc20Contract.address,2000);
      let bCur = await erc20Contract.balanceOf(b.address);
      let bDiff = await toNumber(bCur) - await toNumber(bPrev);
      expect(bDiff).to.be.eq(2000);
      await airdropContract.claim(a.address,erc20Contract.address,500);
      aCur = await erc20Contract.balanceOf(a.address);
      aDiff = await toNumber(aCur) - await toNumber(aPrev);
      expect(aDiff).to.be.eq(1000);
      let cPrev = await erc20Contract1.balanceOf(c.address);
      await airdropContract.claim(c.address,erc20Contract1.address,2000);
      let cCur = await erc20Contract1.balanceOf(c.address);
      let cDiff = await toNumber(cCur) - await toNumber(cPrev);
      expect(cDiff).to.be.eq(2000);
    });

    it("Test claim All function", async () => {
      let aPrev = await erc20Contract.balanceOf(a.address);
      let aPrev1 = await erc20Contract1.balanceOf(a.address);
      let aETH = await a.getBalance();
      let amount = utils.parseEther("1000");
      await airdropContract.claimAll(a.address, [erc20Contract.address,erc20Contract1.address,CONSTANTS.ZERO_ADDRESS],[1000,3000,amount]);
      let aCur = await erc20Contract.balanceOf(a.address);
      let aCur1 = await erc20Contract1.balanceOf(a.address);
      let aETHCur = await a.getBalance();
      expect(WeiconvertToETH(aETHCur.sub(aETH))).to.be.eq(1000);
      expect(aCur.sub(aPrev)).to.be.eq(1000);
      expect(aCur1.sub(aPrev1)).to.be.eq(3000);
    });

    it("Test claim amount > allocated", async () => {
      await expect(airdropContract.claim(a.address,erc20Contract.address,1001)).to.be.revertedWith("AnythingAirdrop: claiming more ERC20 than allocation");
      await expect(airdropContract.claim(a.address,erc20Contract1.address,3001)).to.be.revertedWith("AnythingAirdrop: claiming more ERC20 than allocation");
      await expect(airdropContract.claimETH(a.address,utils.parseEther("1001"))).to.be.revertedWith("AnythingAirdrop: claiming more ETH than allocation");
      await expect(airdropContract.claimAll(a.address, [erc20Contract.address,erc20Contract1.address],[1001,3001])).to.be.revertedWith("AnythingAirdrop: claiming more ERC20 than allocation");
    });
  });

  describe("Test all ownership functions", () => {
    it("All ownership functions", async () => {
      await expect(airdropContract.connect(a).airdrop(b.address,erc20Contract.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(b).airdropETH(b.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(a).airdropMultiUserOneToken([b.address],erc20Contract.address,[100])).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(c).airdropMultiUserETH([b.address],[100])).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(a).airdropOneUserMultiToken(b.address,[erc20Contract.address],[100])).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(c).takeback(b.address,erc20Contract.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(c).takebackETH(b.address,[100])).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(airdropContract.connect(c).shiftAround(b.address,a.address,erc20Contract.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Test takeback function", () => {
    it("Takeback function", async () => {
      let adminBalance = await erc20Contract.balanceOf(admin.address);
      let contractBalance = await erc20Contract.balanceOf(airdropContract.address);
      await airdropContract.connect(admin).airdrop(a.address,erc20Contract.address,1000);
      await airdropContract.connect(admin).takeback(a.address,erc20Contract.address,500);
      let adminBalance1 = await erc20Contract.balanceOf(admin.address);
      let contractBalance1 = await erc20Contract.balanceOf(airdropContract.address);
      expect(contractBalance1.sub(contractBalance)).to.be.eq(500);
      expect(adminBalance.sub(adminBalance1)).to.be.eq(500);
      await airdropContract.connect(admin).takeback(a.address,erc20Contract.address,500);
      adminBalance1 = await erc20Contract.balanceOf(admin.address);
      contractBalance1 = await erc20Contract.balanceOf(airdropContract.address);
      expect(contractBalance1.sub(contractBalance)).to.be.eq(0);
      expect(adminBalance1.sub(adminBalance)).to.be.eq(0);
    });

    it("Takeback amount > allocation", async () => {
      await airdropContract.connect(admin).airdrop(a.address,erc20Contract.address,1000);
      await airdropContract.connect(admin).takeback(a.address,erc20Contract.address,500);
      await expect(airdropContract.connect(admin).takeback(a.address,erc20Contract.address,501)).to.be.revertedWith("AnythingAirdrop: claiming more ERC20 than allocation");
    });
  });

  describe("Test shiftAround function", () => {
    it("ShiftAround", async () => {
      await airdropContract.connect(admin).airdrop(a.address,erc20Contract.address,1000);
      await airdropContract.shiftAround(a.address,b.address,erc20Contract.address,500);
      let aAmount = await airdropContract.getERC20Distribution(a.address,erc20Contract.address);
      let bAmount = await airdropContract.getERC20Distribution(b.address,erc20Contract.address);
      expect(aAmount).to.be.eq(500);
      expect(bAmount).to.be.eq(500);
    });

    it("ShiftAround amount > allocated or person with no balance", async () => {
      await airdropContract.connect(admin).airdrop(a.address,erc20Contract.address,1000);
      await expect(airdropContract.shiftAround(a.address,b.address,erc20Contract.address,1001)).to.be.revertedWith("AnythingAirdrop: shifting more ERC20 than allocation");
      await expect(airdropContract.shiftAround(c.address,b.address,erc20Contract.address,1)).to.be.revertedWith("AnythingAirdrop: shifting more ERC20 than allocation");
    });
  });

  describe("Emission of event", () => {
    it("airdrop", async () => {
      await expect(airdropContract.airdrop(a.address,erc20Contract.address,1000)).to.emit(airdropContract,"Airdrop").withArgs(a.address,erc20Contract.address,1000);
    });

    it("airdropMultiUserETH", async () => {
      await expect(airdropContract.airdropMultiUserETH([a.address],[1000],{ value: 1000})).to.emit(airdropContract,"Airdrop").withArgs(a.address,CONSTANTS.ZERO_ADDRESS,1000);
    });

    it("airdropMultiUserOneToken", async () => {
      await expect(airdropContract.airdropMultiUserOneToken([a.address],erc20Contract.address,[1000])).to.emit(airdropContract,"Airdrop").withArgs(a.address,erc20Contract.address,1000);
    });

    it("airdropOneUserMultiToken", async () => {
      await expect(airdropContract.airdropOneUserMultiToken(a.address,[erc20Contract.address],[1000])).to.emit(airdropContract,"Airdrop").withArgs(a.address,erc20Contract.address,1000);
    });

    it("claim", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      await expect(airdropContract.claim(a.address,erc20Contract.address,1000)).to.emit(airdropContract,"Claim").withArgs(a.address,erc20Contract.address,1000);
    });

    it("claimAll", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      await expect(airdropContract.claimAll(a.address,[erc20Contract.address],[1000])).to.emit(airdropContract,"Claim").withArgs(a.address,erc20Contract.address,1000);
    });

    it("claimETH", async () => {
      await airdropContract.airdropETH(a.address,1000,{ value: 1000});
      await expect(airdropContract.claimETH(a.address,1000)).to.emit(airdropContract,"Claim").withArgs(a.address, CONSTANTS.ZERO_ADDRESS,1000);
    });

    it("takeback", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      await expect(airdropContract.takeback(a.address,erc20Contract.address,1000)).to.emit(airdropContract,"Takeback").withArgs(a.address, admin.address, erc20Contract.address,1000);
    });

    it("shiftAround", async () => {
      await airdropContract.airdrop(a.address,erc20Contract.address,1000);
      await expect(airdropContract.shiftAround(a.address,b.address,erc20Contract.address,1000)).to.emit(airdropContract,"ShiftAround").withArgs(a.address, b.address, erc20Contract.address,1000);
    });
  });
});
