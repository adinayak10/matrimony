'use strict';
/**
 * controllers/admin/announcementController.js — platform announcements (feature expansion A3).
 *
 *   GET    /api/admin/announcements?status&search&page&limit   status: draft|published|archived|expired|all
 *   POST   /api/admin/announcements        {title, body, type, platform, linkUrl, expiresAt}
 *   GET    /api/admin/announcements/:id
 *   PUT    /api/admin/announcements/:id
 *   DELETE /api/admin/announcements/:id
 *   POST   /api/admin/announcements/:id/publish {sendPush}   push counts toward the daily push cap
 *   POST   /api/admin/announcements/:id/archive
 */
const mongoose = require('mongoose');
const Announcement = require('../../models/Announcement');
const { record: audit } = require('../../services/auditLog');
const { text } = require('../SuccessStoryController');
const pushCtl = require('./pushController');

const LINK_RE = /^(https?:\/\/[^\s<>"']+|\/[^\s<>"']*)$/i;

function notFound(res) {
  return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Announcement not found' });
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Derived display status: draft | published | expired | archived */
function displayStatus(a, now = new Date()) {
  if (a.status === 'published' && a.expiresAt && new Date(a.expiresAt) <= now) return 'expired';
  return a.status;
}

function row(a) {
  return { ...a, displayStatus: displayStatus(a) };
}

/** -> { errors, fields }; partial = PUT (only present keys) */
function readFields(body, { partial = false } = {}) {
  const b = body || {};
  const errors = [];
  const fields = {};
  if (b.title !== undefined || !partial) {
    const v = text(b.title, 121);
    if (!v) errors.push('title is required');
    else if (v.length > 120) errors.push('title must be at most 120 characters');
    else fields.title = v;
  }
  if (b.body !== undefined || !partial) {
    const v = text(b.body, 2001);
    if (!v) errors.push('body is required');
    else if (v.length > 2000) errors.push('body must be at most 2000 characters');
    else fields.body = v;
  }
  if (b.type !== undefined && b.type !== '') {
    if (!Announcement.TYPES.includes(b.type)) errors.push(`type must be one of ${Announcement.TYPES.join(', ')}`);
    else fields.type = b.type;
  }
  if (b.platform !== undefined && b.platform !== '') {
    if (!Announcement.PLATFORMS.includes(b.platform)) errors.push(`platform must be one of ${Announcement.PLATFORMS.join(', ')}`);
    else fields.platform = b.platform;
  }
  if (b.linkUrl !== undefined) {
    const v = text(b.linkUrl, 501);
    if (v && (!LINK_RE.test(v) || v.length > 500)) errors.push('linkUrl must start with http(s):// or /');
    else fields.linkUrl = v;
  }
  if (b.expiresAt !== undefined) {
    if (b.expiresAt === null || b.expiresAt === '') fields.expiresAt = null;
    else {
      const d = new Date(b.expiresAt);
      if (Number.isNaN(d.getTime())) errors.push('expiresAt is not a valid date');
      else fields.expiresAt = d;
    }
  }
  return { errors, fields };
}

exports.list = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const now = new Date();
    const query = {};
    const status = String(req.query.status || 'all');
    if (status === 'expired') Object.assign(query, { status: 'published', expiresAt: { $ne: null, $lte: now } });
    else if (status === 'published') Object.assign(query, { status: 'published', $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
    else if (Announcement.STATUSES.includes(status)) query.status = status;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      query.$and = [{ $or: [{ title: re }, { body: re }] }];
    }
    const [total, rows] = await Promise.all([
      Announcement.countDocuments(query),
      Announcement.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'full_name email')
        .populate('publishedBy', 'full_name email')
        .lean(),
    ]);
    return res.json({ status: true, data: rows.map(row), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[admin announcements list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Announcement.findById(req.params.id).populate('createdBy', 'full_name email').populate('publishedBy', 'full_name email').lean();
    if (!doc) return notFound(res);
    return res.json({ status: true, data: row(doc) });
  } catch (err) {
    console.error('[admin announcements get]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { errors, fields } = readFields(req.body);
    if (errors.length) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: errors[0] });
    const doc = await Announcement.create({ ...fields, status: 'draft', createdBy: req.userId });
    audit(req, 'announcement.create', { type: 'announcement', id: doc._id }, { after: fields });
    return res.status(201).json({ status: true, data: row(doc.toObject()) });
  } catch (err) {
    console.error('[admin announcements create]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Announcement.findById(req.params.id);
    if (!doc) return notFound(res);
    const { errors, fields } = readFields(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: errors[0] });
    const before = {};
    for (const k of Object.keys(fields)) before[k] = doc[k];
    Object.assign(doc, fields);
    await doc.save();
    audit(req, 'announcement.update', { type: 'announcement', id: doc._id }, { before, after: fields });
    return res.json({ status: true, data: row(doc.toObject()) });
  } catch (err) {
    console.error('[admin announcements update]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Announcement.findByIdAndDelete(req.params.id).lean();
    if (!doc) return notFound(res);
    audit(req, 'announcement.delete', { type: 'announcement', id: doc._id }, { before: { title: doc.title, status: doc.status } });
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    console.error('[admin announcements delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.publish = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Announcement.findById(req.params.id);
    if (!doc) return notFound(res);
    if (doc.expiresAt && doc.expiresAt <= new Date()) {
      return res.status(400).json({ status: false, code: 'EXPIRED', message: 'This announcement has already expired; change expiresAt first' });
    }
    const sendPush = req.body && (req.body.sendPush === true || req.body.sendPush === 'true');
    if (sendPush) {
      const cap = await pushCtl.dailyCapError(req.userId);
      if (cap) return res.status(429).json(cap);
    }
    const before = { status: doc.status, publishedAt: doc.publishedAt };
    doc.status = 'published';
    if (!doc.publishedAt) doc.publishedAt = new Date();
    doc.publishedBy = req.userId;
    doc.archivedAt = null;
    await doc.save();
    audit(req, 'announcement.publish', { type: 'announcement', id: doc._id }, { before, after: { status: 'published', sendPush } });

    let job = null;
    if (sendPush) {
      job = await pushCtl.runTopicBroadcast(req, {
        title: doc.title.slice(0, 100),
        body: doc.body.slice(0, 500),
        data: { type: 'announcement', announcementId: String(doc._id) },
        platform: doc.platform,
        source: 'announcement',
        announcementId: doc._id,
      });
      doc.pushResult = { jobId: job._id, status: job.status, sent: job.sent, failed: job.failed, results: job.results };
      doc.pushSentAt = new Date();
      await doc.save();
    }
    return res.json({ status: true, data: { ...row(doc.toObject()), pushJob: job ? job.toObject() : null } });
  } catch (err) {
    console.error('[admin announcements publish]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.archive = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await Announcement.findById(req.params.id);
    if (!doc) return notFound(res);
    const before = { status: doc.status };
    doc.status = 'archived';
    doc.archivedAt = new Date();
    await doc.save();
    audit(req, 'announcement.archive', { type: 'announcement', id: doc._id }, { before, after: { status: 'archived' } });
    return res.json({ status: true, data: row(doc.toObject()) });
  } catch (err) {
    console.error('[admin announcements archive]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
