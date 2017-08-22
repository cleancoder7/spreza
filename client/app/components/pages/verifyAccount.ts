import {Component} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';

// Services used by this component
import {AccountService} from '../../services/account';
import {UtilityService} from '../../services/utility';

@Component({
    templateUrl: '../../templates/pages/verifyAccount.html'
})

export class VerifyAccountComponent{

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private utilityService: UtilityService,
        private accountService: AccountService
    ){}

    // Executed when component is initialized
    ngOnInit(){
        // Obtain token from URL and validate it to verify the user
        this.accountService
            .doVerify(this.route.snapshot.params['token'])
            .then(() => {
                // Wait 3 seconds and redirect to login page after success
                this.utilityService.waitAndRedirect(3, this.router, '/login');
            }, () => {
                // Redirect to 404 after failure
                this.router.navigate(['/404']);
            });
    }
}
