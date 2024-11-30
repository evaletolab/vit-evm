import { HDNodeWallet, Wallet } from "ethers";


//
// generate derivation root from mnemonic 
// https://github.com/iancoleman/bip39/blob/c3c7cebfe4c0b5a9b97e71e781b69e6a08e1fb57/src/js/index.js#L1225
export function derivationFromSeed(seed: string, path:string, count?: number, start?: number) {
  const derived = path;
  const node = HDNodeWallet.fromSeed(seed);
  const wallets = new Array(count || 5).fill(0).map((value,index) => node.derivePath(derived + '/' + (value+index + (start || 0))));
  return wallets;
}

export function createFromKey(privateKey: string) {
  const wallet = new Wallet(privateKey);
  //const wallet2 = new SigningKey(privateKey);
  console.log('---- DBG pKey', wallet);
  return wallet;
}
