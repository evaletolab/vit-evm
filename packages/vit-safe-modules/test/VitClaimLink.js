const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

describe('VitClaimLink UUPS v2', function () {
  let claimLink, token, sender, recipient, stranger;

  beforeEach(async function () {
    [sender, recipient, stranger] = await ethers.getSigners();

    const Token = await ethers.getContractFactory('MockERC20');
    token = await Token.deploy('MockZCHF', 'mZCHF', ethers.parseEther('10000'));
    await token.waitForDeployment();

    const Factory = await ethers.getContractFactory('VitClaimLink');
    claimLink = await upgrades.deployProxy(Factory, [sender.address], {
      initializer: 'initialize',
      kind: 'uups',
    });
    await claimLink.waitForDeployment();

    await token.transfer(sender.address, ethers.parseEther('100'));
  });

  async function createLink(opts = {}) {
    const id = opts.id || ethers.hexlify(ethers.randomBytes(32));
    const secret = opts.secret || ethers.hexlify(ethers.randomBytes(32));
    const secretHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['bytes32'], [secret]),
    );
    const amount = opts.amount || ethers.parseEther('10');
    const expiry = opts.expiry ?? 0n;
    const metaHash = opts.metaHash || ethers.ZeroHash;

    await token.connect(sender).approve(await claimLink.getAddress(), amount);
    await claimLink
      .connect(sender)
      .create(id, await token.getAddress(), amount, expiry, secretHash, metaHash);
    return { id, secret, amount, metaHash };
  }

  it('creates and claims with metaHash match', async function () {
    const metaHash = ethers.keccak256(ethers.toUtf8Bytes('contact-payload'));
    const { id, secret, amount } = await createLink({ metaHash });

    await claimLink
      .connect(recipient)
      .claim(id, secret, recipient.address, metaHash);

    expect(await token.balanceOf(recipient.address)).to.equal(amount);
    const link = await claimLink.getLink(id);
    expect(link.status).to.equal(1); // Claimed
  });

  it('reverts claim when metaHash mismatches', async function () {
    const metaHash = ethers.keccak256(ethers.toUtf8Bytes('good'));
    const { id, secret } = await createLink({ metaHash });

    await expect(
      claimLink
        .connect(recipient)
        .claim(id, secret, recipient.address, ethers.keccak256(ethers.toUtf8Bytes('bad'))),
    ).to.be.revertedWithCustomError(claimLink, 'MetaMismatch');
  });

  it('cancelExpired is permissionless after expiry', async function () {
    const latest = await ethers.provider.getBlock('latest');
    const expiry = BigInt(latest.timestamp + 2);
    const { id, amount } = await createLink({ expiry });

    await ethers.provider.send('evm_increaseTime', [5]);
    await ethers.provider.send('evm_mine', []);

    const before = await token.balanceOf(sender.address);
    await claimLink.connect(stranger).cancelExpired(id);
    expect(await token.balanceOf(sender.address)).to.equal(before + amount);
  });

  it('cancelExpired reverts if not expired', async function () {
    const latest = await ethers.provider.getBlock('latest');
    const expiry = BigInt(latest.timestamp + 3600);
    const { id } = await createLink({ expiry });

    await expect(
      claimLink.connect(stranger).cancelExpired(id),
    ).to.be.revertedWithCustomError(claimLink, 'NotExpired');
  });
});
