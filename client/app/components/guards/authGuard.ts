import {Injectable} from '@angular/core';
import {Router, CanActivate} from '@angular/router';

// Services used by this component
import {AccountService} from '../../services/account';

@Injectable()
export class AuthGuard implements CanActivate{

    constructor(
        private router: Router,
        private accountService: AccountService
    ){}

    public canActivate(){
        // Check if user is authenticated
        return this.accountService.doAuthCheck().then(() => {
            // Return true of user is authenticated
            return true;
        }, () => {
            // Redirect to the login page if not authenticated and return false
            this.router.navigate(['/login']);
            return false;
        });
    }
}