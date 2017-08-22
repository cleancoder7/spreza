var mongoose = require('mongoose');

// Define a schema that represents an audio transcript
var transcript = new mongoose.Schema({
    name: String,
    dateCreated: Number,
    ownerID: mongoose.Schema.Types.ObjectId,
    status: {
        type: String,
        default: 'Transcribing'
    },
    audio: {
        url: String,
        origin: String
    },
    content: {
        original: String,
        subtitles: String,
        revisedData: {
            type: Array,
            default: [paragraph]
        },
        // Temp hold the results prior to parsing
        full: {
            response: {
                type: Array,
                default: []
            }
        }
    }
});

var paragraph = new mongoose.Schema({
    words: {
            type: Array,
            default: []
        },
    pid: mongoose.Schema.Types.ObjectId
})

// revisedDatum: {
//     word: String,
//     start: Number,
//     end: Number
// }


// Export the transcript schema as a usable model
module.exports = mongoose.model('transcript', transcript);
