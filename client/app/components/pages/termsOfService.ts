import {Router} from '@angular/router';
import {Component} from '@angular/core';

@Component({
    templateUrl: '../../templates/pages/termsOfService.html'
})

export class TermsOfServiceComponent{

    constructor(){}

    // Executed after component is initialized
    ngAfterViewInit(){
        // Scroll to the top after page loads
        window.scrollTo(0,0);
    }
}
