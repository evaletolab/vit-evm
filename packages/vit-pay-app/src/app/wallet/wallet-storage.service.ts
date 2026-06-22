import { Injectable } from '@angular/core';
import { StoredWallet } from './wallet.types';

const LEGACY_KEY = 'vit-wallet';
const STORAGE_KEY = 'vit-wallet-v2';
const IDB_NAME = 'vit-keystore';
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'wallet';

type EncryptedBlob = {
  v: 2;
  iv: string;
  ct: string;
};

function bytesToHex(arr: Uint8Array): string {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet<T>(db: IDBDatabase, id: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(id);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function idbPut(db: IDBDatabase, id: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

@Injectable({ providedIn: 'root' })
export class WalletStorageService {
  private key: CryptoKey | null = null;
  private cache: StoredWallet | null = null;
  private ready = false;

  /**
   * Decrypts the persisted wallet (if any) and populates the in-memory cache.
   * Must be called once at app bootstrap (APP_INITIALIZER) before any sync
   * `load()` is invoked. Migrates legacy plaintext blob to the encrypted v2
   * format and wipes the old key.
   */
  async init(): Promise<void> {
    if (this.ready) return;
    try {
      const db = await openDb();
      let key = await idbGet<CryptoKey>(db, IDB_KEY_ID);
      if (!key) {
        key = await crypto.subtle.generateKey(
          { name: 'AES-GCM', length: 256 },
          false, // non-extractable — XSS can call decrypt(), can't exfiltrate raw key
          ['encrypt', 'decrypt'],
        );
        await idbPut(db, IDB_KEY_ID, key);
      }
      this.key = key;
      db.close();

      const encrypted = this.readEncrypted();
      if (encrypted) {
        const json = await this.decrypt(encrypted);
        if (json && this.isStoredWallet(json)) this.cache = json;
      } else {
        // Migration : legacy plaintext blob (audit P0-2 pré-fix).
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          try {
            const parsed = JSON.parse(legacy);
            if (this.isStoredWallet(parsed)) {
              this.cache = parsed;
              await this.persist(parsed);
              localStorage.removeItem(LEGACY_KEY);
            }
          } catch {
            // legacy corrompu — on l'ignore et on laisse l'user récréer
          }
        }
      }
    } catch {
      // IDB ou WebCrypto indisponibles (mode privé restrictif, vieux browser).
      // On bascule sur localStorage plaintext en dernier recours pour ne pas
      // bricker l'app — le stockage est moins sûr mais reste fonctionnel.
      try {
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          if (this.isStoredWallet(parsed)) this.cache = parsed;
        }
      } catch {
        this.cache = null;
      }
    }
    this.ready = true;
  }

  load(): StoredWallet | null {
    return this.cache;
  }

  save(wallet: StoredWallet): void {
    this.cache = wallet;
    // fire-and-forget; sync API préservée pour ne pas casser les call sites.
    void this.persist(wallet);
  }

  clear(): void {
    this.cache = null;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }

  private async persist(wallet: StoredWallet): Promise<void> {
    if (!this.key) {
      // Fallback dégradé : pas de clé IDB → on stocke en clair pour ne pas
      // perdre le wallet (acceptable car la situation est exceptionnelle).
      localStorage.setItem(LEGACY_KEY, JSON.stringify(wallet));
      return;
    }
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = new TextEncoder().encode(JSON.stringify(wallet));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, plaintext);
      const blob: EncryptedBlob = {
        v: 2,
        iv: bytesToHex(iv),
        ct: bytesToHex(new Uint8Array(ct)),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(wallet));
    }
  }

  private readEncrypted(): EncryptedBlob | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === 2 && typeof parsed.iv === 'string' && typeof parsed.ct === 'string') {
        return parsed as EncryptedBlob;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private async decrypt(blob: EncryptedBlob): Promise<unknown> {
    if (!this.key) return null;
    try {
      const iv = hexToBytes(blob.iv);
      const ct = hexToBytes(blob.ct);
      const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key, ct);
      return JSON.parse(new TextDecoder().decode(pt));
    } catch {
      return null;
    }
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
