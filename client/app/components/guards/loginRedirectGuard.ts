import {Injectable, ViewChild} from '@angular/core';
import {Router, CanActivate} from '@angular/router';

// Declare external JS libraries
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';

@Injectable()
export class LoginRedirectGuard implements CanActivate{

    constructor(
        private router: Router,
        private commonService: CommonService,
        private accountService: AccountService
    ){}

    public canActivate(){
        // Check if user is authenticated
        return this.accountService.doAuthCheck().then(() => {
            // Redirect to the profile page if authenticated and return false
            this.router.navigate(['/profile']);
            return false;
        }, (errorCode: string) => {
            // Return true if user is not yet authenticated
            if (errorCode === 'ER_COOKIE_EXP'){
                this.accountService.doLogout();
                toastr.error(
                    this.commonService.getUXServerError(errorCode),
                    'Uh Oh...'
                );
            }
            return true;
        });
    }
}
