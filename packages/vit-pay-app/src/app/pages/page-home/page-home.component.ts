import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService, RecentTransfer } from '../../wallet/wallet.service';
import { ContactsService } from '../../contacts/contacts.service';
import { ContactAccessService } from '../../contacts/contact-access.service';
import { ClaimLinkService } from '../../claimlink/claimlink.service';
import { formatZchfAmount, shortAddress } from '../../wallet/wallet.utils';
import { environment } from '../../../environments/environment';

const CLAIM_TITLES: Record<string, string> = {
  pending: 'Lien en attente',
  claimed: 'Lien réclamé',
  expired: 'Lien expiré',
  cancelled: 'Lien annulé (remboursé)',
};

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

  constructor(
    private wallet: WalletService,
    private contacts: ContactsService,
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
      this.displayName = state.displayName || '';
      this.contactAccessActive = this.contactAccess.hasAnyConnected(state.accountAddress);

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
        // Skip if counterparty is the claim-link contract (shown via claim lines)
        if (
          environment.claimLinkAddress &&
          t.counterparty.toLowerCase() === environment.claimLinkAddress.toLowerCase()
        ) {
          continue;
        }
        txs.push(this.toTx(t));
      }

      for (const l of links.slice(0, 5)) {
        // 'cancelled' means the tokens came back to us, so it reads as an inflow.
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

  addUnknown(addr: string): void {
    if (!this.owner || !addr) return;
    const name = prompt('Nom du contact ?');
    if (!name?.trim()) return;
    try {
      this.contacts.upsert(this.owner, {
        name: name.trim(),
        address: addr,
        source: 'manual',
        status: 'confirmed',
      });
      this.recentTxs = this.recentTxs.map((t) =>
        t.addContactAddress === addr
          ? { ...t, title: name.trim(), addContactAddress: undefined }
          : t,
      );
    } catch {
      /* ignore */
    }
  }

  private toTx(t: RecentTransfer): RecentTx {
    const amount = ethers.formatUnits(t.amount, 18);
    const trimmed = parseFloat(amount).toFixed(2).replace('.', ',');
    const known = this.contacts.findByAddress(this.owner, t.counterparty);
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
