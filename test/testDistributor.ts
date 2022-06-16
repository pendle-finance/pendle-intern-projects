import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import hre , { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, minerStart } from "./helpers/hardhat-helpers";
import { ZERO_ADDRESS, _1E18, PRECISION } from "./helpers/Constants";
import { ERC20, Distributor } from "../typechain";

describe("Test Distributor ", () => {
  const [admin, Alice, Bob, Dd] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let ETH_ADDRESS = ZERO_ADDRESS;
  let coin1: ERC20;
  let coin2: ERC20;
  let dist: Distributor;;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    [] = await ethers.getSigners();

    coin1 = await deploy<ERC20>("ERC20", [100, "peepeepoopoo", "PPPOPO", 1]);
    coin2 = await deploy<ERC20>("ERC20", [100, "poopoopeepee", "POPOPP", 1]);
    dist = await deploy<Distributor>("Distributor", []);

    await coin1.mint(admin.address, 500);
    await coin2.mint(admin.address, 500);
    
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("view functions", () => {

    it("test balanceToken", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 5);
      expect(await dist.balanceToken(coin1.address, Alice.address)).to.be.eq(5);
    });      

    it("test balanceETH", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, 5);
      expect(await dist.balanceETH(Alice.address)).to.be.eq(5);
    });

    it("test undistributedToken", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      expect(await dist.undistributedToken(coin1.address)).to.be.eq(100);
    });      

    it("test undistributedETH", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      expect(await dist.undistributedETH()).to.be.eq(_1E18.mul(5));
    });

  });

  describe("deposit functions", () => {

    it("test depositToken", async () =>{
      await coin1.approve(dist.address, 100);
      await coin2.mint(Alice.address, 100);
      await coin2.connect(Alice).approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.connect(Alice).depositToken(coin2.address, 100);
      expect(await dist.undistributedToken(coin1.address)).to.be.eq(100);
    });

    it("test depositToken: not enough", async () =>{
      await coin1.approve(dist.address, 100);
      expect(dist.depositToken(coin1.address, 101)).to.be.revertedWith("yo lyin' :(")
    });

    it("test depositToken: emit", async () =>{
      await coin1.approve(dist.address, 100);
      expect(await dist.depositToken(coin1.address, 100))
        .to.emit(dist, "Deposited")
        .withArgs(coin1.address, admin.address, 100);
    });

    it("test depositETH", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      expect(await dist.undistributedETH()).to.be.eq(_1E18.mul(5));
    });

    it("test depositToken: emit", async () =>{
      expect(await dist.depositETH({value: _1E18.mul(5)}))
        .to.emit(dist, "Deposited")
        .withArgs(ETH_ADDRESS, admin.address, 100);
    });
  });

  describe("approve functions", () => {

    it("test approveToken", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);
      expect(await dist.balanceToken(coin1.address, Alice.address)).to.be.eq(50);
    });  

    it("test approveToken: too much", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      expect(dist.approveToken(coin1.address, Alice.address, 200)).to.be.revertedWith("too poor :(");
    });  

    it("test approveToken: not owner", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      expect(dist.connect(Alice).approveToken(coin1.address, Alice.address, 50)).to.be.revertedWith("not owner :(");
    });  

    it("test approveToken: zero address", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      expect(dist.approveToken(coin1.address, ZERO_ADDRESS, 50)).to.be.revertedWith("non-existent :(");
    });  

    it("test approveToken: emit", async () =>{
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      expect(await dist.approveToken(coin1.address, Alice.address, 50))
        .to.emit(dist, "Approved")
        .withArgs(coin1.address, Alice.address, 50);
    });  

    it("test approveETH", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, 5);
      expect(await dist.balanceETH(Alice.address)).to.be.eq(5);
    });

    it("test approveETH: not owner", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      expect(dist.connect(Alice).approveETH(Alice.address, 50)).to.be.revertedWith("not owner :(");
    });  

    it("test approveETH: not owner", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      expect(dist.approveETH(Alice.address, _1E18.mul(6))).to.be.revertedWith("too poor :(");
    });  

    it("test approveETH: zero address", async () =>{
      await coin1.approve(dist.address, 100);
      expect(dist.approveETH(ZERO_ADDRESS, 50)).to.be.revertedWith("non-existent :(");
    });  

    it("test approveETH", async () =>{
      await dist.depositETH({value: _1E18.mul(5)});
      expect(await dist.approveETH(Alice.address, 50))
        .to.emit(dist, "Approved")
        .withArgs(ETH_ADDRESS, Alice.address, 50);
    });

  });

  describe("claim functions", () => {

    it("test claimToken", async () => {
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);
      await dist.connect(Alice).claimToken(coin1.address, 50);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(50);
    });
    
    it("test claimToken: too much", async () => {
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);
      expect(dist.connect(Alice).claimToken(coin1.address, 100)).to.be.revertedWith("too poor :(");
    });

    it("test claimToken: emit", async () => {
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);
      expect(await dist.connect(Alice).claimToken(coin1.address, 50))
        .to.emit(dist, "Claimed")
        .withArgs(coin1.address, Alice.address, 50);
    });

    it("test claimAllToken: 1 token", async () => {
      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);
      await dist.connect(Alice).claimAllToken(coin1.address);
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(50);
    });

    it("test claimETH", async () => {
      let Alicebal = await waffle.provider.getBalance(Alice.address);
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, _1E18);
      await dist.connect(Alice).claimETH(_1E18);
      expect(await waffle.provider.getBalance(Alice.address)).to.be.closeTo(Alicebal.add(_1E18), PRECISION);
    });
    
    it("test claimETH: too much", async () => {
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, 50);
      expect(dist.connect(Alice).claimETH(100)).to.be.revertedWith("too poor :(");
    });

    it("test claimETH: emit", async () => {
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, 50);
      expect(await dist.connect(Alice).claimETH(50))
        .to.emit(dist, "Claimed")
        .withArgs(ETH_ADDRESS, Alice.address, 50);
    });

    it("test claimAllETH", async () => {
      let Alicebal = await waffle.provider.getBalance(Alice.address);
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, _1E18);
      await dist.connect(Alice).claimAllETH();
      expect(await waffle.provider.getBalance(Alice.address)).to.be.closeTo(Alicebal.add(_1E18), PRECISION);
    });

    it("test claimEverything:", async () => {
      let Alicebal = await waffle.provider.getBalance(Alice.address);
      await dist.depositETH({value: _1E18.mul(5)});
      await dist.approveETH(Alice.address, _1E18);
      await dist.connect(Alice).claimAllETH();

      await coin1.approve(dist.address, 100);
      await dist.depositToken(coin1.address, 100);
      await dist.approveToken(coin1.address, Alice.address, 50);

      await coin2.approve(dist.address, 100);
      await dist.depositToken(coin2.address, 100);
      await dist.approveToken(coin2.address, Alice.address, 50);

      await dist.connect(Alice).claimEverything();
      expect(await coin1.balanceOf(Alice.address)).to.be.eq(50);
      expect(await coin2.balanceOf(Alice.address)).to.be.eq(50);
      expect(await waffle.provider.getBalance(Alice.address)).to.be.closeTo(Alicebal.add(_1E18), PRECISION);
    });

  });

  describe("real men functions", () => {

    it("test gamble", async () =>{
      let Alicebal = await waffle.provider.getBalance(Alice.address);
      await dist.connect(Alice).gamble(1, {value: _1E18.mul(5)});
      expect(await waffle.provider.getBalance(Alice.address)).to.be.closeTo(Alicebal.sub(_1E18.mul(5)), PRECISION);
    });

  });
  
});
