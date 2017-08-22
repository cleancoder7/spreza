import {Router} from '@angular/router';
import {Component, ViewChild} from '@angular/core';
import {ModalComponent} from 'ng2-bs3-modal/ng2-bs3-modal';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var toastr: any;
declare var jQuery: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {AccountService} from '../../services/account';

@Component({
    selector: 'navbar',
    templateUrl: '../../templates/parts/navbar.html'
})

export class NavbarComponent{
    // Declare instance variables
    private isAuth: boolean;
    private accountName: string;
    public feedbackForm: FormGroup;
    private isButtonActive: boolean;

    // Bind variable to child component
    @ViewChild('feedbackModalReference')
    private feedbackModal: ModalComponent;

    constructor(
        private router: Router,
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private accountService: AccountService
    ){
        // Initialize instance variables
        this.isAuth = false;
        this.accountName = '';
        this.isButtonActive = false;
        this.feedbackForm = this.formBuilder.group({
            feedback: [
                '',
                [
                    Validators.required
                ]
            ]
        });
    }

    // Executed when component is initialized
    ngOnInit(){
        // Obtain current session's user's account name
        this.accountService
            .getCurrentUserDetails()
            .then((userDetails) => {
                this.isAuth = true;
                this.accountName = userDetails.name || 'My Account';
            }, () => {});
    }

    private onClickFeedback(){
        this.feedbackModal.open();
    }

    private onSubmitFeedback(){
        // Ensure that the form is valid and the button is not active
        if (this.feedbackForm.valid && !this.isButtonActive){
            // Execute send feedback service with form data
            this.isButtonActive = true;
            this.accountService
                .sendUserFeedback(this.feedbackForm.value).then(() => {
                    this.feedbackModal.close();
                    this.isButtonActive = false
                    // Show notification on success
                    toastr.success(
                        this.commonService.getUXClientMessage('MSG_FEEDBACK'),
                        'Notification'
                    );
                }, (errorCode: string) => {
                    this.feedbackModal.close();
                    this.isButtonActive = false;
                    // Show error
                    toastr.error(
                        this.commonService.getUXServerError(errorCode),
                        'Uh Oh...'
                    );
                });
        }
    }

    private logout(){
        this.accountService
            .doLogout()
            .then(() => {
                this.router.navigate(['/login']);
            }, (errorCode: string) => {
                // Show error
                    toastr.error(
                        this.commonService.getUXServerError(errorCode),
                        'Uh Oh...'
                    );
            });
    }
}
