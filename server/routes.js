var path = require('path');
var userRoutes = require('./resources/user/routes.js');
var statisticRoutes = require('./resources/statistic/routes.js');
var transcriptRoutes = require('./resources/transcript/routes.js');

module.exports = function(app, io){
    // Initialize socketIO for Transcript Routes
    transcriptRoutes.init(io);
	// REST API for user
	app.use('/api/user', userRoutes);
	// REST API for transcript
	app.use('/api/transcript', transcriptRoutes.router);
	// REST API for statistics
	app.use('/api/statistic', statisticRoutes);
	// Serve the index page (single page Angular2 application)
	app.get('*', function(req, res){
		res.sendFile(path.resolve(__dirname + '/../public/index.html'));
	});
};
