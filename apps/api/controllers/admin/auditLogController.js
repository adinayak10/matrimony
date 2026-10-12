'use strict';
/**
 * controllers/admin/auditLogController.js (C4.12)
 *   GET /api/admin/audit-log?page&limit&action&adminId&targetType&targetId&from&to
 *   GET /api/admin/audit-log/actions  -> distinct action names
 */
const mongoose = require('mongoose');
const AdminAuditLog = require('../../models/AdminAuditLog');

exports.list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const { action, adminId, targetType, targetId, from, to } = req.query;

    const query = {};
    if (typeof action === 'string' && action) query.action = action.slice(0, 80);
    if (adminId !== undefined) {
      if (!mongoose.isValidObjectId(adminId)) return res.status(400).json({ status: false, message: 'Invalid adminId' });
      query.adminId = adminId;
    }
    if (typeof targetType === 'string' && targetType) query.targetType = targetType.slice(0, 40);
    if (typeof targetId === 'string' && targetId) query.targetId = targetId.slice(0, 80);
    if (from || to) {
      query.createdAt = {};
      if (from) {
        const d = new Date(from);
        if (!Number.isNaN(d.getTime())) query.createdAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (!Number.isNaN(d.getTime())) query.createdAt.$lte = d;
      }
      if (!Object.keys(query.createdAt).length) delete query.createdAt;
    }

    const [total, rows] = await Promise.all([
      AdminAuditLog.countDocuments(query),
      AdminAuditLog.find(query)
        .populate('adminId', 'full_name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({ status: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Audit log list error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.actions = async (req, res) => {
  try {
    const actions = await AdminAuditLog.distinct('action');
    res.json({ status: true, data: actions.sort() });
  } catch (error) {
    console.error('Audit log actions error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};
