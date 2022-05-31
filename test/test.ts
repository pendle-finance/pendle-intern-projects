import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { ZERO, ZERO_ADDRESS } from "./helpers/Constants";
import { deploy, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { ERC20 } from "../typechain";
import { arch } from "os";

describe("ERC20 test", () => {
  const [admin, alice, bob, charlie] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let erc20: ERC20;

  before(async() => {
    globalSnapshotId = await evm_snapshot();

    erc20 = await deploy<ERC20>("ERC20", []);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async() => {
    await revertSnapshot();
  });

  async function mintForEveryone1000() {
    await erc20.mint(alice.address, 1000);
    await erc20.mint(bob.address, 1000);
    await erc20.mint(charlie.address, 1000);
  }

  async function expectEveryoneBalance(aliceExpected, bobExpected, charlieExpected) {
    expect(await erc20.balanceOf(alice.address)).to.be.equal(aliceExpected);
    expect(await erc20.balanceOf(bob.address)).to.be.equal(bobExpected);
    expect(await erc20.balanceOf(charlie.address)).to.be.equal(charlieExpected);
    expect(await erc20.totalSupply()).to.be.equal(aliceExpected + bobExpected + charlieExpected);
  }

  context("mint", async() => {
    it("mint successful", async() => {
        await erc20.mint(alice.address, 140);

        let aliceBalanceAfterMint140 = await erc20.balanceOf(alice.address);
        expect(aliceBalanceAfterMint140).to.be.equal(140);

        let totalSupplyAfterMint140 = await erc20.totalSupply();
        expect(totalSupplyAfterMint140).to.be.equal(140);

        await erc20.mint(alice.address, 130);

        let aliceBalanceAfterMint270 = await erc20.balanceOf(alice.address);
        expect(aliceBalanceAfterMint270).to.be.equal(270);

        let bobBalanceAfterMint270 = await erc20.balanceOf(bob.address);
        expect(bobBalanceAfterMint270).to.be.equal(0);

        let totalSupplyAfterMint270 = await erc20.totalSupply();
        expect(totalSupplyAfterMint270).to.be.equal(270);

        await erc20.mint(bob.address, 510);

        let bobBalanceAfterMint780 = await erc20.balanceOf(bob.address);
        expect(bobBalanceAfterMint780).to.be.equal(510);

        let aliceBalanceAfterMint780 = await erc20.balanceOf(alice.address);
        expect(aliceBalanceAfterMint780).to.be.equal(270);

        let charlieBalanceAfterMint780 = await erc20.balanceOf(charlie.address);
        expect(charlieBalanceAfterMint780).to.be.equal(0);

        let totalSupplyAfterMint780 = await erc20.totalSupply();
        expect(totalSupplyAfterMint780).to.be.equal(780);
    });

    it("mint everyone 1000", async() => {
        await mintForEveryone1000();
        await expectEveryoneBalance(1000, 1000, 1000);
    });

    it("mint to address 0 failed", async() => {
      await expect(erc20.mint(ZERO_ADDRESS, 100)).to.be.revertedWith("Address must be non-zero");
    });
  });

  context("transfer", async() => {
    it("transfer to address 0 failed", async() => {
      await mintForEveryone1000();

      let transferPromise = erc20.connect(alice).transfer(ZERO_ADDRESS, 100);
      await expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;

      await expectEveryoneBalance(1000, 1000, 1000);
    });

    it("transfer successful", async() => {
      await mintForEveryone1000();

      let transferAliceToBobPromise = erc20.connect(alice).transfer(bob.address, 200);
      await expect(transferAliceToBobPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, bob.address, 200);
      await transferAliceToBobPromise;
      await expectEveryoneBalance(800, 1200, 1000);

      let transferBobToCharliePromise = erc20.connect(bob).transfer(charlie.address, 500);
      await expect(transferBobToCharliePromise).to.emit(erc20, 'Transfer')
        .withArgs(bob.address, charlie.address, 500);
      await transferBobToCharliePromise;
      await expectEveryoneBalance(800, 700, 1500);

      let transferCharlieToAlicePromise = erc20.connect(charlie).transfer(alice.address, 1500);
      await expect(transferCharlieToAlicePromise).to.emit(erc20, 'Transfer')
        .withArgs(charlie.address, alice.address, 1500);
      await transferCharlieToAlicePromise;
      await expectEveryoneBalance(2300, 700, 0);
    });

    it("transfer more than balance failed", async() => {
      await mintForEveryone1000();

      let firstTransferPromise = erc20.connect(alice).transfer(bob.address, 600);
      await expect(firstTransferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, bob.address, 600);
      await firstTransferPromise;
      await expectEveryoneBalance(400, 1600, 1000);

      let secondTransferPromise = erc20.connect(alice).transfer(charlie.address, 401);
      await expect(secondTransferPromise).not.to.emit(erc20, 'Transfer');
      await secondTransferPromise;
      await expectEveryoneBalance(400, 1600, 1000);
    });  

    it("transfer to self successful", async() => {
      await mintForEveryone1000();

      let transferPromise = erc20.connect(alice).transfer(alice.address, 900);
      await expect(transferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, alice.address, 900);
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
    });
  });

  context("approve", async() => {
    it("approve address 0 failed", async() => {
      expect(await erc20.allowance(alice.address, ZERO_ADDRESS)).to.be.equal(0);

      let approvalPromise = erc20.connect(alice).approve(ZERO_ADDRESS, 100);
      await expect(approvalPromise).not.to.emit(erc20, 'Approval');
      await approvalPromise;

      expect(await erc20.allowance(alice.address, ZERO_ADDRESS)).to.be.equal(0);
    });
    
    it("approve successful", async() => {
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(0);

      let firstApprovalPromise = erc20.connect(alice).approve(bob.address, 100);
      await expect(firstApprovalPromise).to.emit(erc20, 'Approval')
        .withArgs(alice.address, bob.address, 100);
      await firstApprovalPromise;
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(100);

      let secondApprovalPromise = erc20.connect(alice).approve(bob.address, 200);
      await expect(secondApprovalPromise).to.emit(erc20, 'Approval')
        .withArgs(alice.address, bob.address, 200);
      await secondApprovalPromise;
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(200);

      let thirdApprovalPromise = erc20.connect(alice).approve(bob.address, 50);
      await expect(thirdApprovalPromise).to.emit(erc20, 'Approval')
        .withArgs(alice.address, bob.address, 50);
      await thirdApprovalPromise;
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(50);
    });
  }); 

  context("transferFrom", async() => {
    it("transferFrom successful", async() => {
      await mintForEveryone1000();
      
      await erc20.connect(alice).approve(bob.address, 300);
      
      let firstTransferPromise = erc20.connect(bob).transferFrom(
        alice.address, charlie.address, 100);
      expect(firstTransferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, charlie.address, 100);
      await firstTransferPromise;
      await expectEveryoneBalance(900, 1000, 1100);
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(200);
            
      let secondTransferPromise = erc20.connect(bob).transferFrom(
        alice.address, bob.address, 50);
      expect(secondTransferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, bob.address, 50);
      await secondTransferPromise;
      await expectEveryoneBalance(850, 1050, 1100);
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(150);

      let reapprovalPromise = erc20.connect(alice).approve(bob.address, 50);
      await expect(reapprovalPromise).to.emit(erc20, 'Approval')
        .withArgs(alice.address, bob.address, 50);
      await reapprovalPromise;
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(50);
    });

    it("transferFrom more than balance failed", async() => {
      await mintForEveryone1000();
      
      await erc20.connect(alice).approve(bob.address, 3000);
      
      let transferPromise = erc20.connect(bob).transferFrom(
        alice.address, charlie.address, 1100);
      expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(3000);
    });

    it("transferFrom more than allowance failed", async() => {
      await mintForEveryone1000();
      
      await erc20.connect(alice).approve(bob.address, 600);
      
      let transferPromise = erc20.connect(bob).transferFrom(
        alice.address, charlie.address, 700);
      expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(600);
    });

    it("transferFrom with amount 0 successful", async() => {
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(0);

      let transferPromise = erc20.connect(bob).transferFrom(
        alice.address, charlie.address, 0);
      expect(transferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, charlie.address, 0);
      await transferPromise;

      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(0);
    });

    it("transferFrom from address 0 failed", async() => {
      let transferPromise = erc20.connect(bob).transferFrom(
        ZERO_ADDRESS, charlie.address, 0);
      expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(0);
    });

    it("transferFrom to address 0 failed", async() => {
      await mintForEveryone1000();
      
      await erc20.connect(alice).approve(bob.address, 600);
      
      let transferPromise = erc20.connect(bob).transferFrom(
        alice.address, ZERO_ADDRESS, 100);
      expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
      expect(await erc20.allowance(alice.address, bob.address)).to.be.equal(600);
    });

    it("transferFrom from self with approval successful", async() => {
      await mintForEveryone1000();
      expect(await erc20.allowance(alice.address, alice.address)).to.be.equal(0);

      await erc20.connect(alice).approve(alice.address, 600);
      
      let transferPromise = erc20.connect(alice).transferFrom(
        alice.address, bob.address, 100);
      expect(transferPromise).to.emit(erc20, 'Transfer').
        withArgs(alice.address, bob.address, 100);
      await transferPromise;
      await expectEveryoneBalance(900, 1100, 1000);
      expect(await erc20.allowance(alice.address, alice.address)).to.be.equal(500);
    });

    it("transferFrom from self without approval failed", async() => {
      await mintForEveryone1000();
      expect(await erc20.allowance(alice.address, alice.address)).to.be.equal(0);
      
      let transferPromise = erc20.connect(alice).transferFrom(
        alice.address, bob.address, 100);
      expect(transferPromise).not.to.emit(erc20, 'Transfer');
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
      expect(await erc20.allowance(alice.address, alice.address)).to.be.equal(0);
    });

    it("transferFrom to self successful", async() => {
      await mintForEveryone1000();
      await erc20.connect(alice).approve(alice.address, 900);

      let transferPromise = erc20.connect(alice).transferFrom(alice.address, alice.address, 800);
      await expect(transferPromise).to.emit(erc20, 'Transfer')
        .withArgs(alice.address, alice.address, 800);
      await transferPromise;
      await expectEveryoneBalance(1000, 1000, 1000);
      expect(await erc20.allowance(alice.address, alice.address)).to.be.equal(100);
    });
  });
});
