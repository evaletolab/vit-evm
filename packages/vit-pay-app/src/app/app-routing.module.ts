import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

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
import { requireWalletGuard } from './wallet/wallet.guard';



const routes: Routes = [
  { path: '', component: PageHomeComponent, pathMatch: 'full', canActivate: [requireWalletGuard] },
  { path: 'account', component: PageAccountComponent, canActivate: [requireWalletGuard] },
  { path: 'buy', component: PageBuyComponent, canActivate: [requireWalletGuard] },
  { path: 'sent', component: PageSentComponent, canActivate: [requireWalletGuard] },
  { path: 'txs', component: PageTransactionsComponent, canActivate: [requireWalletGuard] },
  { path: 'wallet', component: PageWalletComponent },
  { path: 'contacts', component: PageContactsComponent, canActivate: [requireWalletGuard] },
  { path: 'links', component: PageLinksComponent, canActivate: [requireWalletGuard] },
  { path: 'iban', component: PageIbanComponent, canActivate: [requireWalletGuard] },
  { path: 'claim', component: PageClaimComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
