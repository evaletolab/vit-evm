const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VitClaimLink", function () {
  let claim, token, sender, recipient, attacker;
  const SECRET = ethers.encodeBytes32String("super-secret-value");
  const SECRET_HASH = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [SECRET]));
  const ID = ethers.encodeBytes32String("link-001");
  const AMOUNT = ethers.parseEther("10");

  beforeEach(async function () {
    [sender, recipient, attacker] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MockERC20");
    token = await Token.deploy("TestToken", "TTK", ethers.parseEther("1000"));
    await token.waitForDeployment();
    await token.transfer(sender.address, ethers.parseEther("100"));

    const CL = await ethers.getContractFactory("VitClaimLink");
    claim = await CL.deploy();
    await claim.waitForDeployment();

    await token.connect(sender).approve(await claim.getAddress(), AMOUNT);
  });

  it("create locks tokens and emits LinkCreated", async function () {
    await expect(
      claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH),
    )
      .to.emit(claim, "LinkCreated")
      .withArgs(ID, sender.address, await token.getAddress(), AMOUNT, 0);
    expect(await token.balanceOf(await claim.getAddress())).to.equal(AMOUNT);
  });

  it("rejects create with zero amount", async function () {
    await expect(
      claim.connect(sender).create(ID, await token.getAddress(), 0, 0, SECRET_HASH),
    ).to.be.revertedWithCustomError(claim, "ZeroAmount");
  });

  it("rejects duplicate id", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    await token.connect(sender).approve(await claim.getAddress(), AMOUNT);
    await expect(
      claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH),
    ).to.be.revertedWithCustomError(claim, "AlreadyExists");
  });

  it("claim with correct secret transfers to recipient", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    const before = await token.balanceOf(recipient.address);
    await expect(claim.connect(attacker).claim(ID, SECRET, recipient.address))
      .to.emit(claim, "LinkClaimed")
      .withArgs(ID, recipient.address, AMOUNT);
    expect(await token.balanceOf(recipient.address)).to.equal(before + AMOUNT);
  });

  it("claim with wrong secret reverts", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    const bad = ethers.encodeBytes32String("wrong");
    await expect(
      claim.connect(attacker).claim(ID, bad, recipient.address),
    ).to.be.revertedWithCustomError(claim, "WrongSecret");
  });

  it("double-claim reverts", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    await claim.connect(attacker).claim(ID, SECRET, recipient.address);
    await expect(
      claim.connect(attacker).claim(ID, SECRET, recipient.address),
    ).to.be.revertedWithCustomError(claim, "NotPending");
  });

  it("claim after expiry reverts", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const expiry = now + 60;
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, expiry, SECRET_HASH);
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine");
    await expect(
      claim.connect(attacker).claim(ID, SECRET, recipient.address),
    ).to.be.revertedWithCustomError(claim, "Expired");
  });

  it("cancel by sender refunds tokens", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    const before = await token.balanceOf(sender.address);
    await expect(claim.connect(sender).cancel(ID))
      .to.emit(claim, "LinkCancelled")
      .withArgs(ID, sender.address, AMOUNT);
    expect(await token.balanceOf(sender.address)).to.equal(before + AMOUNT);
  });

  it("cancel by non-sender reverts", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    await expect(claim.connect(attacker).cancel(ID)).to.be.revertedWithCustomError(claim, "NotSender");
  });

  it("cancel after expiry still allowed (sender recovers funds)", async function () {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, now + 60, SECRET_HASH);
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine");
    await expect(claim.connect(sender).cancel(ID)).to.emit(claim, "LinkCancelled");
  });

  it("cancel after claim reverts", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    await claim.connect(attacker).claim(ID, SECRET, recipient.address);
    await expect(claim.connect(sender).cancel(ID)).to.be.revertedWithCustomError(claim, "NotPending");
  });

  it("getLink returns full state", async function () {
    await claim.connect(sender).create(ID, await token.getAddress(), AMOUNT, 0, SECRET_HASH);
    const l = await claim.getLink(ID);
    expect(l.sender).to.equal(sender.address);
    expect(l.amount).to.equal(AMOUNT);
    expect(l.status).to.equal(0);
  });
});
