'use strict';
/**
 * Admin verification queue (feature expansion A1). Mounted by
 * routes/adminVerificationRoutes.js under /api/admin, every route adminAuth.
 *
 *   GET    /verifications?status=pending|approved|rejected|all&page&limit&search&userId&documentType
 *   GET    /verifications/stats
 *   GET    /verifications/:id
 *   GET    /verifications/:id/files/:kind     kind = selfie | document-0 | document-1
 *   POST   /verifications/:id/approve
 *   POST   /verifications/:id/reject {reason}
 *   DELETE /verifications/:id/files
 *
 * Rows never expose stored file names: `files` lists the kinds that can be
 * fetched through the file route.
 */
const fs = require('fs');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Verification = require('../../models/Verification');
const verificationService = require('../../services/verificationService');
const { record: audit } = require('../../services/auditLog');
const escapeRegex = require('../../utils/escapeRegex');

const USER_FIELDS = 'full_name email phone gender dob profile is_verified verifiedAt is_block createdAt profileCreatedBy';
const isId = (v) => mongoose.isValidObjectId(v);

function fileKinds(row) {
  if (!row || row.filesPurgedAt) return [];
  const kinds = [];
  if (row.selfieFile) kinds.push('selfie');
  (row.documentFiles || []).forEach((f, i) => f && kinds.push(`document-${i}`));
  return kinds;
}

function view(row) {
  if (!row) return null;
  const { documentFiles, selfieFile, ...rest } = row;
  return { ...rest, files: fileKinds(row), documentCount: (documentFiles || []).length, hasSelfie: !!selfieFile };
}

function notFound(res) {
  return res.status(404).json({ status: false, message: 'Verification request not found' });
}

exports.list = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    // ?userId=<id>: one member's requests (user-detail page), all statuses unless ?status is given
    const userId = typeof req.query.userId === 'string' && isId(req.query.userId) ? req.query.userId : null;
    if (req.query.userId !== undefined && !userId) return res.status(400).json({ status: false, message: 'Invalid userId' });
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : userId ? 'all' : 'pending';

    const query = {};
    if (userId) query.user = userId;
    if (status !== 'all') query.status = Verification.STATUSES.includes(status) ? status : 'pending';
    if (req.query.documentType && typeof req.query.documentType === 'string') query.documentType = req.query.documentType.slice(0, 60);
    const term = typeof search === 'string' ? search.trim().slice(0, 80) : '';
    if (term) {
      const rx = new RegExp(escapeRegex(term), 'i');
      const users = await User.find({ $or: [{ full_name: rx }, { email: rx }, { phone: rx }] }).select('_id').limit(500).lean();
      query.$or = [{ fullName: rx }, { user: { $in: users.map((u) => u._id) } }];
    }

    const [total, rows] = await Promise.all([
      Verification.countDocuments(query),
      Verification.find(query)
        .sort({ createdAt: status === 'pending' && !userId ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user', USER_FIELDS)
        .populate('reviewedBy', 'full_name email')
        .lean(),
    ]);

    res.json({ status: true, data: rows.map(view), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[admin verification] list failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.stats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 7 * 86400 * 1000);
    const [byStatus, verifiedUsers, reviewedLast7d] = await Promise.all([
      Verification.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
      User.countDocuments({ is_verified: 1 }),
      Verification.countDocuments({ reviewedAt: { $gte: since } }),
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const r of byStatus) if (r._id in counts) counts[r._id] = r.n;
    res.json({
      status: true,
      data: { ...counts, total: counts.pending + counts.approved + counts.rejected, verifiedUsers, reviewedLast7d },
    });
  } catch (err) {
    console.error('[admin verification] stats failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.getOne = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res);
    const row = await Verification.findById(req.params.id)
      .populate('user', USER_FIELDS)
      .populate('reviewedBy', 'full_name email')
      .lean();
    if (!row) return notFound(res);
    const userId = row.user && row.user._id ? row.user._id : row.user;
    const history = await Verification.find({ user: userId, _id: { $ne: row._id } })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('status reason documentType createdAt reviewedAt')
      .lean();
    res.json({ status: true, data: { ...view(row), history } });
  } catch (err) {
    console.error('[admin verification] get failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.streamFile = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res);
    const row = await Verification.findById(req.params.id).select('documentFiles selfieFile filesPurgedAt').lean();
    if (!row || row.filesPurgedAt) return notFound(res);
    const kind = String(req.params.kind || '');
    let name = null;
    if (kind === 'selfie') name = row.selfieFile;
    else {
      const m = /^document-([01])$/.exec(kind);
      if (m) name = (row.documentFiles || [])[Number(m[1])];
    }
    const file = verificationService.verificationFile(name);
    if (!file || !fs.existsSync(file)) return res.status(404).json({ status: false, message: 'File not found' });

    res.set({
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Content-Type': 'image/jpeg',
    });
    fs.createReadStream(file)
      .on('error', () => {
        if (!res.headersSent) res.status(404).end();
        else res.end();
      })
      .pipe(res);
    return undefined;
  } catch (err) {
    console.error('[admin verification] file failed:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.approve = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res);
    const now = new Date();
    const row = await Verification.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'approved', reason: null, reviewedBy: req.userId, reviewedAt: now } },
      { new: true }
    ).lean();
    if (!row) {
      const exists = await Verification.exists({ _id: req.params.id });
      if (!exists) return notFound(res);
      return res.status(409).json({ status: false, code: 'NOT_PENDING', message: 'This request has already been reviewed' });
    }
    await verificationService.markVerified(row.user, { reviewerId: req.userId, verificationId: row._id });
    audit(req, 'verification.approve', { type: 'verification', id: row._id }, { after: { user: String(row.user), status: 'approved' } });
    res.json({ status: true, message: 'Verification approved', data: view(row) });
  } catch (err) {
    console.error('[admin verification] approve failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.reject = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res);
    const reason = typeof (req.body || {}).reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!reason) return res.status(400).json({ status: false, code: 'REASON_REQUIRED', message: 'A rejection reason is required' });
    const row = await Verification.findOneAndUpdate(
      { _id: req.params.id, status: 'pending' },
      { $set: { status: 'rejected', reason, reviewedBy: req.userId, reviewedAt: new Date() } },
      { new: true }
    ).lean();
    if (!row) {
      const exists = await Verification.exists({ _id: req.params.id });
      if (!exists) return notFound(res);
      return res.status(409).json({ status: false, code: 'NOT_PENDING', message: 'This request has already been reviewed' });
    }
    await verificationService.markRejected(row.user, reason, { verificationId: row._id });
    audit(req, 'verification.reject', { type: 'verification', id: row._id }, { after: { user: String(row.user), status: 'rejected', reason } });
    res.json({ status: true, message: 'Verification rejected', data: view(row) });
  } catch (err) {
    console.error('[admin verification] reject failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.deleteFiles = async (req, res) => {
  try {
    if (!isId(req.params.id)) return notFound(res);
    const row = await Verification.findById(req.params.id).lean();
    if (!row) return notFound(res);
    if (row.status === 'pending') {
      return res.status(409).json({ status: false, code: 'PENDING', message: 'Review the request before deleting its files' });
    }
    const removed = await verificationService.removeFiles(row);
    const updated = await Verification.findByIdAndUpdate(
      row._id,
      { $set: { documentFiles: [], selfieFile: null, filesPurgedAt: new Date() } },
      { new: true }
    ).lean();
    audit(req, 'verification.files_delete', { type: 'verification', id: row._id }, { after: { removed } });
    res.json({ status: true, message: 'Files deleted', data: { ...view(updated), removed } });
  } catch (err) {
    console.error('[admin verification] delete files failed:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
