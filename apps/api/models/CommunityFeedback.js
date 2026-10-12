const mongoose = require('mongoose');

const CommunityFeedbackSchema = new mongoose.Schema({
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
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['child_safety', 'feature_request', 'bug_report', 'design_ux', 'cultural_concern', 'general_feedback', 'appreciation', 'other']
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true
    },
    followUp: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'reviewed', 'in_progress', 'completed', 'rejected'],
        default: 'pending'
    },
    adminNotes: {
        type: String
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    respondedAt: {
        type: Date
    },
    implementedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for better query performance
CommunityFeedbackSchema.index({ email: 1 });
CommunityFeedbackSchema.index({ category: 1 });
CommunityFeedbackSchema.index({ status: 1 });
CommunityFeedbackSchema.index({ createdAt: -1 });
CommunityFeedbackSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityFeedback', CommunityFeedbackSchema);
