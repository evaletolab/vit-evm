import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ethers } from 'ethers';
import { WalletService, RecentTransfer } from '../../wallet/wallet.service';
import { formatZchfAmount, shortAddress } from '../../wallet/wallet.utils';

interface RecentTx {
  icon: string;
  title: string;
  meta: string;
  amount: string;
  direction: 'in' | 'out';
  hash?: string;
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
  loadingTxs = false;
  recentTxs: RecentTx[] = [];

  constructor(private wallet: WalletService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) {
        this.router.navigate(['/wallet']);
        return;
      }
      this.hasWallet = true;
      this.shortAddr = shortAddress(state.accountAddress);

      this.wallet.getZchfBalance()
        .then((raw) => { this.balance = formatZchfAmount(raw); })
        .catch(() => { this.balance = '—'; });

      this.loadingTxs = true;
      this.wallet.getRecentZchfTransfers(5)
        .then((transfers) => {
          this.recentTxs = transfers.map((t) => this.toTx(t));
        })
        .catch(() => { this.recentTxs = []; })
        .finally(() => { this.loadingTxs = false; });
    } catch {
      this.hasWallet = false;
      this.router.navigate(['/wallet']);
    }
  }

  private toTx(t: RecentTransfer): RecentTx {
    const amount = ethers.formatUnits(t.amount, 18);
    const trimmed = parseFloat(amount).toFixed(2).replace('.', ',');
    return {
      icon: t.direction === 'in' ? 'south_west' : 'arrow_outward',
      title: shortAddress(t.counterparty, 4, 4),
      meta: this.formatMeta(t.timestamp),
      amount: (t.direction === 'in' ? '+' : '−') + trimmed,
      direction: t.direction,
      hash: t.hash,
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
