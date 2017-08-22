import {Injectable} from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';

// Module that creates promises
import 'rxjs/add/operator/toPromise';

@Injectable()
export class TranscriptService{
    // Declare instance variables
    private API_TRANSCRIPT: string;
    private API_UPLOAD_LOCAL: string;
    private API_UPLOAD_ONLINE: string;
    private headers = new Headers({
        'Content-Type': 'application/json'
    });
    private options = new RequestOptions({
        'headers': this.headers
    });

    constructor(private httpService: Http){
        // Initialize instance variables
        this.API_TRANSCRIPT = 'api/transcript';
        this.API_UPLOAD_LOCAL = 'api/transcript/uploader/local';
        this.API_UPLOAD_ONLINE = 'api/transcript/uploader/online';
    }

    private errorHandler(error: any){
        return Promise.reject(error.json().errorCode);
    }

    private dataHandler(res: any){
        return res.json();
    }

    public reviseTranscript(transcriptID: string, revisedDataSet: any){
        // Generate a new revised data set with only required attributes
        let prunedDataSet = [];
        let prunedParagraph = [];
        // Load transcript by paragraph
        for (let paragraphs of revisedDataSet){
            // Load words within each paragraph
            for (let revisedWord of paragraphs.paragraph){
                if (revisedWord.paragraphMarker){                    
                    prunedParagraph.push({
                        'paragraphMarker': true
                    });
                } else {
                    prunedParagraph.push({
                        'word': revisedWord.word,
                        'start': revisedWord.start,
                        'end': revisedWord.end
                    });
                }
            }
            prunedDataSet.push({
                'paragraph': prunedParagraph
            });
            prunedParagraph = [];
        }
        // Create body for the put request
        let body = JSON.stringify({
            'type': 'REVISION',
            'revisedData': prunedDataSet
        });
        // Execute http put request on transcript route to update it
        return this.httpService
            .put(this.API_TRANSCRIPT + '/' + transcriptID, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public deleteTranscript(transcriptID: string){
        return this.httpService
            .delete(this.API_TRANSCRIPT + '/' + transcriptID)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public getTranscript(transcriptID: string){
        return this.httpService
            .get(this.API_TRANSCRIPT + '/' + transcriptID)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public getTranscriptsTableData(){
        return this.httpService
            .get(this.API_TRANSCRIPT)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public createTranscript(pendingFileData: any){
        // Create body for the post request
        let body = JSON.stringify({
            'name': pendingFileData.transcriptName,
            'url': pendingFileData.audioUrl,
            'origin': pendingFileData.origin
        });
        // Execute http post request on transcript route to create it
        return this.httpService
            .post(this.API_TRANSCRIPT, body, this.options)
            .toPromise()
            .then()
            .catch(this.errorHandler);
    }

    public fetchOnlinePending(onlineLink: string){
        // Create body for the post request
        let body = JSON.stringify({
            'url': onlineLink
        });
        // Execute http post request on transcript online uploader route
        return this.httpService
            .post(this.API_UPLOAD_ONLINE, body, this.options)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public uploadPendingFile(transcriptFile: any){
        return new Promise((resolve, reject) => {
            // Generate new FormData for uploading file and XML http request
            let formData = new FormData();
            let xhr = new XMLHttpRequest();
            // Append the pending file object to FormData
            formData.append('transcriptFile', transcriptFile);
            // Monitor state changes for successful upload or failure
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4){
                    if (xhr.status === 200){
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(xhr.response);
                    }
                }
            };
            // Execute post request and send FormData containing the file
            xhr.open('POST', this.API_UPLOAD_LOCAL, true);
            xhr.send(formData);
        });
    }
}
