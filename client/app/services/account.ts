import {Injectable} from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';

// Module that creates promises
import 'rxjs/add/operator/toPromise';

@Injectable()

export class AccountService{
    // Declare instance variables
    private API_USER: string;
    private API_USER_SESSION: string;
    private API_USER_RESETER: string;
    private API_USER_VERIFIER: string;
    private API_USER_SETTINGS: string;
    private API_USER_FEEDBACK: string;
    private headers = new Headers({
        'Content-Type': 'application/json'
    });
    private options = new RequestOptions({
        'headers': this.headers
    });

    constructor(private httpService: Http){
        // Initialize instance variables
        this.API_USER = 'api/user';
        this.API_USER_SESSION = 'api/user/session';
        this.API_USER_RESETER = 'api/user/reseter';
        this.API_USER_VERIFIER = 'api/user/verifier';
        this.API_USER_SETTINGS = 'api/user/settings';
        this.API_USER_FEEDBACK = 'api/user/feedback';
    }

    private errorHandler(error: any){
        return Promise.reject(error.json().errorCode);
    }

    private dataHandler(res: any){
        return res.json();
    }

    public doAuthCheck(){
        // Execute http put request on session route to check authentication
        return this.httpService
            .put(this.API_USER_SESSION, '', this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public getCurrentUserDetails(){
        // Execute http get request on the user route to obtain details
        return this.httpService
            .get(this.API_USER)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public doLogin(formData: any){
        // Create body for the post request
        let body = JSON.stringify(formData);
        // Execute http post request on session route to create session cookie
        return this.httpService
            .post(this.API_USER_SESSION, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public doLogout(){
        // Execute http delete request on session route to del session cookie
        return this.httpService
            .delete(this.API_USER_SESSION)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public doRegister(formData: any){
        // Create body for the post request
        let body = JSON.stringify(formData);
        // Execute http post request on user route to create a new user
        return this.httpService
            .post(this.API_USER, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public doVerify(token: string){
        // Create body for the post request
        let body = JSON.stringify({
            'token': token
        });
        // Execute http post request on the verifier route to veirfy the user
        return this.httpService
            .put(this.API_USER_VERIFIER, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public doPasswordReset(data: any, token: string){
        // Create the body for the post request
        data.token = token;
        let body = JSON.stringify(data);
        // Execute http post request on the rester route to reset password
        return this.httpService
            .put(this.API_USER_RESETER, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public sendUserFeedback(formData: any){
        // Create body for the post request
        let body = JSON.stringify(formData);
        // Execute http post request on the feedback route to send feedback
        return this.httpService
            .post(this.API_USER_FEEDBACK, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public sendVerificationEmail(formData: any){
        // Create body for the post request
        let body = JSON.stringify(formData);
        // Execute http post request on the verifer emailer route to send email
        return this.httpService
            .post(this.API_USER_VERIFIER, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public sendPasswordResetEmail(formData: any){
        // Create body for the post request
        let body = JSON.stringify(formData);
        // Execute http post request on the reseter emailer route to send email
        return this.httpService
            .post(this.API_USER_RESETER, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public getSettings(){
        // Execute http get request on settings route to get user settings
        return this.httpService
            .get(this.API_USER_SETTINGS)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public updateSetting(settingKey: string, settingValue: any){
        // Create body for the put request
        let body = {};
        body[settingKey] = settingValue;
        body = JSON.stringify(body);
        // Exeute http put request on settings route to update settings
        return this.httpService
            .put(this.API_USER_SETTINGS, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }
}
