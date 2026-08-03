import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
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
   * Recherche pour fusion depuis une carte partagée.
   * Discriminant fort = adresse publique :
   * - avec address → match UNIQUEMENT sur cette address (jamais email/tél) ;
   * - sans address → match email/tél seulement parmi les fiches encore sans address.
   * Ainsi on n'écrase jamais « ma » fiche (autre address) quand on scanne quelqu'un.
   */
  findMatch(
    owner: string,
    draft: { address?: string; email?: string; tel?: string },
  ): Contact | undefined {
    const list = this.list(owner);
    const address = draft.address?.trim();
    if (address) {
      const a = address.toLowerCase();
      return list.find((c) => c.address && c.address.toLowerCase() === a);
    }

    const email = draft.email?.trim().toLowerCase();
    if (email) {
      const byEmail = list.find(
        (c) => !c.address && c.email?.toLowerCase() === email,
      );
      if (byEmail) return byEmail;
    }

    const tel = draft.tel?.trim();
    if (tel) {
      const norm = (v: string) => v.replace(/[\s().-]/g, '');
      const t = norm(tel);
      const byTel = list.find((c) => !c.address && c.tel && norm(c.tel) === t);
      if (byTel) return byTel;
    }
    return undefined;
  }

  /**
   * Ajoute / met à jour un contact issu d'un lien partagé (`c=` / carte).
   * L'adresse publique est le discriminant fort — pas de fusion cross-identity
   * via email/tél si une address est déjà présente.
   */
  upsertFromShare(
    owner: string,
    draft: { name: string; address?: string; email?: string; tel?: string },
  ): Contact {
    const draftAddress = draft.address?.trim()
      ? ethers.getAddress(draft.address)
      : '';

    // Ne jamais enregistrer sa propre Safe comme contact « autre ».
    if (draftAddress && draftAddress.toLowerCase() === owner.toLowerCase()) {
      throw new Error('Cette carte est la tienne.');
    }

    const existing = this.findMatch(owner, {
      address: draftAddress || undefined,
      email: draft.email,
      tel: draft.tel,
    });

    // Garde-fou : si une fiche existe déjà avec une address différente, on crée
    // une nouvelle entrée (ne devrait pas arriver via findMatch, mais évite
    // toute régression).
    if (
      existing?.address &&
      draftAddress &&
      existing.address.toLowerCase() !== draftAddress.toLowerCase()
    ) {
      return this.upsert(owner, {
        name: draft.name.trim() || 'Contact',
        address: draftAddress,
        email: draft.email?.trim() || undefined,
        tel: draft.tel?.trim() || undefined,
        source: 'manual',
        status: 'confirmed',
      });
    }

    const address = draftAddress || existing?.address || '';
    const email = draft.email?.trim() || existing?.email;
    const tel = draft.tel?.trim() || existing?.tel;
    const name = draft.name.trim() || existing?.name || 'Contact';
    const source =
      existing && existing.source !== 'pending' ? existing.source : 'manual';

    return this.upsert(owner, {
      id: existing?.id,
      name,
      address,
      email,
      tel,
      note: existing?.note,
      source,
      status: address ? 'confirmed' : existing?.status ?? 'pending',
      claimId: existing?.claimId,
    });
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

  private key(owner: string): string {
    return STORAGE_PREFIX + owner.toLowerCase();
  }

  private persist(owner: string, list: Contact[]): void {
    const key = this.key(owner);
    this.cache.set(key, list);
    localStorage.setItem(key, JSON.stringify(list));
  }
}
