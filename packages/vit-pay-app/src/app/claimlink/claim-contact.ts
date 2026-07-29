/**
 * Contact payload embedded in claim-link URLs (fragment only — hashRoute).
 * Compact JSON → base64url to keep SMS/WhatsApp friendly.
 *
 * IMPORTANT: the on-chain `metaHash` is computed over the *encoded* string, so
 * the exact same string must travel in the URL. Never decode/re-encode a
 * payload before sharing it (see contactMetaHash).
 */
import { ethers } from 'ethers';
import { bytesToBase64Url, decodeJsonBase64Url } from '../shared/base64url';

export interface ClaimContactPayload {
  n: string;   // name
  t?: string;  // tel
  e?: string;  // email
}

export function encodeContactPayload(c: ClaimContactPayload): string {
  const name = c.n.trim();
  if (!name) throw new Error('Nom requis pour le contact joint');
  const obj: ClaimContactPayload = { n: name };
  if (c.t?.trim()) obj.t = c.t.trim();
  if (c.e?.trim()) obj.e = c.e.trim();
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

export function decodeContactPayload(raw: string): ClaimContactPayload | null {
  try {
    const parsed = decodeJsonBase64Url<ClaimContactPayload>(raw);
    if (!parsed?.n || typeof parsed.n !== 'string') return null;
    return {
      n: parsed.n.trim(),
      t: typeof parsed.t === 'string' ? parsed.t.trim() : undefined,
      e: typeof parsed.e === 'string' ? parsed.e.trim() : undefined,
    };
  } catch {
    return null;
  }
}

/** keccak256 of the exact UTF-8 bytes of the base64url payload (on-chain metaHash). */
export function contactMetaHash(encodedPayload: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(encodedPayload));
}
