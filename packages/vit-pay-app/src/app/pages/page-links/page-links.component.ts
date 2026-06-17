import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../../wallet/wallet.service';
import { ClaimLinkService, StoredLink } from '../../claimlink/claimlink.service';
import { parseZchfAmount } from '../../wallet/wallet.utils';

type View = 'list' | 'create' | 'created';

@Component({
  selector: 'vit-page-links',
  templateUrl: './page-links.component.html',
  styleUrl: './page-links.component.scss',
})
export class PageLinksComponent implements OnInit {
  view: View = 'list';
  links: StoredLink[] = [];
  hasWallet = false;
  busy = false;
  error = '';
  owner = '';

  amount = '';
  expiryHours = 24;

  lastUrl = '';
  lastLink?: StoredLink;
  copied = false;

  configured = false;

  constructor(private wallet: WalletService, private cl: ClaimLinkService) {}

  async ngOnInit(): Promise<void> {
    this.configured = !!this.cl.contractAddress();
    if (!this.configured) {
      this.error = 'Contrat VitClaimLink non configuré (environment.claimLinkAddress).';
      return;
    }
    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.links = this.cl.list(this.owner);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    }
  }

  openCreate(): void {
    this.view = 'create';
    this.amount = '';
    this.expiryHours = 24;
    this.error = '';
  }

  cancelForm(): void {
    this.view = 'list';
    this.error = '';
  }

  async create(): Promise<void> {
    this.error = '';
    try {
      const wei = parseZchfAmount(this.amount);
      if (wei <= 0n) throw new Error('Montant invalide');
      const expiry = this.expiryHours > 0
        ? BigInt(Math.floor(Date.now() / 1000) + this.expiryHours * 3600)
        : 0n;
      this.busy = true;
      const { link, url } = await this.cl.create(wei, expiry);
      this.lastLink = link;
      this.lastUrl = url;
      this.links = this.cl.list(this.owner);
      this.view = 'created';
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    } finally {
      this.busy = false;
    }
  }

  async copy(): Promise<void> {
    if (!this.lastUrl) return;
    try {
      await navigator.clipboard.writeText(this.lastUrl);
      this.copied = true;
      setTimeout(() => { this.copied = false; }, 1500);
    } catch {
      /* ignore */
    }
  }

  buildUrl(link: StoredLink): string {
    return this.cl.buildShareUrl(link.id, link.secret);
  }

  async share(link: StoredLink): Promise<void> {
    const url = this.buildUrl(link);
    if (navigator.share) {
      try { await navigator.share({ url, title: 'Claim xCHF', text: 'Tu peux récupérer ces xCHF :' }); } catch { /* user cancel */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  async copyLinkUrl(link: StoredLink): Promise<void> {
    await navigator.clipboard.writeText(this.buildUrl(link));
  }

  async cancelLink(link: StoredLink): Promise<void> {
    if (!confirm(`Annuler ce link et récupérer ${link.amount} xCHF ?`)) return;
    this.busy = true;
    this.error = '';
    try {
      const op = await this.cl.cancel(link.id);
      if (!op.success) throw new Error(op.error || 'Échec annulation');
      this.links = this.cl.list(this.owner);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    } finally {
      this.busy = false;
    }
  }

  formatExpiry(unix: number): string {
    if (!unix) return 'Sans expiration';
    const ms = unix * 1000;
    const left = ms - Date.now();
    if (left <= 0) return 'Expiré';
    const h = Math.floor(left / 3_600_000);
    if (h < 24) return `Expire dans ${h}h`;
    return `Expire dans ${Math.floor(h / 24)}j`;
  }
}
