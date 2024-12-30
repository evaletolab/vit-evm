

// 
// https://github.com/ProtonMail/proton-shared/blob/master/lib/authentication/cryptoHelper.ts

import { getBytes, sha256, toUtf8Bytes } from "ethers";


/**
 * Imports the secret key for AES encryption and decryption.
 * @remarks 
 * The private key is not revealable.
 * 
 * @param rawKey - The raw key as a string.
 * @returns A promise that resolves to the imported secret key.
 */
export async function createSecretKey(rawKey: string): Promise<CryptoKey> {
  let messageBytes = toUtf8Bytes(rawKey);
  const secret = getBytes(sha256(messageBytes)).slice(0, 16);

  return window.crypto.subtle.importKey("raw", secret, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypts a message using AES-GCM encryption.
 * 
 * @param key - The encryption key as a Uint8Array.
 * @param message - The message to encrypt as a string.
 * @param salt - The salt value as a Uint8Array.
 * @returns A promise that resolves to the encrypted ciphertext as a BufferSource.
 */
export async function aes_encrypt(
  message: string,
  secret: CryptoKey,
  salt: Uint8Array
) {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const iv = salt; //window.crypto.getRandomValues(new Uint8Array(12));
  const codec = {
    name: "AES-GCM",
    iv: iv,
  };

  const ciphertext = await window.crypto.subtle.encrypt(
    codec,
    secret,
    encodedMessage
  );
  return new Uint8Array(ciphertext);
}

/**
 * Decrypts a ciphertext using AES-GCM decryption.
 * 
 * @param key - The decryption key as a Uint8Array.
 * @param ciphertext - The ciphertext to decrypt as a BufferSource.
 * @param salt - The salt value as a Uint8Array.
 * @returns A promise that resolves to the decrypted message as a string.
 */
export async function aes_decrypt(
  ciphertext: BufferSource,
  secret: CryptoKey,
  salt: Uint8Array
) {
  const codec = {
    name: "AES-GCM",
    iv: salt,
  };

  const decrypted = await window.crypto.subtle.decrypt(
    codec,
    secret,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
