/**
 * Carte de visite ViT partageable par URL / QR.
 *
 * Le payload voyage dans `?add=` — en hashRoute il est donc dans le fragment
 * et n'atteint jamais le serveur, comme le contact des claim links.
 */
import { decodeJsonBase64Url, encodeJsonBase64Url } from '../shared/base64url';

export interface ContactCardPayload {
  n: string;   // nom affiché
  a?: string;  // adresse Safe (0x…)
  t?: string;  // téléphone
  e?: string;  // e-mail
  w?: string;  // nom local <nom>@3vit.ch
}

function clean(value?: string): string | undefined {
  const v = value?.trim();
  return v ? v : undefined;
}

export function encodeContactCard(card: ContactCardPayload): string {
  const name = card.n.trim();
  if (!name) throw new Error('Nom requis pour partager un contact');
  const obj: ContactCardPayload = { n: name };
  const a = clean(card.a);
  const t = clean(card.t);
  const e = clean(card.e);
  const w = clean(card.w);
  if (a) obj.a = a;
  if (t) obj.t = t;
  if (e) obj.e = e;
  if (w) obj.w = w;
  return encodeJsonBase64Url(obj);
}

export function decodeContactCard(raw: string): ContactCardPayload | null {
  try {
    const parsed = decodeJsonBase64Url<ContactCardPayload>(raw);
    if (!parsed?.n || typeof parsed.n !== 'string') return null;
    const name = parsed.n.trim();
    if (!name) return null;
    return {
      n: name,
      a: typeof parsed.a === 'string' ? clean(parsed.a) : undefined,
      t: typeof parsed.t === 'string' ? clean(parsed.t) : undefined,
      e: typeof parsed.e === 'string' ? clean(parsed.e) : undefined,
      w: typeof parsed.w === 'string' ? clean(parsed.w) : undefined,
    };
  } catch {
    return null;
  }
}

/** Racine de l'app en respectant `<base href>` (ex. /vit-evm/ sur GH Pages). */
function appRoot(): string {
  return new URL(
    document.querySelector('base')?.getAttribute('href') || '/',
    window.location.origin,
  ).href.replace(/\/$/, '');
}

/** URL à encoder dans le QR : ouvre /contacts avec la carte pré-remplie. */
export function buildContactShareUrl(encoded: string, hashRoute: boolean): string {
  const path = hashRoute ? '/#/contacts' : '/contacts';
  return `${appRoot()}${path}?add=${encoded}`;
}

/**
 * Extrait le payload d'une valeur scannée : accepte l'URL complète comme le
 * payload nu, ce qui rend le scan tolérant aux QR régénérés à la main.
 */
export function extractCardParam(scanned: string): string | null {
  const value = scanned.trim();
  if (!value) return null;
  const match = value.match(/[?&]add=([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
