import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../wallet/wallet.service';
import { ContactProviderId } from '../../contacts/contact-providers';
import { ContactAccessService, ProviderState } from '../../contacts/contact-access.service';

@Component({
  selector: 'vit-page-contacts-access',
  templateUrl: './page-contacts-access.component.html',
  styleUrl: './page-contacts-access.component.scss',
})
export class PageContactsAccessComponent implements OnInit {
  providers: ProviderState[] = [];
  owner = '';
  hasWallet = false;
  busy: ContactProviderId | null = null;
  error = '';
  notice = '';
  devicePickerSupported = false;

  constructor(
    private wallet: WalletService,
    private access: ContactAccessService,
  ) {}

  async ngOnInit(): Promise<void> {
    const navAny = navigator as unknown as { contacts?: { select?: unknown } };
    this.devicePickerSupported = typeof navAny.contacts?.select === 'function';

    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.hasWallet = true;
      this.owner = state.accountAddress;
      this.refresh();
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Erreur';
    }
  }

  async connect(p: ProviderState): Promise<void> {
    this.error = '';
    this.notice = '';
    this.busy = p.id;
    try {
      const count = await this.access.connect(this.owner, p.id);
      this.notice = `${p.label} connecté · ${count} fiche${count > 1 ? 's' : ''} en cache.`;
      this.refresh();
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'Connexion impossible';
    } finally {
      this.busy = null;
    }
  }

  disconnect(p: ProviderState): void {
    if (!confirm(`Déconnecter ${p.label} et effacer les fiches en cache ?`)) return;
    this.access.disconnect(this.owner, p.id);
    this.notice = `${p.label} déconnecté.`;
    this.refresh();
  }

  private refresh(): void {
    this.providers = this.access.states(this.owner);
  }
}
