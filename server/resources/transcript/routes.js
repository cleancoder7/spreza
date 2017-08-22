var nJwt = require('njwt');
var WebSocket = require('ws');
var amazon = require('aws-sdk');
var cookies = require('cookies');
var express = require('express');
var utils = require('../../utils.js');
var Transcript = require('./model.js');
var Formidable = require('formidable');
var User = require('../user/model.js');
var config = require('../../config.js');
var consumeSQS = require('sqs-consumer');
var Statistic = require('../statistic/model.js');
var router = express.Router();
var statusSocket;

/*
 * SQS Consumer service
 */

// Configure AWS
amazon.config.update({
    accessKeyId: config.AWS.ACCESS,
    secretAccessKey: config.AWS.SECRET,
    region: config.AWS.REGION
});

// Configure SQS consumer
var consumer = consumeSQS.create({
    queueUrl: config.COMPLETE,
    region: config.AWS.REGION,
    attributeNames: ['All'],
    messageAttributeNames: ['file'],
    handleMessage: function (message, done) {
        // If it's a valid file response
        if(message.MessageAttributes.file){
            // Grab the key
            key = message.MessageAttributes.file.StringValue;
            console.log('Returned complete transcript of: ' + key);
            // Call the result manager
            manageTranscriptionResult(key, function(err){
                if (err){
                    console.error(err)
                }
            });
        }
        done();
    },
    sqs: new amazon.SQS()
});
consumer.on('error', function(err){
    console.log(err.message);
});
consumer.start();

/*
 * Helper functions
 */

// Validate access token from session cookie and bind id, email and name to req
function parseValidateCookie(req, res, next){
    // Obtain token from client cookie
    var token = new cookies(req, res).get('access_token');
    if (!token){
        return res.status(400).send(
            utils.errorResponse('ER_NO_COOKIE')
        );
    }
    // Verify token from the cookie
    nJwt.verify(token, config.KEY.SESSION, function(err, token){
        // If an error occured with verifying the token or it is invalid
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_COOKIE_EXP', err)
            );
        }
        // If token is valid, obtain user from ID stored in the token
        User.findOne({
            "_id": token.body.sub
        }, function(err, user){
            // If an error occured with finding a valid user
            if (!user || err){
                // Delete the corrupt session cookie
                res.clearCookie('access_token');
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            // Extract ID, name and email from the user and bind to request
            req.user = {
                _id: user._id,
                name: user.name,
                email: user.email
            };
            // Continue with the next piece of middleware
            next();
        });
    });
}

function parseSequence(paragraph, lastLen, resultASR, callback) {
    // Obtain the first hypothesis and word / phoneme alignment data
    var sequence = []
    var hypotheses = resultASR.hypotheses;
    var baseHyp = hypotheses[0];
    var baseWordAlign = baseHyp['word-alignment'];
    var basePhoneAlign = baseHyp['phone-alignment'];
    // Populate original transcript from the base hypothesis
    var original = baseHyp.transcript + ' ';
    var originalTokens = original.split(' ').filter(Boolean);
    // Check if word alignment exists
    if (baseWordAlign){
        // Get timing data and variance count for current base word
        var baseWordAlignLen = baseWordAlign.length;
        for (var i = 0; i < baseWordAlignLen; i++){
            var varianceCount = 0;
            var curBaseWordAlign = baseWordAlign[i];
            // Obtain the current base word and it's start / end time data
            var curBaseWord = curBaseWordAlign.word;
            var sTime = curBaseWordAlign.start;
            var eTime = sTime + curBaseWordAlign.length;
            // Exclude processing epsilons
            if (curBaseWord !== '<eps>'){
                // Iterate over other hypotheses to generate variance count
                var hypothesesLen = hypotheses.length;
                for (var j = 1; j < hypothesesLen; j++){
                    var hypWordAlign = hypotheses[j]['word-alignment'];
                    /* Iterate through word alignment data of other
                    hypotheses */
                    var hypWordAlignLen = hypWordAlign.length;
                    for (var k = 0; k < hypWordAlignLen; k++){
                        // Obtain the alt word's start / end time data
                        var altWord = hypWordAlign[k].word;
                        var altSTime = hypWordAlign[k].start;
                        var altETime = altSTime + hypWordAlign[k].length;
                        /* Analysize and increment variance count for
                        overlapping fragments with the same time data */
                        if ((altSTime >= sTime) && (altETime <= eTime)
                            && (altWord != curBaseWord)){
                                varianceCount += 1;
                                break;
                            }
                    }
                }
                // Populate initial revised data for current base word
                paragraph.push({
                    "word": originalTokens.shift(),
                    "variance": varianceCount,
                    "start": +(lastLen + sTime).toFixed(2),
                    "end": +(lastLen + eTime).toFixed(2)
                });
            }
            // Accumulate the end time of the final word to keep sync
            if (i === (baseWordAlignLen - 1)){
                lastLen += eTime;
            }
        }
    } else {
        /* Kaldi forgot to generate word alignment data, use phoneme alignment
        data to keep timings in sync. */
        /* TODO: Replace with CMU phoneme to word map to generate word level
        alignments when using phoneme alignment data. */
        var startPoint = -1;
        var basePhoneAlignLen = basePhoneAlign.length;
        for (var i = 0; i < basePhoneAlignLen; i++){
            var curBasePhoneAlign = basePhoneAlign[i];
            if (startPoint < 0){
                startPoint = lastLen + curBasePhoneAlign.start;
            }
            var sTime = curBasePhoneAlign.start;
            var eTime = sTime + curBasePhoneAlign.length;
        }
        lastLen += eTime;
        // Populate all words in hypothesis with same start and end time
        var originalTokensLen = originalTokens.length;
        for (var j = 0; j < originalTokensLen; j++){
            paragraph.push({
                "word": originalTokens[j],
                "variance": -1,
                "start": startPoint,
                "end": lastLen
            });
        }
    }
    // On success, return the original and lastLen in callback
    //console.log(paragraph); //array of word. variance. start. end.
    return callback(null, {
        "original": original,
        "lastLen": lastLen,
    });
}

function manageTranscriptionResult(fileURL, callback) {
    var lastLen = 0;
    var pLength = 5;
    var original = '';
    var revisedData = [];
    var status = 'Ready';
    Transcript.findOne({
        "audio.url": 'https://' + config.AWS.BUCKET + '.s3.amazonaws.com/'
            + fileURL
    }, function(err, data){
        if (err){
            // If an error occured with the db search, log it
            console.error(err);
            status = 'Error';
        }
        //if(data.content.full.response)
        if (data){
            transcriptID = data._id
            // Parse the result data from the DB as JSON
            var full = data.content.full
            if (typeof full === 'undefined'){
                console.error('Could not parse anything');
                status = 'Error';
            } 
            else {
                //select the array of responses
                var response = full.response;
                if (typeof response === 'undefined'){
                    console.error('Could not parse the responses');
                    status = 'Error';
                } 
                else {
                    // Iterate through each sequence
                    var paragraph = []
                    for (var seq = 0; seq < response.length; seq++){
                        //console.log(seq);
                        var resultASR = response[seq].result;
                        if (typeof resultASR === 'undefined'){
                            console.error('Could not obtain a final result for '
                                + 'sequence');
                            status = 'Error';
                        } 
                        else {
                            //Add a paragraph break after every <pLength> sequences
                            if (((seq + 1) % pLength) == 0){
                                //paragraph.push({
                                //    "paragraphMarker": true
                                //    //speaker = TODO
                                //});
                                //console.log("pushing paragraph...")
                                //push the paragraph and reset the var
                                revisedData.push({"paragraph": paragraph});
                                paragraph = [];
                            }
                            // Parse the words within the current sequence
                            // adding them to the paragraph object
                            parseSequence(paragraph, lastLen, resultASR,
                                function(err, result){
                                    if (err){
                                        console.error(err);
                                        status = 'Error';
                                    }
                                    else {
                                        //console.log(result.original);
                                        original += result.original;
                                        lastLen = result.lastLen;
                                    }
                            });
                        }
                    }
                    ////push whatever is left at the end
                    //paragraph.push({
                    //        "paragraphMarker": true
                    //        //speaker = TODO
                    //});
                    revisedData.push({"paragraph": paragraph});
                }
            }
        }
        // Populate transcript data and update status
        data.content.full = {}; // Clear content.full to save space
        data.status = status;
        if (status === 'Ready'){
            data.content.original = original;
            data.content.revisedData = revisedData;
        }
        data.save(function(err){
            if(err){
                console.error(err);
            }
        });
        statusSocket.emit('refresh');
        console.log('Complete')
    });
}

function sendTranscriptionJob(fileURL, callback) {
    sqs = new amazon.SQS();
    var params = {
        QueueUrl : config.TRANSCRIBE,
        MessageBody : JSON.stringify('transcribe'),
        MessageAttributes: {
            "file": {
                DataType: "String",
                StringValue: fileURL
            }
        }
    }
    // Initiate the sqs stream
    sqs.sendMessage(params, function(err, data){
        if(err){
            console.log('ERR:', err);
        }
    });
    console.log("Message sent: " + fileURL);
}

function createUpdateAudioStats(userID, audioSize, audioDuration, callback){
    Statistic.findOne({
        'userID': userID
    }, function(err, statistic){
        // Check if an error occured with finding a matching statistic
        if (err){
            return callback(err);
        }
        // Check if a statistic with a matching userID exists
        if (!statistic){
            // Create a new statistic with the userID
            var newStatistic = new Statistic();
            newStatistic.userID = userID;
            newStatistic.amountAudioUploaded = audioSize;
            newStatistic.hoursAudioTranscribed = audioDuration;
            // Save the statistic to the database
            newStatistic.save(function(err){
                // If an error occured with saving the statistic
                if (err){
                    return callback(err);
                }
            });
        } else {
            // Update the existing statistic matching userID
            var updatedAmountAudioUploaded = 
                parseFloat(statistic.amountAudioUploaded);
            updatedAmountAudioUploaded += parseFloat(audioSize);
            statistic.amountAudioUploaded = updatedAmountAudioUploaded;
            var updatedHoursAudioTranscribed =
                parseFloat(statistic.hoursAudioTranscribed);
            updatedHoursAudioTranscribed += parseFloat(audioDuration);
            statistic.hoursAudioTranscribed = updatedHoursAudioTranscribed;
            // Save the updated statistic
            statistic.save(function(err){
                // If an error occured with saving the statistic
                if (err){
                    return callback(err);
                }
            });
        }
        return callback(null);
    });
}

/*
 * Router handlers for transcription routes
 */

function createTranscript(req, res, next){
   /*
    * NOTE: parseValidateCookie Must be called before this function in the
    * router in order to confirm that the cookie is verified and the token is
    * valid. It also binds the user's non-sensative data to the request.
    */
   var newTranscript = new Transcript();
   // Populate transcript with data from request
   newTranscript.dateCreated = new Date().getTime();
   newTranscript.ownerID = req.user._id;
   newTranscript.audio.origin = req.body.origin;
   newTranscript.audio.url = req.body.url
   newTranscript.name = req.body.name;
   // Save the transcript to the database
   newTranscript.save(function(err){
       // If an error occured with saving the transcript
       if (err){
           return res.status(500).send(
               utils.errorResponse('ER_SERVER', err)
           );
       } else {
           sendTranscriptionJob(req.body.url, function(err, data){
               if (err){
                   console.log(err, err.stack); // Error response
                   return err;
               } else {
                   console.log(data); // Successful response
                   return data;
               }
          });
      }
      // Return success here to prevent waiting until transcription completes
      statusSocket.emit('refresh');
      return res.sendStatus(200);
   });
}

function getTranscriptById(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Transcript.findOne({
        _id: req.params.id,
        ownerID: req.user._id
    }, function(err, transcript){
        // If an error occured with finding the specific transcript
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If no transcript was found!
        if (!transcript){
            return res.status(500).send(
                utils.errorResponse('ER_NO_TRANSCRIPT')
            );
        }
        // Return data specific for the transcript page
        return res.status(200).send({
            'name': transcript.name,
            'audioURL': transcript.audio.url,
            'revisedData': transcript.content.revisedData
        });
    });
}

function getAllTranscriptTableData(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
     Transcript.find({
         ownerID: req.user._id
     }, function(err, transcripts){
         // If an error occured finding all of the user's transcripts
         if (err || !transcripts){
             return res.status(500).send(
                 utils.errorResponse('ER_SERVER', err)
             );
         }
         // Loop through all transcript objects
         var transcriptsTableData = [];
         transcripts.forEach(function(transcript){
             // Extract only data required for the transcript table
             transcriptsTableData.push({
                 'id': transcript._id,
                 'name': transcript.name,
                 'status': transcript.status,
                 'date': transcript.dateCreated,
                 'origin': transcript.audio.origin
             });
         });
         return res.status(200).send(transcriptsTableData);
     });
}

function updateTranscript(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Transcript.findOne({
        _id: req.params.id,
        ownerID: req.user._id
    }, function(err, transcript){
        // If an error occured finding the transcript
        if (err || !transcript){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // Update transcript based on type
        if (req.body.type === 'REVISION'){
            // Update revised data
            transcript.content.revisedData = req.body.revisedData;
            // Save the transcript to the database
            transcript.save(function(err){
                // If an error occured with saving the transcript
                if (err){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
                return res.sendStatus(200);
            });
        }
    });
}

function deleteTranscript(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Transcript.findOne({
        _id: req.params.id,
        ownerID: req.user._id
    }, function(err, transcript){
        // If an error occured finding the transcript
        if (err || !transcript){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // Delete the audio file from S3
        utils.deleteAudioFromS3(transcript.audio.url, function(err){
            // If an error occured when deleting the file on S3
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            // Find transcript with specific ID and owner ID and delete it
            Transcript.remove({
                _id: req.params.id,
                ownerID: req.user._id
            }, function(err){
                // If an error occured when deleting the transcript
                if (err){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
                return res.sendStatus(200);
            });
        });
    });
}

/*
 * Fetch a video file from YouTube or Vimeo, convert the file into a wav file
 * optimized for kaldi and upload to S3.
 */
function fetchUploadOnlineMedia(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    // Set response timeout to 20 minutes (prevent issues with re-try)
    res.connection.setTimeout(1200000);
    var date = new Date().getTime();
    var userFolder = utils.getUserTempFolderPath(req.user._id);
    var namebase = utils.randomAlphaString(15) + date;
    var audioFilename = namebase + '.wav';
    var subtitlePath = userFolder + '/' + namebase;
    var audioPath = userFolder + '/' + audioFilename;

    var mediaPath = userFolder + '/' + namebase + '.mp4';
    if(req.body.url.includes('soundcloud')){
        mediaPath = userFolder + '/' + namebase + '.mp3';
    }
    console.log()
    // Obtain video from YouTube or Vimeo and extract audio
    utils.getAudioFromMedia(req.body.url, audioPath, mediaPath, function(err){
        // If an error occured with fetching online video and conversion
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // Obtain file size and audio durration of audio
        utils.getAudioMetadata(audioPath, function(err, metadata){
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            var audioMb = utils.bytesToMegabytes(metadata.format.size);
            var audioHours = utils.secondsToHours(metadata.format.duration);
            createUpdateAudioStats(req.user._id, audioMb, audioHours,
                function(err){
                // If an error occured
                if (err){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
            });
        });
        // if(req.body.url.includes('youtu')){
        //     //get the existing subtitles if available
        //     utils.getVideoSubtitles(req.body.url, subtitlePath, function(){});
        // }
        // Upload audio to S3 and return S3 url on success
        utils.uploadAudioToS3(audioFilename, audioPath, function(err, url){
            // If an error occured with uploading audio to S3
            if (err || !url){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.status(200).send({'audioUrl': url});
        });
    });
}

/*
 * Upload files (video or audio) from desktop or local device, convert the file
 * into a wav file optimized for kaldi and upload to S3.
 */
function uploadLocalFile(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    var date = new Date().getTime();
    var uploadedFilepath, wavFilename, wavFilepath;
    var userFolder = utils.getUserTempFolderPath(req.user._id);
    // Configure the input form to obtain the file from the client
    var inputForm = new Formidable.IncomingForm();
    inputForm.keepExtensions = true;
    inputForm.uploadDir = userFolder;
    // Parse the uploaded file
    inputForm.parse(req, function(err, fields, files){
        // If an error occured with parsing the input form
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // Set the filename and filepath for the new kaldi optimized wav file
        uploadedFilepath = files['transcriptFile'].path;
        wavFilename = utils.randomAlphaString(15) + date + '.wav';
        wavFilepath = userFolder + '/' + wavFilename;
    });
    inputForm.on('end', function(){
        // Convert audio or video file into wav file optimized for kaldi ASR
        utils.formatToKaldiWav(uploadedFilepath, wavFilepath, function(err){
            // If an error occured with uploading audio to S3
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            // Obtain file size and audio durration of audio
            utils.getAudioMetadata(wavFilepath, function(err, metadata){
                if (err){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
                var audioMb = utils.bytesToMegabytes(metadata.format.size);
                var audioHours = utils.secondsToHours(metadata.format.duration);
                createUpdateAudioStats(req.user._id, audioMb, audioHours,
                    function(err){
                    // If an error occured
                    if (err){
                        return res.status(500).send(
                            utils.errorResponse('ER_SERVER', err)
                        );
                    }
                });
            });
            // Upload audio to S3 and return S3 url on success
            utils.uploadAudioToS3(wavFilename, wavFilepath, function(err, url){
                // If an error occured with uploading audio to S3
                if (err || !url){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
                return res.status(200).send({'audioUrl': url});
            });
        });
    });
}

/*
 * Socket IO Initialization
 */
function init(socketParam){
    socketParam.on('connection', function(socket){
        statusSocket = socket;
    });
}

/*
 * Router URL index for transcript routes
 */

router.post('/', parseValidateCookie, createTranscript);
router.get('/', parseValidateCookie, getAllTranscriptTableData);
router.get('/:id', parseValidateCookie, getTranscriptById);
router.put('/:id', parseValidateCookie, updateTranscript);
router.delete('/:id', parseValidateCookie, deleteTranscript);
router.post('/uploader/online', parseValidateCookie, fetchUploadOnlineMedia);
router.post('/uploader/local', parseValidateCookie, uploadLocalFile);

// Export socket iO Initialization function and router
module.exports = {
    'init': init,
    'router': router
};
