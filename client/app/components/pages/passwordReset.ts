import {Component, ViewChild} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';
import {UtilityService} from '../../services/utility';

@Component({
    templateUrl: '../../templates/pages/passwordReset.html'
})

export class PasswordResetComponent{
    // Declare instance variables
    private isButtonActive: boolean;
    public passwordResetForm: FormGroup;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private utilityService: UtilityService,
        private accountService: AccountService
    ){
        // Initialize instance variables
        this.isButtonActive = false;
        this.passwordResetForm = this.formBuilder.group({
            password: [
                '',
                [
                    Validators.required,
                    Validators.pattern(this.commonService.getRGXPassword())
                ]
            ],
            confirmPassword: [
                '',
                [
                    Validators.required
                ]
            ]
        },{
            validator: this.utilityService.matchValidator(
                'password',
                'confirmPassword'
            )
        });
    }

    private onSubmit(){
        // Obtain token from URL
        let token = this.route.snapshot.params['token'];
        // Ensure that the form is valid and the button is not active
        if (this.passwordResetForm.valid && !this.isButtonActive){
            this.isButtonActive = true;
            // Reset user's password
            this.accountService
                .doPasswordReset(this.passwordResetForm.value, token)
                .then(() => {
                    this.isButtonActive = false;
                    // Show notification on success
                    toastr.success(
                        this.commonService.getUXClientMessage('MSG_PASS_RESET'),
                        'Notification',
                        // Navigate to login page when closed
                        {onHidden: () => {this.router.navigate(['/login'])}}
                    );
                }, (errorCode: string) => {
                    this.isButtonActive = false;
                    // Show error
                    toastr.error(
                        this.commonService.getUXServerError(errorCode),
                        'Uh Oh...'
                    );
                });
        }
    }
}
