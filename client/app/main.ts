import {Config} from './config';
import {AppModule} from './module';
import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

if (Config.ENV === 'PROD'){
    // Enable production mode for server depolyment
    enableProdMode();
}
// Bootstrap the application module to web page
let appRef = platformBrowserDynamic().bootstrapModule(AppModule);
