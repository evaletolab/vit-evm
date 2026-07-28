/**
 * Banc d'essai : encodage base32 des codes de secours + dérivation Argon2id
 * en JavaScript pur (@noble/hashes), sans WASM.
 *
 * Objectif : décider si une KDF mémoire-dure est tenable côté navigateur pour
 * 3 dérivations à la création et 2 à la restauration.
 *
 *   node packages/vit-pay-app/scripts/bench-recovery-codes.mjs
 */
import { argon2id } from '@noble/hashes/argon2';
import { scrypt } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha2';
import { keccak_256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@noble/curves/secp256k1';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------- base32

// Alphabet Crockford : ni I, ni L, ni O, ni U (confusions et mot malheureux).
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DEALIAS = { I: '1', L: '1', O: '0', U: 'V' };

const SECRET_BITS = 75;
const CHECK_BITS = 5;
const CODE_CHARS = (SECRET_BITS + CHECK_BITS) / 5; // 16

/** 10 octets dont seuls les 75 bits de poids fort portent de l'entropie. */
function generateSecret() {
  const raw = randomBytes(10);
  raw[9] &= 0b11100000; // les 5 bits de poids faible appartiennent au checksum
  return raw;
}

function checksum5(secret) {
  return sha256(secret)[0] & 0b00011111;
}

/** 75 bits de secret + 5 bits de contrôle -> 16 caractères, groupés par 4. */
function encodeCode(secret) {
  const bytes = Uint8Array.from(secret);
  bytes[9] = (bytes[9] & 0b11100000) | checksum5(secret);
  let acc = 0n;
  for (const b of bytes) acc = (acc << 8n) | BigInt(b);
  let out = '';
  for (let i = CODE_CHARS - 1; i >= 0; i--) {
    out += ALPHABET[Number((acc >> BigInt(i * 5)) & 31n)];
  }
  return out.replace(/(.{4})(?=.)/g, '$1-');
}

/** Renvoie le secret canonique, ou lève si la saisie est fautive. */
function decodeCode(input) {
  const clean = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[ILOU]/g, (c) => DEALIAS[c]);
  if (clean.length !== CODE_CHARS) {
    throw new Error(`longueur invalide : ${clean.length} au lieu de ${CODE_CHARS}`);
  }
  let acc = 0n;
  for (const c of clean) {
    const v = ALPHABET.indexOf(c);
    if (v < 0) throw new Error(`caractère invalide : ${c}`);
    acc = (acc << 5n) | BigInt(v);
  }
  const bytes = new Uint8Array(10);
  for (let i = 9; i >= 0; i--) {
    bytes[i] = Number(acc & 255n);
    acc >>= 8n;
  }
  const given = bytes[9] & 0b00011111;
  bytes[9] &= 0b11100000;
  if (checksum5(bytes) !== given) throw new Error('checksum invalide');
  return bytes;
}

// ------------------------------------------------------------------- KDF

/**
 * Le sel lie le code à un wallet précis : sans lui, un attaquant testerait
 * tous les guardians de tous les wallets en une seule passe d'énumération.
 */
function saltFor(safeAddress, index) {
  return sha256(new TextEncoder().encode(`vit-recovery-v1|${safeAddress.toLowerCase()}|${index}`)).slice(0, 16);
}

function toGuardianAddress(dk) {
  // Un DK hors intervalle est astronomiquement improbable, mais il doit rester
  // déterministe : on re-dérive plutôt que d'échouer.
  let scalar = dk;
  while (!secp256k1.utils.isValidPrivateKey(scalar)) scalar = sha256(scalar);
  const pub = secp256k1.getPublicKey(scalar, false).slice(1);
  return '0x' + Buffer.from(keccak_256(pub).slice(12)).toString('hex');
}

const PROFILES = [
  { name: 'argon2id m=64MiB t=3', run: (p, s) => argon2id(p, s, { m: 65536, t: 3, p: 1, dkLen: 32 }) },
  { name: 'argon2id m=32MiB t=3', run: (p, s) => argon2id(p, s, { m: 32768, t: 3, p: 1, dkLen: 32 }) },
  { name: 'argon2id m=19MiB t=2', run: (p, s) => argon2id(p, s, { m: 19456, t: 2, p: 1, dkLen: 32 }) },
  { name: 'argon2id m=8MiB  t=3', run: (p, s) => argon2id(p, s, { m: 8192, t: 3, p: 1, dkLen: 32 }) },
  { name: 'scrypt   N=2^17 r=8 ', run: (p, s) => scrypt(p, s, { N: 2 ** 17, r: 8, p: 1, dkLen: 32 }) },
  { name: 'scrypt   N=2^16 r=8 ', run: (p, s) => scrypt(p, s, { N: 2 ** 16, r: 8, p: 1, dkLen: 32 }) },
  { name: 'scrypt   N=2^15 r=8 ', run: (p, s) => scrypt(p, s, { N: 2 ** 15, r: 8, p: 1, dkLen: 32 }) },
];

// ------------------------------------------------------------------ main

const SAFE = '0x1111111111111111111111111111111111111111';

console.log('--- encodage ---');
const secret = generateSecret();
const code = encodeCode(secret);
console.log(`code            : ${code}   (${SECRET_BITS} bits + ${CHECK_BITS} bits de contrôle)`);
console.log(`aller-retour    : ${Buffer.compare(Buffer.from(decodeCode(code)), Buffer.from(secret)) === 0 ? 'ok' : 'ÉCHEC'}`);
console.log(`saisie tolérante: ${Buffer.compare(Buffer.from(decodeCode(code.toLowerCase().replace(/-/g, ' '))), Buffer.from(secret)) === 0 ? 'ok' : 'ÉCHEC'}`);

let caught = 0;
const chars = code.replace(/-/g, '').split('');
for (let i = 0; i < chars.length; i++) {
  for (const c of ALPHABET) {
    if (c === chars[i]) continue;
    const typo = [...chars];
    typo[i] = c;
    try {
      decodeCode(typo.join(''));
    } catch {
      caught++;
    }
  }
}
const totalTypos = chars.length * (ALPHABET.length - 1);
console.log(`fautes 1 car.   : ${caught}/${totalTypos} détectées (${((100 * caught) / totalTypos).toFixed(1)} %)`);

console.log('\n--- dérivation (JS pur, ce poste) ---');
const salt = saltFor(SAFE, 1);
for (const profile of PROFILES) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const dk = profile.run(secret, salt);
    runs.push(performance.now() - t0);
    if (i === 0) profile.address = toGuardianAddress(dk);
  }
  const ms = runs.reduce((a, b) => a + b) / runs.length;
  console.log(
    `${profile.name} : ${ms.toFixed(0).padStart(6)} ms  ` +
      `| création 3 codes ${((ms * 3) / 1000).toFixed(1)} s | restauration 2 codes ${((ms * 2) / 1000).toFixed(1)} s`,
  );
}

console.log('\n--- déterminisme ---');
const a = toGuardianAddress(argon2id(secret, salt, { m: 19456, t: 2, p: 1, dkLen: 32 }));
const b = toGuardianAddress(argon2id(decodeCode(code), saltFor(SAFE, 1), { m: 19456, t: 2, p: 1, dkLen: 32 }));
console.log(`guardian        : ${a}`);
console.log(`re-dérivé       : ${b}  ${a === b ? 'ok' : 'ÉCHEC'}`);
