const hre = require('hardhat');

async function main() {
  const network = hre.network.name;
  console.log(`Network: ${network}`);
  const signers = await hre.ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      'No deployer account. Set PRIVATE_KEY in env before running.\n' +
        '  bash:       PRIVATE_KEY=0x... npx hardhat run ...\n' +
        '  PowerShell: $env:PRIVATE_KEY="0x..."; npx hardhat run ...',
    );
  }
  const deployer = signers[0];
  console.log(`Deployer: ${deployer.address}`);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

  const initialSupply = hre.ethers.parseUnits('1000000', 18); // 1M ZCHF
  const Token = await hre.ethers.getContractFactory('MockERC20');
  const token = await Token.deploy('ZCHF Test', 'ZCHF', initialSupply);
  await token.waitForDeployment();
  const address = await token.getAddress();

  console.log('');
  console.log('=== Deployment complete ===');
  console.log(`MockZCHF address: ${address}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Copier cette adresse dans');
  console.log('     packages/vit-pay-app/src/environments/environment.development.ts');
  console.log('     → zchfTokenAddress: "<address>"');
  console.log('  2. (Optionnel) Distribuer du ZCHF avec:');
  console.log('     ZCHF_ADDRESS=<address> RECIPIENT=<safe-address> AMOUNT=100 \\');
  console.log('       npx hardhat run scripts/mintZchf.js --network opSepolia');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
