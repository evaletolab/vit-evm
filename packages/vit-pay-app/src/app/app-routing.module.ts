import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Pages
import { PageBuyComponent } from './pages/page-buy/page-buy.component';
import { PageAccountComponent } from './pages/page-account/page-account.component';
import { PageSentComponent } from './pages/page-sent/page-sent.component';
import { PageTransactionsComponent } from './pages/page-transactions/page-transactions.component';



const routes: Routes = [
  { path: 'account', component: PageAccountComponent },
  { path: 'buy', component: PageBuyComponent },
  { path: 'sent', component: PageSentComponent },
  { path: 'txs', component: PageTransactionsComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
