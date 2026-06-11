// F6 test helper — guardian initiates SocialRecoveryModule.executeRecovery.
//
// Usage : node --env-file=.env scripts/guardian-trigger-recovery.mjs
//
// Requires GUARDIAN_PK in .env (see .env.example). Le compte Hardhat dev #0
// est public et OK pour Sepolia, mais ne doit jamais être commit dans le repo.
//
// Le module After3Minutes nous laisse finaliser la recovery 3 min après cet appel.

import { ethers } from 'ethers';

const RPC = process.env.RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com';
const GUARDIAN_PK = process.env.GUARDIAN_PK;
if (!GUARDIAN_PK) {
  console.error('Missing GUARDIAN_PK env var. Copy .env.example to .env and fill it.');
  process.exit(1);
}
const MODULE = '0x949d01d424bE050D09C16025dd007CB59b3A8c66'; // After3Minutes
const SAFE = '0x4962D9D14ef2AD71202851CF4AA0282A5F2419FA';
const NEW_OWNER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const NEW_THRESHOLD = 1n;

const provider = new ethers.JsonRpcProvider(RPC);
const guardian = new ethers.Wallet(GUARDIAN_PK, provider);
console.log('Guardian:', guardian.address);
console.log('Balance:', ethers.formatEther(await provider.getBalance(guardian.address)), 'ETH');

const module = new ethers.Contract(
  MODULE,
  ['function confirmRecovery(address account, address[] newOwners, uint256 newThreshold, bool execute) external'],
  guardian,
);

console.log('Calling confirmRecovery(execute=true) on', MODULE);
console.log('  safe:', SAFE);
console.log('  newOwners:', [NEW_OWNER]);
console.log('  newThreshold:', NEW_THRESHOLD.toString());

const tx = await module.confirmRecovery(SAFE, [NEW_OWNER], NEW_THRESHOLD, true);
console.log('Tx hash:', tx.hash);
const receipt = await tx.wait();
console.log('Mined in block', receipt.blockNumber, 'status', receipt.status);
console.log('\nRecovery queued. Attendre 3 minutes puis click « Finaliser » dans l\'UI.');
