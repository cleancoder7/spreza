import {Injectable} from '@angular/core';
import {Http, Response, Headers, RequestOptions} from '@angular/http';

// Module that creates promises
import 'rxjs/add/operator/toPromise';

@Injectable()
export class StatisticService{
    private API_AMOUNT_UPLOADED: string;
    private API_HOURS_TRANSCRIBED: string;
    private API_TOTAL_AMOUNT_UPLOADED: string;
    private API_TOTAL_HOURS_TRANSCRIBED: string;
    private headers = new Headers({
        'Content-Type': 'application/json'
    });
    private options = new RequestOptions({
        'headers': this.headers
    });

    constructor(private httpService: Http){
        // Initialize instance variables
        this.API_AMOUNT_UPLOADED = 'api/statistic/transcription/amount';
        this.API_HOURS_TRANSCRIBED = 'api/statistic/transcription/hours';
        this.API_TOTAL_AMOUNT_UPLOADED = 
            'api/statistic/transcription/total/amount';
        this.API_TOTAL_HOURS_TRANSCRIBED = 
            'api/statistic/transcription/total/hours';
    }

    private errorHandler(error: any){
        return Promise.reject(error.json().errorCode);
    }
    
    private dataHandler(res: any){
        return res.json();
    }

    public getAmountUploaded(){
        // Execute http get request on statistic amount uploaded route
        return this.httpService
            .get(this.API_AMOUNT_UPLOADED)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public getHoursTranscribed(){
        // Execute http get request on statistic hours transcribed route
        return this.httpService
            .get(this.API_HOURS_TRANSCRIBED)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public getTotalAmountUploaded(){
        // Execute http get request on statistic total amount uploaded route
        return this.httpService
            .get(this.API_TOTAL_AMOUNT_UPLOADED)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }

    public getTotalHoursTranscribed(){
        // Execute http get request on statistic total hours transcribed route
        return this.httpService
            .get(this.API_TOTAL_HOURS_TRANSCRIBED)
            .toPromise()
            .then(this.dataHandler)
            .catch(this.errorHandler);
    }
}