export async function PBKDF2(password:string, salt:string) {
  const iterations = 200000, keyLength = 32
  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    keyLength * 8
  );

  return new Uint8Array(derivedBits);
  
  
}