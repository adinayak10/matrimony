const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
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
  message: {
    type: String,
    required: true
  },
  source: {
    type: String,
    default: 'website',
    enum: ['website', 'mobile', 'admin']
  },
  status: {
    type: String,
    default: 'new',
    enum: ['new', 'read', 'replied', 'resolved', 'spam']
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
  }
}, {
  timestamps: true
});

// Index for faster queries
contactSchema.index({ createdAt: -1 });
contactSchema.index({ status: 1 });
contactSchema.index({ email: 1 });
contactSchema.index({ isRead: 1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
