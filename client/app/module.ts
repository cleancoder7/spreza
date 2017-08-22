import {NgModule} from '@angular/core';
import {HttpModule} from '@angular/http';
import {PopoverModule} from 'ng2-popover';
import {BrowserModule} from '@angular/platform-browser';
import {Ng2Bs3ModalModule} from 'ng2-bs3-modal/ng2-bs3-modal';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

// All components used by the application
import {RootComponent} from './components/root';
import {AuthGuard} from './components/guards/authGuard';
import {LoginComponent} from './components/pages/login';
import {FooterComponent} from './components/parts/footer';
import {SignupComponent} from './components/pages/signup';
import {NavbarComponent} from './components/parts/navbar';
import {ProfileComponent} from './components/pages/profile';
import {NotFoundComponent} from './components/pages/notFound';
import {LoginHelpComponent} from './components/pages/loginHelp';
import {TranscriptComponent} from './components/pages/transcript';
import {PrivacyPolicyComponent} from './components/pages/privacyPolicy';
import {VerifyAccountComponent} from './components/pages/verifyAccount';
import {PasswordResetComponent} from './components/pages/passwordReset';
import {TermsOfServiceComponent} from './components/pages/termsOfService';
import {LoginRedirectGuard} from './components/guards/loginRedirectGuard';

// All services used by the application
import {CommonService} from './services/common';
import {UtilityService} from './services/utility';
import {AccountService} from './services/account';
import {TranscriptService} from './services/transcript';

// Application's router
import {Router} from './router';

// Define module and link all associated components, services and router
@NgModule({
    imports: [
        Router,
        HttpModule,
        FormsModule,
        PopoverModule,
        BrowserModule,
        Ng2Bs3ModalModule,
        ReactiveFormsModule
    ],
    declarations: [
        RootComponent,
        LoginComponent,
        SignupComponent,
        NavbarComponent,
        FooterComponent,
        ProfileComponent,
        NotFoundComponent,
        LoginHelpComponent,
        TranscriptComponent,
        VerifyAccountComponent,
        PasswordResetComponent,
        PrivacyPolicyComponent,
        TermsOfServiceComponent
    ],
    providers: [
        AuthGuard,
        CommonService,
        UtilityService,
        AccountService,
        TranscriptService,
        LoginRedirectGuard
    ],
    bootstrap: [RootComponent]
})

export class AppModule{}
