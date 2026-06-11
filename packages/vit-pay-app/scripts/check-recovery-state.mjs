import { ethers } from 'ethers';

const RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const SAFE = '0x4962D9D14ef2AD71202851CF4AA0282A5F2419FA';
const MODULES = {
  After3Minutes: '0x949d01d424bE050D09C16025dd007CB59b3A8c66',
  After3Days: '0x38275826E1933303E508433dD5f289315Da2541c',
  After7Days: '0x088f6cfD8BB1dDb1BB069CCb3fc1A98927D233f2',
  After14Days: '0x9BacD92F4687Db306D7ded5d4513a51EA05df25b',
};

const provider = new ethers.JsonRpcProvider(RPC);

// 1) Modules enabled on Safe
const safe = new ethers.Contract(
  SAFE,
  ['function getModulesPaginated(address start, uint256 pageSize) view returns (address[] modules, address next)'],
  provider,
);
const SENTINEL = '0x0000000000000000000000000000000000000001';
const { modules: enabled } = await safe.getModulesPaginated(SENTINEL, 50);
console.log('Modules enabled on Safe:', enabled);

// 2) Guardian count for each known module
const modAbi = [
  'function guardiansCount(address account) view returns (uint256)',
  'function threshold(address account) view returns (uint256)',
];
for (const [name, addr] of Object.entries(MODULES)) {
  const mod = new ethers.Contract(addr, modAbi, provider);
  try {
    const count = await mod.guardiansCount(SAFE);
    const t = await mod.threshold(SAFE);
    console.log(`${name} (${addr}): guardians=${count}, threshold=${t}`);
  } catch (e) {
    console.log(`${name}: query failed (${e.shortMessage ?? e.message})`);
  }
}
