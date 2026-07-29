const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const ClaimLink = await hre.ethers.getContractFactory('VitClaimLink');
  const cl = await hre.upgrades.deployProxy(ClaimLink, [deployer.address], {
    initializer: 'initialize',
    kind: 'uups',
  });
  await cl.waitForDeployment();
  console.log('VitClaimLink (proxy):', await cl.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
