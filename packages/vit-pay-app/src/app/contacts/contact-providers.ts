/**
 * Import de carnets d'adresses distants (Google People, Microsoft Graph).
 *
 * 100 % client : aucun secret n'est embarqué. Google passe par le token client
 * GSI déjà chargé dans `index.html` ; Microsoft par un flux OAuth2 *authorization
 * code + PKCE* dans une popup, seul flux encore recommandé pour une SPA.
 *
 * Les deux fournisseurs ne rendent que nom / téléphone / e-mail : jamais
 * d'adresse Safe. Le contact reste donc « sans adresse » tant que l'utilisateur
 * n'en colle pas une ou ne scanne pas la carte ViT du destinataire.
 */
import { bytesToBase64Url } from '../shared/base64url';

export interface ImportedContact {
  name: string;
  tel?: string;
  email?: string;
}

export type ContactProviderId = 'google' | 'microsoft';

const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/contacts.readonly';
const GOOGLE_PEOPLE_URL =
  'https://people.googleapis.com/v1/people/me/connections' +
  '?personFields=names,emailAddresses,phoneNumbers&pageSize=500';

const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_SCOPE = 'https://graph.microsoft.com/Contacts.Read';
const MS_GRAPH_URL =
  'https://graph.microsoft.com/v1.0/me/contacts' +
  '?$select=displayName,emailAddresses,mobilePhone,homePhones&$top=500';

/** Popup OAuth : la page de retour statique renvoie le code par postMessage. */
const CALLBACK_FILE = 'oauth-callback.html';
const POPUP_FEATURES = 'width=520,height=640,menubar=no,toolbar=no';

function appRoot(): string {
  return new URL(
    document.querySelector('base')?.getAttribute('href') || '/',
    window.location.origin,
  ).href.replace(/\/$/, '');
}

function redirectUri(): string {
  return `${appRoot()}/${CALLBACK_FILE}`;
}

function randomUrlSafe(byteLength: number): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

// --- Google -----------------------------------------------------------------

interface GsiTokenResponse {
  access_token?: string;
  error?: string;
}

/** Jeton d'accès Google via GSI (flux implicite, pas de secret client). */
async function googleAccessToken(clientId: string): Promise<string | null> {
  const oauth2 = (window as unknown as {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (resp: GsiTokenResponse) => void;
          }): { requestAccessToken(opts?: { prompt?: string }): void };
        };
      };
    };
  }).google?.accounts?.oauth2;
  if (!oauth2) return null;

  return new Promise<string | null>((resolve) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPE,
      callback: (resp) => resolve(resp.access_token || null),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

interface GooglePerson {
  names?: Array<{ displayName?: string }>;
  emailAddresses?: Array<{ value?: string }>;
  phoneNumbers?: Array<{ value?: string }>;
}

export async function importFromGoogle(clientId: string): Promise<ImportedContact[]> {
  const token = await googleAccessToken(clientId);
  if (!token) throw new Error('Connexion Google annulée.');

  const res = await fetch(GOOGLE_PEOPLE_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Google People a répondu ${res.status}.`);

  const data = (await res.json()) as { connections?: GooglePerson[] };
  return normalize(
    (data.connections || []).map((p) => ({
      name: p.names?.[0]?.displayName || '',
      tel: p.phoneNumbers?.[0]?.value,
      email: p.emailAddresses?.[0]?.value,
    })),
  );
}

// --- Microsoft --------------------------------------------------------------

interface CallbackMessage {
  source?: string;
  code?: string;
  state?: string;
  error?: string;
}

/** Ouvre la popup et attend le `postMessage` de `oauth-callback.html`. */
function awaitAuthCode(url: string, expectedState: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const popup = window.open(url, 'vit-oauth', POPUP_FEATURES);
    if (!popup) {
      reject(new Error('Popup bloquée par le navigateur.'));
      return;
    }

    let settled = false;
    const finish = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(closedTimer);
      try {
        popup.close();
      } catch {
        // la popup s'est déjà fermée toute seule
      }
      fn();
    };

    const onMessage = (event: MessageEvent<CallbackMessage>): void => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'vit-oauth') return;
      if (data.error) {
        finish(() => reject(new Error(`Microsoft a refusé la connexion (${data.error}).`)));
        return;
      }
      if (data.state !== expectedState) {
        finish(() => reject(new Error('Réponse OAuth inattendue (state invalide).')));
        return;
      }
      if (!data.code) {
        finish(() => reject(new Error('Aucun code reçu de Microsoft.')));
        return;
      }
      const code = data.code;
      finish(() => resolve(code));
    };

    const closedTimer = setInterval(() => {
      if (popup.closed) finish(() => reject(new Error('Connexion Microsoft annulée.')));
    }, 500);

    window.addEventListener('message', onMessage);
  });
}

async function microsoftAccessToken(clientId: string): Promise<string> {
  const verifier = randomUrlSafe(48);
  const state = randomUrlSafe(16);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    response_mode: 'query',
    scope: MS_SCOPE,
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
  });

  const code = await awaitAuthCode(`${MS_AUTHORIZE_URL}?${params.toString()}`, state);

  // Client public : l'échange se fait sans secret, PKCE fait foi.
  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      scope: MS_SCOPE,
      code_verifier: verifier,
    }).toString(),
  });
  if (!res.ok) throw new Error(`Échange du code Microsoft refusé (${res.status}).`);

  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) throw new Error('Microsoft n\'a pas renvoyé de jeton.');
  return token.access_token;
}

interface GraphContact {
  displayName?: string;
  emailAddresses?: Array<{ address?: string }>;
  mobilePhone?: string;
  homePhones?: string[];
}

export async function importFromMicrosoft(clientId: string): Promise<ImportedContact[]> {
  const token = await microsoftAccessToken(clientId);

  const res = await fetch(MS_GRAPH_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Microsoft Graph a répondu ${res.status}.`);

  const data = (await res.json()) as { value?: GraphContact[] };
  return normalize(
    (data.value || []).map((c) => ({
      name: c.displayName || '',
      tel: c.mobilePhone || c.homePhones?.[0],
      email: c.emailAddresses?.[0]?.address,
    })),
  );
}

// --- Commun -----------------------------------------------------------------

/** Écarte les fiches sans nom et trie par nom pour une liste stable. */
function normalize(raw: ImportedContact[]): ImportedContact[] {
  return raw
    .map((c) => ({
      name: c.name.trim(),
      tel: c.tel?.trim() || undefined,
      email: c.email?.trim() || undefined,
    }))
    .filter((c) => !!c.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}
