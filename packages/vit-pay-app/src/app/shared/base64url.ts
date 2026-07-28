/**
 * base64url helpers (RFC 4648 §5) — URL/QR safe, no padding.
 * Shared by the backup kit, the claim-link contact payload and the request links.
 */

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlToBytes(value: string): Uint8Array {
  const s = value.trim();
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** UTF-8 safe (accents, emoji) — never use escape/unescape here. */
export function encodeJsonBase64Url(value: unknown): string {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

export function decodeJsonBase64Url<T>(encoded: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(encoded))) as T;
}
