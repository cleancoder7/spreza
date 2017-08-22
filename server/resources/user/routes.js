var nJwt = require('njwt');
var rmdir = require('rimraf');
var mkdir = require('mkdirp');
var User = require('./model.js');
var cookies = require('cookies');
var express = require('express');
var jwt = require('jsonwebtoken');
var utils = require('../../utils.js');
var config = require('../../config.js');
var sprintf = require('sprintf-js').sprintf;
var router = express.Router();

// Constants
const EM_FIELD_FROM = 'Spreza <' + config.EMAIL.USER + '>';
const EM_FIELD_SUBJECT_RESET = 'Verify your Spreza account';
const EM_FIELD_SUBJECT_VERIFY = 'Verify your Spreza account';
const EM_ACCOUNT_VERIFY = '<p>Hey %s!</p><p>Thanks for signing up for your \
    Spreza account. You\'re almost there! Verify your account by clicking \
    the link below:</p><p><a href="%s">Verify your Spreza Account</a></p>\
    <p><b>This link will expire in an hour. If you need a new link, head \
    back to www.spreza.co to receive a new verification link from the \
    login form.</b></p><p>Welcome to Spreza!<br/><br/>The Spreza Team</p><br/>\
    <p><i>Questions? Reach out to info@spreza.co</i></p>';
const EM_RESET_PASSWORD = '<p>Hey %s!</p><p>Here is your password reset link \
    for your Spreza account.</p><p><a href="%s">Password Reset Link</a></p>\
    <p>Regards,<br/>The Spreza Team</p><br/><p><i>Questions? Reach out to \
    info@spreza.co</i></p>';
const EM_FEEDBACK  = '<p>User %s sent the following feedback: </p><p>"%s"\
    </p>';

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
            // Extract ID, name and email from the user and bind to requests
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

// Validate token from the request and bind user ID, email and token type
function parseValidateToken(req, res, next){
    // Decode token data from the request
    jwt.verify(req.body.token, config.KEY.ACCOUNT, function(err, decoded){
        // If an error occured with verifying the token
        if (err || decoded === undefined){
            return res.status(400).send(
                utils.errorResponse('ER_TOKEN_INVALID')
            );
        }
        // Find the user referenced in this token
        User.findOne({
            _id: decoded.id,
            email: decoded.email
        }, function(errr, user){
            // If an error occured with finding a user
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            // If a user was not found
            if (!user){
                return res.status(400).send(
                    utils.errorResponse('ER_NO_USER')
                );
            }
            // Extract ID, email and token type and bind to request
            req.token = {
                userID: user._id,
                type: decoded.type,
                userEmail: user.email
            };
            // Continue with the next piece of middleware
            next();
        });
    });
}

/*
 * Router handlers for user routes
 */

// Create a new user (registration)
function createUser(req, res, next){
    // Check for an existing user with the same email
    User.findOne({
        "email": req.body.email
    }, function(err, user){
        // If an error occured while finding an existing user
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If an existing user with the same email is found
        if (user){
            return res.status(400).send(
                utils.errorResponse('ER_USER_EXISTS')
            );
        }
        // If no user with the same email is found, create a new user
        var newUser = new User(req.body);
        newUser.save(function(err){
            // If an error occured with saving the new user
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.sendStatus(200);
        });
    });
}

// Obtain current session's user's email and name
function getUserNonSensative(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid.
     */
    return res.status(200).send({
        "name": req.user.name,
        "email": req.user.email
    });
}

// Obtain user's settings
function getUserSettings(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid.
     */
     User.findOne({
         _id: req.user._id
     }, function(err, user){
         // If an error occured with finding the user or the user doesn't exist
         if (err || !user){
             return res.status(500).send(
                 utils.errorResponse('ER_SERVER', err)
             );
         }
         return res.status(200).send(user.settings);
     });
}

// Update user's settings
function updateUserSettings(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid.
     */
     // Update user's settings
     User.findOneAndUpdate({
         _id: req.user._id
     },{
         $set: {
             'settings': req.body
         }
     }, function(err, user){
         // If an error occured with saving the user or the user doesn't exist
         if (err || !user){
             return res.status(500).send(
                 utils.errorResponse('ER_SERVER', err)
             );
         }
         return res.sendStatus(200);
     });
}

// Create a new user session token and send as a cookie (login)
function createSession(req, res, next){
    // Check for an existing user with the same email
    User.findOne({
        "email": req.body.email
    }, function(err, user){
        // If an error occured with finding an existing user
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If a user with the email specified was not found
        if (!user){
            return res.status(400).send(
                utils.errorResponse('ER_NO_USER')
            );
        }
        // If a user with the email specified exists then check password
        user.comparePassword(req.body.password, function(err, isMatch){
            // If an error occured with comparing passwords
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            // If the user is not verified
            if (!user.isVerified){
                return res.status(400).send(
                    utils.errorResponse('ER_USER_NOT_VERIFIED')
                );
            }
            // If the password is incorrect
            if (!isMatch){
                return res.status(400).send(
                    utils.errorResponse('ER_WRONG_PASSWORD')
                );
            }
            // If the user exists and password is correct, create TMP folder
            rmdir(utils.getUserTempFolderPath(user._id), function(err){
                // If an error occured with deleting the TMP folder
                if (err){
                    return res.status(500).send(
                        utils.errorResponse('ER_SERVER', err)
                    );
                }
                mkdir(utils.getUserTempFolderPath(user._id), function(err){
                    // If an error occured with creating the TMP folder
                    if (err){
                        return res.status(500).send(
                            utils.errorResponse('ER_SERVER', err)
                        );
                    }
                });
            });
            // Prepare the claims for the user's session
            var claims = {
                sub: user._id,
                iss: config.HOST,
                permissions: 'Default'
            };
            // Generate the JSON web token and set to expire in 10 hours
            var token = nJwt.create(claims, config.KEY.SESSION);
            token.setExpiration(new Date().getTime() + 36000000);
            var compactToken = token.compact();
            // Create a new cookie that stores the compact token
            new cookies(req, res).set(
                'access_token', compactToken, config.COOKIE_FLAGS
            );
            return res.sendStatus(200);
        });
    });
}

// Validate the user's access token in the session cookie
function validateSession(req, res, next){
    /*
     * NOTE: parseValidateCookie Must be called before this function in the
     * router in order to confirm that the cookie is verified and the token is
     * valid.
     */
     return res.sendStatus(200);
}

// Delete the user's session (logout)
function deleteSession(req, res, next){
    // Delete the cookie storing the user's session
    res.clearCookie('access_token');
    return res.sendStatus(200);
}

// send password reset email to the user specified by the email
function sendResetPasswordEmailToUser(req, res, next){
    // Find a user with a matching email
    User.findOne({
        "email": req.body.email
    }, function(err, user){
        // If an error occured with finding the user
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If a user with the email specified was not found
        if (!user){
            return res.status(400).send(
                utils.errorResponse('ER_NO_USER')
            );
        }
        // If the user is not verified
        if (!user.isVerified){
            return res.status(400).send(
                utils.errorResponse('ER_USER_NOT_VERIFIED')
            );
        }
        // Generate JSON that stores token's data, sign and generate token
        var tokenData = {
            "id": user._id,
            "type": 'reset',
            "email": user.email
        };
        var token = jwt.sign(tokenData, config.KEY.ACCOUNT, {
            expiresIn: '1h'
        });
        // Generate the password reset link
        var passwordResetLink = config.HOST + '/reset/' + token;
        // Configure email options
        var emailOptions = {
            from: EM_FIELD_FROM,
            to: user.email,
            subject: EM_FIELD_SUBJECT_RESET,
            html: sprintf(EM_RESET_PASSWORD, user.name, passwordResetLink)
        };
        utils.sendEmail(emailOptions, function(err){
            // If an error occured with sending the email
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.sendStatus(200);
        });
    });
}

// Validate user's token and set a new password for the user as specified
function resetUserPassword(req, res, next){
    /*
     * NOTE: parseValidateToken Must be called before this function in the
     * router in order to confirm that the token is valid.
     */
    User.findOne({
        _id: req.token.userID,
        email: req.token.userEmail
    }, function(err, user){
        // If an error occured with finding a user or the user is not verified
        if (req.token.type !== 'reset' || err || !user.isVerified){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // Update the userr's password
        user.password = req.body.password;
        user.save(function(err){
            // If an error occured with saving the user
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.sendStatus(200);
        });
    });
}

// Send account verification email to the user specified by the email
function sendVerifyAccountEmailToUser(req, res, next){
    // Find a user with a matching email
    User.findOne({
        "email": req.body.email
    }, function(err, user){
        // If an error occured with finding the user
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If a user with the email specified was not found
        if (!user){
            return res.status(400).send(
                utils.errorResponse('ER_NO_USER')
            );
        }
        // If the user is already verified
        if (user.isVerified){
            return res.status(400).send(
                utils.errorResponse('ER_USER_VERIFIED')
            );
        }
        // Generate JSON that stores token's data, sign and generate token
        var tokenData = {
            "id": user._id,
            "type": 'verify',
            "email": user.email
        };
        var token = jwt.sign(tokenData, config.KEY.ACCOUNT, {
            expiresIn: '1h'
        });
        // Generate the verify account link
        var verifyAccountLink = config.HOST + '/verify/' + token;
        // Configure email options
        var emailOptions = {
            to: user.email,
            from: EM_FIELD_FROM,
            subject: EM_FIELD_SUBJECT_VERIFY,
            html: sprintf(EM_ACCOUNT_VERIFY, user.name, verifyAccountLink)
        };
        utils.sendEmail(emailOptions, function(err){
            // If an error occured with sending the email
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.sendStatus(200);
        });
    });
}

// Validate user's token and verify account specified by token
function verifyUserAccount(req, res, next){
    /*
     * NOTE: parseValidateToken Must be called before this function in the
     * router in order to confirm that the token is valid.
     */
    User.findOne({
        _id: req.token.userID,
        email: req.token.userEmail
    }, function(err, user){
        // If an error occured with finding a user or the user is verified
        if (req.token.type !== 'verify' || err || user.isVerified){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        // If the user exists and is not yet verified then verify them
        user.isVerified = true;
        user.save(function(err){
            // If an error occured with saving the user
            if (err){
                return res.status(500).send(
                    utils.errorResponse('ER_SERVER', err)
                );
            }
            return res.sendStatus(200);
        });
    });
}

// Send user feedback
function sendFeedback(req, res, next){
    /*
     * NOTE: parseValidateToken Must be called before this function in the
     * router in order to confirm that the token is valid.
     */
    // Configure email options for sending feedback
    var emailOptions = {
        to: 'feedback@spreza.co',
        from: 'Spreza <' + config.EMAIL.USER + '>',
        subject: 'Spreza Transcribe Feedback From [' + req.user.email + ']',
        html: sprintf(EM_FEEDBACK, req.user.email, req.body.feedback)
    };
    utils.sendEmail(emailOptions, function(err){
        // If an error occured with sending the email
        if (err){
            return res.status(500).send(
                utils.errorResponse('ER_SERVER', err)
            );
        }
        return res.sendStatus(200);
    });
}

/*
 * Router URL index for user routes
 */

router.post('/', createUser);
router.get('/', parseValidateCookie, getUserNonSensative);
router.get('/settings', parseValidateCookie, getUserSettings);
router.put('/settings', parseValidateCookie, updateUserSettings);
router.post('/session', createSession);
router.put('/session', parseValidateCookie, validateSession);
router.delete('/session', deleteSession);
router.post('/reseter', sendResetPasswordEmailToUser);
router.put('/reseter', parseValidateToken, resetUserPassword);
router.post('/verifier', sendVerifyAccountEmailToUser);
router.put('/verifier', parseValidateToken, verifyUserAccount);
router.post('/feedback', parseValidateCookie, sendFeedback);

module.exports = router;
