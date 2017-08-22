import {UUID} from 'angular2-uuid';
import {PopoverModule} from 'ng2-popover';
import {ModalComponent} from 'ng2-bs3-modal/ng2-bs3-modal';
import {Component, ViewChild, Inject} from '@angular/core';
import {Router, ActivatedRoute, Params} from '@angular/router';

// Declare external JS libraries
declare var jQuery: any;
declare var toastr: any;
declare var WaveSurfer: any;

// Services used by this component
import {CommonService} from '../../services/common';
import {UtilityService} from '../../services/utility';
import {AccountService} from '../../services/account';
import {TranscriptService} from '../../services/transcript';

@Component({
    templateUrl: '../../templates/pages/transcript.html'
})

export class TranscriptComponent{ // Declaration
    // Declare instance variables
    private timerRef: any;
    private wavesurfer: any;
    private isSaving: boolean;
    private activeEditing: boolean;
    private audioSpeed: string;
    private textContent: string;
    private audioSeekTime: string;
    private transcriptName: string;
    private isAudioPlaying: boolean;
    private isHelpModalOpen: boolean;
    private percentAudioLoaded: number;
    private revisedDataSet: Array<any>;
    private isBackspacePressed: boolean;
    private isTranscriptModified: boolean;

    // Bind variable to child component
    @ViewChild('speedSliderReference')
    private speedSlider: any;
    @ViewChild('helpModalReference')
    private helpModal: ModalComponent;
    @ViewChild('clipboardReference')
    private clipboard: any;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private commonService: CommonService,
        private utilityService: UtilityService,
        private accountService: AccountService,
        private transcriptService: TranscriptService,
    ){
        // Initialize instance variables
        this.timerRef = null;
        this.isSaving = false;
        this.activeEditing = false;
        this.revisedDataSet = [];
        this.transcriptName = '';
        this.audioSpeed = '1.00';
        this.isAudioPlaying = false;
        this.percentAudioLoaded = 0;
        this.isHelpModalOpen = false;
        this.isBackspacePressed = false;
        this.audioSeekTime = '00:00:00';
        this.isTranscriptModified = false;
    }

    // Executed after component is initialized
    ngAfterViewInit(){
        // Enable tooltips on buttons via hovering
        jQuery('[data-toggle="tooltip"]').tooltip({
            html: true,
            trigger: 'hover',
            container: 'body'
        });
        // Initialize the wavesurfer module
        this.wavesurfer = WaveSurfer.create({
            normalize: true,
            waveColor: '#AAB2BD',
            progressColor: '#4FC1E9',
            container: '#audiowave',
            backend: 'MediaElement',
            cursorColor: '#000000',
            skipLength: 3,
            cursorWidth: 2,
            height: 90
        });
        // Define wavesurfer events
        this.wavesurfer.on('loading', (percent) => {
            this.percentAudioLoaded = percent;
        });
        this.wavesurfer.on('audioprocess', () => {
            this.eventWhileAudioPlaying();
        });
        this.wavesurfer.on('seek', () => {
            this.eventWhileAudioPlaying();
        });
        this.wavesurfer.on('finish', () => {
            // When audio is finished, reset seek time and pause
            this.wavesurfer.seekTo(0);
            this.isAudioPlaying = false;
        });
        // Load required transcript data for this page
        this.loadTranscriptData(this.route.snapshot.params['id']);
    }

    /* Helper functions */

    private processErrors(errorCode: string){
        if (errorCode === 'ER_COOKIE_EXP' || errorCode === 'ER_NO_COOKIE'){
            // If session expired or user not authenticated, redirect to login
            this.router.navigate(['/login']);
        } else if (errorCode === 'ER_NO_TRANSCRIPT'){
            // If the transcript doesn't exist
            this.router.navigate(['/404']);
        } else {
            // Display all other errors
            toastr.error(
                this.commonService.getUXServerError(errorCode),
                'Uh Oh...'
            );
        }
    }

    private isTranscriptLoaded(){
        return this.revisedDataSet.length > 0;
    }

    private redrawAudioTimeline(){
        // Re-render wavesurfer canvas to fit within the current window
        this.wavesurfer.drawer.containerWidth =
            this.wavesurfer.drawer.container.clientWidth;
        this.wavesurfer.drawBuffer();
        // Adjust seek indicator to the correct position
        this.wavesurfer.backend.seekTo(this.wavesurfer.getCurrentTime());
        this.wavesurfer.drawer.progress(
            this.wavesurfer.backend.getPlayedPercents()
        );
    }

    private loadTranscriptData(transcriptID: string){
        let revisedParagraph = []
        this.transcriptService
            .getTranscript(transcriptID)
            .then((result: any) => {
                // Load transcript by paragraph
                for (let paragraphs of result.revisedData){
                    // Load words within each paragraph
                    for (let words of paragraphs.paragraph){
                        if (words.paragraphMarker){
                            revisedParagraph.push({
                                paragraphMarker: true
                            });
                        } else {
                            revisedParagraph.push({
                                'id': UUID.UUID(),
                                'start': words.start,
                                'end': words.end,
                                'word': words.word
                            });
                        }
                    }
                    this.revisedDataSet.push({
                        //TODO 'speaker': revisedParagraph.speaker
                        'id': UUID.UUID(),
                        'isEditing': false,
                        'paragraph': revisedParagraph
                    });
                    revisedParagraph = [];
                }
                this.transcriptName = result.name;
                // Load audio into wavesurfer from transcript
                this.wavesurfer.load(result.audioURL);
            }, (errorCode: string) => {
                // Process errors
                this.processErrors(errorCode);
            });
    }

    private highlightTranscript(currentTime: number){
        // Iterate over all words in the revised data for the transcript
        for (let paragraphs of this.revisedDataSet){
            if (!paragraphs.isEditing){
                for (let word of paragraphs.paragraph){
                    let startTime = parseFloat(word.start);
                    let endTime = parseFloat(word.end);
                    // Assign highlighting to revised data if within the current time
                    if (currentTime >= startTime && currentTime <= endTime){
                        word.isHighlighted = true;
                        word.isHovering = false;
                    } else {
                        word.isHighlighted = false;
                    }
                }
            }
        }
    }

    private getMouseCursorRange(event: any) {
        let range, x = event.clientX, y = event.clientY;
        // Create range for caret position based on event offsets
        if (typeof document.createRange !== 'undefined') {
            if (typeof event.rangeParent !== 'undefined') {
                range = document.createRange();
                range.setStart(event.rangeParent, event.rangeOffset);
                range.collapse(true);
            } else if (document.caretRangeFromPoint) {
                range = document.caretRangeFromPoint(x, y);
            }
        }
        return range;
    }

    private selectRange(range: any){
        if (range){
            if (typeof range.select !== 'undefined'){
                range.select();
            } else if (typeof window.getSelection !== 'undefined'){
                let sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }
    }

    private processEdits(paragraph: any){
        // Obtain all of the span elements in the transcript editor
        let spans = document.getElementById('editable-section').children;
        // Iterate through each span tag in the collection
        let lenSpanCollection = spans.length;
        for (let i = 0; i < lenSpanCollection; i++){
            if (spans[i].hasAttribute('id')){
                // Obtain all of the words within the current span tag
                let unfilteredWords = spans[i].textContent.split(/[\x20|\xa0]/);
                let filteredWords = spans[i].textContent.split(' ');
                let words = filteredWords.filter(Boolean);
                let lenWords = words.length;
                /* Determine if words need to be concatenated
                 * by checking if the last unfiltered is not empty
                 * which would indicate the existence of a &nbsp char
                 */
                if (unfilteredWords[unfilteredWords.length - 1] != ''){
                    // Handle edge case where first letter is modified
                    if (lenWords > 1 && spans[i].nextSibling ){
                        let lastWord = words[words.length - 1];
                        let nextWord = spans[i].nextSibling.textContent;
                        if (nextWord){
                            spans[i].nextSibling.textContent = lastWord
                                + nextWord;
                            words.pop();
                            lenWords--;
                        }
                    }
                } //TODO
                // Find the position to modify and insert the words
                let insertionIndex = 0;
                for (let revisedWord of paragraph){
                    if (revisedWord.id 
                        === spans[i].attributes.getNamedItem('id').value){
                        break;
                    }
                    insertionIndex++;
                }
                // Modify the original word if non empty
                if (words[0].trim() !== ''){
                    paragraph[insertionIndex].word = words[0].trim();
                }
                // Insert any new words if they're non empty
                for (let i = 1; i < lenWords; i++){
                    if (words[i].trim() !== ''){
                        insertionIndex++;
                        paragraph.splice(insertionIndex, 0, {
                            'id': UUID.UUID(),
                            'word': words[i].trim(),
                            'start': -1,
                            'end': -1
                        });
                    }
                }
                this.isTranscriptModified = true;
            }
            else {
            }
        }
    }

    /* Event functions */

    private eventToggleHelp(){
        // Toggle the help modal state
        this.isHelpModalOpen = !this.isHelpModalOpen;
        // Open or close the modal depending on help modal state variable
        if (this.isHelpModalOpen){
            this.helpModal.open();
        } else {
            this.helpModal.close();
        }
    }

    private eventTogglePlayAudio(){
        // Toogle audio playing indicator
        this.isAudioPlaying = !this.isAudioPlaying;
        // Pause or play the audio based on the indicator
        if (this.isAudioPlaying){
            this.wavesurfer.play();
        } else {
            this.wavesurfer.pause();
        }
    }

    private eventAdjustAudioSpeed(){
        // Update the audio speed for the speed indicator and audio player
        this.audioSpeed = this.utilityService.getFloatStrFromStr(
            this.speedSlider.nativeElement.value, 2
        );
        this.wavesurfer.setPlaybackRate(this.audioSpeed);
    }

    private eventAudioForward(){
        this.wavesurfer.skipForward();
    }

    private eventAudioRewind(){
        this.wavesurfer.skipBackward();
    }

    private eventDeleteWord(pid: string, wid: string){
        // remove word only when entire word is backspaced and node removed

        if (this.isBackspacePressed){
            // Find the correct paragraph by the pid
            let revisedParagraph = this.utilityService.getObjByIdFromArray(this.revisedDataSet, pid)
            if (revisedParagraph.paragraph){
                // Remove the currentWord from the set using it's associated ID
                this.utilityService.removeObjByIdFromArray(revisedParagraph.paragraph, wid);
                this.isBackspacePressed = false;
            }
        }
    }

    private eventHoverOverWord(currentWord: any){
        // Only highlight word when not in editing mode and is not highlighted
        if (!this.activeEditing && !currentWord.isHovering){
            currentWord.isHovering = true;
        }
    }

    private eventHoverExitWord(currentWord: any){
        // Only remove if word is highlighted
        if (currentWord.isHovering){
            currentWord.isHovering = false;
        }
    }

    private eventEditorKeydown(event: any){
        // BACKSPACE
        if (event.keyCode === 8){
            this.isBackspacePressed = true;
        }
        // ENTER
        if (event.keyCode === 13){
            // Disable editing and save transcript
            this.eventDisableEditMode();
            this.utilityService.stopEvent(event);
        }
    }

    private eventEnableEditMode(event: any, paragraphs: any){
        if (!paragraphs.isEditing && this.isTranscriptLoaded()){
            paragraphs.isEditing = true;
            // Adjust cursor to correct position
            setTimeout(() => {
                //document.getElementById('editable-section').focus();
                this.selectRange(this.getMouseCursorRange(event))
            }, 1);
        }
    }

    private eventDisableEditMode(){
        for (let paragraphs of this.revisedDataSet){
            if(paragraphs.isEditing == true)
            {
                paragraphs.isEditing = false;
                this.processEdits(paragraphs.paragraph);
            }
        }
    }

    private eventWhileAudioPlaying(){
        // Process time in readable format
        this.audioSeekTime = this.utilityService.getReadableTime(
            this.wavesurfer.getCurrentTime().toString()
        );
        // Process transcript text highlighting
        if (!this.activeEditing){
            this.highlightTranscript(this.wavesurfer.getCurrentTime());
        }
    }

    private eventBindHotKeys(event: any){
        // CTRL modifier hot keys
        if (event.ctrlKey){
            // CTRL + C
            if (event.keyCode === 67){
                this.eventCopyToClipboard();
                this.utilityService.stopEvent(event);
            }
        }
        // SHIFT modifier hot keys
        if (event.shiftKey){
            // SHIFT + SPACE
            if (event.keyCode === 32){
                this.eventTogglePlayAudio();
                this.utilityService.stopEvent(event);
            }
        }
        // F1
        if (event.keyCode === 112){
            this.eventToggleHelp();
            this.utilityService.stopEvent(event);
        }
        // F7
        if (event.keyCode === 118){
            this.eventAudioRewind();
            this.utilityService.stopEvent(event);
        }
        // F8
        if (event.keyCode === 119){
            this.eventAudioForward();
            this.utilityService.stopEvent(event);
        }
    }

    private eventClickWord(currentWord: any){
        // If edit mode is not enabled
        if (!this.activeEditing){
            // Set the seek time to the start time of the current selected word
            this.wavesurfer.backend.seekTo(
                parseFloat(currentWord.start) + 0.01
            );
            // Force update the seek bar and highlighting if paused
            if (!this.isAudioPlaying){
                // Update the seek time indicator in readale format
                this.audioSeekTime = this.utilityService.getReadableTime(
                    (parseFloat(currentWord.start) + 0.01).toString()
                );
                // Update the seek bar on the audio
                this.wavesurfer.drawer.progress(
                    this.wavesurfer.backend.getPlayedPercents()
                );
                // Highlight the correct word
                this.highlightTranscript(this.wavesurfer.getCurrentTime());
            }
        }
        // Remove hover highlighting on selected word
        currentWord.isHovering = false;
    }

    private eventSave(){
        if (this.isTranscriptModified){
            this.isSaving = true;
            this.isTranscriptModified = false;
            // Update the transcript
            this.transcriptService
                .reviseTranscript(
                    this.route.snapshot.params['id'],
                    this.revisedDataSet
                )
                .then(() => {
                    this.isSaving = false;
                    toastr.success(
                        this.commonService.getUXClientMessage(
                            'MSG_TRANSCRIPT_SAVED'
                        ),
                        'Notification'
                    );
                }, (errorCode: string) => {
                    // Process errors
                    this.processErrors(errorCode);
                });
        }
    }

    private eventCopyToClipboard(){
        // Generate the transcript text from the revised data set
        this.textContent = '';
        for (let paragraphs of this.revisedDataSet){
            for (let words of paragraphs.paragraph){
                let word = words.word + ' ';
                if (words.paragraphMarker){
                    word = '\n\n';
                }
                this.textContent += word;
            }
        }
        // Copy the transcript text to the clipboard
        setTimeout(() => {
            this.clipboard.nativeElement.focus();
            this.clipboard.nativeElement.select();
            document.execCommand('copy');
            toastr.success(
                this.commonService.getUXClientMessage('MSG_TRANSCRIPT_COPIED'), 
                'Notification');
        }, 1);
    }
}
