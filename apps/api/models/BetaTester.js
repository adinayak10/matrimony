const mongoose = require('mongoose');

const betaTesterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  androidVersion: {
    type: String,
    trim: true
  },
  deviceModel: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  whyJoin: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'approved', 'active', 'rejected']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  adminNotes: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  inviteSent: {
    type: Boolean,
    default: false
  },
  inviteSentDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
betaTesterSchema.index({ email: 1 });
betaTesterSchema.index({ status: 1 });
betaTesterSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BetaTester', betaTesterSchema);
