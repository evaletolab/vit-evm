import { Component, OnInit } from '@angular/core';
import { ColorDef, ColorKey, ColorPreset, COLOR_PRESETS, ThemeService } from '../../theme/theme.service';
import { WalletService } from '../../wallet/wallet.service';
import { shortAddress } from '../../wallet/wallet.utils';
import { WALLET_NAME_DOMAIN } from '../../wallet/wallet-name';

type Tab = 'menu' | 'settings';

@Component({
  selector: 'vit-page-account',
  templateUrl: './page-account.component.html',
  styleUrl: './page-account.component.scss'
})
export class PageAccountComponent implements OnInit {
  tab: Tab = 'menu';
  colorDefs: ColorDef[];
  colors: Record<ColorKey, string>;
  presets: ColorPreset[] = COLOR_PRESETS;
  devMode = false;

  /** Identité affichée (pseudo, jamais l'adresse en titre). */
  displayName = '';
  walletName = '';
  shortAddr = '';
  profileTel = '';
  profileEmail = '';
  readonly nameDomain = WALLET_NAME_DOMAIN;

  profileError = '';
  profileSaved = false;
  profileBusy = false;

  constructor(
    private theme: ThemeService,
    private wallet: WalletService,
  ) {
    this.colorDefs = this.theme.defs.filter((d) => d.visible);
    this.colors = this.theme.getEffective();
    this.devMode = this.theme.isDevMode();
  }

  async ngOnInit(): Promise<void> {
    await this.reloadProfile();
  }

  /** Pseudo prioritaire ; sinon handle @3vit.ch ; adresse seulement en secours discret. */
  get profileTitle(): string {
    const pseudo = this.displayName.trim();
    if (pseudo && !looksLikeAddress(pseudo)) return pseudo;
    if (this.walletName.trim()) return `${this.walletName}@${this.nameDomain}`;
    return 'Mon compte';
  }

  get profileHandle(): string {
    return this.walletName.trim()
      ? `${this.walletName}@${this.nameDomain}`
      : this.shortAddr;
  }

  openSettings(): void {
    this.colors = this.theme.getEffective();
    this.devMode = this.theme.isDevMode();
    this.profileError = '';
    this.profileSaved = false;
    void this.reloadProfile().then(() => {
      this.tab = 'settings';
    });
  }

  closeSettings(): void {
    this.devMode = this.theme.isDevMode();
    void this.reloadProfile().then(() => {
      this.tab = 'menu';
    });
  }

  saveProfile(): void {
    this.profileError = '';
    this.profileSaved = false;
    this.profileBusy = true;
    try {
      this.wallet.updateProfile({
        displayName: this.displayName,
        tel: this.profileTel,
        email: this.profileEmail,
      });
      this.profileSaved = true;
      void this.reloadProfile();
      setTimeout(() => { this.profileSaved = false; }, 1800);
    } catch (e: unknown) {
      this.profileError = e instanceof Error ? e.message : 'Impossible d\'enregistrer';
    } finally {
      this.profileBusy = false;
    }
  }

  onColorChange(key: ColorKey, value: string): void {
    this.colors = { ...this.colors, [key]: value };
    this.theme.setColor(key, value);
  }

  resetColors(): void {
    this.theme.reset();
    this.colors = this.theme.getEffective();
  }

  applyPreset(preset: ColorPreset): void {
    this.theme.applyPreset(preset);
    this.colors = this.theme.getEffective();
  }

  toggleDevMode(): void {
    this.devMode = !this.devMode;
    this.theme.setDevMode(this.devMode);
  }

  private async reloadProfile(): Promise<void> {
    try {
      const state = await this.wallet.loadWallet();
      if (!state) return;
      this.displayName = state.displayName?.trim() || '';
      this.walletName = state.walletName?.trim() || '';
      this.shortAddr = shortAddress(state.accountAddress);
      this.profileTel = state.profileTel || '';
      this.profileEmail = state.profileEmail || '';
      // Si le pseudo stocké est une adresse, on le vide pour forcer la correction.
      if (looksLikeAddress(this.displayName)) this.displayName = '';
    } catch {
      /* ignore */
    }
  }
}

function looksLikeAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
