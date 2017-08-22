import {ModuleWithProviders}  from '@angular/core';
import {Routes, RouterModule} from '@angular/router';

// All application page components
import {AuthGuard} from './components/guards/authGuard';
import {LoginComponent} from './components/pages/login';
import {SignupComponent} from './components/pages/signup';
import {ProfileComponent} from './components/pages/profile';
import {NotFoundComponent} from './components/pages/notFound';
import {LoginHelpComponent} from './components/pages/loginHelp';
import {TranscriptComponent} from './components/pages/transcript';
import {PrivacyPolicyComponent} from './components/pages/privacyPolicy';
import {VerifyAccountComponent} from './components/pages/verifyAccount';
import {PasswordResetComponent} from './components/pages/passwordReset';
import {TermsOfServiceComponent} from './components/pages/termsOfService';
import {LoginRedirectGuard} from './components/guards/loginRedirectGuard';

// Define application routes and associated page components
const appRoutes: Routes = [{
    // Root route (on index page)
    path: '',
    pathMatch: 'full',
    redirectTo: '/login'
},{
    path: 'login',
    component: LoginComponent,
    canActivate: [LoginRedirectGuard]
},{
    path: 'login/help',
    component: LoginHelpComponent
},{
    path: 'signup',
    component: SignupComponent
},{
    path: 'profile',
    canActivate: [AuthGuard],
    component: ProfileComponent
},{
    path: 'verify/:token',
    component: VerifyAccountComponent
},{
    path: 'reset/:token',
    component: PasswordResetComponent
},{
    path: 'transcript/:id',
    canActivate: [AuthGuard],
    component: TranscriptComponent
},{
    path: 'about/privacy',
    component: PrivacyPolicyComponent
},{
    path: 'about/tos',
    component: TermsOfServiceComponent
},{
    // All other routes (not matching any above)
    path: '**',
    component: NotFoundComponent
}];

export const Router: ModuleWithProviders = RouterModule.forRoot(appRoutes);
