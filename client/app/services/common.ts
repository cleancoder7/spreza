import {Injectable} from '@angular/core';

@Injectable()

export class CommonService{
    // Declare instance variables
    private RGX_EMAIL: string;
    private RGX_PASSWORD: string;
    private COMM_ERROR: string;
    private RGX_REMOTE_LINK: string;
    private UX_SERVER_ERROR_MAP: any;
    private UX_CLIENT_MESSAGE_MAP: any;

    constructor(){
        // Initialize instance variables
        this.RGX_EMAIL = `^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$`;
        this.RGX_PASSWORD = `^(?=.*[0-9])(?=.*[A-Za-z]).{8,}$`;
        this.COMM_ERROR = `Could not communicate with the server.<br>Please try
            again later. If this problem persists, please contact us at
            <a href="mailto:info@spreza.co">info@spreza.co</a>.`;
        /* Create the video link regex from the Soundcloud, Vimeo and YouTube 
        regexes */
        let R_VIM = `(http\:\/\/|https\:\/\/)?(www\.)?(vimeo\.com\/)([0-9]+)`;
        let R_YT = `(https?\:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+`;
        let R_SC = `(https?\:\/\/)?(soundcloud\.com)\/.+`;
        this.RGX_REMOTE_LINK = `^` + R_VIM + `|` + R_YT + `|` + R_SC + `$`;
        // Create UX server error messages and map them
        let ER_SERVER = `An internal server error occurred, please contact us at
            <a href="mailto:info@spreza.co">info@spreza.co</a>.`;
        let ER_USER_EXISTS = `That email is already taken by an existing
            user.<br>Please try again with a different email.`;
        let ER_TOKEN_INVALID = `Your password reset link has expired.<br>Please
            click <a href="/login/help">here</a> to obtain a new password
            reset email.`;
        let ER_NO_USER = `You have not yet signed up with Spreza.<br>Please
            click <a href="/signup">here</a> to sign up for your free account.`;
        let ER_USER_NOT_VERIFIED = `Your account is not yet verified. Please
            check your inbox for a verification email in order to verify your
            account. Please <a href="/login/help">click</a> here to obtain
            a new verification email.`
        let ER_WRONG_PASSWORD = `Incorrect password, please try again.<br>If
            this problem persists, please click <a href="/login/help">
            here</a> for assistance.`;   
        let ER_USER_VERIFIED = `Your account is already verified.`;
        let ER_COOKIE_EXP = `Your session has expired. Please login again to
            continue.`;
        this.UX_SERVER_ERROR_MAP = {
            'ER_SERVER': ER_SERVER,
            'ER_USER_EXISTS': ER_USER_EXISTS,
            'ER_TOKEN_INVALID': ER_TOKEN_INVALID,
            'ER_NO_USER': ER_NO_USER,
            'ER_USER_NOT_VERIFIED': ER_USER_NOT_VERIFIED,
            'ER_WRONG_PASSWORD': ER_WRONG_PASSWORD,
            'ER_USER_VERIFIED': ER_USER_VERIFIED,
            'ER_COOKIE_EXP': ER_COOKIE_EXP
        };
        // Create UX client messages and map them
        let MSG_SEND_RESET = `A new password reset email has been successfully
            sent. Please check your inbox for the email.`;
        let MSG_SEND_VERIFY = `A new verification email has been successfully
            sent. Please check your inbox for the email.`;
        let MSG_PASS_RESET = `Your Spreza account's password has been
            successfully reset.`;
        let MSG_SIGNED_UP = `Thank you for registering with Spreza. Please
            check your inbox for an email with further instructions on how to
            verify your account.`;
        let ERR_PERMITTED_FILE = `Some of your selected file(s) cannot be
            staged for upload. Please select files of the following formats:
            MP3, OGG, WAV, FLAC, M4A, FLV, MP4, AVI, WEBM or MPEG.`;
        let MSG_FEEDBACK = `Thank You for your feedback.`;
        let MSG_TRANSCRIPT_COPIED = `Your transcript has been copied to the
            clipboard.`;
        let MSG_TRANSCRIPT_SAVED = `Your transcript has been saved
            successfully.`;
        this.UX_CLIENT_MESSAGE_MAP = {
            'MSG_FEEDBACK': MSG_FEEDBACK,
            'MSG_SIGNED_UP': MSG_SIGNED_UP,
            'MSG_SEND_RESET': MSG_SEND_RESET,
            'MSG_PASS_RESET': MSG_PASS_RESET,
            'MSG_SEND_VERIFY': MSG_SEND_VERIFY,
            'ERR_PERMITTED_FILE': ERR_PERMITTED_FILE,
            'MSG_TRANSCRIPT_SAVED': MSG_TRANSCRIPT_SAVED,
            'MSG_TRANSCRIPT_COPIED': MSG_TRANSCRIPT_COPIED
        };
    }

    public getRGXEmail(){
        return this.RGX_EMAIL;
    }

    public getRGXPassword(){
        return this.RGX_PASSWORD;
    }

    public getRGXRemoteLink(){
        return this.RGX_REMOTE_LINK;
    }

    public getUXServerError(serverError: string){
        return this.UX_SERVER_ERROR_MAP[serverError] || this.COMM_ERROR;
    }

    public getUXClientMessage(clientMessage: string){
        return this.UX_CLIENT_MESSAGE_MAP[clientMessage];
    }
}
