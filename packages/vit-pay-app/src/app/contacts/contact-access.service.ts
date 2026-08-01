/**
 * Accès aux carnets distants (Google / Microsoft).
 *
 * L'autorisation est accordée une fois depuis `/contacts/access`, puis
 * l'annuaire est mis en cache localement. La recherche d'un destinataire s'en
 * sert **implicitement** : aucun aller-retour OAuth pendant la frappe.
 *
 * Le cache reste en clair dans localStorage, comme le carnet lui-même — c'est
 * de la donnée personnelle (noms, tels, e-mails), à chiffrer avec le reste du
 * stockage (cf. audit P0-2).
 */
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  ContactProviderId,
  ImportedContact,
  importFromGoogle,
  importFromMicrosoft,
} from './contact-providers';

export interface ProviderState {
  id: ContactProviderId;
  label: string;
  /** Client ID renseigné dans l'environnement. */
  configured: boolean;
  connected: boolean;
  syncedAt?: number;
  count: number;
}

export interface DirectoryMatch extends ImportedContact {
  provider: ContactProviderId;
}

interface StoredAccess {
  syncedAt: number;
  contacts: ImportedContact[];
}

type AccessMap = Partial<Record<ContactProviderId, StoredAccess>>;

const STORAGE_PREFIX = 'vit-contact-access:';

const PROVIDER_LABELS: Record<ContactProviderId, string> = {
  google: 'Google Contacts',
  microsoft: 'Outlook · Microsoft 365',
};

@Injectable({ providedIn: 'root' })
export class ContactAccessService {
  private cache = new Map<string, AccessMap>();

  clientId(provider: ContactProviderId): string {
    return provider === 'google' ? environment.googleClientId : environment.microsoftClientId;
  }

  isConfigured(provider: ContactProviderId): boolean {
    return !!this.clientId(provider);
  }

  states(owner: string): ProviderState[] {
    const map = this.load(owner);
    return (Object.keys(PROVIDER_LABELS) as ContactProviderId[]).map((id) => ({
      id,
      label: PROVIDER_LABELS[id],
      configured: this.isConfigured(id),
      connected: !!map[id],
      syncedAt: map[id]?.syncedAt,
      count: map[id]?.contacts.length ?? 0,
    }));
  }

  /** Au moins un carnet distant actif — pilote l'icône d'état. */
  hasAnyConnected(owner: string): boolean {
    const map = this.load(owner);
    return Object.keys(map).length > 0;
  }

  connectedProviders(owner: string): ContactProviderId[] {
    return Object.keys(this.load(owner)) as ContactProviderId[];
  }

  /** OAuth puis mise en cache de l'annuaire. Retourne le nombre de fiches. */
  async connect(owner: string, provider: ContactProviderId): Promise<number> {
    const clientId = this.clientId(provider);
    if (!clientId) throw new Error(`${PROVIDER_LABELS[provider]} n'est pas configuré.`);

    const contacts =
      provider === 'google'
        ? await importFromGoogle(clientId)
        : await importFromMicrosoft(clientId);

    const map = { ...this.load(owner) };
    map[provider] = { syncedAt: Date.now(), contacts };
    this.persist(owner, map);
    return contacts.length;
  }

  disconnect(owner: string, provider: ContactProviderId): void {
    const map = { ...this.load(owner) };
    delete map[provider];
    this.persist(owner, map);
  }

  /** Annuaire complet, tous fournisseurs confondus. */
  directory(owner: string): DirectoryMatch[] {
    const map = this.load(owner);
    const out: DirectoryMatch[] = [];
    for (const id of Object.keys(map) as ContactProviderId[]) {
      for (const c of map[id]!.contacts) out.push({ ...c, provider: id });
    }
    return out;
  }

  /**
   * Recherche implicite dans les carnets distants. Sans requête d'au moins
   * deux caractères on ne retourne rien : inutile de dérouler 500 fiches.
   */
  search(owner: string, query: string, limit = 6): DirectoryMatch[] {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const scored: Array<{ match: DirectoryMatch; score: number }> = [];
    for (const c of this.directory(owner)) {
      const name = c.name.toLowerCase();
      const email = c.email?.toLowerCase() ?? '';
      const tel = c.tel?.replace(/[\s().-]/g, '') ?? '';
      // Un début de nom passe avant une correspondance au milieu de la chaîne.
      let score = -1;
      if (name.startsWith(q)) score = 0;
      else if (name.includes(q)) score = 1;
      else if (email.startsWith(q)) score = 2;
      else if (email.includes(q) || tel.includes(q)) score = 3;
      if (score >= 0) scored.push({ match: c, score });
    }

    return scored
      .sort((a, b) => a.score - b.score || a.match.name.localeCompare(b.match.name, 'fr'))
      .slice(0, limit)
      .map((s) => s.match);
  }

  private load(owner: string): AccessMap {
    const key = this.key(owner);
    const cached = this.cache.get(key);
    if (cached) return cached;
    let parsed: AccessMap = {};
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : {};
      if (value && typeof value === 'object') parsed = value as AccessMap;
    } catch {
      parsed = {};
    }
    this.cache.set(key, parsed);
    return parsed;
  }

  private persist(owner: string, map: AccessMap): void {
    const key = this.key(owner);
    this.cache.set(key, map);
    localStorage.setItem(key, JSON.stringify(map));
  }

  private key(owner: string): string {
    return STORAGE_PREFIX + owner.toLowerCase();
  }
}
