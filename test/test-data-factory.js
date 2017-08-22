'use strict';
let nJwt = require('njwt');
let faker = require('faker');
let mongoose = require('mongoose');
let chaiFactory = require('chai-js-factories');

// Define constants
let SESSION_KEY = 'h`Y>4X[>fg7x@c2D';

module.exports = function(chai){
    // Allow chai to use cha-js-factories plugin
    chai.use(chaiFactory);

    // Define create user request factory
    chai.factory.define('userRequest', (args=false) => {
        // Use values from args if they exist otherwise generate new values
        return {
            'name': args.name || faker.name.findName(),
            'email': args.email || faker.internet.email(),
            'password': args.password || faker.internet.password()
        };
    });

    // Define login user request factory
    chai.factory.define('loginRequest', (args=false) => {
        // Use values from args if they exist otherwise generate new values
        return {
            'email': args.email || faker.internet.email(),
            'password': args.password || faker.internet.password()
        };
    });

    // Define user statistics factory
    chai.factory.define('userStats', (args=false) => {
        // Use values from args if they exist otherwise generate new values
        return {
            'userID': args.userID || mongoose.Types.ObjectId(),
            'amountAudioUploaded': 
                args.amountAudioUploaded || faker.random.number,
            'hoursAudioTranscribed': 
                args.hoursAudioTranscribed || faker.random.number
        };
    });

    // Define access token factory
    chai.factory.define('accessToken', (args=false) => {
        // Use values from args if they exist otherwise generate new values
        let claims = {
            sub: args.tokenSub || mongoose.Types.ObjectId(),
            iss: args.tokenIss || 'http://localhost:8888',
            permissions: args.tokenPermissions || 'Default'
        }
        let token = nJwt.create(claims, args.tokenKey || SESSION_KEY);
        token.setExpiration(new Date().getTime() + (args.tokenExp || 36000000));
        return token.compact(); 
    });
}

