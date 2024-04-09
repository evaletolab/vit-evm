


/**
 * Imports the secret key for AES encryption and decryption.
 * 
 * @param rawKey - The raw key as a Uint8Array.
 * @returns A promise that resolves to the imported secret key.
 */
function importSecretKey(rawKey: Uint8Array) {
  return window.crypto.subtle.importKey("raw", rawKey, "AES-GCM", true, [
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
export async function aes_browser_encrypt(
  key: Uint8Array,
  message: string,
  salt: Uint8Array
) {
  const encoder = new TextEncoder();
  const encodedMessage = encoder.encode(message);
  const iv = salt; //window.crypto.getRandomValues(new Uint8Array(12));
  const codec = {
    name: "AES-GCM",
    iv: iv,
  };
  const secret = await importSecretKey(key);

  const ciphertext = await window.crypto.subtle.encrypt(
    codec,
    secret,
    encodedMessage
  );
  return ciphertext;
}

/**
 * Decrypts a ciphertext using AES-GCM decryption.
 * 
 * @param key - The decryption key as a Uint8Array.
 * @param ciphertext - The ciphertext to decrypt as a BufferSource.
 * @param salt - The salt value as a Uint8Array.
 * @returns A promise that resolves to the decrypted message as a string.
 */
export async function aes_browser_decrypt(
  key: Uint8Array,
  ciphertext: BufferSource,
  salt: Uint8Array
) {
  const codec = {
    name: "AES-GCM",
    iv: salt,
  };
  const secret = await importSecretKey(key);

  const decrypted = await window.crypto.subtle.decrypt(
    codec,
    secret,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
