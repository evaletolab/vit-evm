const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const Recovery = await hre.ethers.getContractFactory('VitSafeRecoveryValidator');
  const recovery = await Recovery.deploy();
  await recovery.waitForDeployment();
  console.log('VitSafeRecoveryValidator:', await recovery.getAddress());

  const WebAuthn = await hre.ethers.getContractFactory('VitSafeWebAuthnValidator');
  const webauthn = await WebAuthn.deploy();
  await webauthn.waitForDeployment();
  console.log('VitSafeWebAuthnValidator:', await webauthn.getAddress());

  const Guard = await hre.ethers.getContractFactory('VitSafePaymentGuard');
  const guard = await Guard.deploy();
  await guard.waitForDeployment();
  console.log('VitSafePaymentGuard:', await guard.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


