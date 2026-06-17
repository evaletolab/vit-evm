import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService, RecentTransfer } from '../../wallet/wallet.service';
import { shortAddress } from '../../wallet/wallet.utils';

type Filter = 'all' | 'out' | 'in';

interface TxRow {
  icon: string;
  title: string;
  meta: string;
  amount: string;
  direction: 'in' | 'out';
  hash: string;
}

@Component({
  selector: 'vit-page-transactions',
  templateUrl: './page-transactions.component.html',
  styleUrl: './page-transactions.component.scss',
})
export class PageTransactionsComponent implements OnInit {
  loading = false;
  error = '';
  hasWallet = false;
  filter: Filter = 'all';
  private all: TxRow[] = [];

  constructor(private wallet: WalletService) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.loading = true;
      const transfers = await this.wallet.getRecentZchfTransfers(50, 200_000);
      this.all = transfers.map((t) => this.toRow(t));
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur de chargement';
    } finally {
      this.loading = false;
    }
  }

  get visible(): TxRow[] {
    if (this.filter === 'all') return this.all;
    return this.all.filter((t) => t.direction === this.filter);
  }

  setFilter(f: Filter): void { this.filter = f; }

  private toRow(t: RecentTransfer): TxRow {
    const amount = ethers.formatUnits(t.amount, 18);
    const trimmed = parseFloat(amount).toFixed(2).replace('.', ',');
    return {
      icon: t.direction === 'in' ? 'south_west' : 'arrow_outward',
      title: t.direction === 'in' ? 'Reçu' : 'Envoyé',
      meta: this.formatMeta(t.timestamp, t.counterparty),
      amount: (t.direction === 'in' ? '+' : '−') + trimmed,
      direction: t.direction,
      hash: t.hash,
    };
  }

  private formatMeta(ts: number, counterparty: string): string {
    const addr = shortAddress(counterparty, 4, 4);
    if (!ts) return addr;
    const date = new Date(ts * 1000);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (sameDay) return `${addr} · Aujourd'hui ${time}`;
    const day = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    return `${addr} · ${day} ${time}`;
  }
}
