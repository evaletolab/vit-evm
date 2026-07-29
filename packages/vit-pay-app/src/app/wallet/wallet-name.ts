/**
 * Identité locale <nom>@vit.app (V1 — pas de registre on-chain).
 * Sert à séparer les instances et à scoper le coffre (username du credential).
 */

/** Routes plates existantes + chemins vault/restore — interdits comme nom. */
export const RESERVED_WALLET_NAMES = new Set([
  'account',
  'buy',
  'claim',
  'contacts',
  'devices',
  'iban',
  'links',
  'recovery',
  'request',
  'restore',
  'sent',
  'txs',
  'vault',
  'wallet',
  'assets',
  'favicon.ico',
]);

export const WALLET_NAME_MIN = 3;
export const WALLET_NAME_MAX = 20;
export const WALLET_NAME_DOMAIN = 'vit.app';

const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeWalletName(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidWalletName(raw: string): boolean {
  const name = normalizeWalletName(raw);
  if (name.length < WALLET_NAME_MIN || name.length > WALLET_NAME_MAX) return false;
  if (!NAME_RE.test(name)) return false;
  if (RESERVED_WALLET_NAMES.has(name)) return false;
  return true;
}

export function validateWalletName(raw: string): string {
  const name = normalizeWalletName(raw);
  if (name.length < WALLET_NAME_MIN) {
    throw new Error(`Le nom doit faire au moins ${WALLET_NAME_MIN} caractères`);
  }
  if (name.length > WALLET_NAME_MAX) {
    throw new Error(`Le nom doit faire au plus ${WALLET_NAME_MAX} caractères`);
  }
  if (!NAME_RE.test(name)) {
    throw new Error('Utilisez uniquement a-z, 0-9 et des tirets (pas en début/fin)');
  }
  if (RESERVED_WALLET_NAMES.has(name)) {
    throw new Error('Ce nom est reserve (mot interdit)');
  }
  return name;
}

export function walletHandle(name: string, domain = WALLET_NAME_DOMAIN): string {
  return `${normalizeWalletName(name)}@${domain}`;
}
