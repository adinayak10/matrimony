const UserReport = require('../../models/UserReport');
const User = require('../../models/User');

/**
 * List user-vs-user abuse reports, filterable by status/reason, paginated.
 */
exports.getAllReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      reason,
      sort = '-createdAt'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (reason) query.reason = reason;

    const total = await UserReport.countDocuments(query);

    const reports = await UserReport.find(query)
      .populate('reportedBy', 'full_name email profile')
      .populate('reportedUser', 'full_name email profile is_block')
      .populate('resolvedBy', 'full_name email')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json({
      status: true,
      data: reports,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Admin getAllReports error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Report counts by status, for dashboard/list header tiles.
 */
exports.getReportStats = async (req, res) => {
  try {
    const [pending, resolved, dismissed, total] = await Promise.all([
      UserReport.countDocuments({ status: 'pending' }),
      UserReport.countDocuments({ status: 'resolved' }),
      UserReport.countDocuments({ status: 'dismissed' }),
      UserReport.countDocuments()
    ]);
    res.json({ status: true, data: { pending, resolved, dismissed, total } });
  } catch (error) {
    console.error('Admin getReportStats error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const report = await UserReport.findById(req.params.id)
      .populate('reportedBy', 'full_name email profile phone')
      .populate('reportedUser', 'full_name email profile phone is_block')
      .populate('resolvedBy', 'full_name email');

    if (!report) {
      return res.status(404).json({ status: false, message: 'Report not found' });
    }

    res.json({ status: true, data: report });
  } catch (error) {
    console.error('Admin getReportById error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Resolve or dismiss a report, with an optional note for the (currently informal) audit trail.
 */
exports.updateReportStatus = async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ status: false, message: 'Invalid status' });
    }

    const report = await UserReport.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolutionNote: resolutionNote || undefined,
        resolvedBy: status === 'pending' ? undefined : req.userId,
        resolvedAt: status === 'pending' ? undefined : new Date()
      },
      { new: true }
    ).populate('reportedBy reportedUser', 'full_name email profile');

    if (!report) {
      return res.status(404).json({ status: false, message: 'Report not found' });
    }

    res.json({ status: true, message: `Report marked as ${status}`, data: report });
  } catch (error) {
    console.error('Admin updateReportStatus error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Quick action from the report queue: block the reported user (reuses the
 * same is_block flag toggled by userController.toggleBlockUser) and mark the
 * report resolved in one step.
 */
exports.blockReportedUser = async (req, res) => {
  try {
    const report = await UserReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: false, message: 'Report not found' });
    }

    const user = await User.findById(report.reportedUser);
    if (!user) {
      return res.status(404).json({ status: false, message: 'Reported user not found' });
    }

    user.is_block = 1;
    user.block_reason = `Blocked via report #${report._id}: ${report.reason}`;
    await user.save();

    report.status = 'resolved';
    report.resolvedBy = req.userId;
    report.resolvedAt = new Date();
    report.resolutionNote = req.body.resolutionNote || 'User blocked';
    await report.save();

    res.json({ status: true, message: 'User blocked and report resolved', data: { is_block: user.is_block } });
  } catch (error) {
    console.error('Admin blockReportedUser error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
