import { ethers } from "ethers";

export function retrieveEntropy(mnemonic: string, defaultLang:string = 'en') {
  const strEntropy = ethers.utils.mnemonicToEntropy(mnemonic, ethers.wordlists[defaultLang]);
  return ethers.utils.toUtf8Bytes(strEntropy);
}


export function createMnemonic(entropy: Uint8Array, size: number = 16, defaultLang:string = 'en') {
  // https://docs.ethers.io/v5/api/utils/hdnode/#Mnemonic
  // https://github.com/ethers-io/ethers.js/issues/34
  const sizedEntropy = entropy.slice(0, size);
  const mnemonic = ethers.utils.entropyToMnemonic(ethers.utils.hexlify(sizedEntropy), ethers.wordlists[defaultLang])
  return mnemonic;
}

export function isValidMnemonic(mnemonic: string, defaultLang:string = 'en') {
  return ethers.utils.isValidMnemonic(mnemonic, ethers.wordlists[defaultLang]);
}

export function isValidPrivateKey(pKey: string) {
  const hex32 = (typeof (pKey) === "string" && pKey.match(/^(0x)?[0-9a-f]{64}$/i));
  return hex32;
}

export async function mnemonicToSeed(mnemonic: string) {
  return ethers.utils.mnemonicToSeed(mnemonic);
}