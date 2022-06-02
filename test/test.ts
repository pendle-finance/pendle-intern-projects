import { expect } from "chai";
import { utils } from "ethers";
import { ethers, waffle } from "hardhat";
import { deploy, evm_revert, evm_snapshot, impersonateAccount, impersonateAccountStop, toNumber } from "./helpers/hardhat-helpers";
import * as CONSTANTS from "./helpers/Constants";
import { TestContract, ERC20 } from "../typechain";

describe("Test ERC20 Contract", () => {
  const [admin, a, b, c, d] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let erc20Contract: ERC20;

  before(async () => {
    globalSnapshotId = await evm_snapshot();
    var tokenName = "name";
    var tokenSymbol = "tok";
    var tokenDecimals = 18;
    var initialSupply = 100000;
    erc20Contract = await deploy<ERC20>("ERC20",[tokenName,tokenSymbol,tokenDecimals, initialSupply]);
    await erc20Contract.mint(a.address,100);
    await erc20Contract.mint(b.address,100);
    await erc20Contract.mint(c.address,100);
    await erc20Contract.mint(d.address,100);

    await impersonateAccountStop(admin.address);
    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async () => {
    await revertSnapshot();
  });

  describe("Basic view functions tests", () => {
    it("Test totalSupply", async () => {
      let contractTotalSupply = await toNumber(await erc20Contract.totalSupply());
      expect(contractTotalSupply).to.be.eq(100400)
    });

    it("Test token", async () => {
      let contractName = await erc20Contract.name();
      expect(contractName).to.be.eq("name");
    });

    it("Test symbol", async () => {
      let contractName = await erc20Contract.symbol();
      expect(contractName).to.be.eq("tok");
    });

    it("Test decimals", async () => {
      let contractName = await erc20Contract.decimals();
      expect(contractName).to.be.eq(18);
    });
  });

  it("Basic balance tests", async () => {
    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));
    let cRemaining = await toNumber(await erc20Contract.balanceOf(c.address));
    let dRemaining = await toNumber(await erc20Contract.balanceOf(d.address));

    expect(aRemaining).to.be.eq(100);
    expect(bRemaining).to.be.eq(100);
    expect(cRemaining).to.be.eq(100);
    expect(dRemaining).to.be.eq(100);
  });

  it("Basic approval tests (and basically all the specifications)", async () => {
    //allowance within balance
    await erc20Contract.connect(a).approve(b.address,10);
    let aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(10);

    //allowance > balance
    await erc20Contract.connect(a).approve(b.address,1000);
    aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(1000);

    //allowance = 0
    await erc20Contract.connect(a).approve(b.address,0);
    aApproved = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aApproved).to.be.eq(0);

    //negative allowance
    await expect(erc20Contract.connect(a).approve(b.address,-10)).to.be.reverted;

    //allowance to 0 address
    await expect(erc20Contract.connect(a).approve(CONSTANTS.ZERO_ADDRESS,10)).to.be.revertedWith("Address [spender] is zero");

    //allowance to ownself
    await erc20Contract.connect(a).approve(a.address,10);
    aApproved = await toNumber(await erc20Contract.allowance(a.address,a.address));
    expect(aApproved).to.be.eq(10);
  });

  it("Basic transfer test a->b", async () => {
    await erc20Contract.connect(a).transfer(b.address,10);

    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));

    expect(aRemaining).to.be.eq(90);
    expect(bRemaining).to.be.eq(110);
  });

  it("Basic transferFrom test a->b", async () => {
    await erc20Contract.connect(a).approve(b.address,10);
    await erc20Contract.connect(b).transferFrom(a.address,c.address,5);

    let aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let cRemaining = await toNumber(await erc20Contract.balanceOf(c.address));
    let aApprovedB = await toNumber(await erc20Contract.allowance(a.address,b.address));
    
    expect(aRemaining).to.be.eq(95);
    expect(cRemaining).to.be.eq(105);
    expect(aApprovedB).to.be.eq(5);

    await erc20Contract.connect(b).transferFrom(a.address,b.address,5);
    aRemaining = await toNumber(await erc20Contract.balanceOf(a.address));
    let bRemaining = await toNumber(await erc20Contract.balanceOf(b.address));
    aApprovedB = await toNumber(await erc20Contract.allowance(a.address,b.address));

    expect(aRemaining).to.be.eq(90);
    expect(bRemaining).to.be.eq(105);
    expect(aApprovedB).to.be.eq(0);
  });

  describe("Testing transfer specifications ", () => {
    it("Test amount > balance", async () => {
      await expect(erc20Contract.connect(a).transfer(b.address,101)).to.be.revertedWith("Insufficient balance to transfer");
    });

    it("0 address", async () => {
      await expect(erc20Contract.connect(a).transfer(CONSTANTS.ZERO_ADDRESS,10)).to.be.revertedWith("Address [to] is zero");
    });
  });

  describe("Testing transferFrom specifications ", () => {
    it("Test amount > balance", async () => {
      await erc20Contract.connect(a).approve(b.address,101);
      await expect(erc20Contract.connect(b).transferFrom(a.address,b.address,101)).to.be.revertedWith("Insufficient balance to transferfrom");
    });

    it("Test amount > allowance", async () => {
      await erc20Contract.connect(a).approve(b.address,10);
      await expect(erc20Contract.connect(b).transferFrom(a.address,b.address,11)).to.be.revertedWith("Insufficient allowance to transferfrom");
    });

    it("0 address", async () => {
      await erc20Contract.connect(a).approve(b.address,10);
      await erc20Contract.connect(b).transferFrom(a.address,b.address,5);
      await expect(erc20Contract.connect(b).transferFrom(CONSTANTS.ZERO_ADDRESS,a.address,10)).to.be.revertedWith("Address [from] is zero");
      await expect(erc20Contract.connect(b).transferFrom(a.address,CONSTANTS.ZERO_ADDRESS,10)).to.be.revertedWith("Address [to] is zero")
    });
  });

  describe("Testing possible underflows & overflows ", () => {
    //Underflow of balance is checked in testing transferFrom and transfer where amount > balance

    it("Test overflow of balance/totalSupply", async () => {
      await expect(erc20Contract.connect(admin).mint(a.address,CONSTANTS.MAX_UINT.add(1))).to.be.reverted;
    });

    //Underflow of approval is checked in testing transferFrom where amount > allowance
    //Possible underflow of approval is re-entrancy but state updates are done before allowance is decreased

    it("Test overflow of approval", async () => {
      await expect(erc20Contract.connect(a).approve(b.address, CONSTANTS.MAX_UINT.add(1))).to.be.reverted;
    });
  });

  describe("Testing event emitted ", () => {
    it("Test Transfer Event", async () => {
      await expect(erc20Contract.connect(a).transfer(b.address,100)).to.emit(erc20Contract, 'Transfer').withArgs(a.address, b.address, 100);
    });

    it("Test Transfer Event (from transferFrom)", async () => {
      await expect(erc20Contract.connect(a).approve(b.address,100)).to.emit(erc20Contract, 'Approval').withArgs(a.address, b.address, 100);
      await expect(erc20Contract.connect(b).transferFrom(a.address,b.address,100)).to.emit(erc20Contract, 'Transfer').withArgs(a.address, b.address, 100);
    });

    it("Test Approval Event", async () => {
      await expect(erc20Contract.connect(a).approve(b.address,100)).to.emit(erc20Contract, 'Approval').withArgs(a.address, b.address, 100);
    });
  });

  describe("Basic mint test", () => {
    it("Test mint increases totalSupply", async () => {
      let prevTotalSupply = await toNumber(await erc20Contract.totalSupply());
      await erc20Contract.mint(d.address,100);
      let curTotalSupply = await toNumber(await erc20Contract.totalSupply());
      let difference = curTotalSupply - prevTotalSupply;
      expect(difference).to.be.eq(100);
    });
    
    it("0 address", async () => {
      await expect(erc20Contract.mint(CONSTANTS.ZERO_ADDRESS,100)).to.be.revertedWith("Address [mint to] is zero")
    });
  });

  describe("Basic burn test", () => {
    it("Test burn decreases totalSupply", async () => {
      let prevTotalSupply = await toNumber(await erc20Contract.totalSupply());
      await erc20Contract.burn(d.address,100);
      let curTotalSupply = await toNumber(await erc20Contract.totalSupply());
      let difference = prevTotalSupply - curTotalSupply;
      expect(difference).to.be.eq(100);
    });
    
    it("0 address", async () => {
      await expect(erc20Contract.burn(CONSTANTS.ZERO_ADDRESS,100)).to.be.revertedWith("Address [burn to] is zero");
    });

    it("burn amount > balance", async () => {
      await expect(erc20Contract.burn(d.address,101)).to.be.revertedWith("Insufficient balance to burn");
    });
  });

  describe("Testing ownership of tokens", () => {
    it("C cannot transfer A tokens to itself", async () => {
      await erc20Contract.connect(a).approve(b.address,10);
      await expect(erc20Contract.connect(c).transferFrom(a.address,c.address,10)).to.be.revertedWith("Insufficient allowance to transferfrom");
    });
  });
 
  describe("Testing ownership of smart contract", () => {
    it("Only owner can burn", async () => {
      await expect(erc20Contract.connect(d).burn(d.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(erc20Contract.connect(admin).burn(d.address,100)).to.not.be.reverted;
    });

    it("Only owner can mint", async () => {
      await expect(erc20Contract.connect(d).mint(d.address,100)).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(erc20Contract.connect(admin).mint(d.address,100)).to.not.be.reverted;
    });

  });
});
