import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../wallet/wallet.service';
import { ThemeService } from '../../theme/theme.service';
import { UserOperationDebug, UserOperationResult } from '../../wallet/wallet.types';
import { isValidEvmAddress, mapPaymasterError } from '../../wallet/wallet.utils';

@Component({
  selector: 'vit-page-devices',
  templateUrl: './page-devices.component.html',
  styleUrl: './page-devices.component.scss',
})
export class PageDevicesComponent implements OnInit {
  busy = false;
  error?: string;
  addDeviceResult?: { address: string; op: UserOperationResult };
  externalOwnerAddress = '';

  constructor(private wallet: WalletService, private theme: ThemeService) {}

  get devMode(): boolean { return this.theme.isDevMode(); }

  async ngOnInit(): Promise<void> {
    try {
      await this.wallet.loadWallet();
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    }
  }

  async addDevice(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      const out = await this.wallet.addDeviceWithPasskey();
      this.addDeviceResult = { address: out.newOwnerAddress, op: out.operation };
      if (!out.operation.success && out.operation.error) {
        this.error = mapPaymasterError(new Error(out.operation.error));
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.busy = false;
    }
  }

  async addOwnerByAddress(): Promise<void> {
    this.busy = true;
    this.error = undefined;
    try {
      if (!isValidEvmAddress(this.externalOwnerAddress)) {
        throw new Error('Address EVM invalide');
      }
      const op = await this.wallet.addOwnerByAddress(this.externalOwnerAddress);
      this.addDeviceResult = { address: this.externalOwnerAddress, op };
      if (!op.success && op.error) {
        this.error = mapPaymasterError(new Error(op.error));
      }
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
