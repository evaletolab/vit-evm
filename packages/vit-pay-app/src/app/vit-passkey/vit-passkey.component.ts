import { Component, Input } from '@angular/core';
import { SafeAccountV0_3_0 as SafeAccount } from 'abstractionkit';
import { createPasskey, PasskeyLocalStorageFormat, toLocalStorageFormat } from '../../lib/passkeys';
import { setItem } from '../../lib/storage';

const chainName = process.env['NG_APP_CHAIN_NAME'];

@Component({
  selector: 'vit-vit-passkey',
  templateUrl: './vit-passkey.component.html',
  styleUrl: './vit-passkey.component.scss'
})
export class VitPasskeyComponent {
  @Input() passkey?: PasskeyLocalStorageFormat;

  get getAccountAddress(): string | undefined {
    if (!this.passkey) return undefined;

    const accountAddress = SafeAccount.createAccountAddress([this.passkey.pubkeyCoordinates]);
    setItem('accountAddress', accountAddress);

    return accountAddress;
  }


  async handleCreatePasskeyClick() {
		try {
			const passkey = await createPasskey();

		  (toLocalStorageFormat(passkey));
		} catch (error) {
			if (error instanceof Error) {
				// setError(error.message);
			} else {
				// setError("Unknown error");
			}
		}
	};  
}
