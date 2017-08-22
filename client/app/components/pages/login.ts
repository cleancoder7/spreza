import {Router} from '@angular/router';
import {Component, ViewChild} from '@angular/core';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';

@Component({
    templateUrl: '../../templates/pages/login.html'
})

export class LoginComponent{
    // Declare instance variables
    public loginForm: FormGroup;
    private isButtonActive: boolean;

    constructor(
        private router: Router,
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private accountService: AccountService
    ){
        // Initialize instance variables
        this.isButtonActive = false;
        this.loginForm = this.formBuilder.group({
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
            ]
        });
    }

    // Login submit button event
    public onSubmit(){
        // Ensure that the form is valid and the button is not active
        if (this.loginForm.valid && !this.isButtonActive){
            // Execute login service with form data
            this.isButtonActive = true;
            this.accountService
                .doLogin(this.loginForm.value).then((data: any) => {
                    this.isButtonActive = false;
                    // Redirect to profile page
                    this.router.navigate(['/profile']);
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
