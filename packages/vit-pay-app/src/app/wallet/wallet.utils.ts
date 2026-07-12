import { ethers } from 'ethers';

export const ZCHF_DECIMALS = 18;

export function parseZchfAmount(input: string): bigint {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '-') {
    throw new Error('Amount is empty');
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid amount format: "${input}"`);
  }
  const parsed = ethers.parseUnits(trimmed, ZCHF_DECIMALS);
  if (parsed <= 0n) {
    throw new Error('Amount must be positive');
  }
  return parsed;
}

export function formatZchfAmount(amount: bigint): string {
  return ethers.formatUnits(amount, ZCHF_DECIMALS);
}

export function isValidEvmAddress(value: string): boolean {
  return ethers.isAddress(value);
}

export function shortAddress(address: string, prefix = 6, suffix = 4): string {
  if (!isValidEvmAddress(address)) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
}

export function mapPaymasterError(err: unknown): string {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  if (message.includes('policy')) {
    return 'Aucune policy de subvention active pour cette transaction.';
  }
  if (message.includes('budget') || message.includes('quota')) {
    return 'Budget paymaster insuffisant. Réessayer plus tard.';
  }
  if (message.includes('reject') || message.includes('denied')) {
    return 'Transaction rejetée par le paymaster.';
  }
  return 'Transaction non sponsorisée.';
}

/** True when the browser exposes WebAuthn credentials API. */
export function isWebAuthnAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials
  );
}

/**
 * Maps WebAuthn / passkey errors to short French messages for end users.
 * Avoids raw DOMException names (NotAllowedError, etc.).
 */
export function mapPasskeyError(err: unknown): string {
  if (!isWebAuthnAvailable()) {
    return 'La sécurité biométrique n\'est pas disponible sur cet appareil ou ce navigateur. Essayez un téléphone récent (Face ID, empreinte) ou un autre navigateur.';
  }

  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name: unknown }).name)
      : '';
  const message = err instanceof Error ? err.message : String(err ?? '');
  const lower = `${name} ${message}`.toLowerCase();

  if (
    lower.includes('notsupported') ||
    lower.includes('not supported') ||
    lower.includes('webauthn is not available') ||
    lower.includes('webauthn indisponible') ||
    lower.includes('publickeycredential')
  ) {
    return 'La sécurité biométrique n\'est pas prise en charge sur cet appareil. Utilisez un téléphone avec Face ID, empreinte digitale ou Windows Hello.';
  }

  if (
    lower.includes('invalidstate') ||
    lower.includes('already exists') ||
    lower.includes('credentialexclusion')
  ) {
    return 'Une clé d\'accès existe déjà sur cet appareil. Essayez de déverrouiller votre compte ou utilisez un autre appareil.';
  }

  if (
    lower.includes('notallowed') ||
    lower.includes('abort') ||
    lower.includes('cancelled') ||
    lower.includes('canceled') ||
    lower.includes('timed out') ||
    lower.includes('timeout')
  ) {
    return 'Authentification annulée ou expirée. Réessayez avec Face ID, Touch ID ou le code de votre appareil.';
  }

  if (
    lower.includes('security') ||
    lower.includes('insecure') ||
    lower.includes('https')
  ) {
    return 'La sécurité biométrique nécessite une connexion sécurisée (HTTPS).';
  }

  if (
    lower.includes('failed to generate passkey') ||
    lower.includes('received null')
  ) {
    return 'Impossible de créer la clé d\'accès. Vérifiez que Face ID / empreinte est activé sur cet appareil.';
  }

  // Fallback: never surface raw technical exception text to end users.
  return 'Impossible d\'utiliser la biométrie pour le moment. Vérifiez que Face ID ou l\'empreinte est activé, puis réessayez.';
}
