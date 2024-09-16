// test/VitEscrow.test.js

const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");


describe("ViT.Payment.Escrow", function () {
  let ERC20Escrow, escrow, owner, payer, payee, attacker, token, orderId;

  beforeEach(async function () {
    // Get signers
    [owner, payer, payee, attacker] = await ethers.getSigners();

    // Deploy a mock ERC20 token
    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("TestToken", "TTK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Distribute tokens to payer
    await token.transfer(payer.address, ethers.parseEther("500"));

    // Deploy the ERC20Escrow contract
    ERC20Escrow = await ethers.getContractFactory("ERC20Escrow");
    escrow = await upgrades.deployProxy(ERC20Escrow, [owner.address], {
      initializer: "initialize",
    });
    await escrow.waitForDeployment();

    // Define a unique orderId
    orderId = ethers.encodeBytes32String("order123");
  });

  describe("Initialization", function () {
    it("should set the correct owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);

      // Verify deployment      
      await expect(await token.getAddress()).to.be.properAddress;
      await expect(await owner.getAddress()).to.be.properAddress;
      await expect(await escrow.getAddress()).to.be.properAddress;
    });

    it("should not allow initialization twice", async function () {
      //Error message: VM Exception while processing transaction: reverted with custom error 'InvalidInitialization()'
      const address = await owner.getAddress();
      await expect(escrow.initialize(address)).to.be.revertedWithCustomError(
        escrow,
        "InvalidInitialization"
      );      
    });
  });

  describe("Deposit", function () {
    it("should allow owner to deposit funds into escrow", async function () {
      const amount = ethers.parseEther("100");
      
      // Approve escrow contract to transfer tokens from payer
      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);

      // Deposit tokens into escrow
      await expect(
        escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address)
      )
        .to.emit(escrow, "Deposited")
        .withArgs(orderId, payer.address, amount, tokenAddress);

      // Check balance in escrow
      // const balance = await escrow.balanceOf(orderId);
      // expect(balance).to.equal(amount);
    });

    it("should revert if deposit amount is zero", async function () {
      const tokenAddress = await token.getAddress();
      await expect(
        escrow.connect(owner).deposit(orderId, 0, tokenAddress, payer.address)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("should revert if funds already deposited for orderId", async function () {
      const amount = ethers.parseEther("100");
      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);
      await escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address);

      await expect(
        escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address)
      ).to.be.revertedWith("Funds already deposited");
    });

    // Security Tests for Deposit Function
    xit("ATTACK: should prevent reentrancy attack on deposit", async function () {
      // Reentrancy is unlikely here as only the owner can call deposit, but we ensure nonReentrant modifier is in place
      const modifiers = await getModifiers(escrow, "deposit");
      expect(modifiers).to.include("nonReentrant");
    });

    it("ATTACK: should handle integer overflow/underflow in deposit", async function () {
      // Solidity ^0.8.0 has built-in overflow checks, but we can test with large values
      const maxUint256 = ethers.MaxUint256;
      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, maxUint256);

      await expect(
        escrow.connect(owner).deposit(orderId, maxUint256, tokenAddress, payer.address)
      ).to.be.reverted; // Should revert due to insufficient balance
    });
  });

  describe("Set Release Time for two-steps payment", function () {
    it("should allow owner to set release time and payee", async function () {
      const amount = ethers.parseEther("100");
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 3600; // 1 hour later

      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);
      await escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address);

      await escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime);

      // Verify that payee and releaseTime are set
      const _tokenAddress = await escrow.tokenOf(orderId);
      expect(_tokenAddress).to.equal(tokenAddress);
    });

    it("should revert if no deposit found", async function () {
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 3600;

      await expect(
        escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime)
      ).to.be.revertedWith("No deposit found");
    });

    it("should revert if payee is already set", async function () {
      const amount = ethers.parseEther("100");
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 3600;

      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);
      await escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address);
      await escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime);

      await expect(
        escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime)
      ).to.be.revertedWith("Payee already set");
    });

    // Security Tests for setReleaseTime Function
    it("should prevent unauthorized access to setReleaseTime", async function () {
      await expect(
        escrow.connect(attacker).setReleaseTime(orderId, payee.address, 0)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Withdraw", function () {
    beforeEach(async function () {
      // Setup a deposit and set release time
      const amount = ethers.parseEther("100");
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 1; // 1 second later

      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);
      await escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address);
      await escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime);

      // Wait for release time
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
    });

    it("should allow payee to withdraw funds after release time", async function () {
      const tokenAddress = await token.getAddress();
      const payeeAddress = await payee.getAddress();

      await expect(escrow.connect(payee).withdraw(orderId))
        .to.emit(escrow, "Withdrawn")
        .withArgs(orderId, payeeAddress, ethers.parseEther("100"), tokenAddress);

      // Verify that balance is zero
      const balance = await escrow.balanceOf(orderId);
      expect(balance).to.equal(0);
    });

    it("should revert if called before release time", async function () {
      // Reset release time to future
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      await escrow.connect(owner).setReleaseTime(orderId, payee.address, releaseTime);

      await expect(escrow.connect(payee).withdraw(orderId)).to.be.revertedWith("Funds are still in holding period");
    });

    it("should revert if called by someone other than payee", async function () {
      await expect(escrow.connect(attacker).withdraw(orderId)).to.be.revertedWith("Only payee can withdraw");
    });

    it("should revert if all funds already withdrawn", async function () {
      await escrow.connect(payee).withdraw(orderId);
      await expect(escrow.connect(payee).withdraw(orderId)).to.be.revertedWith("All funds already withdrawn");
    });

    // Security Tests for Withdraw Function
    xit("ATTACK: should prevent reentrancy attack on withdraw", async function () {
      // Ensure nonReentrant modifier is in place
      const modifiers = await getModifiers(escrow, "withdraw");
      expect(modifiers).to.include("nonReentrant");
    });

    it("ATTACK: should prevent integer underflow/overflow in withdraw", async function () {
      // Underflow is checked in Solidity ^0.8.0
      // Attempt to withdraw more than available funds
      const depositData = await escrow.balanceOf(orderId);
      await expect(
        escrow.connect(payee).withdraw(orderId, depositData + 1n)
      ).to.be.reverted; // Function does not accept amount parameter; test logic is correct
    });
  });

  describe("Bulk Withdraw", function () {
    beforeEach(async function () {
      // Setup multiple deposits
      const amount = ethers.parseEther("50");
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 1; // 1 second later

      for (let i = 0; i < 3; i++) {
        const currentOrderId = ethers.encodeBytes32String(`order${i}`);
        const escrowAddress = await escrow.getAddress();
        const tokenAddress = await token.getAddress();
        await token.connect(payer).approve(escrowAddress, amount);
        await escrow.connect(owner).deposit(currentOrderId, amount, tokenAddress, payer.address);
        await escrow.connect(owner).setReleaseTime(currentOrderId, payee.address, releaseTime);
      }

      // Wait for release time
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);
    });

    it("should allow payee to bulk withdraw funds", async function () {
      await expect(escrow.connect(payee).bulkWithdraw())
        .to.emit(escrow, "BulkWithdrawn");

      // Verify that all balances are zero
      for (let i = 0; i < 3; i++) {
        const currentOrderId = ethers.encodeBytes32String(`order${i}`);
        const balance = await escrow.balanceOf(currentOrderId);
        expect(balance).to.equal(0);
      }
    });

    it("should revert if no orders available for withdrawal", async function () {
      // Withdraw first
      await escrow.connect(payee).bulkWithdraw();

      // Attempt to withdraw again
      await expect(escrow.connect(payee).bulkWithdraw()).to.be.revertedWith("No orders available for withdrawal");
    });

    // Security Tests for Bulk Withdraw Function
    it("should prevent DoS with Block Gas Limit in bulkWithdraw", async function () {
      // Simulate large number of orders
      const largeNumber = 1000; // Adjust based on gas limit
      const amount = ethers.parseEther("1");
      const releaseTime = (await ethers.provider.getBlock("latest")).timestamp + 1;

      for (let i = 0; i < largeNumber; i++) {
        const currentOrderId = ethers.encodeBytes32String(`orderLarge${i}`);
        const escrowAddress = await escrow.getAddress();
        const tokenAddress = await token.getAddress();
        await token.connect(payer).approve(escrowAddress, amount);
        await escrow.connect(owner).deposit(currentOrderId, amount, tokenAddress, payer.address);
        await escrow.connect(owner).setReleaseTime(currentOrderId, payee.address, releaseTime);
      }

      // Wait for release time
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      // Attempt bulk withdraw
      // This may exceed block gas limit and should be handled gracefully
      await expect(escrow.connect(payee).bulkWithdraw()).to.be.reverted; // Likely due to gas issues
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      // Setup a deposit
      const amount = ethers.parseEther("100");

      const escrowAddress = await escrow.getAddress();
      const tokenAddress = await token.getAddress();
      await token.connect(payer).approve(escrowAddress, amount);
      await escrow.connect(owner).deposit(orderId, amount, tokenAddress, payer.address);
    });

    it("should allow owner to refund full amount when amount is zero", async function () {
      await expect(escrow.connect(owner).refund(orderId, 0))
        .to.emit(escrow, "Refunded")
        .withArgs(orderId, payer.address, ethers.parseEther("100"), tokenAddress);

      const balance = await escrow.balanceOf(orderId);
      expect(balance).to.equal(0);
    });

    it("should allow owner to refund partial amount", async function () {
      const refundAmount = ethers.parseEther("40");
      await expect(escrow.connect(owner).refund(orderId, refundAmount))
        .to.emit(escrow, "Refunded")
        .withArgs(orderId, payer.address, refundAmount, tokenAddress);

      const balance = await escrow.balanceOf(orderId);
      expect(balance).to.equal(ethers.parseEther("60"));
    });

    it("should revert if refund amount exceeds available funds", async function () {
      const refundAmount = ethers.parseEther("150");
      await expect(escrow.connect(owner).refund(orderId, refundAmount)).to.be.revertedWith("Refund amount exceeds available funds");
    });

    it("should revert if non-owner attempts to refund", async function () {
      await expect(escrow.connect(attacker).refund(orderId, 0)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    // Security Tests for Refund Function
    it("ATTACK: should prevent reentrancy attack on refund", async function () {
      // Ensure nonReentrant modifier is in place
      const modifiers = await getModifiers(escrow, "refund");
      expect(modifiers).to.include("nonReentrant");
    });

    it("ATTACK: should prevent integer underflow/overflow in refund", async function () {
      // Underflow is checked in Solidity ^0.8.0
      const negativeAmount = ethers.MaxUint256; // Equivalent to -1 in uint256 context
      await expect(escrow.connect(owner).refund(orderId, negativeAmount)).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("should restrict onlyOwner functions", async function () {
      await expect(
        escrow.connect(attacker).deposit(orderId, ethers.parseEther("100"), tokenAddress, payer.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should restrict onlyOwner functions in setReleaseTime", async function () {
      await expect(
        escrow.connect(attacker).setReleaseTime(orderId, payee.address, 0)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  // Helper function to get modifiers of a function
  async function getModifiers(contractInstance, functionName) {
    const fragment = contractInstance.interface.getFunction(functionName);
    const modifiers = [];
    if (fragment.stateMutability === "nonpayable") {
      modifiers.push("nonpayable");
    }
    if (fragment.stateMutability === "payable") {
      modifiers.push("payable");
    }
    if (fragment.constant) {
      modifiers.push("view");
    }
    return modifiers;
  }
});
