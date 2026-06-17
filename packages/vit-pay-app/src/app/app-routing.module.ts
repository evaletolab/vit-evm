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



const routes: Routes = [
  { path: '', component: PageHomeComponent, pathMatch: 'full' },
  { path: 'account', component: PageAccountComponent },
  { path: 'buy', component: PageBuyComponent },
  { path: 'sent', component: PageSentComponent },
  { path: 'txs', component: PageTransactionsComponent },
  { path: 'wallet', component: PageWalletComponent },
  { path: 'contacts', component: PageContactsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
