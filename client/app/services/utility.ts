import {Router} from '@angular/router';
import {Injectable} from '@angular/core';
import {FormGroup} from '@angular/forms';

@Injectable()

export class UtilityService{

    constructor(){}

    public matchValidator(fieldOneKey: string, fieldTwoKey: string){
        return (group: FormGroup) => {
            let fieldOneInput = group.controls[fieldOneKey];
            let fieldTwoInput = group.controls[fieldTwoKey];
            if (fieldOneInput.value !== fieldTwoInput.value){
                return fieldTwoInput.setErrors({
                    notEquivalent: true
                });
            }
        }
    }

    public removeObjByIdFromArray(inputArray: Array<any>, id: string){
        for (let i in inputArray){
            if (inputArray[i].id === id){
                inputArray.splice(+i, 1);
            }
        }
    }

    public getObjByIdFromArray(inputArray: Array<any>, id: string){
        for (let obj of inputArray){
            if (obj.id === id){
                return obj;
            }
        }
    }

    public stopEvent(event: any){
        event.preventDefault();
        event.stopPropagation();
    }

    public waitAndRedirect(seconds: number, router: Router, route: string){
        setTimeout(() => {
            router.navigate([route]);
        }, 1000 * seconds);
    }

    public getFloatStrFromStr(value: string, numDecimals: number){
        return parseFloat(value).toFixed(numDecimals);
    }

    public getReadableTime(timeString: string) {
        // Generate hours, minutes and seconds from time string
        var sec_num  = parseInt(timeString, 10);
        var hours = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);
        // Convert numeric variables to string
        var hourStr = hours.toString();
        var minStr = minutes.toString();
        var secStr = seconds.toString();
        // Ensure that each time string has two digits
        if (hours < 10) {
            hourStr = '0' + hourStr;
        }
        if (minutes < 10) {
            minStr = '0' + minStr;
        }
        if (seconds < 10) {
            secStr = '0' + secStr;
        }
        return hourStr + ':' + minStr + ':' + secStr;
    }
}
