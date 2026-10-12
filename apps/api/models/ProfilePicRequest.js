const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ProfilePicRequest Schema (models relationship between users with profile pic request status)
const profilePicRequestSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user who requested the profile picture
  requestedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user whose profile picture is requested
  status: { type: Boolean, default: false }, // Request status (true or false)
  createdAt: { type: Date, default: Date.now },
});

const ProfilePicRequest = mongoose.model('ProfilePicRequest', profilePicRequestSchema);
module.exports = ProfilePicRequest;
