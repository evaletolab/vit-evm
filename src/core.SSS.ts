import { ethers } from "ethers";

// replace SSS with https://github.com/jwerle/shamirs-secret-sharing
import { share, combine } from 'secrets.js-34r7h';


export async function createShamirSecretFromSeed(entropy: Uint8Array, shares: number = 4, threshold: number = 3) {
  const hexSeed = ethers.utils.hexlify(entropy).split('0x')[1];
  const pad = 32;
  return share(hexSeed, shares, threshold, pad) as [];
}


export function combineShamirSecret(shares: string[]):string {
  return combine(shares);
}