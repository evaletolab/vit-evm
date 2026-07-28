import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { environment } from '../../../environments/environment';
import { WalletService } from '../../wallet/wallet.service';
import { WalletUnlockService } from '../../wallet/wallet-unlock.service';
import { TxOverlayService } from '../../wallet/tx-overlay.service';
import {
  RecoveryCodeMaterial,
  RecoveryCodePayload,
  buildRestoreQrUrl,
  encodeCodePayload,
  offerVaultSave,
  vaultPassword,
  vaultUsername,
} from '../../wallet/recovery-codes';
import { isValidWalletName, walletHandle } from '../../wallet/wallet-name';

type Dest = 'vault' | 'qr' | 'none';

interface CodeSlot {
  material: RecoveryCodeMaterial;
  payload: RecoveryCodePayload;
  dest: Dest;
  saved: boolean;
  qrDataUrl?: string;
}

@Component({
  selector: 'vit-page-vault',
  templateUrl: './page-vault.component.html',
  styleUrl: './page-vault.component.scss',
})
export class PageVaultComponent implements OnInit {
  name = '';
  handle = '';
  busy = false;
  generating = false;
  progress = '';
  error?: string;
  slots: CodeSlot[] = [];
  armed = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private wallet: WalletService,
    private unlock: WalletUnlockService,
    private txOverlay: TxOverlayService,
  ) {}

  get distinctDestCount(): number {
    const set = new Set(this.slots.filter((s) => s.saved && s.dest !== 'none').map((s) => `${s.dest}:${s.material.index}`));
    // Count unique destination *types* that have at least one saved code? Plan: 2 destinations distinctes.
    const types = new Set(this.slots.filter((s) => s.saved).map((s) => s.dest));
    return types.size;
  }

  get canContinue(): boolean {
    return this.slots.length === 3 && this.distinctDestCount >= 2 && this.slots.filter((s) => s.saved).length >= 2;
  }

  rotateMode = false;

  async ngOnInit(): Promise<void> {
    const param = this.route.snapshot.paramMap.get('name') ?? '';
    if (!isValidWalletName(param)) {
      this.error = 'Nom invalide';
      return;
    }
    this.name = param.toLowerCase();
    this.handle = walletHandle(this.name);
    this.rotateMode = this.route.snapshot.queryParamMap.get('rotate') === '1';

    const state = await this.wallet.loadWallet();
    if (!state) {
      await this.router.navigate(['/wallet']);
      return;
    }
    if (state.walletName && state.walletName !== this.name) {
      await this.router.navigate(['/', state.walletName, 'vault'], {
        queryParams: this.rotateMode ? { rotate: '1' } : undefined,
      });
      return;
    }
    if (state.recoveryEnabled && state.backupKitConfirmed && !this.rotateMode) {
      this.armed = true;
    }
  }

  async rotateCodes(): Promise<void> {
    this.busy = true;
    this.generating = true;
    this.error = undefined;
    this.txOverlay.show('Rotation des codes…');
    try {
      const { materials, operation } = await this.wallet.rotateRecoveryGuardians(
        (index, ratio) => {
          this.progress = `Code ${index}/3 — ${Math.round(ratio * 100)} %`;
        },
      );
      if (!operation.success) {
        throw new Error(operation.error ?? 'Échec rotation on-chain');
      }
      const payloads = this.wallet.buildCodePayloads(materials, { includeSoftMetaOnFirst: true });
      this.slots = materials.map((m, i) => ({
        material: m,
        payload: payloads[i],
        dest: i === 0 ? 'vault' : 'qr',
        saved: false,
      }));
      for (const slot of this.slots) {
        if (slot.dest === 'qr') await this.refreshQr(slot);
      }
      this.armed = false;
      // Keep rotateMode true until the user confirms destinations saved.
      this.txOverlay.succeed('Nouveaux codes prêts — sauvegardez-les');
      this.progress = '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail(msg);
      this.error = msg;
    } finally {
      this.busy = false;
      this.generating = false;
    }
  }

  async generate(): Promise<void> {
    this.busy = true;
    this.generating = true;
    this.error = undefined;
    this.progress = 'Génération des codes…';
    try {
      const materials = await this.wallet.generateRecoveryCodes((index, ratio) => {
        this.progress = `Code ${index}/3 — ${Math.round(ratio * 100)} %`;
      });
      const payloads = this.wallet.buildCodePayloads(materials, { includeSoftMetaOnFirst: true });
      this.slots = materials.map((m, i) => ({
        material: m,
        payload: payloads[i],
        // Défaut : 1 coffre + 2 QR
        dest: i === 0 ? 'vault' : 'qr',
        saved: false,
      }));
      for (const slot of this.slots) {
        if (slot.dest === 'qr') {
          await this.refreshQr(slot);
        }
      }
      this.progress = '';
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
      this.generating = false;
    }
  }

  async setDest(slot: CodeSlot, dest: Dest): Promise<void> {
    // Interdit 2 codes au même type si ça laisse un seul type… on autorise le choix
    // mais canContinue exige 2 types distincts.
    slot.dest = dest;
    slot.saved = false;
    if (dest === 'qr') await this.refreshQr(slot);
  }

  private async refreshQr(slot: CodeSlot): Promise<void> {
    const url = buildRestoreQrUrl(this.name, slot.payload, {
      origin: typeof location !== 'undefined' ? location.origin : 'https://vit.app',
      hashRoute: environment.hashRoute,
    });
    slot.qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
  }

  async saveVault(slot: CodeSlot): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const result = await offerVaultSave(
        vaultUsername(this.name),
        vaultPassword(slot.payload),
      );
      if (result === 'unsupported') {
        // Fallback copie
        await navigator.clipboard.writeText(encodeCodePayload(slot.payload));
      }
      slot.dest = 'vault';
      slot.saved = true;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async markQrSaved(slot: CodeSlot): Promise<void> {
    slot.dest = 'qr';
    slot.saved = true;
  }

  async copyCode(slot: CodeSlot): Promise<void> {
    try {
      await navigator.clipboard.writeText(slot.material.code);
      slot.saved = true;
    } catch {
      window.prompt('Copiez ce code :', slot.material.code);
      slot.saved = true;
    }
  }

  async continueArm(): Promise<void> {
    if (!this.canContinue) {
      this.error = 'Enregistrez au moins 2 codes dans 2 destinations différentes (coffre et QR).';
      return;
    }
    this.busy = true;
    this.error = undefined;
    this.txOverlay.show('Activation des codes de secours…');
    try {
      const materials = this.slots.map((s) => s.material);
      const result = await this.wallet.armRecoveryGuardians(materials);
      if (!result.success) {
        throw new Error(result.error ?? 'Échec armement');
      }
      this.txOverlay.succeed('Codes activés');
      this.unlock.markUnlocked();
      this.armed = true;
      // Wipe private keys from memory
      this.slots = [];
      await this.router.navigateByUrl('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.txOverlay.fail(msg);
      this.error = msg;
    } finally {
      this.busy = false;
    }
  }

  skip(): void {
    this.wallet.skipRecoveryVault();
    this.unlock.markUnlocked();
    this.router.navigateByUrl('/');
  }

  confirmRotated(): void {
    if (!this.canContinue) {
      this.error = 'Enregistrez au moins 2 codes dans 2 destinations différentes.';
      return;
    }
    this.wallet.confirmVaultSaved();
    this.slots = [];
    this.armed = true;
    this.rotateMode = false;
    this.unlock.markUnlocked();
    void this.router.navigateByUrl('/');
  }

  abort(): void {
    this.wallet.abortUnconfirmedWallet();
    this.router.navigate(['/wallet']);
  }
}
