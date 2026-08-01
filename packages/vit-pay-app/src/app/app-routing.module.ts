import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { environment } from '../environments/environment';

// Pages
import { PageHomeComponent } from './pages/page-home/page-home.component';
import { PageBuyComponent } from './pages/page-buy/page-buy.component';
import { PageAccountComponent } from './pages/page-account/page-account.component';
import { PageSentComponent } from './pages/page-sent/page-sent.component';
import { PageTransactionsComponent } from './pages/page-transactions/page-transactions.component';
import { PageWalletComponent } from './pages/page-wallet/page-wallet.component';
import { PageContactsComponent } from './pages/page-contacts/page-contacts.component';
import { PageLinksComponent } from './pages/page-links/page-links.component';
import { PageClaimComponent } from './pages/page-claim/page-claim.component';
import { PageIbanComponent } from './pages/page-iban/page-iban.component';
import { PageDevicesComponent } from './pages/page-devices/page-devices.component';
import { PageRecoveryComponent } from './pages/page-recovery/page-recovery.component';
import { PageRequestComponent } from './pages/page-request/page-request.component';
import { PageVaultComponent } from './pages/page-vault/page-vault.component';
import { PageRestoreComponent } from './pages/page-restore/page-restore.component';
import { requireWalletGuard, devOnlyGuard } from './wallet/wallet.guard';

const routes: Routes = [
  { path: '', component: PageHomeComponent, pathMatch: 'full', canActivate: [requireWalletGuard] },
  { path: 'account', component: PageAccountComponent, canActivate: [requireWalletGuard] },
  { path: 'buy', component: PageBuyComponent, canActivate: [requireWalletGuard] },
  { path: 'request', component: PageRequestComponent, canActivate: [requireWalletGuard] },
  { path: 'sent', component: PageSentComponent, canActivate: [requireWalletGuard] },
  { path: 'txs', component: PageTransactionsComponent, canActivate: [requireWalletGuard] },
  { path: 'wallet', component: PageWalletComponent, canActivate: [devOnlyGuard] },
  { path: 'contacts', component: PageContactsComponent, canActivate: [requireWalletGuard] },
  { path: 'links', component: PageLinksComponent, canActivate: [requireWalletGuard] },
  { path: 'iban', component: PageIbanComponent, canActivate: [requireWalletGuard] },
  { path: 'devices', component: PageDevicesComponent, canActivate: [requireWalletGuard] },
  { path: 'recovery', component: PageRecoveryComponent, canActivate: [requireWalletGuard] },
  { path: 'claim', component: PageClaimComponent },
  // Identité <nom>@3vit.ch — après les routes plates (mots réservés).
  { path: ':name/vault', component: PageVaultComponent },
  { path: ':name/restore', component: PageRestoreComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: environment.hashRoute })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
