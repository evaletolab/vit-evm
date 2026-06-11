import { Injectable } from '@angular/core';
import { StoredWallet } from './wallet.types';

const STORAGE_KEY = 'vit-wallet';

@Injectable({ providedIn: 'root' })
export class WalletStorageService {
  load(): StoredWallet | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!this.isStoredWallet(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  save(wallet: StoredWallet): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wallet));
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  private isStoredWallet(value: unknown): value is StoredWallet {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
      v['version'] === 1 &&
      typeof v['accountAddress'] === 'string' &&
      typeof v['chainId'] === 'number' &&
      typeof v['credentialId'] === 'string' &&
      typeof v['webauthnPublicKey'] === 'object' &&
      v['webauthnPublicKey'] !== null &&
      typeof (v['webauthnPublicKey'] as Record<string, unknown>)['x'] === 'string' &&
      typeof (v['webauthnPublicKey'] as Record<string, unknown>)['y'] === 'string' &&
      Array.isArray(v['owners']) &&
      typeof v['recoveryEnabled'] === 'boolean' &&
      typeof v['zchfTokenAddress'] === 'string'
    );
  }
}
