import {Config} from '../config';
import {Component} from '@angular/core';
import {Router, Event, NavigationEnd} from '@angular/router';

// Declare external JS libraries
declare var toastr: any;
// declare var ga : Function;

// Define the root component for the application
@Component({
    selector: 'app',
    templateUrl: '../templates/parts/root.html'
})

export class RootComponent{
    // Declare instance variables
    // private isEnableGA: boolean;

    constructor(public router:Router){
        // Configure Toastr notification system
        toastr.options = {
            'debug': false,
            'onclick': null,
            'timeOut': '10000',
            'newestOnTop': true,
            'progressBar': false,
            'closeButton': false,
            'hideEasing': 'swing',
            'showEasing': 'swing',
            'showDuration': '300',
            'hideDuration': '1000',
            'showMethod': 'fadeIn',
            'hideMethod': 'fadeOut',
            'extendedTimeOut': '10000',
            'preventDuplicates': true,
            'positionClass': 'toast-top-left',
        };
        // Initialize instance variables
        //this.isEnableGA = false;

        // Enable Google Analytics script if in production mode
        // if (Config.ENV === 'PROD'){
        //     this.isEnableGA = true;
        //     this.router.events.subscribe((event:Event) => {
        //         if (event instanceof NavigationEnd){
        //             ga('send', 'pageview', event.urlAfterRedirects);
        //         }
        //     });
        // }
    }
}
