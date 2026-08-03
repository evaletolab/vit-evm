import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService, RecentTransfer } from '../../wallet/wallet.service';
import { ContactsService, Contact } from '../../contacts/contacts.service';
import { ContactAccessService, DirectoryMatch } from '../../contacts/contact-access.service';
import { ClaimLinkService } from '../../claimlink/claimlink.service';
import { formatZchfAmount, shortAddress } from '../../wallet/wallet.utils';
import { environment } from '../../../environments/environment';

const CLAIM_TITLES: Record<string, string> = {
  pending: 'Lien en attente',
  claimed: 'Lien réclamé',
  expired: 'Lien expiré',
  cancelled: 'Lien annulé (remboursé)',
};

/** Nombre de contacts affichés en raccourci sur l'accueil. */
const HOME_CONTACT_LIMIT = 8;

interface RecentTx {
  icon: string;
  title: string;
  meta: string;
  amount: string;
  direction: 'in' | 'out';
  hash?: string;
  addContactAddress?: string;
}

@Component({
  selector: 'vit-page-home',
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
})
export class PageHomeComponent implements OnInit {
  balance = '—';
  hasWallet = false;
  shortAddr = '';
  displayName = '';
  loadingTxs = false;
  recentTxs: RecentTx[] = [];
  owner = '';
  contactAccessActive = false;

  contacts: Contact[] = [];
  /** Total carnet local (peut dépasser HOME_CONTACT_LIMIT). */
  contactsTotal = 0;
  query = '';
  suggestions: Array<{ name: string; value: string; meta: string; remote: boolean }> = [];

  /** Formulaire « Choisir un contact » seulement s'il y a plus de raccourcis que N. */
  get showContactPicker(): boolean {
    return this.contactsTotal > HOME_CONTACT_LIMIT;
  }

  constructor(
    private wallet: WalletService,
    private contactsSvc: ContactsService,
    private contactAccess: ContactAccessService,
    private claimLink: ClaimLinkService,
    private router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) {
        this.router.navigate(['/wallet']);
        return;
      }
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.shortAddr = shortAddress(state.accountAddress);
      this.displayName = preferDisplayName(state.displayName, state.walletName);
      this.contactAccessActive = this.contactAccess.hasAnyConnected(state.accountAddress);
      this.reloadHomeContacts();

      this.wallet.getZchfBalance()
        .then((raw) => { this.balance = formatZchfAmount(raw); })
        .catch(() => { this.balance = '—'; });

      this.loadingTxs = true;
      const [transfers, links] = await Promise.all([
        this.wallet.getRecentZchfTransfers(8).catch(() => [] as RecentTransfer[]),
        Promise.resolve(this.claimLink.list(state.accountAddress)),
      ]);

      const seen = new Set<string>();
      const txs: RecentTx[] = [];

      for (const t of transfers) {
        if (t.hash && seen.has(t.hash)) continue;
        if (t.hash) seen.add(t.hash);
        if (
          environment.claimLinkAddress &&
          t.counterparty.toLowerCase() === environment.claimLinkAddress.toLowerCase()
        ) {
          continue;
        }
        txs.push(this.toTx(t));
      }

      for (const l of links.slice(0, 5)) {
        const refunded = l.status === 'cancelled';
        txs.push({
          icon: 'link',
          title: CLAIM_TITLES[l.status],
          meta: `${l.amount} xCHF · ${this.formatMeta(l.createdAt)}`,
          amount: (refunded ? '+' : '−') + parseFloat(l.amount).toFixed(2).replace('.', ','),
          direction: refunded ? 'in' : 'out',
          hash: l.txHash,
        });
      }

      this.recentTxs = txs.slice(0, 8);
      this.loadingTxs = false;
    } catch {
      this.hasWallet = false;
      this.router.navigate(['/wallet']);
    }
  }

  onSearch(): void {
    const q = this.query.trim().toLowerCase();
    if (q.length < 2) {
      this.suggestions = [];
      return;
    }

    const out: typeof this.suggestions = [];
    const seen = new Set<string>();

    for (const c of this.contactsSvc.list(this.owner)) {
      if (!c.name.toLowerCase().includes(q)) continue;
      const value = c.address || c.email || c.tel;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({
        name: c.name,
        value,
        meta: this.contactMeta(c),
        remote: false,
      });
      if (out.length >= 5) break;
    }

    if (out.length < 5) {
      for (const s of this.contactAccess.search(this.owner, q)) {
        const value = s.email || s.tel;
        if (!value || seen.has(value)) continue;
        seen.add(value);
        out.push({ name: s.name, value, meta: value, remote: true });
        if (out.length >= 5) break;
      }
    }

    this.suggestions = out;
  }

  /** Envoie vers /buy avec le contact dans l'URL (plus de saisie sur la page d'envoi). */
  goSend(c: Contact | DirectoryMatch | { name: string; value: string }): void {
    const name = c.name;
    let to = '';
    if ('value' in c && c.value) to = c.value;
    else if ('address' in c && c.address) to = c.address;
    else if ('email' in c && c.email) to = c.email!;
    else if ('tel' in c && c.tel) to = c.tel!;

    this.router.navigate(['/buy'], {
      queryParams: {
        ...(to ? { to } : {}),
        name,
      },
    });
  }

  pickSuggestion(s: { name: string; value: string }): void {
    this.query = '';
    this.suggestions = [];
    this.goSend(s);
  }

  /** Sans contact → /buy ouvre le scan QR. */
  goScan(): void {
    this.router.navigate(['/buy']);
  }

  goReceive(): void {
    this.router.navigate(['/sent']);
  }

  addUnknown(addr: string): void {
    if (!this.owner || !addr) return;
    const name = prompt('Nom du contact ?');
    if (!name?.trim()) return;
    try {
      this.contactsSvc.upsert(this.owner, {
        name: name.trim(),
        address: addr,
        source: 'manual',
        status: 'confirmed',
      });
      this.reloadHomeContacts();
      this.recentTxs = this.recentTxs.map((t) =>
        t.addContactAddress === addr
          ? { ...t, title: name.trim(), addContactAddress: undefined }
          : t,
      );
    } catch {
      /* ignore */
    }
  }

  private reloadHomeContacts(): void {
    if (!this.owner) {
      this.contacts = [];
      this.contactsTotal = 0;
      return;
    }
    const all = this.contactsSvc.list(this.owner);
    this.contactsTotal = all.length;
    this.contacts = all.slice(0, HOME_CONTACT_LIMIT);
  }

  contactMeta(c: Contact): string {
    if (c.tel) return c.tel;
    if (c.email) return c.email;
    if (c.address) return shortAddress(c.address);
    return 'Sans coordonnées';
  }

  private toTx(t: RecentTransfer): RecentTx {
    const amount = ethers.formatUnits(t.amount, 18);
    const trimmed = parseFloat(amount).toFixed(2).replace('.', ',');
    const known = this.contactsSvc.findByAddress(this.owner, t.counterparty);
    const title = known?.name || shortAddress(t.counterparty, 4, 4);
    return {
      icon: t.direction === 'in' ? 'south_west' : 'arrow_outward',
      title,
      meta: this.formatMeta(t.timestamp),
      amount: (t.direction === 'in' ? '+' : '−') + trimmed,
      direction: t.direction,
      hash: t.hash,
      addContactAddress: known ? undefined : t.counterparty,
    };
  }

  private formatMeta(ts: number): string {
    if (!ts) return 'xCHF';
    const date = new Date(ts * 1000);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `Aujourd'hui · ${time}`;
    const day = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return `${day} · ${time}`;
  }
}

/** Pseudo > handle wallet > vide (l'accueil affichera shortAddr en secours). */
function preferDisplayName(displayName?: string, walletName?: string): string {
  const n = displayName?.trim() || '';
  if (n && !/^0x[a-fA-F0-9]{40}$/.test(n)) return n;
  return walletName?.trim() || '';
}
