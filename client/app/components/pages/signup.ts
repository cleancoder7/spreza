import {Router} from '@angular/router';
import {Component, ViewChild} from '@angular/core';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';
import {UtilityService} from '../../services/utility';

@Component({
    templateUrl: '../../templates/pages/signup.html'
})

export class SignupComponent{
    // Declare instance variables
    public signupForm: FormGroup;
    private isButtonActive: boolean;

    constructor(
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private utilityService: UtilityService,
        private accountService: AccountService
    ){
        // Initialize instance variables
        this.isButtonActive = false;
        this.signupForm = this.formBuilder.group({
            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(3)
                ]
            ],
            email: [
                '',
                [
                    Validators.required,
                    Validators.pattern(this.commonService.getRGXEmail())
                ]
            ],
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

    // Signup submit button event function
    private onSubmit(){
        // Ensure that the form is valid
        if (this.signupForm.valid && !this.isButtonActive){
            this.isButtonActive = true;
            // Execute signup service with form data
            this.accountService
                .doRegister(this.signupForm.value)
                .then(() => {
                    // Send new account verification email to the user
                    this.sendVerificationEmail();
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

    private sendVerificationEmail(){
        this.accountService
            .sendVerificationEmail({
                'email': this.signupForm.controls['email'].value
            }).then(() => {
                this.isButtonActive = false;
                // Show notification on success
                toastr.success(
                    this.commonService.getUXClientMessage('MSG_SIGNED_UP'),
                    'Notification'
                );
            });
    }
}
