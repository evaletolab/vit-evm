import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../wallet/wallet.service';
import { formatZchfAmount, shortAddress } from '../../wallet/wallet.utils';

@Component({
  selector: 'vit-page-home',
  templateUrl: './page-home.component.html',
  styleUrl: './page-home.component.scss',
})
export class PageHomeComponent implements OnInit {
  balance = '—';
  hasWallet = false;
  shortAddr = '';

  constructor(private wallet: WalletService) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (state) {
        this.hasWallet = true;
        this.shortAddr = shortAddress(state.accountAddress);
        try {
          const raw = await this.wallet.getZchfBalance();
          this.balance = formatZchfAmount(raw);
        } catch {
          this.balance = '—';
        }
      }
    } catch {
      this.hasWallet = false;
    }
  }
}
