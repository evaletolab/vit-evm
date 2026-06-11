import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as QRCode from 'qrcode';
import { WalletService } from '../../wallet/wallet.service';
import { parseZchfAmount, shortAddress } from '../../wallet/wallet.utils';

@Component({
  selector: 'vit-page-sent',
  templateUrl: './page-sent.component.html',
  styleUrl: './page-sent.component.scss',
})
export class PageSentComponent implements OnInit, AfterViewInit {
  @ViewChild('qrCanvas') qrCanvas?: ElementRef<HTMLCanvasElement>;

  address = '';
  shortAddr = '';
  amount = '';
  copied = false;
  loading = true;
  error?: string;

  constructor(private wallet: WalletService) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) {
        this.error = 'Aucun wallet trouvé. Crée-en un d\'abord.';
      } else {
        this.address = state.accountAddress;
        this.shortAddr = shortAddress(state.accountAddress);
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.loading = false;
      setTimeout(() => this.renderQR(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (this.address) setTimeout(() => this.renderQR(), 0);
  }

  get payload(): string {
    if (!this.address) return '';
    if (this.amount && Number(this.amount) > 0) {
      try {
        const wei = parseZchfAmount(this.amount);
        return `ethereum:${this.address}?value=${wei.toString()}`;
      } catch {
        return this.address;
      }
    }
    return this.address;
  }

  async renderQR(): Promise<void> {
    const canvas = this.qrCanvas?.nativeElement;
    if (!canvas || !this.payload) return;
    try {
      await QRCode.toCanvas(canvas, this.payload, {
        width: 220,
        margin: 1,
        color: { dark: '#1D1D1D', light: '#FFFFFF' },
      });
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  onAmountChange(): void {
    this.renderQR();
  }

  async copy(): Promise<void> {
    if (!this.address) return;
    try {
      await navigator.clipboard.writeText(this.address);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    } catch {
      window.prompt('Copier l\'adresse :', this.address);
    }
  }
}
