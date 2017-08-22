import {Router} from '@angular/router';
import {Component, ViewChild} from '@angular/core';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';

@Component({
    templateUrl: '../../templates/pages/loginHelp.html'
})

export class LoginHelpComponent{
    // Declare instance variable
    private isButtonActive: boolean;
    public accountServiceForm: FormGroup;

    constructor(
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private accountService: AccountService
    ){
        // Initialize instance variables
        this.isButtonActive = false;
        this.accountServiceForm = this.formBuilder.group({
            email: [
                '',
                [
                    Validators.required,
                    Validators.pattern(this.commonService.getRGXEmail())
                ]
            ],
            service: [
                '~',
                [
                    Validators.required
                ]
            ]
        });
    }

    private onSubmit(){
        // Ensure that the form is valid and the button is not active
        if (
            this.accountServiceForm.valid
            && !this.isButtonActive
            && this.accountServiceForm.controls['service'].value !== '~'
        ){
            this.isButtonActive = true;
            // Determine the type of email to send based on service
            if (this.accountServiceForm.controls['service'].value === 'RESET'){
                // Send password reset email
                this.sendPasswordResetEmail();
            } else {
                // Send account verification email
                this.sendVerificationEmail();
            }
        }
    }

    private sendPasswordResetEmail(){
        this.accountService
            .sendPasswordResetEmail(this.accountServiceForm.value)
            .then(() => {
                this.isButtonActive = false;
                // Show notification on success
                toastr.success(
                    this.commonService.getUXClientMessage('MSG_SEND_RESET'),
                    'Notification'
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

    private sendVerificationEmail(){
        this.accountService
            .sendVerificationEmail(this.accountServiceForm.value)
            .then(() => {
                this.isButtonActive = false;
                // Show notification on success
                toastr.success(
                    this.commonService.getUXClientMessage('MSG_SEND_RESET'),
                    'Notification'
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
