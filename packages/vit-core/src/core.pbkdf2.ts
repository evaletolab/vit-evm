export async function PBKDF2(buffer8:Uint8Array, salt:Uint8Array, iterations = 200000):Promise<Uint8Array> {
  const keyLength = 32
  // Encode string to Uint8Array
  // const enc = new TextEncoder();
  // enc.encode(salt);
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    buffer8,
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    keyLength * 8
  );

  return new Uint8Array(derivedBits);
}