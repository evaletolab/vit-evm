import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { environment } from '../../environments/environment';
import {
  ContactProviderId,
  ImportedContact,
  importFromGoogle,
  importFromMicrosoft,
} from './contact-providers';
import { ContactCardPayload } from './contact-share';

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

  isMicrosoftPickerSupported(): boolean {
    return !!environment.microsoftClientId;
  }

  /**
   * Carnet distant (Google People / Microsoft Graph). Ces API ne renvoient que
   * nom / tel / e-mail : les contacts importés arrivent donc sans address Safe,
   * en statut `pending`, jusqu'à ce qu'une carte ViT soit scannée.
   */
  async importFromProvider(provider: ContactProviderId): Promise<ImportedContact[]> {
    if (provider === 'google') {
      if (!environment.googleClientId) throw new Error('Google non configuré (googleClientId).');
      return importFromGoogle(environment.googleClientId);
    }
    if (!environment.microsoftClientId) {
      throw new Error('Microsoft non configuré (microsoftClientId).');
    }
    return importFromMicrosoft(environment.microsoftClientId);
  }

  /**
   * Enregistre en masse des fiches sans address. Les doublons (même nom, ou
   * même tel/e-mail) sont ignorés pour rendre un ré-import idempotent.
   */
  importMany(owner: string, contacts: ImportedContact[], source: Contact['source'] = 'phone'): number {
    const existing = this.list(owner);
    const seen = new Set(
      existing.flatMap((c) => [
        c.name.toLowerCase(),
        ...(c.tel ? [c.tel] : []),
        ...(c.email ? [c.email.toLowerCase()] : []),
      ]),
    );

    let added = 0;
    for (const c of contacts) {
      const keys = [c.name.toLowerCase(), ...(c.tel ? [c.tel] : []), ...(c.email ? [c.email.toLowerCase()] : [])];
      if (keys.some((k) => seen.has(k))) continue;
      this.upsert(owner, {
        name: c.name,
        address: '',
        tel: c.tel,
        email: c.email,
        source,
        status: 'pending',
      });
      keys.forEach((k) => seen.add(k));
      added++;
    }
    return added;
  }

  /** Ajoute (ou met à jour) le contact reçu via une carte ViT partagée. */
  addFromCard(owner: string, card: ContactCardPayload): Contact {
    const existing = card.a ? this.findByAddress(owner, card.a) : undefined;
    return this.upsert(owner, {
      id: existing?.id,
      name: card.n,
      address: card.a || '',
      tel: card.t,
      email: card.e,
      note: existing?.note,
      source: 'manual',
      status: card.a ? 'confirmed' : 'pending',
    });
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
