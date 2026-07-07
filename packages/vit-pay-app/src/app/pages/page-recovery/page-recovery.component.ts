import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../wallet/wallet.service';
import { ThemeService } from '../../theme/theme.service';
import {
  RecoveryRequest,
  UserOperationDebug,
  UserOperationResult,
  WalletState,
} from '../../wallet/wallet.types';
import { mapPaymasterError } from '../../wallet/wallet.utils';

@Component({
  selector: 'vit-page-recovery',
  templateUrl: './page-recovery.component.html',
  styleUrl: './page-recovery.component.scss',
})
export class PageRecoveryComponent implements OnInit {
  state: WalletState | null = null;
  busy = false;
  error?: string;

  guardiansInput = '';
  guardianThreshold = 1;
  recoveryRequest: RecoveryRequest | null = null;
  lastRecoveryOp?: UserOperationResult;

  constructor(private wallet: WalletService, private theme: ThemeService) {}

  get devMode(): boolean { return this.theme.isDevMode(); }

  get canFinalizeRecovery(): boolean {
    if (!this.recoveryRequest) return false;
    return BigInt(Math.floor(Date.now() / 1000)) >= BigInt(this.recoveryRequest.executeAfter);
  }

  async ngOnInit(): Promise<void> {
    this.recoveryRequest = this.wallet.getCachedRecoveryRequest();
    try {
      this.state = await this.wallet.loadWallet();
      await this.refreshRecoveryRequest();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  async refreshRecoveryRequest(): Promise<void> {
    try {
      this.recoveryRequest = await this.wallet.getRecoveryRequest();
    } catch {
      this.recoveryRequest = null;
    }
  }

  async enableRecovery(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    this.lastRecoveryOp = undefined;
    try {
      const guardians = this.guardiansInput
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const result = await this.wallet.enableRecovery(guardians, this.guardianThreshold);
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshRecoveryRequest();
      const reloaded = await this.wallet.loadWallet();
      if (reloaded) this.state = reloaded;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async finalizeRecovery(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const result = await this.wallet.finalizeRecovery();
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = result.error;
      }
      await this.refreshRecoveryRequest();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async cancelOnChainRecovery(): Promise<void> {
    if (!confirm('Annuler la recovery en cours ? Cette action est irréversible sur cette requête.')) return;
    this.busy = true;
    this.error = undefined;
    try {
      const result = await this.wallet.cancelRecoveryOnChain();
      this.lastRecoveryOp = result;
      if (!result.success && result.error) {
        this.error = mapPaymasterError(new Error(result.error));
      }
      await this.refreshRecoveryRequest();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  formatDebug(debug: UserOperationDebug): string {
    return JSON.stringify(debug, null, 2);
  }

  async copyDebug(debug: UserOperationDebug): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.formatDebug(debug));
    } catch {
      window.prompt('Copier le JSON ci-dessous :', this.formatDebug(debug));
    }
  }
}
