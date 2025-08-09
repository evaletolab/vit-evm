//
// Orginal source code from github.com/BitySA/orianne
export interface Networks {

}

export interface Payment {
}

export interface CryptoAddress {
    value: string;
    pay(toAddress: string, amountInStandardDenomination: string): Promise<Payment>;
    sign(message: string | Uint8Array): Promise<string | Uint8Array>;
}

export interface Wallet {
    getAnyCryptoAddress(network?: string): Promise<CryptoAddress>;
    initialize(): Promise<this>;
}

export enum Error {
    NoWallets,
    NoWalletInUse,
    WalletAlreadyExists,
    WalletDoesntExist,
}

export type Result<T> = T | Error;


export enum Wallets {
    BitBox02 = 'BitBox02',
    Dummy = 'Dummy',
    Ledger = 'Ledger',
    Metamask = 'Metamask',
    Trezor = 'Trezor',
}

// ===============================
// WebAuthn / Passkey types
// ===============================

export interface PasskeyCredential {
  credentialId: string;             // base64url
  publicKey?: string;               // uncompressed 65-byte public key hex (0x04...) or base64url-encoded bytes
  userHandle?: string | null;       // base64url or null
}

export interface WebAuthnSignature {
  credentialId: string;             // base64url
  clientDataJSON: string;           // base64url
  authenticatorData: string;        // base64url
  signature: string;                // base64url (DER-encoded ECDSA for P-256)
  userHandle?: string | null;       // base64url or null
}

export interface WebAuthnModuleConfig {
  chainId: number;
  safeAddress: string;              // 0x...
  moduleAddress: string;            // 0x...
}

export interface ModuleCall {
  to: string;                       // contract address
  data: string;                     // 0x...
  value?: bigint;                   // default 0n
}

// Minimal WebAuthn shapes to avoid DOM lib dependency
export interface WebAuthnAttestationLike {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    attestationObject: ArrayBuffer;
    transports?: string[];
  };
  type: 'public-key';
}

export interface WebAuthnAssertionLike {
  id: string;
  rawId: ArrayBuffer;
  response: {
    clientDataJSON: ArrayBuffer;
    authenticatorData: ArrayBuffer;
    signature: ArrayBuffer;
    userHandle?: ArrayBuffer | null;
  };
  type: 'public-key';
}

// Minimal option types to avoid DOM lib dependency
export interface PasskeyRegistrationOptions {
  publicKey: Record<string, unknown>;
}

export interface PasskeyRequestOptions {
  publicKey: Record<string, unknown>;
}