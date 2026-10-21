'use strict';
/**
 * controllers/admin/recommendationController.js — admin matchmaking (feature expansion A3).
 *
 *   POST   /api/admin/users/:id/recommend {targetUserId, note?, notifyBoth?}
 *   GET    /api/admin/users/:id/recommendations?page&limit    rows sent TO this member
 *   GET    /api/admin/recommendations?page&limit
 *   DELETE /api/admin/recommendations/:id
 *   POST   /api/fetchRecommendations {start, limit}            member side (authenticate)
 *
 * Same gender and gotra-exogamy conflicts are returned as `warnings`, never
 * blocking. A block either way -> 400 BLOCKED; same pair twice -> 409.
 * The member gets Notification `admin_recommendation` (fromUser = target)
 * and a push {type:'admin_recommendation', userId:<target>}.
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const AdminRecommendation = require('../../models/AdminRecommendation');
const Notification = require('../../models/Notification');
const blocks = require('../../services/blocks');
const mq = require('../../services/matchQuery');
const push = require('../../services/push');
const { getSettings } = require('../../services/settingsCache');
const { serializeProfileFor, resolveRelations, PUBLIC_USER_SELECT } = require('../../services/profileSerializer');
const { resolveCaller } = require('../../middleware/identity');
const { record: audit } = require('../../services/auditLog');
const { text } = require('../SuccessStoryController');

const USER_CARD = 'full_name email profile gender gotra family.motherGotra is_block dob location';
const PAIR_SELECT = '_id full_name gender gotra family.motherGotra is_block device_token settings';

function pageParams(req, def = 20) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || def));
  return { page, limit, skip: (page - 1) * limit };
}

function sameId(a, b) {
  return !!a && !!b && String(a) === String(b);
}

/** viewer's exogamy rule (only when enforced and the viewer has a gotra) broken by cand? */
function breaksExogamy(viewer, cand, settings) {
  if (!mq.gotraExogamyClauses(viewer, settings).length) return false;
  const own = mq.toId(viewer.gotra);
  const mother = mq.toId(viewer.family && viewer.family.motherGotra);
  const cg = mq.toId(cand.gotra);
  const cm = mq.toId(cand.family && cand.family.motherGotra);
  return (!!cg && (sameId(cg, own) || sameId(cg, mother))) || (!!cm && sameId(cm, own));
}

function warningsFor(user, target, settings) {
  const out = [];
  if (user.gender && target.gender && user.gender === target.gender) out.push('same_gender');
  if (breaksExogamy(user, target, settings) || breaksExogamy(target, user, settings)) out.push('gotra_conflict');
  return out;
}

async function notify(toUser, fromUser, rec, note) {
  const name = fromUser.full_name || 'a member';
  const content = `Our team recommends ${name} for you.${note ? ` ${note}` : ''}`.slice(0, 600);
  await Notification.create({
    type: 'admin_recommendation',
    toUser: toUser._id,
    fromUser: fromUser._id,
    content,
    data: { recommendationId: String(rec._id), userId: String(fromUser._id) },
  });
  await push.sendToUser(toUser, 'A match recommended for you', `Our team recommends ${name} for you.`, {
    type: 'admin_recommendation',
    userId: String(fromUser._id),
    recommendationId: String(rec._id),
  });
}

exports.recommend = async (req, res) => {
  try {
    const userId = req.params.id;
    const b = req.body || {};
    const targetId = b.targetUserId;
    if (!mongoose.isValidObjectId(userId)) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'User not found' });
    if (!targetId || !mongoose.isValidObjectId(targetId)) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'targetUserId is required' });
    if (String(userId) === String(targetId)) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'A member cannot be recommended to themselves' });
    const note = text(b.note, 501);
    if (note.length > 500) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'note must be at most 500 characters' });
    const notifyBoth = b.notifyBoth === true || b.notifyBoth === 'true';

    const [user, target] = await Promise.all([User.findById(userId).select(PAIR_SELECT).lean(), User.findById(targetId).select(PAIR_SELECT).lean()]);
    if (!user) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'User not found' });
    if (!target) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Recommended user not found' });
    if (user.is_block === 1 || target.is_block === 1) return res.status(400).json({ status: false, code: 'USER_BLOCKED', message: 'One of these accounts is blocked' });
    if (await blocks.isBlockedEither(user._id, target._id)) {
      return res.status(400).json({ status: false, code: 'BLOCKED', message: 'One of these members has blocked the other' });
    }
    if (await AdminRecommendation.exists({ user: user._id, target: target._id })) {
      return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'This member was already recommended to this user' });
    }

    const settings = await getSettings();
    const warnings = warningsFor(user, target, settings);
    let rec;
    try {
      rec = await AdminRecommendation.create({ user: user._id, target: target._id, note, notifyBoth, warnings, createdBy: req.userId });
    } catch (err) {
      if (err && err.code === 11000) return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'This member was already recommended to this user' });
      throw err;
    }
    await notify(user, target, rec, note);
    if (notifyBoth) await notify(target, user, rec, note);
    audit(req, 'recommendation.create', { type: 'user', id: user._id }, { after: { targetUserId: String(target._id), note, notifyBoth, warnings } });
    return res.status(201).json({ status: true, data: { recommendation: rec.toObject(), warnings } });
  } catch (err) {
    console.error('[admin recommend]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

async function listWhere(req, res, query) {
  const { page, limit, skip } = pageParams(req);
  const [total, rows] = await Promise.all([
    AdminRecommendation.countDocuments(query),
    AdminRecommendation.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', USER_CARD)
      .populate('target', USER_CARD)
      .populate('createdBy', 'full_name email')
      .lean(),
  ]);
  return res.json({ status: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
}

exports.listForUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'User not found' });
    return await listWhere(req, res, { user: req.params.id });
  } catch (err) {
    console.error('[admin recommendations user]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.listAll = async (req, res) => {
  try {
    return await listWhere(req, res, {});
  } catch (err) {
    console.error('[admin recommendations list]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Recommendation not found' });
    const rec = await AdminRecommendation.findByIdAndDelete(req.params.id).lean();
    if (!rec) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Recommendation not found' });
    await Notification.deleteMany({ type: 'admin_recommendation', 'data.recommendationId': String(rec._id) });
    audit(req, 'recommendation.delete', { type: 'user', id: rec.user }, { before: { targetUserId: String(rec.target), note: rec.note } });
    return res.json({ status: true, data: { _id: rec._id, deleted: true } });
  } catch (err) {
    console.error('[admin recommendations delete]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/* ---------- member side ---------- */

function intOr(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

exports.fetchRecommendations = async (req, res) => {
  try {
    const callerId = resolveCaller(req);
    const start = Math.max(0, intOr(req.body && req.body.start, 0));
    const limit = Math.min(50, Math.max(1, intOr(req.body && req.body.limit, 20)));
    const blocked = await blocks.getBlockedIds(callerId);
    const hidden = await User.distinct('_id', { is_block: 1 });
    const query = { user: callerId, target: { $nin: [...blocked, ...hidden] } };
    const [total, recs] = await Promise.all([
      AdminRecommendation.countDocuments(query),
      AdminRecommendation.find(query).sort({ createdAt: -1 }).skip(start).limit(limit).lean(),
    ]);
    const targetIds = recs.map((r) => r.target);
    const [users, relations] = await Promise.all([
      User.find({ _id: { $in: targetIds } }).select(PUBLIC_USER_SELECT).populate('location.city', 'name').populate('location.state', 'name').lean(),
      resolveRelations(callerId, targetIds),
    ]);
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const data = [];
    for (const r of recs) {
      const u = byId.get(String(r.target));
      if (!u) continue;
      data.push({
        _id: r._id,
        note: r.note || '',
        createdAt: r.createdAt,
        relation: relations.get(String(u._id)) || 'none',
        user: serializeProfileFor(req.user, u, { relation: relations.get(String(u._id)) || 'none' }),
      });
    }
    return res.json({ status: true, message: 'Recommendations', data, total, start, limit });
  } catch (err) {
    console.error('[fetchRecommendations]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports._warningsFor = warningsFor;
