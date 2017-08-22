var http = require('http');
var path = require('path');
var express = require('express');
var utils = require('./utils.js');
var mongoose = require('mongoose');
var config = require('./config.js');
var routes = require('./routes.js');
var bodyParser = require('body-parser');
var session = require('express-session');
var cookieParser = require('cookie-parser');

// Init express
var app = express();

// Configure express
app.use(cookieParser());
app.use(bodyParser.json({limit: '1mb'}));
app.set('port', process.env.PORT || 8888);
app.use(express.static(path.join(__dirname + '/../public')));
app.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

// Configure session for express
app.use(session({
    secret: config.KEY.SESSION,
    resave: false,
    saveUninitialized: false
}));

// Fix mongoose promise deprecation warning by specificing global promise
mongoose.Promise = global.Promise;
// Connect to mongo database
mongoose.connect(config.DATABASE, function(err){
    if (err) {
        throw new Error('Error connecting to MongoDB instance.');
    }
});

// Configure websocket server
var server = http.createServer(app);
var io = require('socket.io')(server);

// Bind app and socket io to the API routes
routes(app, io);

// Start the server
server.listen(app.get('port'), '0.0.0.0', function(){
    console.log('Server running on port: ' + server.address().port);
    console.log('Host: ' + server.address().address);
});
