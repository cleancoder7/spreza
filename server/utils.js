var os = require('os');
var knox = require('knox');
var fileSys = require('fs');
var Aws = require('aws-sdk');
var config = require('./config.js');
var youtubeDL = require('youtube-dl');
var ffmpeg = require('fluent-ffmpeg');
var nodemailer = require('nodemailer');

// Create a reusable SMTP transport method for sending emails
var SMTPTransport = nodemailer.createTransport('SMTP', {
    //service: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secureConnection: false,
    auth: {
        user: config.EMAIL.USER,
        pass: config.EMAIL.PASS
    },
    tls: {
        secureProtocol: "TLSv1_method"
    }
});

// Create a reusable knox client for AWS
var knoxClient = knox.createClient({
    key: config.AWS.ACCESS,
    secret: config.AWS.SECRET,
    bucket: config.AWS.BUCKET
});

// Configure AWS
Aws.config.update({
    accessKeyId: config.AWS.ACCESS,
    secretAccessKey: config.AWS.SECRET,
    region: config.AWS.REGION
});

// Return a random string of alphabetical characters
exports.randomAlphaString = function(length){
    var result = '';
    var charBank = 'abcdefghijklmnopqrstuvwxyz';
    for (var i = 0; i < length; i++){
        result += charBank.charAt(Math.floor(Math.random() * 26));
    }
    return result;
}

exports.getS3File = function(filename, bucket){
    // Create a new AWS S3 object and return S3 file from specific bucket
    var s3 = new Aws.S3();
    return s3.getObject({
        Bucket: bucket,
        Key: filename.split('/').pop()
    });
}

// Return the extension of a specified filename
exports.getFileExtension = function(filename){
    var extensionRegex = /(?:\.([^.]+))?$/;
    return extensionRegex.exec(filename)[1];
}

// Obtain format metadata of an audio's stream
exports.getAudioMetadata = function(filepath, callback){
    ffmpeg.setFfprobePath(config.FFPROBE_PATH[os.type()]);
    ffmpeg.ffprobe(filepath, function(err, metadata){
        return callback(err, metadata);
    });
}

// Convert seconds (as a number) to hours (as a number)
exports.secondsToHours = function(seconds){
    return parseFloat(seconds / 3600);
}

// Convert bytes (as a number) to Megabytes (as a number)
exports.bytesToMegabytes = function(bytes){
    return parseFloat(bytes / 1048576);
}

// Convert audio or video file to a wav file optimalized for Kaldi ASR
exports.formatToKaldiWav = function(inputpath, outputpath, callback){
    console.log('converting...')
    // Define formatting process with output prams optimized for kaldi ASR
    var process = ffmpeg(inputpath)
        .format('wav')
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec('pcm_s16le')
        .setFfmpegPath(config.FFMPEG_PATH[os.type()]);
    // Convert and save audio
    process.save(outputpath);
    // If an error occured with the formatting process
    process.on('error', function(err){
        return callback(err);
    });
    // Delete the input file when audio formatting process is complete
    process.on('end', function(){
        console.log('complete');
        fileSys.unlink(inputpath);
        return callback();
    });
}

exports.uploadAudioToS3 = function(filename, filepath, callback){
    // Open and read audio file
    fileSys.readFile(filepath, function(err, buffer){
        // Check if an error occured with reading the file
        if (err){
            return callback(err);
        }
        // Upload file to S3
        var knoxRequest = knoxClient.put(filename, {
            'Content-Length': buffer.length,
            'Content-Type': 'audio/wav'
        });
        knoxRequest.on('response', function(res){
            // Check if he file was successfully uploaded to S3
            if (res.statusCode === 200){
                // Delete the local file
                fileSys.unlink(filepath, function(){});
                return callback(null, knoxRequest.url);
            }
        });
        knoxRequest.end(buffer);
    });
}

exports.deleteAudioFromS3 = function(s3AudioUrl, callback){
    // Obtain filename from S3 URL
    var filename = s3AudioUrl.split('/').pop();
    knoxClient.deleteFile(filename, function(err){
        // Check if an error occured when deleting the file from S3 bucket
        return callback(err);
    });
}

// Send an email with basic fields (from, to, subject and body)
exports.sendEmail = function(mailOptions, callback){
    SMTPTransport.sendMail(mailOptions, function(err, result){
        // Close the SMTP transport when the email has been sent
        SMTPTransport.close();
        return callback(err, result);
    });
}

exports.getVideoSubtitles = function(url, outputPath, callback){
    // Define subtitle options
    var subtitleOptions = {
        // Write automatic subtitle files (YouTube only)
        auto: false,
        // Downloads all the avaliable subtitles.
        all: false,
        // Languages of subtitles to download, seperated by commas.
        lang: 'en',
        // The directory to save the downloaded files to.
        cwd: outputPath
    };
    youtubeDL.getSubs(url, subtitleOptions, function(err, files){
        if (err){
            console.error('Warning: No subtitles available');
        }
        if (files){
            console.log('subtitles avaliable: ', files[0]);
            console.log('in location: ', outputPath);
        }
        return callback();
    });
}

// Download media from Soundcloud, YouTube or Vimeo and convert them into wav audio files
exports.getAudioFromMedia = function(url, audioPath, mediaPath, callback){
    console.log(url);
    var process = youtubeDL(url);
    console.log('downloading...')
    process.pipe(fileSys.createWriteStream(mediaPath));
    // If an error occured with the download process
    process.on('error', function(err){
        return callback(err);
    });
    // Convert downloaded media into audio
    process.on('end', function(){
        module.exports.formatToKaldiWav(mediaPath, audioPath, function(err){
            console.log('returned');
            // If an error occured with formatting the audio
            if (err){
                return callback(err);
            }
            return callback();
        });
    });
}

// Return an JSON response consisting of a specific error code string
exports.errorResponse = function(errorCode, errorObject){
    // Log any error objects to the console if they exist
    if (errorObject){
        var date = new Date();
        console.error('\n[Error Occured @ '
            + date.toLocaleTimeString() + ']:\n\n', errorObject);
    }
    return {"errorCode": errorCode};
}

// Return string representing the path to the user's temp folder
exports.getUserTempFolderPath = function(userID){
    return './TMP/' + userID;
}
