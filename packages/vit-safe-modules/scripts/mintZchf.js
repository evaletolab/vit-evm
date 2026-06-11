const hre = require('hardhat');

async function main() {
  const tokenAddress = process.env.ZCHF_ADDRESS;
  const recipient = process.env.RECIPIENT;
  const amountInput = process.env.AMOUNT || '100';

  if (!tokenAddress) {
    throw new Error('Missing env: ZCHF_ADDRESS=0x...');
  }
  if (!recipient) {
    throw new Error('Missing env: RECIPIENT=0x...');
  }

  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      'No signer account. Set PRIVATE_KEY in env before running.\n' +
        '  bash:       PRIVATE_KEY=0x... npx hardhat run ...\n' +
        '  PowerShell: $env:PRIVATE_KEY="0x..."; npx hardhat run ...',
    );
  }
  const signer = signers[0];
  console.log(`Network: ${hre.network.name}`);
  console.log(`Signer: ${signer.address}`);
  console.log(`Token:  ${tokenAddress}`);
  console.log(`To:     ${recipient}`);
  console.log(`Amount: ${amountInput} ZCHF`);

  const amount = hre.ethers.parseUnits(amountInput, 18);
  const token = await hre.ethers.getContractAt('MockERC20', tokenAddress);
  const tx = await token.mint(recipient, amount);
  console.log(`tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`mined in block ${receipt.blockNumber}`);

  const balance = await token.balanceOf(recipient);
  console.log(`new balance: ${hre.ethers.formatUnits(balance, 18)} ZCHF`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
