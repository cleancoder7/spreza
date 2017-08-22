var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// Define a schema that represents a User in our application
var user = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    isVerified: {
        type: Boolean,
        default: false
    },
    settings: {
        profileHelpTipsOn: {
            type: Boolean,
            default: true
        }
    }
});

// Password hasing and salting when save() is invoked on a user instance
user.pre('save', function(next){
    // Obtain the current user instance
    var user = this;
    // If the password was not modified (for when an existing user is modified)
    if (!user.isModified('password')){
        return next();
    }
    // Hash the password with a salt factor
    bcrypt.genSalt(10, function(err, salt){
        if (err){
            return next(err);
        }
        bcrypt.hash(user.password, salt, null, function(err, hash){
            user.password = hash;
            next(); // Call save() for this user instance
        });
    });
});

// Define the password comparison method for authentication
user.methods.comparePassword = function(plainTextPassword, callback){
    bcrypt.compare(plainTextPassword, this.password, function(err, isMatch){
        if (err){
            return callback(err);
        }
        callback(null, isMatch);
    });
};

// Export he user schema as a mongoose model
module.exports = mongoose.model('user', user);
