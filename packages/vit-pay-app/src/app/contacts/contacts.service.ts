import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { environment } from '../../environments/environment';

export interface Contact {
  id: string;
  name: string;
  /** Empty string while pending claim (no Safe address yet). */
  address: string;
  note?: string;
  tel?: string;
  email?: string;
  source: 'manual' | 'phone' | 'claim' | 'pending';
  status?: 'confirmed' | 'pending' | 'unconfirmed';
  claimId?: string;
  addedAt: number;
}

const STORAGE_PREFIX = 'vit-contacts:';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private cache = new Map<string, Contact[]>();

  list(owner: string): Contact[] {
    const key = this.key(owner);
    const cached = this.cache.get(key);
    if (cached) return cached;
    let parsed: Contact[] = [];
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : [];
      if (Array.isArray(value)) parsed = value as Contact[];
    } catch {
      parsed = [];
    }
    this.cache.set(key, parsed);
    return parsed;
  }

  upsert(owner: string, draft: Omit<Contact, 'id' | 'addedAt'> & { id?: string }): Contact {
    const name = draft.name.trim();
    const address = draft.address?.trim()
      ? ethers.getAddress(draft.address)
      : '';
    if (!name) throw new Error('Nom requis');

    const list = [...this.list(owner)];
    if (address) {
      const dup = list.find(
        (c) => c.id !== draft.id && c.address && c.address.toLowerCase() === address.toLowerCase(),
      );
      if (dup) throw new Error(`Address déjà associée à « ${dup.name} »`);
    }

    const tel = draft.tel?.trim() || undefined;
    const email = draft.email?.trim() || undefined;

    if (draft.id) {
      const idx = list.findIndex((c) => c.id === draft.id);
      if (idx < 0) throw new Error('Contact introuvable');
      const updated: Contact = {
        ...list[idx],
        name,
        address,
        note: draft.note?.trim() || undefined,
        tel,
        email,
        source: draft.source,
        status: draft.status ?? list[idx].status,
        claimId: draft.claimId ?? list[idx].claimId,
      };
      list[idx] = updated;
      this.persist(owner, list);
      return updated;
    }

    const created: Contact = {
      id: crypto.randomUUID(),
      name,
      address,
      note: draft.note?.trim() || undefined,
      tel,
      email,
      source: draft.source,
      status: draft.status ?? (address ? 'confirmed' : 'pending'),
      claimId: draft.claimId,
      addedAt: Date.now(),
    };
    list.unshift(created);
    this.persist(owner, list);
    return created;
  }

  /** Create/update pending contact when sending a claim without known Safe address. */
  upsertPending(
    owner: string,
    draft: { name: string; tel?: string; email?: string; claimId: string; note?: string },
  ): Contact {
    const list = this.list(owner);
    const existing = list.find((c) => c.claimId === draft.claimId);
    return this.upsert(owner, {
      id: existing?.id,
      name: draft.name,
      address: '',
      tel: draft.tel,
      email: draft.email,
      note: draft.note,
      source: 'pending',
      status: 'pending',
      claimId: draft.claimId,
    });
  }

  /** Resolve pending → confirmed when claim is redeemed (bilateral). */
  confirmPendingWithAddress(
    owner: string,
    claimId: string,
    address: string,
    name?: string,
  ): Contact | null {
    const list = this.list(owner);
    const existing = list.find((c) => c.claimId === claimId);
    if (!existing) {
      if (!name) return null;
      return this.upsert(owner, {
        name,
        address,
        source: 'claim',
        status: 'unconfirmed',
        claimId,
      });
    }
    return this.upsert(owner, {
      id: existing.id,
      name: name || existing.name,
      address,
      tel: existing.tel,
      email: existing.email,
      note: existing.note,
      source: 'claim',
      status: 'unconfirmed',
      claimId,
    });
  }

  pending(owner: string): Contact[] {
    return this.list(owner).filter((c) => c.status === 'pending');
  }

  remove(owner: string, id: string): void {
    const list = this.list(owner).filter((c) => c.id !== id);
    this.persist(owner, list);
  }

  findByAddress(owner: string, address: string): Contact | undefined {
    const a = address.toLowerCase();
    return this.list(owner).find((c) => c.address && c.address.toLowerCase() === a);
  }

  /**
   * Best-effort import depuis le carnet d'adresses du device (Android Chrome).
   * Retourne `null` si l'API n'existe pas (iOS, desktop sans support).
   * L'utilisateur devra coller l'address manuellement — l'API native n'expose
   * aucune crypto-address, seulement nom/tel/email.
   */
  async pickFromPhone(): Promise<Array<{ name: string; hint?: string; tel?: string; email?: string }> | null> {
    const picked = await this.selectFromPhone(true);
    if (!picked) return null;
    return picked.map((c) => ({
      name: (c.name?.[0] || 'Sans nom').trim(),
      hint: c.email?.[0] || c.tel?.[0],
      tel: c.tel?.[0],
      email: c.email?.[0],
    }));
  }

  /** Single-contact pick for « C'est moi » profile bootstrap (V1 Contact Picker). */
  async pickSelfFromPhone(): Promise<{ name: string; tel?: string; email?: string } | null> {
    const picked = await this.selectFromPhone(false);
    const c = picked?.[0];
    if (!c) return null;
    return {
      name: (c.name?.[0] || '').trim(),
      tel: c.tel?.[0],
      email: c.email?.[0],
    };
  }

  private async selectFromPhone(
    multiple: boolean,
  ): Promise<Array<{ name?: string[]; email?: string[]; tel?: string[] }> | null> {
    const navAny = navigator as any;
    if (!this.isPhonePickerSupported()) return null;
    try {
      const supported: string[] = await navAny.contacts.getProperties();
      const props = ['name', 'email', 'tel'].filter((p) => supported.includes(p));
      if (!props.length) return null;
      return await navAny.contacts.select(props, { multiple });
    } catch {
      // user cancelled, or the picker is not allowed in this context
      return null;
    }
  }

  isPhonePickerSupported(): boolean {
    const navAny = navigator as any;
    return !!(navAny.contacts && typeof navAny.contacts.select === 'function');
  }

  isGooglePickerSupported(): boolean {
    return !!environment.googleClientId && typeof (window as any).google !== 'undefined';
  }

  /**
   * OAuth Google (People API readonly) → liste des connexions de l'utilisateur.
   * Ne donne que des noms (+ tel/email en hint). Aucune crypto-address.
   * Requires `googleClientId` configured et `<script src="…/gsi/client">` chargé.
   */
  async pickFromGoogle(): Promise<Array<{ name: string; hint?: string }> | null> {
    const win = window as any;
    if (!environment.googleClientId || !win.google?.accounts?.oauth2) return null;

    const accessToken = await new Promise<string | null>((resolve) => {
      const client = win.google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: 'https://www.googleapis.com/auth/contacts.readonly',
        callback: (resp: { access_token?: string; error?: string }) => {
          resolve(resp.access_token || null);
        },
      });
      client.requestAccessToken({ prompt: '' });
    });

    if (!accessToken) return null;

    const url = 'https://people.googleapis.com/v1/people/me/connections' +
      '?personFields=names,emailAddresses,phoneNumbers&pageSize=200';
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const data = await res.json() as {
      connections?: Array<{
        names?: Array<{ displayName?: string }>;
        emailAddresses?: Array<{ value?: string }>;
        phoneNumbers?: Array<{ value?: string }>;
      }>;
    };
    const conns = data.connections || [];
    const out: Array<{ name: string; hint?: string }> = [];
    for (const c of conns) {
      const name = c.names?.[0]?.displayName?.trim();
      if (!name) continue;
      const hint = c.emailAddresses?.[0]?.value || c.phoneNumbers?.[0]?.value;
      out.push({ name, hint });
    }
    return out;
  }

  private key(owner: string): string {
    return STORAGE_PREFIX + owner.toLowerCase();
  }

  private persist(owner: string, list: Contact[]): void {
    const key = this.key(owner);
    this.cache.set(key, list);
    localStorage.setItem(key, JSON.stringify(list));
  }
}
