'use strict';
let chai = require('chai');
let should = chai.should();
let mongoose = require('mongoose');
let chaiHttp = require('chai-http');
let config = require('../server/config');
let testServer = require('./test-server');
let factories = require('./test-data-factory')(chai);
let User = require('../server/resources/user/model');
let Statistic = require('../server/resources/statistic/model');

// Constants
let REGEX_COOKIE_TOKEN = /^access_token=[\d\w-_.]+;/;

// Allow chai to use the chai-http plugin
chai.use(chaiHttp);

// Helper functions

function initDatabase(callback){
    mongoose.Promise = global.Promise;
    mongoose.connect('mongodb://localhost/SprezaTest', (err) => {
        callback(err);
    });
}

function cleanCloseDatabase(){
    // Clear the database of any previous collections
    for (var i in mongoose.connection.collections){
        mongoose.connection.collections[i].remove(() => {});
    }
    mongoose.disconnect();
}

function injectIntoDatabase(model, modelData, callback){
    let newModel = new model(modelData);
    newModel.save((err) => {
        callback(err, newModel);
    });
}

// User REST API test suite
describe('User API Test Suite', () => {
    
    // Execute before each test case in this suite
    beforeEach((done) => {
        initDatabase((err) => {
            done(err);
        });
    });
    
    // Execute after each test case in this suite
    afterEach((done) => {
        cleanCloseDatabase();
        done();
    });

    describe('GET api/user', () => {
        it('it should not get the current user\'s details when no current user exists', (done) => {
            chai.request(testServer)
                .get('/api/user')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the current user\'s details when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/user')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        })
        it('it should get the current user\'s details when the current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/user')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('name').eql(userRequest.name);
                        res.body.should.have.property('email').eql(userRequest.email);
                        done();
                    });
            });
        });
        it('it should not get the current user\'s details when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/user')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
    });

    describe('GET api/user/settings', () => {
        it('it should not get the current user\'s settings when no current user exists', (done) => {
            chai.request(testServer)
                .get('/api/user/settings')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the current user\'s settings when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/user/settings')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not get the current user\'s settings when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/user/settings')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it ('it should get the current user\'s settings when the current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/user/settings')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('profileHelpTipsOn').eql(true);
                        done();
                    });
            });
        });
    });

    describe('PUT api/user/settings', () =>{
        it('it should not modify the current user\'s settings when no current user exists', (done) =>{
            chai.request(testServer)
                .put('/api/user/settings')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not modify the current user\'s settings when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .put('/api/user/settings')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not modify the current user\'s settings with the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .put('/api/user/settings')
                    .set('Cookie', ['access_token=' + accessToken])
                    .send({'profileHelpTipsOn': false})
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should modify the current user\'s settings when the current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .put('/api/user/settings')
                    .set('Cookie', ['access_token=' + accessToken])
                    .send({'profileHelpTipsOn': false})
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        done();
                    });
            });
        });
    });

    describe('PUT api/user/session', () => {
        it('it should not validate the current user when no current user exists', (done) => {
            chai.request(testServer)
                .put('/api/user/session')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not validate the current user when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .put('/api/user/session')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should not validate the current user when no current user exists', (done) => {
            // Create an access token for a non-existing current user
            let accessToken = chai.factory.create('accessToken', {
                tokenKey: config.KEY.SESSION
            });
            // Execute request and attach access token to cookie
            chai.request(testServer)
                .put('/api/user/session')
                .set('Cookie', ['access_token=' + accessToken])
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(500);
                    err.response.body.should.have.property('errorCode').eql('ER_SERVER');
                    done();
                });
        });
        it('it should validate the current user when the current user is authenticated', (done) => {
            // Create a user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create a valid access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .put('/api/user/session')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        done();
                    });
            });
        });
    });

    describe('POST api/user/feedback', () => {
        it('it should not create new feedback from the current user when no current user exists', (done) => {
            chai.request(testServer)
                .put('/api/user/session')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not create new feedback from the current user when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .put('/api/user/session')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
    });

    describe('POST api/user', () => {
        it('it should create a new user when provided valid user request data', (done) => {
            chai.request(testServer)
                .post('/api/user')
                .send(chai.factory.create('userRequest'))
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    done();
                });
        });
        it ('it should not create two users when both users\' request data contain the same email (emails must be unique)', (done) => {
            let userRequest = chai.factory.create('userRequest');
            chai.request(testServer)
                .post('/api/user')
                .send(userRequest)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    // Call the API on the same user request data
                    chai.request(testServer)
                        .post('/api/user')
                        .send(userRequest)
                        .end((err, res) => {
                            err.should.not.be.null;
                            err.should.have.status(400);
                            err.response.body.should.have.property('errorCode').eql('ER_USER_EXISTS');
                            done();
                        });
                });
        });
        it('it should create two users when both users\' request data contain the same name but different emails', (done) => {
            // Create two users requests both with the same name but different emails
            let userRequestA = chai.factory.create('userRequest');
            let userRequestB = chai.factory.create('userRequest', {
                name: userRequestA.name
            });
            chai.request(testServer)
                .post('/api/user')
                .send(userRequestA)
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    // Call the same API on the second user request data
                    chai.request(testServer)
                        .post('/api/user')
                        .send(userRequestB)
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(200);
                            done();
                        });
                });
        });
    });

    describe('POST api/user/session', () => {
        it('it should not authenticate the current user when no current user exists', (done) => {
            chai.request(testServer)
                .post('/api/user/session')
                .send(chai.factory.create('userRequest'))
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    res.should.not.have.cookie('access_token');
                    err.response.body.should.have.property('errorCode').eql('ER_NO_USER');
                    done();
                });
        });
        it('it should not authenticate the current user when the current user is unverified with correct password', (done) => {
            // Create login and user requests and inject a new user into the test database
            let userRequest = chai.factory.create('userRequest');
            let loginRequest = chai.factory.create('loginRequest', userRequest);
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                if (err){
                    // Failed to inject user, force the test to fail
                    done(err);
                }
                chai.request(testServer)
                    .post('/api/user/session')
                    .send(loginRequest)
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        res.should.not.have.cookie('access_token');
                        err.response.body.should.have.property('errorCode').eql('ER_USER_NOT_VERIFIED');
                        done();
                    });
            });
        });
        it('it should not authenticate the current user when the current user is unverified with incorrect password', (done) => {
            // Create login and user requests and inject a new user into the test database
            let userRequest = chai.factory.create('userRequest');
            let loginRequest = chai.factory.create('loginRequest', {
                'email': userRequest.email
            });
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                if (err){
                    // Failed to inject user, force the test to fail
                    done(err);
                }
                chai.request(testServer)
                    .post('/api/user/session')
                    .send(loginRequest)
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        res.should.not.have.cookie('access_token');
                        err.response.body.should.have.property('errorCode').eql('ER_USER_NOT_VERIFIED');
                        done();
                    });
            });
        });
        it('it should not authenticate the current user when the current user is verified with incorrect password', (done) => {
            // Create login and user request and inject a new user into the test database
            let userRequest = chai.factory.create('userRequest');
            let loginRequest = chai.factory.create('loginRequest', userRequest);
            userRequest['isVerified'] = true;
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                if (err){
                    // Failed to inject user, force the test to fail
                    done(err);
                }
                chai.request(testServer)
                    .post('/api/user/session')
                    .send(loginRequest)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.should.have.cookie('access_token');
                        res.header['set-cookie'][0].should.match(REGEX_COOKIE_TOKEN);
                        done();
                    });
            });
        });
        it('it should authenticate the current user when the current user is verified with correct password', (done) => {
            // Create login and user reuqest and inject a new user into the test database
            let userRequest = chai.factory.create('userRequest');
            let loginRequest = chai.factory.create('loginRequest', {
                'email': userRequest.email
            });
            userRequest['isVerified'] = true;
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                if (err){
                    // Failed to inject user, force the test to fail
                    done(err);
                }
                chai.request(testServer)
                    .post('/api/user/session')
                    .send(loginRequest)
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        res.should.not.have.cookie('access_token');
                        err.response.body.should.have.property('errorCode').eql('ER_WRONG_PASSWORD');
                        done();
                    });
            });
        });
    });

    describe('DELETE api/user/session', () => {
        it('it should delete the session cookie when there is an active session', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create access token for the above user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                chai.request(testServer)
                    .delete('/api/user/session')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.should.not.have.cookie('access_token');
                        res.header['set-cookie'][0].should.not.match(REGEX_COOKIE_TOKEN);
                        done();
                    });
            });
        });
        it('it should delete the session cookie when there is no active session', (done) => {
            chai.request(testServer)
                .delete('/api/user/session')
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    res.should.not.have.cookie('access_token');
                    res.header['set-cookie'][0].should.not.match(REGEX_COOKIE_TOKEN);
                    done();
                });
        });
        it('it should delete the session cookie when the session has expired', (done) => {
            // Create a fake access token to inject into the cookie
            let accessToken = chai.factory.create('accessToken', {
                tokenExp: 1
            });
            chai.request(testServer)
                .delete('/api/user/session')
                .end((err, res) => {
                    should.not.exist(err);
                    res.should.have.status(200);
                    res.should.not.have.cookie('access_token');
                    res.header['set-cookie'][0].should.not.match(REGEX_COOKIE_TOKEN);
                    done();
                });
        });
    });
});

// Statistic REST API test suite
describe('Statistic API Test Suite', () => {

    // Execute before each test case in this suite
    beforeEach((done) => {
        initDatabase((err) => {
            done(err);
        });
    });
    
    // Execute after each test case in this suite
    afterEach((done) => {
        cleanCloseDatabase();
        done();
    });

    describe('GET api/statistic/transcription/hours', () => {
        it('it should not get the hours transcribed for the current user when no current user exists', (done) => {
            chai.request(testServer)
                .get('/api/statistic/transcription/hours')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the hours transcribed for the current user when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/statistic/transcription/hours')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not get the hours transcribed for the current user when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/hours')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should get 0 as the hours transcribed for the new singleton current user when the new singleton current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/hours')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('hoursAudioTranscribed').eql(0);
                        done();
                    });
            });
        });
        it('it should get a non-zero value as the hours transcribed for the current singleton user when the singleton user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Generate user statistics and inject into database
                let userStats = chai.factory.create('userStats', {
                    userID: userObj._id,
                    amountAudioUploaded: 3,
                    hoursAudioTranscribed: 12
                });
                injectIntoDatabase(Statistic, userStats, (err, statObj) => {
                    // Execute request and attach access token to cookie
                    chai.request(testServer)
                        .get('/api/statistic/transcription/hours')
                        .set('Cookie', ['access_token=' + accessToken])
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(200);
                            res.body.should.have.property('hoursAudioTranscribed').eql(12);
                            done();
                        });
                });
            });
        });
        it('it should get a non-zero value as the hours transcribed for the current user when the current user is authenticated and multiple users exist', (done) => {
            // Create 2 users and inject both into the database
            let userRequestA = chai.factory.create('userRequest');
            let userRequestB = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequestA, (err, userObjA) => {
                injectIntoDatabase(User, userRequestB, (err, userObjB) => {
                    // Create access token for user A
                    let accessToken = chai.factory.create('accessToken', {
                        tokenSub: userObjA._id,
                        tokenKey: config.KEY.SESSION
                    });
                    // Generate user statistics for both users and inject into database
                    let userStatsA = chai.factory.create('userStats', {
                        userID: userObjA._id,
                        amountAudioUploaded: 12,
                        hoursAudioTranscribed: 23.5
                    });
                    let userStatsB = chai.factory.create('userStats', {
                        userID: userObjB._id,
                        amountAudioUploaded: 4,
                        hoursAudioTranscribed: 9
                    });
                    injectIntoDatabase(Statistic, userStatsA, (err, statObjA) => {
                        injectIntoDatabase(Statistic, userStatsB, (err, statObjB) => {
                            // Execute request and attach access token to cookie
                            chai.request(testServer)
                                .get('/api/statistic/transcription/hours')
                                .set('Cookie', ['access_token=' + accessToken])
                                .end((err, res) => {
                                    should.not.exist(err);
                                    res.should.have.status(200);
                                    res.body.should.have.property('hoursAudioTranscribed').eq(23.5);
                                    done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe('GET api/statistic/transcription/amount', () => {
        it('it should not get the amount of audio uploaded for the current user when no current user exists', (done) => {
            chai.request(testServer)
                .get('/api/statistic/transcription/amount')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the amount of audio uploaded for the current user when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/statistic/transcription/amount')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not get the amount of audio uploaded for the current user when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/amount')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should get 0 as the amount of audio uploaded for the new singleton current user when the new singleton current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/amount')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('amountAudioUploaded').eql(0);
                        done();
                    });
            });
        });
        it('it should get a non-zero value as the amount of audio uploaded for the current singleton user where the singleton user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                });
                // Generate user statistics and inject into database
                let userStats = chai.factory.create('userStats', {
                    userID: userObj._id,
                    amountAudioUploaded: 7,
                    hoursAudioTranscribed: 2
                });
                injectIntoDatabase(Statistic, userStats, (err, statObj) => {
                    // Execute request and attach access token to cookie
                    chai.request(testServer)
                        .get('/api/statistic/transcription/amount')
                        .set('Cookie', ['access_token=' + accessToken])
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(200);
                            res.body.should.have.property('amountAudioUploaded').eql(7);
                            done();
                        });
                });
            });
        });
        it('it should get a non-zero value as the amount of audio uploaded for the current user when the current user is authenticated and multiple users exists', (done) => {
            // Create 2 users and inject both into the database
            let userRequestA = chai.factory.create('userRequest');
            let userRequestB = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequestA, (err, userObjA) => {
                injectIntoDatabase(User, userRequestB, (err, userObjB) => {
                    // Create access token for user A
                    let accessToken = chai.factory.create('accessToken', {
                        tokenSub: userObjA._id,
                        tokenKey: config.KEY.SESSION
                    });
                    // Generate user statistics for both users and inject into database
                    let userStatsA = chai.factory.create('userStats', {
                        userID: userObjA._id,
                        amountAudioUploaded: 12,
                        hoursAudioTranscribed: 23.5
                    });
                    let userStatsB = chai.factory.create('userStats', {
                        userID: userObjB._id,
                        amountAudioUploaded: 4,
                        hoursAudioTranscribed: 9
                    });
                    injectIntoDatabase(Statistic, userStatsA, (err, statObjA) => {
                        injectIntoDatabase(Statistic, userStatsB, (err, statObjB) => {
                            // Execute request and attach access token to cookie
                            chai.request(testServer)
                                .get('/api/statistic/transcription/amount')
                                .set('Cookie', ['access_token=' + accessToken])
                                .end((err, res) => {
                                    should.not.exist(err);
                                    res.should.have.status(200);
                                    res.body.should.have.property('amountAudioUploaded').eq(12);
                                    done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe('GET api/statistic/transcription/total/hours', () => {
        it('it should not get the total hours transcribed across all users when no current user exists', (done) =>{
            chai.request(testServer)
                .get('/api/statistic/transcription/total/hours')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the total hours transcribed across all users when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/hours')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not get the total hours transcribed across all users when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/hours')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should get 0 as the total hours transcribed for the new singleton current user when the new singleston current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/hours')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('totalHoursAudioTranscribed').eql(0);
                        done();
                    });
            });
        });
        it('it should get a non-zero value as the total hours transcribed for the current singleton user where the singleton user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                });
                // Generate user statistics and inject into database
                let userStats = chai.factory.create('userStats', {
                    userID: userObj._id,
                    amountAudioUploaded: 7,
                    hoursAudioTranscribed: 2
                });
                injectIntoDatabase(Statistic, userStats, (err, statObj) => {
                    // Execute request and attach access token to cookie
                    chai.request(testServer)
                        .get('/api/statistic/transcription/total/hours')
                        .set('Cookie', ['access_token=' + accessToken])
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(200);
                            res.body.should.have.property('totalHoursAudioTranscribed').eql(2);
                            done();
                        });
                });
            });
        });
        it('it should get a non-zero value as the total hours transcribed across all users for the current user when the current user is authenticated and multiple users exist', (done) => {
            // Create 2 users and inject both into the database
            let userRequestA = chai.factory.create('userRequest');
            let userRequestB = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequestA, (err, userObjA) => {
                injectIntoDatabase(User, userRequestB, (err, userObjB) => {
                    // Create access token for user A
                    let accessToken = chai.factory.create('accessToken', {
                        tokenSub: userObjA._id,
                        tokenKey: config.KEY.SESSION
                    });
                    // Generate user statistics for both users and inject into database
                    let userStatsA = chai.factory.create('userStats', {
                        userID: userObjA._id,
                        amountAudioUploaded: 12,
                        hoursAudioTranscribed: 23
                    });
                    let userStatsB = chai.factory.create('userStats', {
                        userID: userObjB._id,
                        amountAudioUploaded: 4,
                        hoursAudioTranscribed: 9
                    });
                    injectIntoDatabase(Statistic, userStatsA, (err, statObjA) => {
                        injectIntoDatabase(Statistic, userStatsB, (err, statObjB) => {
                            // Execute request and attach access token to cookie
                            chai.request(testServer)
                                .get('/api/statistic/transcription/total/hours')
                                .set('Cookie', ['access_token=' + accessToken])
                                .end((err, res) => {
                                    should.not.exist(err);
                                    res.should.have.status(200);
                                    res.body.should.have.property('totalHoursAudioTranscribed').eq(32);
                                    done();
                            });
                        });
                    });
                });
            });
        });
    });

    describe('GET api/statistic/transcription/total/amount', () => {
        it('it should not get the total amount of audio uploaded across all users when no current user exists', (done) => {
            chai.request(testServer)
                .get('/api/statistic/transcription/total/amount')
                .end((err, res) => {
                    err.should.not.be.null;
                    err.should.have.status(400);
                    err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                    done();
                });
        });
        it('it should not get the total amount of audio uploadedd across all users when the current user is not authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/amount')
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_NO_COOKIE');
                        done();
                    });
            });
        });
        it('it should not get the total amount of audio uploaded across all users when the current user\'s session has expired', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                    tokenExp: 1
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/amount')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        err.should.not.be.null;
                        err.should.have.status(400);
                        err.response.body.should.have.property('errorCode').eql('ER_COOKIE_EXP');
                        done();
                    });
            });
        });
        it('it should get 0 as the total amount of audio uploaded for the new singleton current user when the new singleston current user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION
                });
                // Execute request and attach access token to cookie
                chai.request(testServer)
                    .get('/api/statistic/transcription/total/amount')
                    .set('Cookie', ['access_token=' + accessToken])
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.have.status(200);
                        res.body.should.have.property('totalAmountAudioUploaded').eql(0);
                        done();
                    });
            });
        });
        it('it should get a non-zero value as the total amount of audio uploaded for the current singleton user where the singleton user is authenticated', (done) => {
            // Create user and inject into database
            let userRequest = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequest, (err, userObj) => {
                // Create an expired access token for the current user
                let accessToken = chai.factory.create('accessToken', {
                    tokenSub: userObj._id,
                    tokenKey: config.KEY.SESSION,
                });
                // Generate user statistics and inject into database
                let userStats = chai.factory.create('userStats', {
                    userID: userObj._id,
                    amountAudioUploaded: 7,
                    hoursAudioTranscribed: 2
                });
                injectIntoDatabase(Statistic, userStats, (err, statObj) => {
                    // Execute request and attach access token to cookie
                    chai.request(testServer)
                        .get('/api/statistic/transcription/total/amount')
                        .set('Cookie', ['access_token=' + accessToken])
                        .end((err, res) => {
                            should.not.exist(err);
                            res.should.have.status(200);
                            res.body.should.have.property('totalAmountAudioUploaded').eql(7);
                            done();
                        });
                });
            });
        });
        it('it should get a non-zero value as the total amount of audio uploaded across all users for the current user when the current user is authenticated and multiple users exist', (done) => {
            // Create 2 users and inject both into the database
            let userRequestA = chai.factory.create('userRequest');
            let userRequestB = chai.factory.create('userRequest');
            injectIntoDatabase(User, userRequestA, (err, userObjA) => {
                injectIntoDatabase(User, userRequestB, (err, userObjB) => {
                    // Create access token for user A
                    let accessToken = chai.factory.create('accessToken', {
                        tokenSub: userObjA._id,
                        tokenKey: config.KEY.SESSION
                    });
                    // Generate user statistics for both users and inject into database
                    let userStatsA = chai.factory.create('userStats', {
                        userID: userObjA._id,
                        amountAudioUploaded: 12,
                        hoursAudioTranscribed: 23.5
                    });
                    let userStatsB = chai.factory.create('userStats', {
                        userID: userObjB._id,
                        amountAudioUploaded: 4,
                        hoursAudioTranscribed: 9
                    });
                    injectIntoDatabase(Statistic, userStatsA, (err, statObjA) => {
                        injectIntoDatabase(Statistic, userStatsB, (err, statObjB) => {
                            // Execute request and attach access token to cookie
                            chai.request(testServer)
                                .get('/api/statistic/transcription/total/amount')
                                .set('Cookie', ['access_token=' + accessToken])
                                .end((err, res) => {
                                    should.not.exist(err);
                                    res.should.have.status(200);
                                    res.body.should.have.property('totalAmountAudioUploaded').eq(16);
                                    done();
                            });
                        });
                    });
                });
            });
        });
    });
});
