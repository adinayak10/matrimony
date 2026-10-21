const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['chat_accepted', 'chat_declined', 'interest_request', 'friend_accept','interest_accept','interest_detected','profile_search_alert','profile_updated','add_to_gallery',
      // feature expansion (2026-10)
      'verification_approved','verification_rejected','admin_recommendation','admin_message','success_story_published','missed_call'],
    required: true,
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: { type: String, required: true },
  data: {
    type: Object,
    default: {},
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true
});

// A6.11: 180-day TTL + unread-count lookup
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 86400 });
notificationSchema.index({ toUser: 1, isRead: 1 });
notificationSchema.index({ toUser: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
