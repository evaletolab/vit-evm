import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SafeAccountV0_3_0 as SafeAccount } from 'abstractionkit';
import {
  createPasskey,
  isLocalStoragePasskey,
  PasskeyLocalStorageFormat,
  toLocalStorageFormat,
} from '../../lib/passkeys';
import { getItem, setItem } from '../../lib/storage';
import { hexStringToUint8Array } from '../../utils';

type Status = 'idle' | 'loading' | 'authenticated' | 'error';

@Component({
  selector: 'vit-passkey',
  templateUrl: './vit-passkey.component.html',
  styleUrl: './vit-passkey.component.scss',
})
export class VitPasskeyComponent implements OnInit {
  @Output() readonly authenticated = new EventEmitter<PasskeyLocalStorageFormat>();

  status: Status = 'idle';
  errorMessage?: string;
  passkey?: PasskeyLocalStorageFormat;
  accountAddress?: string;

  ngOnInit() {
    const stored = getItem('passkey');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored, (_key, value) =>
        typeof value === 'string' && /^0x[0-9a-fA-F]+$/.test(value) && (_key === 'x' || _key === 'y')
          ? BigInt(value)
          : value,
      );
      if (isLocalStoragePasskey(parsed)) {
        this.adopt(parsed);
      }
    } catch {
      // Stored passkey is corrupt — fall back to idle (re-create flow).
    }
  }

  get hasStoredPasskey(): boolean {
    return !!this.passkey;
  }

  async onCreate(): Promise<void> {
    this.status = 'loading';
    this.errorMessage = undefined;
    try {
      const credential = await createPasskey();
      const stored = toLocalStorageFormat(credential);
      setItem('passkey', stored);
      this.adopt(stored);
    } catch (error) {
      this.status = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  async onUnlock(): Promise<void> {
    if (!this.passkey) return;
    this.status = 'loading';
    this.errorMessage = undefined;
    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            {
              type: 'public-key',
              id: hexStringToUint8Array(this.passkey.rawId),
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });
      if (!assertion) throw new Error('Authentication cancelled');
      this.adopt(this.passkey);
    } catch (error) {
      this.status = 'error';
      this.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  private adopt(passkey: PasskeyLocalStorageFormat): void {
    this.passkey = passkey;
    this.accountAddress = SafeAccount.createAccountAddress([passkey.pubkeyCoordinates]);
    setItem('accountAddress', this.accountAddress);
    this.status = 'authenticated';
    this.authenticated.emit(passkey);
  }
}
