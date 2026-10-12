const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// RemainingProfileImageView Schema (models the remaining views or restrictions related to profile image)
const remainingProfileImageViewSchema = new Schema({
  viewer: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user viewing the profile picture
  profileOwner: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user whose profile picture is viewed
  remainingViews: { type: Number, default: 5 }, // Number of remaining profile picture views
  restrictionStatus: { type: Boolean, default: false }, // Whether viewing is restricted
  createdAt: { type: Date, default: Date.now },
});

const RemainingProfileImageView = mongoose.model('RemainingProfileImageView', remainingProfileImageViewSchema);
module.exports = RemainingProfileImageView;
