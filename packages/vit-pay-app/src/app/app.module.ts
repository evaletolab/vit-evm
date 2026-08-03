import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
import { IntlTelDirective } from './shared/intl-tel.directive';
import { WalletStorageService } from './wallet/wallet-storage.service';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { PageHomeComponent } from './pages/page-home/page-home.component';
import { PageAccountComponent } from './pages/page-account/page-account.component';
import { PageSentComponent } from './pages/page-sent/page-sent.component';
import { PageTransactionsComponent } from './pages/page-transactions/page-transactions.component';
import { PageBuyComponent } from './pages/page-buy/page-buy.component';
import { PageWalletComponent } from './pages/page-wallet/page-wallet.component';
import { PageContactsComponent } from './pages/page-contacts/page-contacts.component';
import { PageContactsAccessComponent } from './pages/page-contacts-access/page-contacts-access.component';
import { PageLinksComponent } from './pages/page-links/page-links.component';
import { PageClaimComponent } from './pages/page-claim/page-claim.component';
import { PageIbanComponent } from './pages/page-iban/page-iban.component';
import { PageDevicesComponent } from './pages/page-devices/page-devices.component';
import { PageRecoveryComponent } from './pages/page-recovery/page-recovery.component';
import { PageRequestComponent } from './pages/page-request/page-request.component';
import { PageVaultComponent } from './pages/page-vault/page-vault.component';
import { PageRestoreComponent } from './pages/page-restore/page-restore.component';
import { VitMintComponent } from './vit-mint/vit-mint.component';
import { VitPasskeyComponent } from './vit-passkey/vit-passkey.component';
import { TxOverlayComponent } from './wallet/tx-overlay.component';
import { AmountFieldComponent } from './shared/amount-field.component';


@NgModule({
  declarations: [
    AppComponent,
    PageHomeComponent,
    PageAccountComponent,
    PageSentComponent,
    PageTransactionsComponent,
    PageBuyComponent,
    PageWalletComponent,
    PageContactsComponent,
    PageContactsAccessComponent,
    PageLinksComponent,
    PageClaimComponent,
    PageIbanComponent,
    PageDevicesComponent,
    PageRecoveryComponent,
    PageRequestComponent,
    PageVaultComponent,
    PageRestoreComponent,
    VitMintComponent,
    VitPasskeyComponent,
    TxOverlayComponent,
    AmountFieldComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    IntlTelDirective,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (storage: WalletStorageService) => () => storage.init(),
      deps: [WalletStorageService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
