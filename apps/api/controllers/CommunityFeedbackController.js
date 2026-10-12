const CommunityFeedback = require('../models/CommunityFeedback');
const { sanitizeText } = require('../services/sanitize');
const { sendChildSafetyAlert } = require('../services/emailService');
const { record: audit } = require('../services/auditLog');

const STATUS_OK = 200;
const HONEY_OK = { status: true, message: 'Thank you for your feedback! We will review it and get back to you within 48 hours.', data: {} };
const CATEGORIES = CommunityFeedback.schema.path('category').enumValues;
const STATUSES = CommunityFeedback.schema.path('status').enumValues;
const PRIORITIES = CommunityFeedback.schema.path('priority').enumValues;

exports.submitCommunityFeedback = async (req, res) => {
    try {
        const { name, email, phone, category, subject, message, followUp } = req.body || {};
    // D42 honeypot: bots fill the hidden `website` field; answer 200 and store nothing
    if (typeof req.body.website === 'string' && req.body.website.trim() !== '') {
      return res.status(STATUS_OK).json(HONEY_OK);
    }

        // Validation
        if ([name, email, category, subject, message].some((v) => typeof v !== 'string' || !v.trim())) {
            return res.status(400).json({
                status: false,
                message: 'Please provide all required fields (name, email, category, subject, message)'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                status: false,
                message: 'Please provide a valid email address'
            });
        }

        if (!CATEGORIES.includes(category)) {
            return res.status(400).json({ status: false, message: 'Invalid category' });
        }

        // Create feedback entry
        const feedback = new CommunityFeedback({
            name: sanitizeText(name, 100),
            email: email.trim().toLowerCase().slice(0, 254),
            phone: typeof phone === 'string' && phone.trim() ? sanitizeText(phone, 30) : undefined,
            category,
            subject: sanitizeText(subject, 200),
            message: sanitizeText(message, 10000),
            followUp: followUp === true || followUp === 'true',
            status: 'pending',
            priority: determinePriority(category, message)
        });

        await feedback.save();

        // CRITICAL: child-safety reports alert the safety contact immediately (D16)
        if (category === 'child_safety') {
            console.error('CHILD_SAFETY_REPORT', { id: String(feedback._id) });
            sendChildSafetyAlert(feedback)
                .then((info) => { if (!info) console.error('CHILD_SAFETY_ALERT_NOT_SENT', { id: String(feedback._id) }); })
                .catch((err) => console.error('CHILD_SAFETY_ALERT_FAILED', { id: String(feedback._id), error: err.message }));
        }

        console.log('New community feedback received', { id: String(feedback._id), category: feedback.category, priority: feedback.priority });

        return res.status(200).json({
            status: true,
            message: 'Thank you for your feedback! We will review it and get back to you within 48 hours.',
            data: {
                feedbackId: feedback._id,
                category: feedback.category,
                subject: feedback.subject
            }
        });

    } catch (error) {
        console.error('❌ Error submitting community feedback:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to submit feedback. Please try again later.'
        });
    }
};

// Helper function to determine priority based on category and content
function determinePriority(category, message) {
    const messageLower = message.toLowerCase();
    
    // CRITICAL: Child safety reports always get highest priority
    if (category === 'child_safety') {
        return 'critical';
    }
    
    // Critical keywords
    if (messageLower.includes('child') ||
        messageLower.includes('minor') ||
        messageLower.includes('security') || 
        messageLower.includes('data leak') || 
        messageLower.includes('hack') ||
        messageLower.includes('breach') ||
        messageLower.includes('urgent') ||
        category === 'bug_report' && messageLower.includes('crash')) {
        return 'critical';
    }
    
    // High priority
    if (category === 'bug_report' || 
        category === 'cultural_concern' ||
        messageLower.includes('important') ||
        messageLower.includes('serious')) {
        return 'high';
    }
    
    // Medium priority (default)
    if (category === 'feature_request' || category === 'design_ux') {
        return 'medium';
    }
    
    // Low priority
    return 'low';
}

// Admin list (A4.4 + C4.3): ?page&limit&status&category&priority&search
// (the legacy ?skip form still works). child_safety rows sort first.
exports.getAllFeedbacks = async (req, res) => {
    try {
        const { status, category, priority, search } = req.query;
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const skip = req.query.page !== undefined ? (page - 1) * limit : Math.max(0, parseInt(req.query.skip, 10) || 0);
        
        const filter = {};
        if (typeof status === 'string' && STATUSES.includes(status)) filter.status = status;
        if (typeof category === 'string' && CATEGORIES.includes(category)) filter.category = category;
        if (typeof priority === 'string' && PRIORITIES.includes(priority)) filter.priority = priority;
        const q = require('../utils/escapeRegex')(search, 60);
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { subject: { $regex: q, $options: 'i' } },
            ];
        }
        
        const [feedbacks, total] = await Promise.all([
            CommunityFeedback.aggregate([
                { $match: filter },
                { $addFields: { _safety: { $cond: [{ $eq: ['$category', 'child_safety'] }, 0, 1] } } },
                { $sort: { _safety: 1, createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
                { $project: { _safety: 0 } },
            ]),
            CommunityFeedback.countDocuments(filter),
        ]);
        
        return res.status(200).json({
            status: true,
            data: feedbacks,
            pagination: {
                total,
                page: Math.floor(skip / limit) + 1,
                pages: Math.ceil(total / limit),
                limit,
                skip
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching feedbacks:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to fetch feedbacks'
        });
    }
};

// Counts per status (C4.3 tiles)
exports.getFeedbackStats = async (req, res) => {
    try {
        const rows = await CommunityFeedback.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
        const data = { total: 0, childSafety: await CommunityFeedback.countDocuments({ category: 'child_safety', status: { $nin: ['completed', 'rejected'] } }) };
        for (const st of STATUSES) data[st] = 0;
        for (const r of rows) { data[r._id] = r.count; data.total += r.count; }
        return res.status(200).json({ status: true, data });
    } catch (error) {
        console.error('Error fetching feedback stats:', error.message);
        return res.status(500).json({ status: false, message: 'Failed to fetch stats' });
    }
};

exports.getFeedbackById = async (req, res) => {
    try {
        const id = req.params.feedbackId || req.params.id;
        if (!require('mongoose').isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Feedback not found' });
        const feedback = await CommunityFeedback.findById(id).lean();
        if (!feedback) return res.status(404).json({ status: false, message: 'Feedback not found' });
        return res.status(200).json({ status: true, data: feedback });
    } catch (error) {
        console.error('Error fetching feedback:', error.message);
        return res.status(500).json({ status: false, message: 'Failed to fetch feedback' });
    }
};

// Update feedback status/priority/adminNotes (Admin only; PUT legacy + PATCH C4.3)
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const feedbackId = req.params.feedbackId || req.params.id;
        const { status, adminNotes, priority } = req.body || {};
        if (!require('mongoose').isValidObjectId(feedbackId)) {
            return res.status(404).json({ status: false, message: 'Feedback not found' });
        }
        if (status !== undefined && !STATUSES.includes(status)) return res.status(400).json({ status: false, message: 'Invalid status' });
        if (priority !== undefined && !PRIORITIES.includes(priority)) return res.status(400).json({ status: false, message: 'Invalid priority' });
        
        const feedback = await CommunityFeedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({
                status: false,
                message: 'Feedback not found'
            });
        }
        const before = { status: feedback.status, priority: feedback.priority };
        
        if (status) feedback.status = status;
        if (typeof adminNotes === 'string') feedback.adminNotes = sanitizeText(adminNotes, 5000);
        if (priority) feedback.priority = priority;
        
        if (status === 'reviewed' && !feedback.respondedAt) {
            feedback.respondedAt = new Date();
        }
        
        if (status === 'completed' && !feedback.implementedAt) {
            feedback.implementedAt = new Date();
        }
        
        await feedback.save();
        audit(req, 'communityFeedback.update', { type: 'communityFeedback', id: feedback._id }, { before, after: { status: feedback.status, priority: feedback.priority } });
        
        return res.status(200).json({
            status: true,
            message: 'Feedback updated successfully',
            data: feedback
        });
        
    } catch (error) {
        console.error('❌ Error updating feedback:', error);
        return res.status(500).json({
            status: false,
            message: 'Failed to update feedback'
        });
    }
};

/**
 * "Ramesh Kumar Naik" -> "Ramesh N." — enough to thank a contributor in public
 * without printing a full name next to what they wrote.
 */
function publicDisplayName(name) {
    const parts = String(sanitizeText(name, 100) || '').split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Community member';
    const first = parts[0].slice(0, 30);
    const last = parts.length > 1 ? parts[parts.length - 1] : '';
    return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/**
 * GET /api/community-feedback/contributors?limit=100   (PUBLIC, rate limited)
 *
 * The website's "contributors" list. Only suggestions an admin has marked
 * `completed` (implemented), never the child_safety category, and only four
 * safe fields: displayName, category, subject, createdAt. No email, phone,
 * message, admin notes, priority, IP or document id ever leaves this handler.
 */
exports.getPublicContributors = async (req, res) => {
    try {
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
        const filter = { status: 'completed', category: { $ne: 'child_safety' } };
        const [rows, total] = await Promise.all([
            CommunityFeedback.find(filter)
                .select('name category subject createdAt implementedAt')
                .sort({ implementedAt: -1, createdAt: -1 })
                .limit(limit)
                .lean(),
            CommunityFeedback.countDocuments(filter),
        ]);
        const data = rows.map((r) => ({
            displayName: publicDisplayName(r.name),
            category: r.category,
            subject: sanitizeText(r.subject, 200) || '',
            createdAt: r.createdAt,
        }));
        res.set('Cache-Control', 'public, max-age=300');
        return res.status(200).json({ status: true, data, total });
    } catch (error) {
        console.error('Error fetching public contributors:', error.message);
        return res.status(500).json({ status: false, message: 'Failed to fetch contributors' });
    }
};
exports.publicDisplayName = publicDisplayName;

module.exports = exports;
