import {UUID} from 'angular2-uuid';
import {Router} from '@angular/router';
import {Component, ViewChild, ViewChildren} from '@angular/core';
import {FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';

// Declare external JS libraries
declare var io: any;
declare var toastr: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {UtilityService} from '../../services/utility';
import {AccountService} from '../../services/account';
import {TranscriptService} from '../../services/transcript';

@Component({
    templateUrl: '../../templates/pages/profile.html'
})

export class ProfileComponent{
    // Declare instance variables
    private statusSocket: any;
    private isLoadingTable: boolean;
    private isDropHovering: boolean;
    private isProfileTipsOn: boolean;
    private uploadLinkForm: FormGroup;
    private permittedMimes: Array<string>;
    private transcriptDataList: Array<any>;
    private pendingUploadsDataSet: Array<any>;

    // Bind variable to child elements in the DOM
    @ViewChild('fileInputReference')
    private fileInput: any;
    @ViewChildren('transcriptNameInputReference')
    private transcriptNameField: any;

    constructor(
        private router: Router,
        private formBuilder: FormBuilder,
        private commonService: CommonService,
        private utilityService: UtilityService,
        private accountService: AccountService,
        private transcriptService: TranscriptService
    ){
        // Initialize instance variables
        this.isDropHovering = false;
        this.isLoadingTable = true;
        this.isProfileTipsOn = false;
        this.transcriptDataList = [];
        this.pendingUploadsDataSet = [];
        this.uploadLinkForm = this.formBuilder.group({
            link: [
                '',
                [
                    Validators.required,
                    Validators.pattern(this.commonService.getRGXRemoteLink())
                ]
            ]
        });
        // Create the permitted formats list and MIME types
        this.permittedMimes = [
            'audio/wav',
            'audio/mp3',
            'audio/mpeg',
            'audio/ogg',
            'audio/flac',
            'video/ogg',
            'video/m4a',
            'video/flv',
            'video/mp4',
            'video/avi',
            'video/webm',
            'video/mpeg'
        ];
        // Initialize websocket for backend to frontend realtime communication
        this.statusSocket = io();
        this.statusSocket.on('refresh', () => {
            // Update transcript table when 'refresh' received from backend
            this.updateTranscriptTable();
        });
    }

    // Execute when component is initialized
    ngOnInit(){
        // Load settings and update transcript table
        this.loadUserSettings();
        this.updateTranscriptTable();
    }

    private loadUserSettings(){
        this.accountService
            .getSettings()
            .then((res: any) => {
                // Get value of setting from the user's settings
                this.isProfileTipsOn = res['profileHelpTipsOn'];
            }, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private processErrors(errorCode: string){
        // If session expired then redirect to login
        if (errorCode === 'ER_COOKIE_EXP' || errorCode === 'ER_NO_COOKIE'){
            this.router.navigate(['/login']);
        } else {
            // Display all other errors
            toastr.error(
                this.commonService.getUXServerError(errorCode),
                'Uh Oh...'
            );
        }
    }

    private onProfileTipsClose(){
        this.isProfileTipsOn = false;
        this.accountService
            .updateSetting('profileHelpTipsOn', false)
            .then(() => {}, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private onConfirmLink(){
        // Ensure that the form is valid
        if (this.uploadLinkForm.valid){
            // Obtain the link from the form
            let link = this.uploadLinkForm.controls['link'].value;
            let origin = 'youtube-play';
            // Set the origin to vimeo if the url is a vimeo link
            if (link.includes('vimeo')){
                origin = 'vimeo';
            }
            // Or to soundcloud if it's from soundcloud
            if (link.includes('soundcloud')){
                origin = 'soundcloud';
            }
            // Populate pending uploads data list with link and origin
            this.pendingUploadsDataSet.push({
                'id': UUID.UUID(),
                'link': link,
                'origin': origin,
                'isNameValid': true,
                'isUploading': false
            });
            // Clear the video upload link forum
            this.uploadLinkForm.reset();
        }
    }

    private onDropOver(event: any){
        // Enable drop zone hovering style
        this.isDropHovering = true;
        this.utilityService.stopEvent(event);
    }

    private onDropLeave(event: any){
        // Disable the drop zone hovering style
        this.isDropHovering = false;
        this.utilityService.stopEvent(event);
    }

    private onDrop(event: any){
        // Cancel event and hover styling
        this.onDropLeave(event);
        // Fetch FileList object
        let fileList = event.target.files || event.dataTransfer.files;
        // Process all File objects
        for (let file of fileList){
            // Check if the MIME type of the file is permitted
            if (this.permittedMimes.includes(file.type)){
                // Populate pending uploads data list with file and origin
                this.pendingUploadsDataSet.push({
                    'id': UUID.UUID(),
                    'file': file,
                    'origin': 'desktop',
                    'isNameValid': true,
                    'isUploading': false
                });
            } else {
                // Display error message for non-permitted MIME type files
                toastr.error(
                    this.commonService.getUXClientMessage('ERR_PERMITTED_FILE'),
                    'Uh Oh...'
                );
                return false;
            }
        }
    }

    private uploadSuccess(result: any, pendingFileData: any){
        // Add S3 audio URL to pending file data
        pendingFileData['audioUrl'] = result.audioUrl;
        // Create transcript using pending file data
        this.transcriptService
            .createTranscript(pendingFileData)
            .then(() => {}, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private updateTranscriptTable(){
        // Loading transcripts
        this.isLoadingTable = true;
        this.transcriptService
            .getTranscriptsTableData()
            .then((transcriptsTableData: any) => {
                // Clear list before populating
                this.transcriptDataList = [];
                // Populate basic transcript data for the table
                for (let transcriptTableData of transcriptsTableData){
                    this.transcriptDataList.push({
                        'id': transcriptTableData.id,
                        'name': transcriptTableData.name,
                        'status': transcriptTableData.status,
                        'origin': transcriptTableData.origin,
                        'date': new Date(transcriptTableData.date)
                            .toLocaleString()
                    });
                }
                // No longer loading transcripts
                this.isLoadingTable = false;
            }, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private onUpload(index: string, id: string){
        // Ensure that user is authenticated to perform action
        this.accountService
            .doAuthCheck()
            .then(() => {
                // Clear file input
                this.fileInput.nativeElement.value = '';
                // Obtain the transcript name from the correct field
                let nameFieldResult = this.transcriptNameField._results[index];
                let transcriptName = nameFieldResult.nativeElement.value;
                // Ensure that the transcript name exists for pending file data
                if (transcriptName){
                    // Obtain current pending upload data and append more data
                    let pendingUploadData = this.utilityService
                        .getObjByIdFromArray(this.pendingUploadsDataSet, id);
                    pendingUploadData['isNameValid'] = true;
                    pendingUploadData['isUploading'] = true;
                    pendingUploadData['transcriptName'] = transcriptName;
                    // Context switch based, local upload or online video
                    if (pendingUploadData.origin === 'desktop'){
                        this.transcriptService
                            .uploadPendingFile(pendingUploadData.file)
                            .then((res: any) => {
                                this.uploadSuccess(res, pendingUploadData);
                                this.onRemove(id);
                            }, (errorCode: string) => {
                                // Process errors
                                this.processErrors(errorCode);
                            });
                    } else {
                        this.transcriptService
                            .fetchOnlinePending(pendingUploadData.link)
                            .then((res: any) => {
                                this.uploadSuccess(res, pendingUploadData);
                                this.onRemove(id);
                            }, (errorCode: string) => {
                                // Process errors
                                this.processErrors(errorCode);
                            });
                    }
                } else {
                    // If no transcript name exists, invalidate field
                    this.utilityService
                        .getObjByIdFromArray(this.pendingUploadsDataSet, id)
                        ['isNameValid'] = false;
                }
            }, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private onViewTranscript(transcriptID: string){
        // Redirect to transcript page
        this.router.navigate(['/transcript/' + transcriptID]);
    }

    private onDeleteTranscript(transcriptID: string, index: string){
        // Set delete button for transcript to is active
        this.transcriptDataList[index]['isButtonActive'] = true;
        // Delete transcript
        this.transcriptService
            .deleteTranscript(transcriptID)
            .then(() => {
                // Remove transcript data from transcript data list
                this.transcriptDataList.splice(parseInt(index), 1);
            }, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private onRemove(id: string){
        // Clear file input
        this.fileInput.nativeElement.value = '';
        // Remove pending upload object with id
        this.utilityService
            .removeObjByIdFromArray(this.pendingUploadsDataSet, id);
    }
}
