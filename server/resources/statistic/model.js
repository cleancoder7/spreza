var mongoose = require('mongoose');

// Define a schema that represents application usage statistics
var statistic = new mongoose.Schema({
    userID: mongoose.Schema.Types.ObjectId,
    amountAudioUploaded: {
        type: Number,
        default: 0
    },
    hoursAudioTranscribed: {
        type: Number,
        default: 0
    }
});

// Export the statistic schema as a usable model
module.exports = mongoose.model('statistic', statistic);
