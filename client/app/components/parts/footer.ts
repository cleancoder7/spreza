import {Router} from '@angular/router';
import {Component} from '@angular/core';

@Component({
    selector: 'footer',
    templateUrl: '../../templates/parts/footer.html'
})

export class FooterComponent{
    // Declare instance variables
    private isTranscriptPage: boolean;

    constructor(
        private router: Router
    ){
        // Initialize instance variables
        this.isTranscriptPage = false;
    }

    // Executed when component is initialized
    ngOnInit(){
        // Determine if the current page is the transcript page
        if (this.router.url.includes('/transcript/')){
            this.isTranscriptPage = true;
        }
    }
}
