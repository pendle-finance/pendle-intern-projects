import { expect } from "chai";
import { BigNumber, utils, Wallet } from "ethers";
import { ethers, waffle } from "hardhat";
import { _1E18, ZERO_ADDRESS, PRECISION, ZERO } from "./helpers/Constants";
import { deploy, deployWithoutLog, evm_revert, evm_snapshot } from "./helpers/hardhat-helpers";
import { TokenDistributor, ERC20, FallbackRevertContract, NormalFallbackContract, 
  NoFallbackContract, ReentrancyAttacker, IERC20 } from "../typechain";
import { assert } from "console";
// import { arch } from "os";
// import { first } from "underscore";

describe("TokenDistributor test", async() => {
  const [admin, alice, bob] = waffle.provider.getWallets();
  let globalSnapshotId;
  let snapshotId;
  let distributor: TokenDistributor;
  let firstToken, secondToken: ERC20;
  
  const NATIVE_TOKEN_ADDRESS = ZERO_ADDRESS;

  before(async() => {
    globalSnapshotId = await evm_snapshot();

    distributor = await deploy<TokenDistributor>("TokenDistributor", []);
    firstToken = await deploy<ERC20>("ERC20", ["First token", "FIR"]);
    secondToken = await deploy<ERC20>("ERC20", ["Second token", "SEC"]);

    snapshotId = await evm_snapshot();
  });

  async function revertSnapshot() {
    await evm_revert(snapshotId);
    snapshotId = await evm_snapshot();
  }

  beforeEach(async() => {
    await revertSnapshot();
  });

  describe("ERC20 methods", async() => {
    describe("airdrop, unclaimedAmount, and totalBalance", async() => {
      it("airdropERC20() successful", async() => {
        await expect(distributor.airdropERC20(firstToken.address, alice.address, 10))
          .to.emit(distributor, "Airdrop")
          .withArgs(firstToken.address, alice.address, 10);

        expect(await distributor.unclaimedAmountERC20(firstToken.address, alice.address))
          .to.be.equal(10);
      })
  
      it("airdropERC20() with zero token address reverted", async() => {
        await expect(distributor.airdropERC20(ZERO_ADDRESS, alice.address, 10))
          .to.be.revertedWith("Token address must be non-zero");
      });
  
      it("airdropERC20() to zero address reverted", async() => {
        await expect(distributor.airdropERC20(firstToken.address, ZERO_ADDRESS, 10))
          .to.be.revertedWith("Claimer address must be non-zero");
      });
  
      it("airdropERC20() called by non-owner reverted", async() => {
        await expect(distributor.connect(alice).airdropERC20(firstToken.address, alice.address, 10))
          .to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("unclaimedAmountERC20() returns accurate amount", async() => {
        await distributor.airdropERC20(firstToken.address, alice.address, 20);
        await distributor.airdropERC20(firstToken.address, alice.address, 10);
        await distributor.airdropERC20(secondToken.address, alice.address, 40);
        await distributor.airdropERC20(firstToken.address, bob.address, 30);
        
        expect(await distributor.unclaimedAmountERC20(firstToken.address, alice.address))
          .to.be.equal(10);
        expect(await distributor.unclaimedAmountERC20(firstToken.address, bob.address))
          .to.be.equal(30);
        expect(await distributor.unclaimedAmountERC20(secondToken.address, alice.address))
          .to.be.equal(40);
        expect(await distributor.unclaimedAmountERC20(secondToken.address, bob.address))
          .to.be.equal(0);
      });
  
      it("unclaimedAmountERC20() with zero token address reverted", async() => {
        await expect(distributor.unclaimedAmountERC20(ZERO_ADDRESS, alice.address))
          .to.be.revertedWith("Token address must be non-zero");
      });

      it("unclaimedAmountERC20() of zero address reverted", async() => {
        await expect(distributor.unclaimedAmountERC20(firstToken.address, ZERO_ADDRESS))
          .to.be.revertedWith("User address must be non-zero");
      });

      it("totalBalanceERC20() returns accurate amount", async() => {
        firstToken.mint(distributor.address, 100);
        expect(await distributor.totalBalanceERC20(firstToken.address))
          .to.be.equal(100);
      });
  
      it("totalBalanceERC20() with zero token address reverted", async() => {
        await expect(distributor.totalBalanceERC20(ZERO_ADDRESS))
          .to.be.revertedWith("Token address must be non-zero");
      });
    });

    describe("deposit", async() => {
      it("depositERC20() successful", async() => {
        expect(await firstToken.balanceOf(distributor.address))
          .to.be.equal(0);
        
        await firstToken.mint(alice.address, 1000);
        await firstToken.connect(alice).approve(distributor.address, 1000);
        await expect(distributor.connect(alice).depositERC20(firstToken.address, 1000))
          .to.emit(firstToken, "Transfer")
          .withArgs(alice.address, distributor.address, 1000)
          .to.emit(distributor, "Deposit")
          .withArgs(firstToken.address, alice.address, 1000);

        expect(await firstToken.balanceOf(distributor.address))
          .to.be.equal(1000);
      });

      it("depositERC20() with amount zero successful", async() => {
        await expect(distributor.connect(alice).depositERC20(firstToken.address, 0))
          .to.emit(firstToken, "Transfer")
          .withArgs(alice.address, distributor.address, 0)
          .to.emit(distributor, "Deposit")
          .withArgs(firstToken.address, alice.address, 0);
      });

      it("depositERC20() with zero token address reverted", async() => {
        await expect(distributor.connect(alice).depositERC20(ZERO_ADDRESS, 0))
          .to.be.revertedWith("Token address must be non-zero");
      });

      it("depositERC20() without pre-Ai reverted", async() => {
        expect(await firstToken.balanceOf(distributor.address))
          .to.be.equal(0);
        
        await firstToken.mint(alice.address, 1000);
        expect(distributor.connect(alice).depositERC20(firstToken.address, 1000))
          .to.be.revertedWith("Insufficient unclaimed amount");
      });
      
      it("deposit directly through ERC20 native function successful", async() => {
        expect(await firstToken.balanceOf(distributor.address))
          .to.be.equal(0);
        
        await firstToken.mint(alice.address, 1000);
        await firstToken.connect(alice).transfer(distributor.address, 1000);

        expect(await firstToken.balanceOf(distributor.address))
          .to.be.equal(1000);
      });
    });

    describe("claim", async() => {
      it("claimERC20() successful", async() => {
        await firstToken.mint(distributor.address, 1000);
        
        await distributor.airdropERC20(firstToken.address, alice.address, 100);
        expect(await distributor.connect(alice).claimERC20(firstToken.address, 100)) 
          .to.emit(firstToken, "Transfer")
          .withArgs(distributor.address, alice.address, 100)
          .to.emit(distributor, "Claim")
          .withArgs(firstToken.address, alice.address, 100);

        expect(await distributor.totalBalanceERC20(firstToken.address)).to.be.equal(900);
        expect(await firstToken.balanceOf(distributor.address)).to.be.equal(900);
        expect(await firstToken.balanceOf(alice.address)).to.be.equal(100);
        expect(await distributor.unclaimedAmountERC20(firstToken.address, alice.address)).to.be.equal(0);
      })

      it("multiple claimERC20() successful", async() => {
        await firstToken.mint(distributor.address, 1000);
        await secondToken.mint(distributor.address, 1000);

        await distributor.airdropERC20(firstToken.address, alice.address, 600);
        await distributor.airdropERC20(firstToken.address, bob.address, 300);
        await distributor.airdropERC20(secondToken.address, alice.address, 800);

        await distributor.connect(alice).claimERC20(firstToken.address, 200);
        await distributor.connect(alice).claimERC20(secondToken.address, 200);
        await distributor.connect(bob).claimERC20(firstToken.address, 300);
        await distributor.connect(alice).claimERC20(firstToken.address, 200);

        expect(await distributor.totalBalanceERC20(firstToken.address)).to.be.equal(300);
        expect(await distributor.totalBalanceERC20(secondToken.address)).to.be.equal(800);

        expect(await firstToken.balanceOf(alice.address)).to.be.equal(400);
        expect(await firstToken.balanceOf(bob.address)).to.be.equal(300);
        expect(await secondToken.balanceOf(alice.address)).to.be.equal(200);
        expect(await secondToken.balanceOf(bob.address)).to.be.equal(0);

        expect(await distributor.unclaimedAmountERC20(firstToken.address, alice.address))
          .to.be.equal(200);
        expect(await distributor.unclaimedAmountERC20(firstToken.address, bob.address))
          .to.be.equal(0);
        expect(await distributor.unclaimedAmountERC20(secondToken.address, alice.address))
          .to.be.equal(600);
        expect(await distributor.unclaimedAmountERC20(secondToken.address, bob.address))
          .to.be.equal(0);
      });

      it("claimERC20() with zero amount successful", async() => {
        await expect(distributor.connect(alice).claimERC20(firstToken.address, 0)) 
          .to.emit(firstToken, "Transfer")
          .withArgs(distributor.address, alice.address, 0)
          .to.emit(distributor, "Claim")
          .withArgs(firstToken.address, alice.address, 0);
      });

      it("claimERC20() with zero token address reverted", async() => {
        await expect(distributor.connect(alice).claimERC20(ZERO_ADDRESS, 0))
          .to.be.revertedWith("Token address must be non-zero");
      });

      it("claimERC20() amount exceeds unclaimed amount reverted", async() => {
        await firstToken.mint(distributor.address, 10);
        await expect(distributor.connect(alice).claimERC20(firstToken.address, 1))
          .to.be.revertedWith("Insufficient unclaimed amount");
      });

      it("claimERC20() amount exceeds balance reverted", async() => {
        await firstToken.mint(distributor.address, 10);
        await distributor.airdropERC20(firstToken.address, alice.address, 100);
        await expect(distributor.connect(alice).claimERC20(firstToken.address, 11))
          .to.be.revertedWith("Insufficient total balance");
      });

      it("claimAllERC20() successful", async() => {
        await firstToken.mint(distributor.address, 10);
        await distributor.airdropERC20(firstToken.address, alice.address, 6);
        await expect(distributor.connect(alice).claimAllERC20(firstToken.address))
          .to.emit(distributor, "Claim")
          .withArgs(firstToken.address, alice.address, 6);
      });

      it("claimAllERC20() exceed balance reverted", async() => {
        await firstToken.mint(distributor.address, 10);
        await distributor.airdropERC20(firstToken.address, alice.address, 60);
        await expect(distributor.connect(alice).claimAllERC20(firstToken.address))
          .to.be.revertedWith("Insufficient total balance");
      });
    });
  });

  describe("native token methods", async() => {
    describe("airdrop and unclaimedAmount", async() => {
      it("airdropNativeToken() successful", async() => {
        await expect(distributor.airdropNativeToken(alice.address, 10))
          .to.emit(distributor, "Airdrop")
          .withArgs(NATIVE_TOKEN_ADDRESS, alice.address, 10);

        expect(await distributor.unclaimedAmountNativeToken(alice.address))
          .to.be.equal(10);
      })
  
      it("airdropNativeToken() to zero address reverted", async() => {
        await expect(distributor.airdropNativeToken(ZERO_ADDRESS, 10))
          .to.be.revertedWith("Claimer address must be non-zero");
      });
  
      it("airdropNativeToken() called by non-owner reverted", async() => {
        await expect(distributor.connect(alice).airdropNativeToken(alice.address, 10))
          .to.be.revertedWith("Ownable: caller is not the owner");
      });

      it("unclaimedAmountNativeToken() returns accurate amount", async() => {
        await distributor.airdropNativeToken(alice.address, 20);
        await distributor.airdropNativeToken(alice.address, 10);
        await distributor.airdropNativeToken(bob.address, 30);
        
        expect(await distributor.unclaimedAmountNativeToken(alice.address))
          .to.be.equal(10);
        expect(await distributor.unclaimedAmountNativeToken(bob.address))
          .to.be.equal(30);
      });

      it("unclaimedAmountNativeToken() of zero address reverted", async() => {
        await expect(distributor.unclaimedAmountNativeToken(ZERO_ADDRESS))
          .to.be.revertedWith("User address must be non-zero");
      });
    });

      // it("totalBalanceNativeToken() returns accurate amount", async() => {
      //   firstToken.mint(distributor.address, 100);
      //   expect(await distributor.totalBalanceNativeToken(firstToken.address))
      //     .to.be.equal(100);
      // });

    describe("deposit and totalBalance", async() => {
      it("depositNativeToken() successful and totalBalanceNativeToken() accurate", async() => {
        expect(await waffle.provider.getBalance(distributor.address)).to.be.equal(0);
        expect(await distributor.totalBalanceNativeToken()).to.be.equal(0);
        const aliceInitialBalance = await waffle.provider.getBalance(alice.address);

        expect(await distributor.connect(alice).depositNativeToken({value: _1E18}))
          .to.emit(distributor, "Deposit")
          .withArgs(NATIVE_TOKEN_ADDRESS, alice.address, _1E18);

        expect(await waffle.provider.getBalance(distributor.address)).to.be.equal(_1E18);
        expect(await waffle.provider.getBalance(alice.address))
          .to.be.closeTo(aliceInitialBalance.sub(_1E18), PRECISION);
        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18);
      });

      it("transfer funds directly reverted", async() => {
        await expect(alice.sendTransaction({to: distributor.address, value: 1000}))
          .to.be.reverted;
      });

      it("multiple deposits successful", async() => {
        const aliceInitialBalance = await waffle.provider.getBalance(alice.address);
        const bobInitialBalance = await waffle.provider.getBalance(bob.address);

        await distributor.connect(alice).depositNativeToken({value: _1E18.mul(1)});
        await distributor.connect(bob).depositNativeToken({value: _1E18.mul(4)});
        await distributor.connect(alice).depositNativeToken({value: _1E18.mul(2)});

        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(7));
        expect(await waffle.provider.getBalance(alice.address))
          .to.be.closeTo(aliceInitialBalance.sub(_1E18.mul(3)), PRECISION);
        expect(await waffle.provider.getBalance(bob.address))
          .to.be.closeTo(bobInitialBalance.sub(_1E18.mul(4)), PRECISION);
      })
    });


    describe("claim", async() => {
      it("claimNativeToken() successful", async() => {
        const aliceInitialBalance = await waffle.provider.getBalance(alice.address);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(alice.address, _1E18);

        expect(await distributor.connect(alice).claimNativeToken(_1E18.sub(1))) 
          .to.emit(distributor, "Claim")
          .withArgs(firstToken.address, alice.address, _1E18.sub(1));

        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(9).add(1));
        expect(await distributor.unclaimedAmountNativeToken(alice.address)).to.be.equal(1);
        expect(await waffle.provider.getBalance(alice.address))
          .to.be.closeTo(aliceInitialBalance.add(_1E18.mul(1)), PRECISION);
      })

      it("multiple claimNativeToken() successful", async() => {
        const aliceInitialBalance = await waffle.provider.getBalance(alice.address);
        const bobInitialBalance = await waffle.provider.getBalance(bob.address);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});

        await distributor.airdropNativeToken(alice.address, _1E18.mul(16));
        await distributor.airdropNativeToken(bob.address, _1E18.mul(15));

        await distributor.connect(alice).claimNativeToken(_1E18.mul(2));
        await distributor.connect(bob).claimNativeToken(_1E18.mul(3));
        await distributor.connect(alice).claimNativeToken(_1E18.mul(2));

        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(3));

        expect(await waffle.provider.getBalance(alice.address))
          .to.be.closeTo(aliceInitialBalance.add(_1E18.mul(4)), PRECISION);

        expect(await waffle.provider.getBalance(bob.address))
        .to.be.closeTo(bobInitialBalance.add(_1E18.mul(3)), PRECISION);

        expect(await distributor.unclaimedAmountNativeToken(alice.address))
          .to.be.equal( _1E18.mul(12));
        expect(await distributor.unclaimedAmountNativeToken(bob.address))
          .to.be.equal( _1E18.mul(12));
      });

      it("claimNativeToken() with zero amount successful", async() => {
        await expect(distributor.connect(alice).claimNativeToken(0))
          .to.emit(distributor, "Claim")
          .withArgs(NATIVE_TOKEN_ADDRESS, alice.address, 0);
      });

      it("claimNativeToken() amount exceeds unclaimed amount reverted", async() => {
        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await expect(distributor.connect(alice).claimNativeToken(1))
          .to.be.revertedWith("Insufficient unclaimed amount");

        await distributor.airdropNativeToken(alice.address, _1E18);
        await expect(distributor.connect(alice).claimNativeToken(_1E18.add(1)))
          .to.be.revertedWith("Insufficient unclaimed amount");
      });

      it("claimNativeToken() amount exceeds balance reverted", async() => {
        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(alice.address, _1E18.mul(20));
        await expect(distributor.connect(alice).claimNativeToken(_1E18.mul(15)))
          .to.be.revertedWith("Insufficient total balance");
      });

      it("claimAllNativeToken() successful", async() => {
        await distributor.depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(alice.address, _1E18.mul(6));
        await expect(distributor.connect(alice).claimAllNativeToken())
          .to.emit(distributor, "Claim")
          .withArgs(NATIVE_TOKEN_ADDRESS, alice.address, _1E18.mul(6));
      });

      it("claimAllNativeToken() exceed balance reverted", async() => {
        await distributor.depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(alice.address, _1E18.mul(60));
        await expect(distributor.connect(alice).claimAllNativeToken())
          .to.be.revertedWith("Insufficient total balance");
      });
    });

    describe("contract claims", async() => {
      it("normal fallback function claim successful", async() => {
        let contract = await deployWithoutLog<NormalFallbackContract>("NormalFallbackContract", []);

        await expect(admin.sendTransaction({to: contract.address, value: _1E18}))
          .to.emit(contract, "Received")
          .withArgs(admin.address, _1E18);
        expect(await waffle.provider.getBalance(contract.address))
          .to.be.equal(_1E18);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(contract.address, _1E18.mul(10));
        await expect(contract.claimEther(distributor.address, _1E18.mul(2)))
          .to.emit(contract, "Received")
          .withArgs(distributor.address, _1E18.mul(2));
        expect(await waffle.provider.getBalance(contract.address))
          .to.be.equal(_1E18.mul(3));
      });

      it("no fallback function claim reverted", async() => {
        let contract = await deployWithoutLog<NoFallbackContract>("NoFallbackContract", []);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(contract.address, _1E18.mul(10));
        await expect(contract.claimEther(distributor.address, _1E18.mul(2))).to.be.reverted;
        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(10));
      });

      it("fallback revert function claim reverted", async() => {
        let contract = await deployWithoutLog<FallbackRevertContract>("FallbackRevertContract", []);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(contract.address, _1E18.mul(10));
        await expect(contract.claimEther(distributor.address, _1E18.mul(2))).to.be.reverted;
        expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(10));
      });

      it("lenient reentrancy attack successful", async() => {
        let contract = await deployWithoutLog<ReentrancyAttacker>("ReentrancyAttacker", []);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(10)});
        await distributor.airdropNativeToken(contract.address, _1E18.mul(9));
        await contract.attack(distributor.address, _1E18.mul(2));
        expect(await waffle.provider.getBalance(contract.address))
          .to.be.equal(_1E18.mul(4));
        expect(await distributor.totalBalanceNativeToken())
          .to.be.equal(_1E18.mul(6));
        expect(await distributor.unclaimedAmountNativeToken(contract.address))
          .to.be.equal(_1E18.mul(5));
      });

      it("greedy reentrancy attack reverted", async() => {
        let contract = await deployWithoutLog<ReentrancyAttacker>("ReentrancyAttacker", []);

        await distributor.connect(admin).depositNativeToken({value: _1E18.mul(11)});
        await distributor.airdropNativeToken(contract.address, _1E18.mul(9));
        await expect(contract.attack(distributor.address, _1E18.mul(5))).to.be.reverted;
        
        expect(await waffle.provider.getBalance(contract.address))
          .to.be.equal(_1E18.mul(0));
        expect(await distributor.totalBalanceNativeToken())
          .to.be.equal(_1E18.mul(11));
        expect(await distributor.unclaimedAmountNativeToken(contract.address))
          .to.be.equal(_1E18.mul(9));
      });
    });
  });

  describe("ownership tests and misc", async() => {
    it("direct transfer successful", async() => {
      expect(await distributor.owner()).to.be.equal(admin.address);
      await distributor.connect(admin).airdropNativeToken(bob.address, 1);
      await expect(distributor.connect(alice).airdropNativeToken(bob.address, 2))
        .to.be.reverted;
      expect(await distributor.unclaimedAmountNativeToken(bob.address)).to.be.equal(1);
      
      await distributor.connect(admin).transferOwnership(alice.address, true, false);

      expect(await distributor.owner()).to.be.equal(alice.address);
      await distributor.connect(alice).airdropNativeToken(bob.address, 3);
      await expect(distributor.connect(admin).airdropNativeToken(bob.address, 4))
        .to.be.reverted;
      expect(await distributor.unclaimedAmountNativeToken(bob.address)).to.be.equal(3);
    });

    it("indirect transfer successful", async() => {
      expect(await distributor.owner()).to.be.equal(admin.address);
      expect(await distributor.pendingOwner()).to.be.equal(ZERO_ADDRESS);

      await distributor.connect(admin).transferOwnership(bob.address, false, false);
      expect(await distributor.owner()).to.be.equal(admin.address);
      expect(await distributor.pendingOwner()).to.be.equal(bob.address);

      await distributor.connect(admin).transferOwnership(ZERO_ADDRESS, false, false);
      expect(await distributor.owner()).to.be.equal(admin.address);
      expect(await distributor.pendingOwner()).to.be.equal(ZERO_ADDRESS);

      await distributor.connect(admin).transferOwnership(alice.address, false, false);
      expect(await distributor.owner()).to.be.equal(admin.address);
      expect(await distributor.pendingOwner()).to.be.equal(alice.address);

      await expect(distributor.connect(bob).claimOwnership()).to.be.reverted;
      expect(await distributor.owner()).to.be.equal(admin.address);
      expect(await distributor.pendingOwner()).to.be.equal(alice.address);

      await distributor.connect(alice).claimOwnership();
      expect(await distributor.owner()).to.be.equal(alice.address);
      expect(await distributor.pendingOwner()).to.be.equal(ZERO_ADDRESS);
    });

    it("renounce ownership successful", async() => {
      expect(await distributor.owner()).to.be.equal(admin.address);
      await expect(distributor.transferOwnership(ZERO_ADDRESS, true, false)).to.be.reverted;
      await distributor.transferOwnership(ZERO_ADDRESS, true, true);
      expect(await distributor.owner()).to.be.equal(ZERO_ADDRESS);
    });

    it("multiple tokens + native tokens simultaneously OK", async() => {
      const aliceClient = distributor.connect(alice);
      const aliceInitialBalance = await waffle.provider.getBalance(alice.address);

      await firstToken.mint(alice.address, 1000);
      await secondToken.mint(alice.address, 1000);

      await firstToken.connect(alice).approve(distributor.address, 1000);
      await secondToken.connect(alice).approve(distributor.address, 1000);

      await distributor.connect(alice).depositNativeToken({value: _1E18.mul(10)});
      await aliceClient.depositERC20(firstToken.address, 900);
      await aliceClient.depositERC20(secondToken.address, 800);

      await distributor.airdropNativeToken(alice.address, _1E18.mul(8));
      await distributor.airdropERC20(firstToken.address, alice.address, 600);
      await distributor.airdropERC20(secondToken.address, alice.address, 900);

      await aliceClient.claimNativeToken(_1E18.mul(3));
      await aliceClient.claimERC20(firstToken.address, 400);
      await aliceClient.claimERC20(secondToken.address, 400);

      expect(await distributor.totalBalanceNativeToken()).to.be.equal(_1E18.mul(7));
      expect(await distributor.totalBalanceERC20(firstToken.address)).to.be.equal(500);
      expect(await distributor.totalBalanceERC20(secondToken.address)).to.be.equal(400);

      expect(await distributor.unclaimedAmountNativeToken(alice.address)).to.be.equal(_1E18.mul(5));
      expect(await distributor.unclaimedAmountERC20(firstToken.address, alice.address)).to.be.equal(200);
      expect(await distributor.unclaimedAmountERC20(secondToken.address, alice.address)).to.be.equal(500);

      expect(await waffle.provider.getBalance(alice.address)).to.be
        .closeTo(aliceInitialBalance.sub(_1E18.mul(7)), PRECISION);
      expect(await firstToken.balanceOf(alice.address)).to.be.equal(500);
      expect(await secondToken.balanceOf(alice.address)).to.be.equal(600);
    });
  });
});

// raw transfer should fail
// multiple tokens
// reentrancy test
// test ownership
// test holding token + ether simultaneously

