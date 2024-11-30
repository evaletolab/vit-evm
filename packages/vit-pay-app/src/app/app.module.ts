import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { CodeInputModule } from 'angular-code-input';
import { VitPinComponent } from './vit-pin/vit-pin.component';
import { PageAccountComponent } from './pages/page-account/page-account.component';
import { PageSentComponent } from './pages/page-sent/page-sent.component';
import { PageTransactionsComponent } from './pages/page-transactions/page-transactions.component';
import { PageBuyComponent } from './pages/page-buy/page-buy.component';
import { VitMintComponent } from './vit-mint/vit-mint.component';
import { VitPasskeyComponent } from './vit-passkey/vit-passkey.component';


@NgModule({
  declarations: [
    AppComponent,
    VitPinComponent,
    PageAccountComponent,
    PageSentComponent,
    PageTransactionsComponent,
    PageBuyComponent,
    VitMintComponent,
    VitPasskeyComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CodeInputModule.forRoot({
      codeLength: 6,
      isCharsCode: true,
      code: 'abcdef'
    }),    
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
