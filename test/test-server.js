'use strict';
let http = require('http');
let path = require('path');
let express = require('express');
let utils = require('../server/utils.js');
let config = require('../server/config.js');
let bodyParser = require('body-parser');
let session = require('express-session');
let cookieParser = require('cookie-parser');
let userRoutes = require('../server/resources/user/routes.js');
let statisticRoutes = require('../server/resources/statistic/routes.js');
let transcriptRoutes = require('../server/resources/transcript/routes.js');

// Init express
let app = express();

// Configure express
app.use(cookieParser());
app.use(bodyParser.json({limit: '1mb'}));
app.set('port', process.env.PORT || 8888);
app.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

// Configure session for express
app.use(session({
    secret: config.KEY.SESSION,
    resave: false,
    saveUninitialized: false
}));

// Create the test server
let server = http.createServer(app);

// Bind app to API routes
app.use('/api/user', userRoutes);
// REST API for transcript
app.use('/api/transcript', transcriptRoutes.router);
// REST API for statistics
app.use('/api/statistic', statisticRoutes);

// Start the test server
server.listen(app.get('port'));

module.exports = app