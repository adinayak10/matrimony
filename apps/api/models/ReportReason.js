const mongoose = require('mongoose');

const ReportReasonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ReportReason', ReportReasonSchema);
