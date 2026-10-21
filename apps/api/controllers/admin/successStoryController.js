'use strict';
/**
 * controllers/admin/successStoryController.js — moderation (feature expansion A3).
 *
 *   GET    /api/admin/success-stories?status&featured&search&page&limit
 *   POST   /api/admin/success-stories            (multipart `photo` optional)
 *   GET    /api/admin/success-stories/:id
 *   PUT    /api/admin/success-stories/:id        (multipart `photo` optional)
 *   DELETE /api/admin/success-stories/:id
 *   PATCH  /api/admin/success-stories/:id/status   {status, reason?}
 *   PATCH  /api/admin/success-stories/:id/featured {isFeatured}
 *
 * Publishing notifies the submitter (and partner) once: Notification
 * `success_story_published` + push.
 */
const mongoose = require('mongoose');
const SuccessStory = require('../../models/SuccessStory');
const Notification = require('../../models/Notification');
const push = require('../../services/push');
const { record: audit } = require('../../services/auditLog');
const S = require('../SuccessStoryController');

const USER_FIELDS = 'full_name email profile gender';

function pageParams(req, def = 20) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || def));
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function adminRow(doc) {
  return {
    ...S.mineRow(doc),
    rejectionReason: doc.rejectionReason || null,
    submittedBy: doc.submittedBy || null,
    partnerUser: doc.partnerUser || null,
    createdByAdmin: doc.createdByAdmin || null,
    reviewedBy: doc.reviewedBy || null,
    reviewedAt: doc.reviewedAt || null,
  };
}

function notFound(res) {
  return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Story not found' });
}

async function loadPopulated(id) {
  return SuccessStory.findById(id)
    .populate('submittedBy', USER_FIELDS)
    .populate('partnerUser', USER_FIELDS)
    .populate('reviewedBy', 'full_name email')
    .lean();
}

async function notifyPublished(story) {
  const recipients = [story.submittedBy, story.partnerUser].filter(Boolean).map(String);
  const unique = [...new Set(recipients)];
  const content = 'Your success story is now live on BanjaraMatch. Thank you for sharing it!';
  for (const userId of unique) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Notification.create({
        type: 'success_story_published',
        toUser: userId,
        content,
        data: { storyId: String(story._id) },
      });
      // eslint-disable-next-line no-await-in-loop
      await push.sendToUser(userId, 'Your story is live', content, { type: 'success_story_published', storyId: String(story._id) });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[successStory] notify failed:', err.message);
    }
  }
}

exports.list = async (req, res) => {
  try {
    const { page, limit, skip } = pageParams(req);
    const query = {};
    const status = String(req.query.status || 'pending');
    if (status !== 'all') query.status = SuccessStory.STATUSES.includes(status) ? status : 'pending';
    if (req.query.featured === '1' || req.query.featured === 'true') query.isFeatured = true;
    if (req.query.featured === '0' || req.query.featured === 'false') query.isFeatured = false;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      query.$or = [{ groomName: re }, { brideName: re }, { city: re }];
    }
    const [total, rows] = await Promise.all([
      SuccessStory.countDocuments(query),
      SuccessStory.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('submittedBy', USER_FIELDS)
        .populate('partnerUser', USER_FIELDS)
        .lean(),
    ]);
    return res.json({ status: true, data: rows.map(adminRow), pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[admin success-stories list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.getById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await loadPopulated(req.params.id);
    if (!doc) return notFound(res);
    return res.json({ status: true, data: adminRow(doc) });
  } catch (err) {
    console.error('[admin success-stories get]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const { errors, fields } = S.readStoryFields(req.body);
    if (errors.length) {
      await S.discardUpload(req);
      return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: errors[0] });
    }
    const status = SuccessStory.STATUSES.includes(req.body.status) && req.body.status !== 'rejected' ? req.body.status : 'approved';
    const doc = await SuccessStory.create({
      ...fields,
      photo: S.storedPhotoPath(req.file),
      status,
      isFeatured: req.body.isFeatured === true || req.body.isFeatured === 'true',
      publishedAt: status === 'published' ? new Date() : null,
      createdByAdmin: req.userId,
      reviewedBy: req.userId,
      reviewedAt: new Date(),
    });
    audit(req, 'successStory.create', { type: 'successStory', id: doc._id }, { after: { groomName: doc.groomName, brideName: doc.brideName, status } });
    return res.status(201).json({ status: true, data: adminRow(doc.toObject()) });
  } catch (err) {
    await S.discardUpload(req);
    console.error('[admin success-stories create]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      await S.discardUpload(req);
      return notFound(res);
    }
    const doc = await SuccessStory.findById(req.params.id);
    if (!doc) {
      await S.discardUpload(req);
      return notFound(res);
    }
    const { errors, fields } = S.readStoryFields(req.body, { partial: true });
    if (errors.length) {
      await S.discardUpload(req);
      return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: errors[0] });
    }
    const before = { groomName: doc.groomName, brideName: doc.brideName, city: doc.city, weddingDate: doc.weddingDate, photo: doc.photo };
    Object.assign(doc, fields);
    let oldPhoto = null;
    const newPhoto = S.storedPhotoPath(req.file);
    if (newPhoto) {
      oldPhoto = doc.photo;
      doc.photo = newPhoto;
    } else if (req.body.removePhoto === true || req.body.removePhoto === 'true') {
      oldPhoto = doc.photo;
      doc.photo = null;
    }
    await doc.save();
    if (oldPhoto && oldPhoto !== doc.photo) await S.removePhoto(oldPhoto);
    audit(req, 'successStory.update', { type: 'successStory', id: doc._id }, { before, after: { ...fields, photo: doc.photo } });
    return res.json({ status: true, data: adminRow(await loadPopulated(doc._id)) });
  } catch (err) {
    await S.discardUpload(req);
    console.error('[admin success-stories update]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await SuccessStory.findByIdAndDelete(req.params.id).lean();
    if (!doc) return notFound(res);
    await S.removePhoto(doc.photo);
    audit(req, 'successStory.delete', { type: 'successStory', id: doc._id }, { before: { groomName: doc.groomName, brideName: doc.brideName, status: doc.status } });
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    console.error('[admin success-stories delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.setStatus = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const { status } = req.body || {};
    if (!SuccessStory.STATUSES.includes(status)) {
      return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: `status must be one of ${SuccessStory.STATUSES.join(', ')}` });
    }
    const reason = S.text(req.body.reason, 500);
    if (status === 'rejected' && !reason) {
      return res.status(400).json({ status: false, code: 'REASON_REQUIRED', message: 'A reason is required to reject a story' });
    }
    const doc = await SuccessStory.findById(req.params.id);
    if (!doc) return notFound(res);
    const before = { status: doc.status, publishedAt: doc.publishedAt };
    const firstPublish = status === 'published' && !doc.publishedAt;
    doc.status = status;
    doc.rejectionReason = status === 'rejected' ? reason : null;
    if (status === 'published' && !doc.publishedAt) doc.publishedAt = new Date();
    if (status !== 'published' && doc.isFeatured) doc.isFeatured = false;
    doc.reviewedBy = req.userId;
    doc.reviewedAt = new Date();
    await doc.save();
    if (firstPublish) await notifyPublished(doc);
    audit(req, `successStory.${status}`, { type: 'successStory', id: doc._id }, { before, after: { status, reason: doc.rejectionReason } });
    return res.json({ status: true, data: adminRow(await loadPopulated(doc._id)) });
  } catch (err) {
    console.error('[admin success-stories status]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.setFeatured = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const raw = (req.body || {}).isFeatured;
    if (![true, false, 'true', 'false'].includes(raw)) {
      return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'isFeatured must be true or false' });
    }
    const isFeatured = raw === true || raw === 'true';
    const doc = await SuccessStory.findById(req.params.id);
    if (!doc) return notFound(res);
    if (isFeatured && doc.status !== 'published') {
      return res.status(400).json({ status: false, code: 'NOT_PUBLISHED', message: 'Only published stories can be featured' });
    }
    const before = { isFeatured: doc.isFeatured };
    doc.isFeatured = isFeatured;
    await doc.save();
    audit(req, 'successStory.featured', { type: 'successStory', id: doc._id }, { before, after: { isFeatured } });
    return res.json({ status: true, data: adminRow(await loadPopulated(doc._id)) });
  } catch (err) {
    console.error('[admin success-stories featured]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
