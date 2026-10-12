const mongoose = require('mongoose');
const UserReport = require('../../models/UserReport');
const User = require('../../models/User');
const { record: audit } = require('../../services/auditLog');

const SORT_WHITELIST = new Set(['-createdAt', 'createdAt', '-updatedAt', 'status']);
const isId = (v) => mongoose.isValidObjectId(v);

/**
 * List user-vs-user abuse reports, filterable by status/reason, paginated.
 */
exports.getAllReports = async (req, res) => {
  try {
    const { status, reason, reportedUser, reportedBy } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sort = SORT_WHITELIST.has(String(req.query.sort)) ? String(req.query.sort) : '-createdAt';

    const query = {};
    if (['pending', 'resolved', 'dismissed'].includes(status)) query.status = status;
    if (typeof reason === 'string' && reason) query.reason = reason.slice(0, 100);
    // C4.2: user-detail Reports tab filters (24-hex ids only)
    if (reportedUser !== undefined) {
      if (!isId(reportedUser)) return res.status(400).json({ status: false, message: 'Invalid reportedUser' });
      query.reportedUser = reportedUser;
    }
    if (reportedBy !== undefined) {
      if (!isId(reportedBy)) return res.status(400).json({ status: false, message: 'Invalid reportedBy' });
      query.reportedBy = reportedBy;
    }

    const [total, reports] = await Promise.all([
      UserReport.countDocuments(query),
      UserReport.find(query)
        .populate('reportedBy', 'full_name email profile')
        .populate('reportedUser', 'full_name email profile is_block')
        .populate('resolvedBy', 'full_name email')
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
    ]);

    res.json({
      status: true,
      data: reports,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) }
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
    if (!isId(req.params.id)) return res.status(404).json({ status: false, message: 'Report not found' });
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
    if (!isId(req.params.id)) return res.status(404).json({ status: false, message: 'Report not found' });
    const before = await UserReport.findById(req.params.id).select('status').lean();

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

    audit(req, 'report.status', { type: 'report', id: req.params.id }, { before, after: { status, resolutionNote } });
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
    if (!isId(req.params.id)) return res.status(404).json({ status: false, message: 'Report not found' });
    const report = await UserReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ status: false, message: 'Report not found' });
    }

    // A2.4: tokenVersion bump makes the ban immediate
    const user = await User.findByIdAndUpdate(
      report.reportedUser,
      { $set: { is_block: 1, block_reason: `Blocked via report #${report._id}: ${report.reason}` }, $inc: { tokenVersion: 1 } },
      { new: true }
    ).select('is_block');
    if (!user) {
      return res.status(404).json({ status: false, message: 'Reported user not found' });
    }

    report.status = 'resolved';
    report.resolvedBy = req.userId;
    report.resolvedAt = new Date();
    report.resolutionNote = req.body.resolutionNote || 'User blocked';
    await report.save();

    audit(req, 'user.block', { type: 'user', id: String(report.reportedUser) }, { after: { is_block: 1, viaReport: String(report._id) } });
    res.json({ status: true, message: 'User blocked and report resolved', data: { is_block: user.is_block } });
  } catch (error) {
    console.error('Admin blockReportedUser error:', error);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
