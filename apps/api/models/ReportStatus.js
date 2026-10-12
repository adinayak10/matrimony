const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ReportStatus Schema (models relationship between users with report status)
const reportStatusSchema = new Schema({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user who reported
  reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The user who is reported
  status: { type: Boolean, default: false }, // Report status (true or false)
  createdAt: { type: Date, default: Date.now },
});

const ReportStatus = mongoose.model('ReportStatus', reportStatusSchema);
module.exports = ReportStatus;
