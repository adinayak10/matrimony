const mongoose = require('mongoose');

const UserReportSchema = new mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  desc: { type: String },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNote: { type: String }
}, { timestamps: true });

// A6.7: one report per reporter/target pair (duplicate -> 409)
UserReportSchema.index({ reportedBy: 1, reportedUser: 1 }, { unique: true });
// C4.6: admin queue listing
UserReportSchema.index({ status: 1, createdAt: -1 });
UserReportSchema.index({ reportedUser: 1 });

module.exports = mongoose.model('UserReport', UserReportSchema);
