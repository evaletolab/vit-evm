import { hexlify, Mnemonic } from "ethers";

// replace SSS with https://github.com/jwerle/shamirs-secret-sharing
import { Buffer, combine, split } from 'shamirs-secret-sharing'


//
// https://slip39.com/posts/ethereum-slip39-account-generation/
// https://github.com/satoshilabs/slips/blob/master/slip-0039.md
export async function createShamirSecretFromSeed(masterSecret: Uint8Array, shares: number = 4, threshold: number = 2): Promise<string[]> {
  const result = split(Buffer.from(masterSecret), {shares, threshold} )


  // Retourner les parts sous forme de chaînes
  return result.map(buf => buf.toString('hex'));
}


export function combineShamirSecret(shares: string[]):Uint8Array {
  //return Slip39.recoverSecret(mnemonics, passphrase ).toString('hex');
  const bytes = Uint8Array.from(combine(shares) as Uint8Array);
  return (bytes);

}