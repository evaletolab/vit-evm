
import { HDNodeWallet, Wallet } from "ethers";

/**
 * Generates a list of HDNodeWallets derived from a given seed and derivation path.
 * 
 * @param seed - The seed phrase used to generate the root node.
 * @param path - The derivation path to use for generating wallets.
 * @param count - The number of wallets to generate. Defaults to 5 if not provided.
 * @param start - The starting index for wallet generation. Defaults to 0 if not provided.
 * @returns An array of HDNodeWallets derived from the seed and path.
 * 
 * @remarks
 * The derivation paths follow the BIP standards:
 * - BIP32: m/0 ; Bitcoin ; General purpose
 * - BIP44: m/44'/0'/0'/0 ; Bitcoin ; Multi-account hierarchy for deterministic wallets
 * - BIP49: m/49'/0'/0'/0 ; Bitcoin ; P2WPKH-nested-in-P2SH
 * - BIP84: m/84'/0'/0'/0 ; Bitcoin ; Native SegWit (P2WPKH)
 * - BIP141: m/0'/0 ; Bitcoin ; Segregated Witness (SegWit)
 * 
 * Additional derivation paths for other networks:
 * - Litecoin (LTC): m/44'/2'/0'/0
 * - Ethereum (ETH): m/44'/60'/0'/0
 * - Base: m/44'/60'/0'/0
 * - Polygon (MATIC): m/44'/966'/0'/0
 * 
 * @see {@link https://github.com/iancoleman/bip39/blob/c3c7cebfe4c0b5a9b97e71e781b69e6a08e1fb57/src/js/index.js#L1225}
 * 
 * @example
 * ```typescript
 * const seed = "your seed phrase here";
 * const path = "m/44'/0'/0'/0";
 * const wallets = derivationFromSeed(seed, path, 10, 0);
 * console.log(wallets);
 * ```
 */
export function derivationFromSeed(seed: string, path:string, count?: number, start?: number): HDNodeWallet[] {
  const derived = path;
  const node = HDNodeWallet.fromSeed(seed);
  const wallets = new Array(count || 5).fill(start || 0).map((start,offset) => node.derivePath(derived + '/' + (start+offset)));
  return wallets;
}

/**
 * Creates a Wallet instance from a given private key.
 * 
 * @param privateKey - The private key to create the wallet from.
 * @returns A Wallet instance created from the private key.
 * 
 * @remarks
 * Account Extended Private Key:
 * - HDNodeWallet.privateKey
 * 
 * BIP32 Extended Private Key:
 * - HDNodeWallet.extendedKey
 * - HDNodeWallet.extendedPublicKey
 * - HDNodeWallet.mnemonic
 * 
 * @example
 * ```typescript
 * const privateKey = "your private key here";
 * const wallet = createFromKey(privateKey);
 * console.log(wallet.address);
 * ```
 */
export function createFromKey(privateKey: string) {
  const wallet = new Wallet(privateKey);
  return wallet;
}


export function isValidPrivateKey(pKey: string) {
  const hex32 = (typeof (pKey) === "string" && pKey.match(/^(0x)?[0-9a-f]{64}$/i));
  return hex32;
}
