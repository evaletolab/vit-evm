import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../wallet/wallet.service';

type Mode = 'buy' | 'sell';
type Step = 'checklist' | 'kyc' | 'enter' | 'done';

function isValidIban(raw: string): boolean {
  const clean = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) return false;
  const rearranged = clean.slice(4) + clean.slice(0, 4);
  let expanded = '';
  for (const ch of rearranged) {
    expanded += /[A-Z]/.test(ch) ? (ch.charCodeAt(0) - 55).toString() : ch;
  }
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    remainder = parseInt(String(remainder) + expanded.slice(i, i + 7), 10) % 97;
  }
  return remainder === 1;
}

@Component({
  selector: 'vit-page-iban',
  templateUrl: './page-iban.component.html',
  styleUrl: './page-iban.component.scss',
})
export class PageIbanComponent implements OnInit {
  step: Step = 'checklist';
  mode: Mode = 'buy';
  address = '';
  amount = '';
  iban = '';
  ibanError?: string;
  checklist = [
    { key: 'id',      label: 'Pièce d\'identité (carte ou passeport)', icon: 'badge' },
    { key: 'selfie',  label: 'Caméra (selfie + scan recto/verso)',     icon: 'photo_camera' },
    { key: 'address', label: 'Justificatif de domicile (< 3 mois)',    icon: 'home' },
    { key: 'phone',   label: 'Numéro de téléphone pour le SMS',         icon: 'sms' },
  ];
  error?: string;

  constructor(private wallet: WalletService) {}

  async ngOnInit(): Promise<void> {
    try {
      const state = this.wallet.getState() ?? await this.wallet.loadWallet();
      this.address = state?.accountAddress ?? '';
      const stored = localStorage.getItem('vit-iban');
      if (stored) {
        this.iban = this.formatIban(stored);
        this.step = 'done';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  setMode(mode: Mode): void {
    this.mode = mode;
  }

  goTo(step: Step): void {
    this.ibanError = undefined;
    this.step = step;
  }

  formatIban(iban: string): string {
    return iban.replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim();
  }

  onIbanInput(value: string): void {
    this.iban = this.formatIban(value);
    this.ibanError = undefined;
  }

  saveIban(): void {
    const clean = this.iban.replace(/\s+/g, '').toUpperCase();
    if (!isValidIban(clean)) {
      this.ibanError = 'IBAN invalide (vérifie qu\'il commence par CH et que tu l\'as bien recopié).';
      return;
    }
    localStorage.setItem('vit-iban', clean);
    this.iban = this.formatIban(clean);
    this.step = 'done';
  }

  clearIban(): void {
    localStorage.removeItem('vit-iban');
    this.iban = '';
    this.step = 'checklist';
  }

  get widgetUrl(): string {
    const base = this.mode === 'buy'
      ? 'https://buy.mtpelerin.com/'
      : 'https://sell.mtpelerin.com/';
    const params = new URLSearchParams({
      lang: 'fr',
      tab: this.mode === 'buy' ? 'buy' : 'sell',
      tabs: 'buy,sell',
      type: 'direct-link',
      bsc: 'CHF',
      bdc: 'XCHF',
      crys: 'XCHF',
      net: 'optimism_mainnet',
      nets: 'optimism_mainnet,mainnet',
    });
    if (this.address) params.set('addr', this.address);
    if (this.amount) params.set(this.mode === 'buy' ? 'bsa' : 'bda', this.amount);
    return `${base}?${params.toString()}`;
  }

  openWidget(): void {
    window.open(this.widgetUrl, '_blank', 'noopener,noreferrer');
  }

  startKyc(): void {
    this.step = 'kyc';
    this.openWidget();
  }

  openAccount(): void {
    window.open('https://app.mtpelerin.com/', '_blank', 'noopener,noreferrer');
  }

  async copyAddress(): Promise<void> {
    if (!this.address) return;
    try {
      await navigator.clipboard.writeText(this.address);
    } catch {
      window.prompt('Adresse à copier :', this.address);
    }
  }
}
