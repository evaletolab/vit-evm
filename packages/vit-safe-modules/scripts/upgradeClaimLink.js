const hre = require('hardhat');

async function main() {
  const proxy = process.env.CLAIMLINK_PROXY;
  if (!proxy) {
    throw new Error('Set CLAIMLINK_PROXY to the existing proxy address');
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log('Upgrader:', deployer.address);
  console.log('Proxy:', proxy);

  const ClaimLink = await hre.ethers.getContractFactory('VitClaimLink');
  const upgraded = await hre.upgrades.upgradeProxy(proxy, ClaimLink, {
    kind: 'uups',
  });
  await upgraded.waitForDeployment();
  console.log('VitClaimLink upgraded at:', await upgraded.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
