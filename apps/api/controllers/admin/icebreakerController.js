'use strict';
/**
 * controllers/admin/icebreakerController.js — Ice Breaker question bank (feature expansion A3).
 *
 *   GET    /api/admin/icebreaker/questions?search&active&page&limit   (whole list unless limit given)
 *   POST   /api/admin/icebreaker/questions          {question, options[2-6], category?, difficulty?, order?, isActive?}
 *   PUT    /api/admin/icebreaker/questions/:id
 *   DELETE /api/admin/icebreaker/questions/:id
 *   POST   /api/admin/icebreaker/questions/:id/toggle
 *   POST   /api/admin/icebreaker/questions/seed-defaults   (alias /api/admin/icebreaker/seed-defaults)
 *   GET    /api/admin/icebreaker/stats
 *
 * Every mutation invalidates the game cache (services/icebreakerQuestions.js).
 */
const mongoose = require('mongoose');
const IceBreakerQuestion = require('../../models/IceBreakerQuestion');
require('../../models/IceBreakerGame'); // registers IceBreakerGame
const questions = require('../../services/icebreakerQuestions');
const { record: audit } = require('../../services/auditLog');
const { text } = require('../SuccessStoryController');

function notFound(res) {
  return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Question not found' });
}
function invalid(res, message) {
  return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message });
}
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readOptions(raw) {
  let list = raw;
  if (typeof list === 'string') list = list.split('\n');
  if (!Array.isArray(list)) return { error: 'options must be a list of 2 to 6 answers' };
  const opts = list.map((o) => text(o, 121)).filter(Boolean);
  if (opts.length < 2 || opts.length > 6) return { error: 'options must be a list of 2 to 6 answers' };
  if (opts.some((o) => o.length > 120)) return { error: 'each option must be at most 120 characters' };
  if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) return { error: 'options must be different' };
  return { options: opts };
}

function readFields(b, partial) {
  const fields = {};
  if (b.question !== undefined || !partial) {
    const q = text(b.question, 301);
    if (!q) return { error: 'question is required' };
    if (q.length > 300) return { error: 'question must be at most 300 characters' };
    fields.question = q;
  }
  if (b.options !== undefined || !partial) {
    const o = readOptions(b.options);
    if (o.error) return { error: o.error };
    fields.options = o.options;
  }
  if (b.category !== undefined && b.category !== '') {
    if (!IceBreakerQuestion.CATEGORIES.includes(b.category)) return { error: `category must be one of ${IceBreakerQuestion.CATEGORIES.join(', ')}` };
    fields.category = b.category;
  }
  if (b.difficulty !== undefined && b.difficulty !== '') {
    if (!IceBreakerQuestion.DIFFICULTIES.includes(b.difficulty)) return { error: `difficulty must be one of ${IceBreakerQuestion.DIFFICULTIES.join(', ')}` };
    fields.difficulty = b.difficulty;
  }
  if (b.order !== undefined && b.order !== '') {
    const n = parseInt(b.order, 10);
    if (!Number.isFinite(n)) return { error: 'order must be a number' };
    fields.order = Math.max(0, Math.min(n, 100000));
  }
  if (b.isActive !== undefined) {
    if (![true, false, 'true', 'false'].includes(b.isActive)) return { error: 'isActive must be true or false' };
    fields.isActive = b.isActive === true || b.isActive === 'true';
  }
  return { fields };
}

exports.list = async (req, res) => {
  try {
    const query = {};
    if (req.query.active === '1' || req.query.active === 'true') query.isActive = true;
    if (req.query.active === '0' || req.query.active === 'false') query.isActive = false;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    if (search) query.question = new RegExp(escapeRegex(search), 'i');
    const total = await IceBreakerQuestion.countDocuments(query);
    const paged = req.query.limit !== undefined;
    const limit = paged ? Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50)) : Math.min(Math.max(total, 1), 1000);
    const page = paged ? Math.max(1, parseInt(req.query.page, 10) || 1) : 1;
    const rows = await IceBreakerQuestion.find(query)
      .sort({ order: 1, createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return res.json({ status: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[admin icebreaker list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.create = async (req, res) => {
  try {
    const r = readFields(req.body || {}, false);
    if (r.error) return invalid(res, r.error);
    if (r.fields.order === undefined) {
      const last = await IceBreakerQuestion.findOne().sort({ order: -1 }).select('order').lean();
      r.fields.order = last ? (last.order || 0) + 1 : 1;
    }
    const doc = await IceBreakerQuestion.create(r.fields);
    questions.invalidate();
    audit(req, 'icebreaker.create', { type: 'icebreakerQuestion', id: doc._id }, { after: r.fields });
    return res.status(201).json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin icebreaker create]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.update = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const r = readFields(req.body || {}, true);
    if (r.error) return invalid(res, r.error);
    const doc = await IceBreakerQuestion.findById(req.params.id);
    if (!doc) return notFound(res);
    const before = {};
    for (const k of Object.keys(r.fields)) before[k] = doc[k];
    Object.assign(doc, r.fields);
    await doc.save();
    questions.invalidate();
    audit(req, 'icebreaker.update', { type: 'icebreakerQuestion', id: doc._id }, { before, after: r.fields });
    return res.json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin icebreaker update]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await IceBreakerQuestion.findByIdAndDelete(req.params.id).lean();
    if (!doc) return notFound(res);
    questions.invalidate();
    audit(req, 'icebreaker.delete', { type: 'icebreakerQuestion', id: doc._id }, { before: { question: doc.question, key: doc.key || null } });
    return res.json({ status: true, data: { _id: doc._id, deleted: true } });
  } catch (err) {
    console.error('[admin icebreaker delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.toggle = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return notFound(res);
    const doc = await IceBreakerQuestion.findById(req.params.id);
    if (!doc) return notFound(res);
    doc.isActive = !doc.isActive;
    await doc.save();
    questions.invalidate();
    audit(req, 'icebreaker.toggle', { type: 'icebreakerQuestion', id: doc._id }, { before: { isActive: !doc.isActive }, after: { isActive: doc.isActive } });
    return res.json({ status: true, data: doc.toObject() });
  } catch (err) {
    console.error('[admin icebreaker toggle]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.seedDefaults = async (req, res) => {
  try {
    const result = await questions.seedDefaults();
    audit(req, 'icebreaker.seedDefaults', { type: 'icebreakerQuestion', id: null }, { after: result });
    return res.json({ status: true, message: `${result.inserted} default question(s) added`, data: result });
  } catch (err) {
    console.error('[admin icebreaker seed]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.stats = async (req, res) => {
  try {
    const Game = mongoose.model('IceBreakerGame');
    const since = new Date(Date.now() - 7 * 86400000);
    const [totalQuestions, activeQuestions, gamesTotal, gamesCompleted, gamesLast7Days] = await Promise.all([
      IceBreakerQuestion.countDocuments(),
      IceBreakerQuestion.countDocuments({ isActive: true }),
      Game.countDocuments(),
      Game.countDocuments({ status: 'completed' }),
      Game.countDocuments({ createdAt: { $gte: since } }),
    ]);
    let live = { activeGames: 0, queuedPlayers: 0 };
    try {
      // lazy: gamesocket.js is loaded by socket.js at boot
      // eslint-disable-next-line global-require
      const s = require('../../gamesocket').getIcebreakerStats() || {};
      live = { activeGames: s.activeGames || 0, queuedPlayers: s.playersInQueue || 0 };
    } catch (_) {
      /* not loaded */
    }
    return res.json({
      status: true,
      data: {
        totalQuestions,
        activeQuestions,
        defaultQuestions: questions.DEFAULT_QUESTIONS.length,
        minActive: questions.MIN_ACTIVE,
        usingDefaults: activeQuestions < questions.MIN_ACTIVE,
        games: { total: gamesTotal, completed: gamesCompleted, last7Days: gamesLast7Days },
        live,
      },
    });
  } catch (err) {
    console.error('[admin icebreaker stats]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
