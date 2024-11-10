import { expect } from 'chai'
import { hexlify } from 'ethers';

import { createShamirSecretFromSeed, combineShamirSecret } from '../dist/core.SSS';
import { randomBytes } from 'crypto';


describe('Shamir (SSS) for [device,user,restore-a,restore-b]', () => {
  let masterSecret: Uint8Array = randomBytes(16);
  const groups = 4;
  const threshold = 2;

  it("should create Shamir-Secret (4) and combine with randomly 2", async () => {
    //const entropy = 'cf27a3060af7f0d1a6203d98d019d4fd91ece5de';
    //console.log('----',(hexlify(masterSecret)))

    const shares = await createShamirSecretFromSeed(masterSecret, groups, threshold);
    const selectedShares = shares.sort(() => 0.5 - Math.random()).slice(0, threshold);
    const restored = combineShamirSecret(selectedShares);
    //console.log('----',(hexlify(restored)))
    expect(hexlify(restored)).equal(hexlify(masterSecret));

  });  

})
