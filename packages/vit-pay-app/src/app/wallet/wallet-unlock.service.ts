import { Injectable } from '@angular/core';
import { WalletStorageService } from './wallet-storage.service';
import { hexStringToUint8Array } from '../../utils';
import { mapPasskeyError } from './wallet.utils';

const SESSION_KEY = 'vit-session-unlocked';

/**
 * Session unlock via WebAuthn assertion. Required when a wallet blob exists.
 * Claim deep-links without a local wallet skip this gate (handled in AppComponent).
 */
@Injectable({ providedIn: 'root' })
export class WalletUnlockService {
  constructor(private storage: WalletStorageService) {}

  isUnlocked(): boolean {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  }

  needsUnlock(): boolean {
    return this.storage.load() != null && !this.isUnlocked();
  }

  markUnlocked(): void {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* private mode */ }
  }

  lock(): void {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  async unlock(): Promise<void> {
    const stored = this.storage.load();
    if (!stored) {
      this.markUnlocked();
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.credentials) {
      throw new Error('WebAuthn is not available in this browser');
    }
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            {
              type: 'public-key',
              id: hexStringToUint8Array(stored.credentialId),
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (!assertion) throw new Error('Authentication cancelled');
      this.markUnlocked();
    } catch (err) {
      throw new Error(mapPasskeyError(err));
    }
  }
}
