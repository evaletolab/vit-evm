import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
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
import { PageLinksComponent } from './pages/page-links/page-links.component';
import { PageClaimComponent } from './pages/page-claim/page-claim.component';
import { PageIbanComponent } from './pages/page-iban/page-iban.component';
import { VitMintComponent } from './vit-mint/vit-mint.component';
import { VitPasskeyComponent } from './vit-passkey/vit-passkey.component';


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
    PageLinksComponent,
    PageClaimComponent,
    PageIbanComponent,
    VitMintComponent,
    VitPasskeyComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
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
