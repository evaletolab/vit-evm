import { PasskeyCredential, WebAuthnAssertionLike, WebAuthnAttestationLike, WebAuthnSignature, PasskeyRegistrationOptions, PasskeyRequestOptions } from './core.types';

/**
 * WebAuthn Passkey API wrapper (browser context expected)
 * - Does NOT perform any Safe/on-chain logic
 */
export async function registerPasskey(options?: PasskeyRegistrationOptions): Promise<PasskeyCredential> {
  if (typeof navigator === 'undefined' || !('credentials' in navigator)) {
    throw new Error('WebAuthn not available in this environment');
  }

  const creationOptions: CredentialCreationOptions = (options ?? { publicKey: {} }) as unknown as CredentialCreationOptions;
  const cred = (await navigator.credentials.create(creationOptions)) as unknown as WebAuthnAttestationLike | null;
  if (!cred) {
    throw new Error('Passkey registration was cancelled or failed');
  }

  // For MVP scope, we return only the minimal info needed; publicKey extraction can be added later
  return {
    credentialId: bufferToBase64Url(cred.rawId),
  };
}

export async function authenticatePasskey(options: PasskeyRequestOptions): Promise<WebAuthnSignature> {
  if (typeof navigator === 'undefined' || !('credentials' in navigator)) {
    throw new Error('WebAuthn not available in this environment');
  }

  const requestOptions: CredentialRequestOptions = (options as unknown as CredentialRequestOptions);
  const cred = (await navigator.credentials.get(requestOptions)) as unknown as WebAuthnAssertionLike | null;
  if (!cred) {
    throw new Error('Passkey authentication was cancelled or failed');
  }

  return {
    credentialId: bufferToBase64Url(cred.rawId),
    clientDataJSON: bufferToBase64Url(cred.response.clientDataJSON),
    authenticatorData: bufferToBase64Url(cred.response.authenticatorData),
    signature: bufferToBase64Url(cred.response.signature),
    userHandle: cred.response.userHandle ? bufferToBase64Url(cred.response.userHandle) : null,
  };
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  const base64 = typeof btoa !== 'undefined' ? btoa(str) : Buffer.from(bytes).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

export type { PasskeyCredential, WebAuthnSignature };


