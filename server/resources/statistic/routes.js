var nJwt = require('njwt');
var cookies = require('cookies');
var express = require('express');
var utils = require('../../utils.js');
var Statistic = require('./model.js');
var User = require('../user/model.js');
var config = require('../../config.js');
var router = express.Router();

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
            return res.status(400).send(
                utils.errorResponse('ER_COOKIE_EXP')
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

/*
 * Router handlers for transcription routes
 */

/*
 * Obtain the total number of hours of audio transcribed for a specific user.
 */
function getUserHoursTranscribed(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Statistic.findOne({
        userID: req.user._id
    }, function(err, statistic){
        // If an error occured with finding the user's statistic
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If the statistic does not exist, return 0
        if (!statistic){
            return res.status(200).send({'hoursAudioTranscribed': 0});
        }
        // Return the hours of audio transcribed
        return res.status(200).send({
            'hoursAudioTranscribed': statistic.hoursAudioTranscribed
        });
    });
}

/*
 * Obtain the total amount of audio uploaded (in megabytes) for a specific
 * user.
 */
function getUserAmountTranscribed(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Statistic.findOne({
        userID: req.user._id
    }, function(err, statistic){
        // If an error occured with finding the user's statistic
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If the statistic does not exist, return 0
        if (!statistic){
            return res.status(200).send({'amountAudioUploaded': 0});
        }
        // Return the amount of audio uploaded
        return res.status(200).send({
            'amountAudioUploaded': statistic.amountAudioUploaded
        });
    });
}

/*
 * Obtain the total number of hours of audio transcribed as an agregate of the
 * total number of hours of audio transcribed across all users.
 */
function getTotalHoursTranscribed(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Statistic.find({}, function(err, statistics){
        // If an error occured with finding all user statistics 
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If no transcripts are found, return 0
        if (!statistics){
            return res.status(200).send({'totalHoursAudioTranscribed': 0});
        } else {
            // Iterate through every statistic and add hoursAudioTranscribed
            var totalHoursAudioTranscribed = 0;
            statistics.forEach(function(statistic){
                totalHoursAudioTranscribed += 
                    parseInt(statistic.hoursAudioTranscribed);
            });
            return res.status(200).send({
                'totalHoursAudioTranscribed': totalHoursAudioTranscribed
            });
        }
    });
}

/*
 * Obtain the total amount of audio uploaded (in megabytes) as an agregate
 * of the total amount of audio uploaded (in megabytes) across all users.
 */
function getTotalAmountTranscribed(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid. It also binds the user's non-sensative data to the request.
     */
    Statistic.find({}, function(err, statistics){
        // If an error occured with finding all user statistics 
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If no transcripts are found, return 0
        if (!statistics){
            return res.status(200).send({'totalAmountAudioUploaded': 0});
        } else {
            // Iterate through every statistic and add amountAudioUploaded
            var totalAmountAudioUploaded = 0;
            statistics.forEach(function(statistic){
                totalAmountAudioUploaded += 
                    parseInt(statistic.amountAudioUploaded);
            });
            return res.status(200).send({
                'totalAmountAudioUploaded': totalAmountAudioUploaded
            });
        }
    });
}

/*
 * Router URL index for statistic routes
 */

router.get('/transcription/total/hours', parseValidateCookie, 
    getTotalHoursTranscribed);
router.get('/transcription/total/amount', parseValidateCookie, 
    getTotalAmountTranscribed);
router.get('/transcription/hours', parseValidateCookie,
    getUserHoursTranscribed);
router.get('/transcription/amount', parseValidateCookie,
    getUserAmountTranscribed);

module.exports = router;
