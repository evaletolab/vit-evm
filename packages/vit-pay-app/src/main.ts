import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';

import { AppModule } from './app/app.module';


setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.17.1/cdn/');
// setBasePath('/node_modules/@shoelace-style/shoelace/dist/');
platformBrowserDynamic().bootstrapModule(AppModule, {
  ngZoneEventCoalescing: true
})
  .catch(err => console.error(err));
