/**
 * Codes de secours ViT — 3 guardians SocialRecoveryModule.
 *
 * Format: base32 Crockford, 16 caractères (4×4), 75 bits de secret + 5 bits
 * de checksum. Dérivation → clé EOA via scrypt N=2^16 (v1), sel lié au Safe.
 *
 * Les codes ne sont JAMAIS persistés en localStorage. La charge utile stockée
 * dans le coffre / le QR embarque l'adresse Safe (pas de registre on-chain V1).
 */
import { scryptAsync } from '@noble/hashes/scrypt';
import { sha256 } from '@noble/hashes/sha2';
import { keccak_256 } from '@noble/hashes/sha3';
import { secp256k1 } from '@noble/curves/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { bytesToBase64Url, decodeJsonBase64Url, encodeJsonBase64Url } from '../shared/base64url';

/** Crockford base32 — pas de I, L, O, U. */
export const RECOVERY_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const DEALIAS: Record<string, string> = { I: '1', L: '1', O: '0', U: 'V' };

export const SECRET_BITS = 75;
export const CHECK_BITS = 5;
export const CODE_CHARS = (SECRET_BITS + CHECK_BITS) / 5; // 16
export const GUARDIAN_COUNT = 3;
export const GUARDIAN_THRESHOLD = 2;

/** Paramètres KDF versionnés — figés une fois des codes émis. */
export const KDF_PROFILES = {
  1: { N: 2 ** 16, r: 8, p: 1, dkLen: 32, label: 'scrypt-64MiB' },
  /** Repli si un appareil cale sur 64 MiB. */
  2: { N: 2 ** 15, r: 8, p: 1, dkLen: 32, label: 'scrypt-32MiB' },
} as const;

export type KdfVersion = keyof typeof KDF_PROFILES;
export const CURRENT_KDF_VERSION: KdfVersion = 1;

export interface RecoveryCodeMaterial {
  /** Index 1..3 (ordre stable pour le sel). */
  index: number;
  /** Code affiché : GEPP-2EYW-GV2P-CC9B */
  code: string;
  /** 10 octets canoniques (75 bits utiles). */
  secret: Uint8Array;
  /** Adresse guardian EOA (checksummed lowercase). */
  address: string;
  /** Clé privée hex 0x… — à jeter après usage. */
  privateKey: string;
}

/** Charge utile coffre / QR (jamais en localStorage). */
export interface RecoveryCodePayload {
  v: KdfVersion;
  /** Adresse Safe. */
  a: string;
  /** Index du code 1..3. */
  i: number;
  /** Code base32 groupé. */
  c: string;
  /** Soft-restore (code 1 au coffre) : credentialId + pubkey. */
  cid?: string;
  x?: string;
  y?: string;
  /** Nom local <nom>@vit.swiss. */
  n?: string;
}

export function generateSecret(): Uint8Array {
  const raw = new Uint8Array(10);
  crypto.getRandomValues(raw);
  raw[9] &= 0b11100000;
  return raw;
}

function checksum5(secret: Uint8Array): number {
  return sha256(secret)[0] & 0b00011111;
}

/** 75 bits + 5 bits de contrôle → `XXXX-XXXX-XXXX-XXXX`. */
export function encodeCode(secret: Uint8Array): string {
  if (secret.length !== 10) throw new Error('secret invalide');
  const bytes = Uint8Array.from(secret);
  bytes[9] = (bytes[9] & 0b11100000) | checksum5(secret);
  let acc = 0n;
  for (const b of bytes) acc = (acc << 8n) | BigInt(b);
  let out = '';
  for (let i = CODE_CHARS - 1; i >= 0; i--) {
    out += RECOVERY_ALPHABET[Number((acc >> BigInt(i * 5)) & 31n)];
  }
  return out.replace(/(.{4})(?=.)/g, '$1-');
}

/** Décode + vérifie le checksum. Tolère minuscules, espaces, I/L/O/U. */
export function decodeCode(input: string): Uint8Array {
  const clean = input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[ILOU]/g, (c) => DEALIAS[c] ?? c);
  if (clean.length !== CODE_CHARS) {
    throw new Error(`Code invalide (longueur ${clean.length}, attendu ${CODE_CHARS})`);
  }
  let acc = 0n;
  for (const ch of clean) {
    const v = RECOVERY_ALPHABET.indexOf(ch);
    if (v < 0) throw new Error(`Caractère invalide : ${ch}`);
    acc = (acc << 5n) | BigInt(v);
  }
  const bytes = new Uint8Array(10);
  for (let i = 9; i >= 0; i--) {
    bytes[i] = Number(acc & 255n);
    acc >>= 8n;
  }
  const given = bytes[9] & 0b00011111;
  bytes[9] &= 0b11100000;
  if (checksum5(bytes) !== given) {
    throw new Error('Code invalide (checksum)');
  }
  return bytes;
}

export function formatCodeDisplay(code: string): string {
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return clean.replace(/(.{4})(?=.)/g, '$1-');
}

export function saltFor(safeAddress: string, index: number, version: KdfVersion = CURRENT_KDF_VERSION): Uint8Array {
  const label = `vit-recovery-v${version}|${safeAddress.toLowerCase()}|${index}`;
  return sha256(new TextEncoder().encode(label)).slice(0, 16);
}

function privateKeyFromDk(dk: Uint8Array): Uint8Array {
  let scalar = dk;
  while (!secp256k1.utils.isValidPrivateKey(scalar)) {
    scalar = sha256(scalar);
  }
  return scalar;
}

export function addressFromPrivateKey(privateKey: Uint8Array): string {
  const pub = secp256k1.getPublicKey(privateKey, false).slice(1);
  const addr = keccak_256(pub).slice(12);
  return ('0x' + bytesToHex(addr)).toLowerCase();
}

export type DeriveProgress = (ratio: number) => void;

/**
 * Dérive la clé guardian depuis le secret. scryptAsync cède périodiquement
 * au event loop (progression UI sans Web Worker — rollback WASM possible).
 */
export async function deriveGuardianKey(
  secret: Uint8Array,
  safeAddress: string,
  index: number,
  opts?: { version?: KdfVersion; onProgress?: DeriveProgress },
): Promise<{ privateKey: string; address: string }> {
  const version = opts?.version ?? CURRENT_KDF_VERSION;
  const profile = KDF_PROFILES[version];
  const salt = saltFor(safeAddress, index, version);
  const dk = await scryptAsync(secret, salt, {
    N: profile.N,
    r: profile.r,
    p: profile.p,
    dkLen: profile.dkLen,
    asyncTick: 16,
    onProgress: opts?.onProgress,
  });
  const priv = privateKeyFromDk(dk);
  return {
    privateKey: '0x' + bytesToHex(priv),
    address: addressFromPrivateKey(priv),
  };
}

/** Génère les 3 codes et dérive les 3 adresses guardians (création / rotation). */
export async function generateGuardianCodes(
  safeAddress: string,
  opts?: { version?: KdfVersion; onProgress?: (index: number, ratio: number) => void },
): Promise<RecoveryCodeMaterial[]> {
  const version = opts?.version ?? CURRENT_KDF_VERSION;
  const out: RecoveryCodeMaterial[] = [];
  for (let index = 1; index <= GUARDIAN_COUNT; index++) {
    const secret = generateSecret();
    const code = encodeCode(secret);
    const key = await deriveGuardianKey(secret, safeAddress, index, {
      version,
      onProgress: (r) => opts?.onProgress?.(index, r),
    });
    out.push({
      index,
      code,
      secret,
      address: key.address,
      privateKey: key.privateKey,
    });
  }
  return out;
}

export function buildCodePayload(
  material: RecoveryCodeMaterial,
  safeAddress: string,
  extras?: { credentialId?: string; x?: string; y?: string; name?: string },
  version: KdfVersion = CURRENT_KDF_VERSION,
): RecoveryCodePayload {
  const payload: RecoveryCodePayload = {
    v: version,
    a: safeAddress.toLowerCase(),
    i: material.index,
    c: material.code,
  };
  if (extras?.credentialId) payload.cid = extras.credentialId;
  if (extras?.x) payload.x = extras.x;
  if (extras?.y) payload.y = extras.y;
  if (extras?.name) payload.n = extras.name;
  return payload;
}

export function encodeCodePayload(payload: RecoveryCodePayload): string {
  return encodeJsonBase64Url(payload);
}

export function decodeCodePayload(raw: string): RecoveryCodePayload {
  const s = raw.trim();
  // Accepte URL complète avec fragment, ou payload nu.
  let encoded = s;
  const hashIdx = s.lastIndexOf('#');
  if (hashIdx >= 0 && !s.startsWith('{')) {
    const frag = s.slice(hashIdx + 1);
    const params = new URLSearchParams(frag.startsWith('c=') || frag.includes('=') ? frag : `c=${frag}`);
    encoded = params.get('c') ?? frag;
  }
  if (encoded.startsWith('vitcode:')) encoded = encoded.slice('vitcode:'.length);

  let parsed: RecoveryCodePayload;
  try {
    parsed = decodeJsonBase64Url<RecoveryCodePayload>(encoded);
  } catch {
    // Fallback : l'utilisateur a collé uniquement le code 4×4 — pas assez pour résoudre le Safe.
    throw new Error('Charge utile de code invalide');
  }
  if (!parsed.a || !parsed.c || !parsed.i || !parsed.v) {
    throw new Error('Charge utile de code incomplète');
  }
  if (!(parsed.v in KDF_PROFILES)) {
    throw new Error(`Version KDF non supportée : ${parsed.v}`);
  }
  if (parsed.i < 1 || parsed.i > GUARDIAN_COUNT) {
    throw new Error(`Index de code invalide : ${parsed.i}`);
  }
  // Valide checksum du code immédiatement.
  decodeCode(parsed.c);
  return parsed;
}

/** Dérive la clé depuis une charge utile décodée. */
export async function deriveFromPayload(
  payload: RecoveryCodePayload,
  opts?: { onProgress?: DeriveProgress },
): Promise<{ privateKey: string; address: string; payload: RecoveryCodePayload }> {
  const secret = decodeCode(payload.c);
  const key = await deriveGuardianKey(secret, payload.a, payload.i, {
    version: payload.v,
    onProgress: opts?.onProgress,
  });
  return { ...key, payload };
}

/**
 * Résolution V1 : l'adresse Safe est dans la charge utile.
 * V2 brancherait ici un registre on-chain keccak(nom) → Safe.
 */
export function resolveWalletAddress(
  _name: string,
  payloads: RecoveryCodePayload[],
): string {
  if (payloads.length === 0) throw new Error('Aucun code fourni');
  const addr = payloads[0].a.toLowerCase();
  for (const p of payloads) {
    if (p.a.toLowerCase() !== addr) {
      throw new Error('Les codes ne correspondent pas au même wallet');
    }
  }
  return addr;
}

export function vaultUsername(name: string, domain = 'vit.swiss'): string {
  return `${name.toLowerCase()}@${domain}`;
}

/** Mot de passe coffre = charge utile encodée (contient le code + adresse). */
export function vaultPassword(payload: RecoveryCodePayload): string {
  return encodeCodePayload(payload);
}

/**
 * Offre l'enregistrement dans le coffre du navigateur / OS.
 * Chromium : credentials.store. Safari/iOS : formulaire visible + submit
 * (PasswordCredential non supporté — WebKit 252908).
 */
export async function offerVaultSave(
  username: string,
  password: string,
): Promise<'stored' | 'prompted' | 'unsupported'> {
  if (typeof window === 'undefined') return 'unsupported';

  if ('PasswordCredential' in window && navigator.credentials?.store) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Cred = (window as any).PasswordCredential;
      const cred = new Cred({ id: username, password, name: 'ViT recovery' });
      await navigator.credentials.store(cred);
      return 'stored';
    } catch {
      // fall through
    }
  }

  injectVisibleCredentialForm(username, password);
  return 'prompted';
}

function injectVisibleCredentialForm(username: string, password: string): void {
  const form = document.createElement('form');
  form.setAttribute('autocomplete', 'on');
  form.method = 'post';
  form.action = location.pathname + location.search;
  // Doit être visible au moment du submit pour déclencher l'invite iOS.
  form.style.cssText =
    'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,.45);padding:1.5rem;';

  const box = document.createElement('div');
  box.style.cssText =
    'background:#fff;border-radius:12px;padding:1.25rem;max-width:22rem;width:100%;' +
    'font-family:system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.2);';
  box.innerHTML =
    '<p style="margin:0 0 .75rem;font-weight:600;">Enregistrer le code de secours</p>' +
    '<p style="margin:0 0 1rem;font-size:.875rem;color:#555;">' +
    'Confirmez l\'enregistrement dans le coffre de votre appareil.</p>';

  const user = document.createElement('input');
  user.type = 'text';
  user.name = 'username';
  user.autocomplete = 'username';
  user.value = username;
  user.readOnly = true;
  user.style.cssText = 'width:100%;margin-bottom:.5rem;padding:.5rem;box-sizing:border-box;';

  const pass = document.createElement('input');
  pass.type = 'password';
  pass.name = 'password';
  // current-password : évite le générateur de mot de passe fort Apple.
  pass.autocomplete = 'current-password';
  pass.value = password;
  pass.readOnly = true;
  pass.style.cssText = 'width:100%;margin-bottom:1rem;padding:.5rem;box-sizing:border-box;';

  const btn = document.createElement('button');
  btn.type = 'submit';
  btn.textContent = 'Enregistrer';
  btn.style.cssText =
    'width:100%;padding:.75rem;border:0;border-radius:8px;background:#f97316;' +
    'color:#fff;font-weight:600;cursor:pointer;';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Plus tard';
  cancel.style.cssText =
    'width:100%;margin-top:.5rem;padding:.5rem;border:0;background:transparent;' +
    'color:#666;cursor:pointer;';

  box.appendChild(user);
  box.appendChild(pass);
  box.appendChild(btn);
  box.appendChild(cancel);
  form.appendChild(box);
  document.body.appendChild(form);

  const cleanup = () => form.remove();
  cancel.addEventListener('click', cleanup);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    try {
      history.pushState({}, '', location.href);
    } catch {
      /* ignore */
    }
    setTimeout(cleanup, 800);
  });
}

/** Construit l'URL de restauration pour un QR (secret dans le fragment). */
export function buildRestoreQrUrl(
  name: string,
  payload: RecoveryCodePayload,
  opts: { origin: string; hashRoute: boolean },
): string {
  const encoded = encodeCodePayload(payload);
  const path = `/${encodeURIComponent(name)}/restore`;
  if (opts.hashRoute) {
    // Hash routing : la route est déjà dans #/… — le secret va en query du hash.
    return `${opts.origin}/#${path}?c=${encoded}`;
  }
  return `${opts.origin}${path}#c=${encoded}`;
}

/** Utilitaire tests / debug. */
export function hexSecret(secret: Uint8Array): string {
  return bytesToHex(secret);
}

export function secretFromHex(hex: string): Uint8Array {
  return hexToBytes(hex.startsWith('0x') ? hex.slice(2) : hex);
}
