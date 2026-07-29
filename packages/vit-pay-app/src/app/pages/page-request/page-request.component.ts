import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from '../../wallet/wallet.service';
import { ContactsService } from '../../contacts/contacts.service';
import { parseZchfAmount } from '../../wallet/wallet.utils';
import { environment } from '../../../environments/environment';

/**
 * P6 Reverse claim (payment request) — V1 UX shell.
 *
 * The request itself stays off-chain: the link simply pre-fills the payer's
 * send screen (/buy?to=…&amount=…) with our Safe address. Nothing is locked,
 * nothing is enforced — an on-chain request contract is a later iteration.
 */
@Component({
  selector: 'vit-page-request',
  template: `
    <section class="request-page">
      <header class="topbar">
        <a class="back" routerLink="/" aria-label="Retour">
          <span class="material-symbols-outlined">arrow_back</span>
        </a>
        <h1>Demander</h1>
      </header>

      <p class="info">
        Envoyez une demande d’argent. Le destinataire ouvre le lien et paie
        vers votre Safe (contacts créés des deux côtés après paiement).
      </p>

      <label>
        À (nom, e-mail, tél)
        <input type="text" [(ngModel)]="to" [disabled]="busy" />
      </label>
      <label>
        Montant (xCHF)
        <input type="text" inputmode="decimal" [(ngModel)]="amount" [disabled]="busy" />
      </label>
      <label>
        Message (optionnel)
        <input type="text" [(ngModel)]="message" [disabled]="busy" />
      </label>

      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="shareUrl" class="ok">
        Lien prêt — <button type="button" (click)="copy()">Copier</button>
        <button type="button" (click)="share()">Partager</button>
      </p>

      <button type="button" class="cta" (click)="create()" [disabled]="busy || !to || !amount">
        {{ busy ? '…' : 'Envoyer la demande' }}
      </button>
    </section>
  `,
  styles: [`
    .request-page { padding: 1rem 1rem 6rem; }
    .topbar { display: flex; align-items: center; gap: .75rem; margin-bottom: 1rem; }
    .topbar h1 { flex: 1; margin: 0; font-size: 1.15rem; }
    .back { color: inherit; text-decoration: none; }
    label { display: block; margin: .75rem 0; font-size: .85rem; color: var(--text-muted); }
    input {
      display: block; width: 100%; margin-top: .35rem; padding: .75rem;
      border: none; border-radius: 12px; background: var(--glass); color: var(--text);
    }
    .info, .ok { color: var(--text-muted); font-size: .9rem; }
    .error { color: var(--negative); }
    .cta {
      margin-top: 1rem; width: 100%; border: none; border-radius: 14px;
      padding: .9rem; background: var(--grad); color: #fff; font-weight: 600;
    }
  `],
})
export class PageRequestComponent {
  to = '';
  amount = '';
  message = '';
  shareUrl = '';
  error = '';
  busy = false;

  constructor(
    private wallet: WalletService,
    private contacts: ContactsService,
    private router: Router,
  ) {}

  async create(): Promise<void> {
    this.error = '';
    this.busy = true;
    try {
      const state = await this.wallet.loadWallet();
      if (!state) {
        this.router.navigate(['/wallet']);
        return;
      }
      const wei = parseZchfAmount(this.amount);
      if (wei <= 0n) throw new Error('Montant invalide');

      const params = new URLSearchParams({
        to: state.accountAddress,
        amount: this.amount.trim(),
      });
      if (state.displayName) params.set('from', state.displayName);
      const root = new URL(
        document.querySelector('base')?.getAttribute('href') || '/',
        window.location.origin,
      ).href.replace(/\/$/, '');
      const path = environment.hashRoute ? '/#/buy' : '/buy';
      this.shareUrl = `${root}${path}?${params.toString()}`;

      this.contacts.upsertPending(state.accountAddress, {
        name: this.to.trim(),
        claimId: `req-${Date.now()}`,
        note: `Demande ${this.amount} xCHF`,
      });
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : String(e);
    } finally {
      this.busy = false;
    }
  }

  async copy(): Promise<void> {
    if (this.shareUrl) await navigator.clipboard.writeText(this.shareUrl);
  }

  async share(): Promise<void> {
    if (!this.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Demande ViT',
          text: this.message || `Demande de ${this.amount} xCHF`,
          url: this.shareUrl,
        });
      } catch { /* cancel */ }
    } else {
      await this.copy();
    }
  }
}
