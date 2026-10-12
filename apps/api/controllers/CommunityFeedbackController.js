const CommunityFeedback = require('../models/CommunityFeedback');

exports.submitCommunityFeedback = async (req, res) => {
    try {
        const { name, email, phone, category, subject, message, followUp } = req.body;

        // Validation
        if (!name || !email || !category || !subject || !message) {
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

        // Create feedback entry
        const feedback = new CommunityFeedback({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone?.trim() || undefined,
            category,
            subject: subject.trim(),
            message: message.trim(),
            followUp: followUp || false,
            status: 'pending',
            priority: determinePriority(category, message)
        });

        await feedback.save();

        // CRITICAL: If child safety concern, send immediate alert
        if (category === 'child_safety') {
            console.error('🚨🚨🚨 CRITICAL CHILD SAFETY REPORT RECEIVED 🚨🚨🚨');
            console.error('Report ID:', feedback._id);
            console.error('Reporter:', email);
            console.error('Subject:', subject);
            console.error('Action Required: Immediate review and report to authorities');
            // TODO: Send urgent email to info@banjaramatch.com
            // TODO: Send automated report to NCMEC if applicable
            // TODO: Alert admin dashboard
        }

        // TODO: Send notification email to admin
        // TODO: If followUp is true, send confirmation email to user

        console.log('✅ New community feedback received:', {
            id: feedback._id,
            category: feedback.category,
            subject: feedback.subject,
            email: feedback.email,
            priority: feedback.priority
        });

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

// Get all feedbacks (Admin only - add authentication middleware)
exports.getAllFeedbacks = async (req, res) => {
    try {
        const { status, category, priority, limit = 50, skip = 0 } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        
        const feedbacks = await CommunityFeedback.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));
        
        const total = await CommunityFeedback.countDocuments(filter);
        
        return res.status(200).json({
            status: true,
            data: feedbacks,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
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

// Update feedback status (Admin only)
exports.updateFeedbackStatus = async (req, res) => {
    try {
        const { feedbackId } = req.params;
        const { status, adminNotes, priority } = req.body;
        
        const feedback = await CommunityFeedback.findById(feedbackId);
        if (!feedback) {
            return res.status(404).json({
                status: false,
                message: 'Feedback not found'
            });
        }
        
        if (status) feedback.status = status;
        if (adminNotes) feedback.adminNotes = adminNotes;
        if (priority) feedback.priority = priority;
        
        if (status === 'reviewed' && !feedback.respondedAt) {
            feedback.respondedAt = new Date();
        }
        
        if (status === 'completed' && !feedback.implementedAt) {
            feedback.implementedAt = new Date();
        }
        
        await feedback.save();
        
        // TODO: Send status update email to user if followUp is true
        
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

module.exports = exports;
