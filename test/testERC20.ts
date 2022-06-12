import { expect } from "chai";
import { BigNumber, utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20 } from "../typechain";

describe("Test ERC20", () => {
  const [admin, Alice, Bob, Dd] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let erc20: ERC20;
  let initialSupply = 1000;
  let initialName = "Not placeholder";
  let initialSymbol = "NPH";
  let initialDecimals = 5;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    [] = await ethers.getSigners();
    erc20 = await deploy<ERC20>("ERC20", [initialSupply, initialName, initialSymbol, initialDecimals]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("view only functions", () => {
    it("test name", async () => {
      expect(await erc20.name()).to.be.eq(initialName);
    });
    
    it("test symbol", async () => {
      expect(await erc20.symbol()).to.be.eq(initialSymbol);
    });
    
    it("test decimals", async () => {
      expect(await erc20.decimals()).to.be.eq(initialDecimals);
    });

    it("test totalsupply", async () => {
      await erc20.connect(admin).mint(Alice.address, 500);
      await erc20.connect(admin).mint(Bob.address, 500);
      expect(await erc20.totalSupply()).to.be.eq(1000 * 10**initialDecimals + 1000);
    });

    it("test balanceof", async () => {
      expect(await erc20.balanceOf(admin.address)).to.be.eq(1000 * 10**initialDecimals);
      await erc20.connect(admin).mint(Alice.address, 500);
      expect(await erc20.balanceOf(Alice.address)).to.be.eq(500);
      expect(await erc20.balanceOf(Dd.address)).to.be.eq(0);
    });

    it("test allowance", async () => {
      expect(await erc20.allowance(Alice.address, Dd.address)).to.be.eq(0);
      await erc20.connect(Alice).approve(Dd.address, 123);
      expect(await erc20.allowance(Alice.address, Dd.address)).to.be.eq(123);
    });
  });

  describe("owner-only functions", () => {
    it("test mint: owner mint", async () => {
      await erc20.connect(admin).mint(Dd.address, 69420);
      expect(await erc20.balanceOf(Dd.address)).to.be.eq(69420);
    });

    it("test mint: not owner mint", async () => {
      expect(erc20.connect(Dd).burn(Dd.address, 177013)).to.be.revertedWith("not owner :(");
    });

    it("test burn: owner burn", async () => {
      await erc20.connect(admin).mint(Alice.address, 500);

      //owner burn
      await erc20.connect(admin).burn(Alice.address, 499);
      expect(await erc20.balanceOf(Alice.address)).to.be.eq(1);

      //owner burn too much
      expect(erc20.connect(admin).burn(Alice.address, 2)).to.be.revertedWith("he got nothing left :(");
    });

    it("test burn: not owner burn", async () => {
      expect(erc20.connect(Dd).burn(Dd.address, 100)).to.be.revertedWith("not owner :(");
    });
  });

  describe("idk-what-to-classify functions", () => {
    it("test transfer: ordinary transfer", async () => {
      await erc20.connect(admin).mint(Alice.address, 500)
      await erc20.connect(Alice).transfer(Bob.address, 6);
      expect(await erc20.balanceOf(Alice.address)).to.be.eq(494);
      expect(await erc20.balanceOf(Bob.address)).to.be.eq(6);
    });

    it("test transfer: transfer to self", async () => {
      await erc20.connect(admin).mint(Alice.address, 1234);
      await erc20.connect(Alice).transfer(Alice.address, 999);
      expect(await erc20.balanceOf(Alice.address)).to.be.eq(1234);
    });

    it("test transfer: too poor to transfer", async () => {
      await erc20.connect(admin).mint(Alice.address, 1234);
      expect(erc20.connect(Alice).transfer(Dd.address, 1235)).to.be.revertedWith("too poor :(");
    });
      
    it("test transfer: too much to transfer (test by lomk)", async () => {
      let INF = BigNumber.from(2).pow(255);
      await erc20.connect(admin).mint(Dd.address, 100000)
      expect(await erc20.connect(Dd).transfer(Alice.address, 99000))
        .to.emit(erc20, 'Transfer')
        .withArgs(admin.address, Alice.address, 99000);
      expect(erc20.connect(Dd).transfer(Alice.address, INF)).to.be.revertedWith("too poor :(");
    });

    it("test transfer: check emit", async () => {
      await erc20.connect(admin).mint(Alice.address, 1234);
      expect(await erc20.connect(Alice).transfer(Bob.address, 1001))
        .to.emit(erc20, "Transfer")
        .withArgs(Alice.address, Bob.address, 1001);
    });

    it("test approve: ordinary approval", async () => {
      await erc20.connect(Alice).approve(Bob.address, 69);
      expect(await erc20.allowance(Alice.address, Bob.address)).to.be.eq(69);
      await erc20.connect(Alice).approve(Bob.address, 71);
      expect(await erc20.allowance(Alice.address, Bob.address)).to.be.eq(71);
    });

    it("test approve: allow self", async () => {
      await erc20.connect(Dd).approve(Dd.address, 999999);
      expect(await erc20.allowance(Dd.address, Dd.address)).to.be.eq(999999);
    });

    it("test approve: check emit", async () => {
      expect(await erc20.connect(Alice).approve(Bob.address, 1))
        .to.emit(erc20, "Approval")
        .withArgs(Alice.address, Bob.address, 1);
    });

    it("test transferfrom: ordinary transferfrom", async () => {
      await erc20.connect(admin).mint(Alice.address, 1000)
      await erc20.connect(Alice).approve(Bob.address, 567);
      await erc20.connect(Bob).transferFrom(Alice.address, Dd.address, 566);
      expect(await erc20.balanceOf(Alice.address)).to.be.eq(434);
      expect(await erc20.balanceOf(Dd.address)).to.be.eq(566);
      expect(await erc20.allowance(Alice.address, Bob.address)).to.be.eq(1);
    });

    it("test transferfrom: self transferfrom", async () => {
      await erc20.connect(admin).mint(Dd.address, 12345)
      await erc20.connect(Dd).approve(Dd.address, 6789);
      await erc20.connect(Dd).transferFrom(Dd.address, Dd.address, 6543);
      expect(await erc20.balanceOf(Dd.address)).to.be.eq(12345);
      expect(await erc20.allowance(Dd.address, Dd.address)).to.be.eq(246);
    });

    it("test transferfrom: transfer more than balance", async () => {
      await erc20.connect(admin).mint(Alice.address, 25)
      await erc20.connect(Alice).approve(Bob.address, 50);
      expect(erc20.connect(Bob).transferFrom(Alice.address, Dd.address, 50)).to.be.revertedWith("sender too poor :(");
    });

    it("test transferfrom: transfer more than allowance", async () => {
      await erc20.connect(admin).mint(Alice.address, 50)
      await erc20.connect(Alice).approve(Bob.address, 25);
      expect(erc20.connect(Bob).transferFrom(Alice.address, Dd.address, 50)).to.be.revertedWith("allowance too low :(");
    });

    it("test transferfrom: check emit", async () => {
      await erc20.connect(admin).mint(Alice.address, 34567)
      await erc20.connect(Alice).approve(Bob.address, 23456);
      expect(erc20.connect(Bob).transferFrom(Alice.address, Dd.address, 12345))
      .to.emit(erc20, "Transfer")
      .withArgs(Alice.address, Dd.address, 12345);
    });
  });
});
