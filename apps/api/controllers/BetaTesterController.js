const BetaTester = require('../models/BetaTester');

const STATUS_OK = 201;
const HONEY_OK = { success: true, message: 'Thank you for applying! We will contact you within 24 hours via email.', data: {} };

/**
 * Submit beta tester application
 */
exports.submitApplication = async (req, res) => {
  try {
    const { email } = req.body || {};
    // D42 honeypot: bots fill the hidden `website` field; answer 200 and store nothing
    if (typeof req.body.website === 'string' && req.body.website.trim() !== '') {
      return res.status(STATUS_OK).json(HONEY_OK);
    }

    // Validation - only email required
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if already applied
    const existingApplication = await BetaTester.findOne({ 
      email: email.trim().toLowerCase() 
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for the beta testing program. We will contact you soon!'
      });
    }

    // Get IP and User Agent
    const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Create beta tester application (with email only)
    const betaTester = new BetaTester({
      email: email.trim().toLowerCase(),
      name: 'Not provided',
      phone: 'Not provided',
      androidVersion: 'Not specified',
      deviceModel: 'Not specified',
      location: 'Not specified',
      whyJoin: '',
      ipAddress,
      userAgent
    });

    await betaTester.save();

    res.status(201).json({
      success: true,
      message: 'Thank you for applying! We will contact you within 24 hours via email.',
      data: {
        id: betaTester._id,
        email: betaTester.email,
        status: betaTester.status
      }
    });

  } catch (error) {
    console.error('Beta tester application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application. Please try again later.'
    });
  }
};

/**
 * Get all beta tester applications (Admin only)
 */
exports.getAllApplications = async (req, res) => {
  try {
    const {
      status,
      isRead,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (isRead !== undefined) filter.isRead = isRead === 'true';

    // Sort order
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get applications
    const applications = await BetaTester.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await BetaTester.countDocuments(filter);

    res.json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Get beta testers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications'
    });
  }
};

/**
 * Get stats
 */
exports.getStats = async (req, res) => {
  try {
    const total = await BetaTester.countDocuments();
    const pending = await BetaTester.countDocuments({ status: 'pending' });
    const approved = await BetaTester.countDocuments({ status: 'approved' });
    const active = await BetaTester.countDocuments({ status: 'active' });
    const unread = await BetaTester.countDocuments({ isRead: false });

    res.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        active,
        unread
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
};

/**
 * Update application status
 */
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, inviteSent } = req.body;

    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (inviteSent !== undefined) {
      updateData.inviteSent = inviteSent;
      if (inviteSent) updateData.inviteSentDate = new Date();
    }

    const application = await BetaTester.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application updated successfully',
      data: application
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application'
    });
  }
};

/**
 * Mark as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await BetaTester.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      data: application
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read'
    });
  }
};

/**
 * Delete application
 */
exports.deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await BetaTester.findByIdAndDelete(id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });

  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete application'
    });
  }
};
