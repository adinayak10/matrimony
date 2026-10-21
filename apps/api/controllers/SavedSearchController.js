'use strict';
/**
 * Saved searches (feature expansion A2). All POST, caller = token user.
 *
 *   fetchSavedSearches {}                                  -> [row]
 *   createSavedSearch  {name, filters, alertEnabled}       -> row   (max 10 per member, 409 LIMIT_REACHED)
 *   updateSavedSearch  {id, name?, filters?, alertEnabled?} -> row
 *   deleteSavedSearch  {id}                                -> {_id}
 *   runSavedSearch     {id, page, limit}                   -> searchProfiles envelope
 *                                                             {status, message, data[], page, limit, total}
 *
 * row = {_id, name, filters, alertEnabled, lastNotifiedAt, lastRunAt, createdAt, updatedAt}
 * filters = {age_range, height_range, marital_status[], caste[], gotra[],
 *            qualification[], profession[], incomeRange, isVerify, recentlyActive}
 */
const mongoose = require('mongoose');
const User = require('../models/User');
const SavedSearch = require('../models/SavedSearch');
const profileSearch = require('../services/profileSearch');
const { computeMatchPercent } = require('../services/matchScore');
const { serializeMany, resolveRelations } = require('../services/profileSerializer');
const { NO_GENDER_MESSAGE } = require('../services/matchQuery');
const { MARITAL_STATUS_ENUM, MARITAL_STATUS_PREFERENCE_ENUM } = require('../enum/enum');

const ID_LISTS = ['caste', 'gotra', 'qualification', 'profession'];
const MARITAL = [...new Set([...MARITAL_STATUS_ENUM, ...MARITAL_STATUS_PREFERENCE_ENUM])];

function bad(res, status, code, message) {
  return res.status(status).json({ status: false, code, message });
}

function num(v, lo, hi) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(hi, Math.max(lo, Math.round(n)));
}

function range(input, lo, hi) {
  if (!input || typeof input !== 'object') return null;
  const min = num(input.min, lo, hi);
  const max = num(input.max, lo, hi);
  if (min === undefined || max === undefined) return undefined;
  if (min === null && max === null) return null;
  return { min, max };
}

function ids(v) {
  const arr = Array.isArray(v) ? v : v ? [v] : [];
  return [...new Set(arr.map(String).filter((x) => mongoose.isValidObjectId(x)))].slice(0, 50);
}

const asBool = (v) => v === true || v === 'true' || v === 1 || v === '1';

/** Allowlisted, normalised filters or { error }. */
function sanitizeFilters(input) {
  let f = input;
  if (typeof f === 'string') {
    try { f = JSON.parse(f); } catch (_) { return { error: 'filters must be an object' }; }
  }
  if (f === undefined || f === null) f = {};
  if (typeof f !== 'object' || Array.isArray(f)) return { error: 'filters must be an object' };
  const out = {};
  const age = range(f.age_range, 18, 100);
  if (age === undefined) return { error: 'age_range must be numbers' };
  if (age) out.age_range = age;
  const height = range(f.height_range, 30, 250);
  if (height === undefined) return { error: 'height_range must be numbers' };
  if (height) out.height_range = height;
  if (f.marital_status !== undefined) {
    const list = (Array.isArray(f.marital_status) ? f.marital_status : [f.marital_status]).map(String).filter((m) => MARITAL.includes(m));
    if (list.length) out.marital_status = [...new Set(list)];
  }
  for (const key of ID_LISTS) {
    const list = ids(f[key]);
    if (list.length) out[key] = list;
  }
  const income = ids(f.incomeRange !== undefined ? f.incomeRange : f.income);
  if (income.length) out.incomeRange = income.length === 1 ? income[0] : income;
  if (asBool(f.isVerify)) out.isVerify = true;
  if (asBool(f.recentlyActive)) out.recentlyActive = true;
  return { filters: out };
}

function rowView(r) {
  return {
    _id: r._id,
    name: r.name,
    filters: r.filters || {},
    alertEnabled: !!r.alertEnabled,
    lastNotifiedAt: r.lastNotifiedAt || null,
    lastRunAt: r.lastRunAt || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function cleanName(v) {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/\s+/g, ' ');
  return s && s.length <= 60 ? s : null;
}

async function ownRow(req) {
  const id = (req.body || {}).id;
  if (!mongoose.isValidObjectId(id)) return null;
  return SavedSearch.findOne({ _id: id, user: req.userId });
}

exports.fetchSavedSearches = async (req, res) => {
  try {
    const rows = await SavedSearch.find({ user: req.userId }).sort({ createdAt: -1 }).limit(SavedSearch.MAX_PER_USER).lean();
    return res.json({ status: true, message: 'Saved searches', data: rows.map(rowView), total: rows.length });
  } catch (err) {
    console.error('[savedSearch] fetch failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.createSavedSearch = async (req, res) => {
  try {
    const body = req.body || {};
    const name = cleanName(body.name);
    if (!name) return bad(res, 400, 'VALIDATION', 'name is required (up to 60 characters)');
    const { filters, error } = sanitizeFilters(body.filters);
    if (error) return bad(res, 400, 'VALIDATION', error);
    const count = await SavedSearch.countDocuments({ user: req.userId });
    if (count >= SavedSearch.MAX_PER_USER) {
      return bad(res, 409, 'LIMIT_REACHED', `You can keep up to ${SavedSearch.MAX_PER_USER} saved searches`);
    }
    const row = await SavedSearch.create({ user: req.userId, name, filters, alertEnabled: asBool(body.alertEnabled) });
    return res.json({ status: true, message: 'Search saved', data: rowView(row.toObject()) });
  } catch (err) {
    console.error('[savedSearch] create failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.updateSavedSearch = async (req, res) => {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(body.id)) return bad(res, 400, 'VALIDATION', 'id is required');
    const row = await ownRow(req);
    if (!row) return bad(res, 404, 'NOT_FOUND', 'Saved search not found');
    if (body.name !== undefined) {
      const name = cleanName(body.name);
      if (!name) return bad(res, 400, 'VALIDATION', 'name must be 1-60 characters');
      row.name = name;
    }
    if (body.filters !== undefined) {
      const { filters, error } = sanitizeFilters(body.filters);
      if (error) return bad(res, 400, 'VALIDATION', error);
      row.filters = filters;
      row.markModified('filters');
    }
    if (body.alertEnabled !== undefined) {
      const on = asBool(body.alertEnabled);
      // turning alerts on starts counting from now, not from when the search was saved
      if (on && !row.alertEnabled) row.lastNotifiedAt = new Date();
      row.alertEnabled = on;
    }
    await row.save();
    return res.json({ status: true, message: 'Saved search updated', data: rowView(row.toObject()) });
  } catch (err) {
    console.error('[savedSearch] update failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.deleteSavedSearch = async (req, res) => {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(body.id)) return bad(res, 400, 'VALIDATION', 'id is required');
    const r = await SavedSearch.deleteOne({ _id: body.id, user: req.userId });
    if (!r.deletedCount) return bad(res, 404, 'NOT_FOUND', 'Saved search not found');
    return res.json({ status: true, message: 'Saved search deleted', data: { _id: body.id } });
  } catch (err) {
    console.error('[savedSearch] delete failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.runSavedSearch = async (req, res) => {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(body.id)) return bad(res, 400, 'VALIDATION', 'id is required');
    const row = await ownRow(req);
    if (!row) return bad(res, 404, 'NOT_FOUND', 'Saved search not found');
    const currentUser = await User.findById(req.userId).lean();
    if (!currentUser) return bad(res, 404, 'NOT_FOUND', 'User not found');

    const filters = row.filters || {};
    const { rows, total, page, limit, noGender } = await profileSearch.runSearch(currentUser, {
      filters,
      isVerify: !!filters.isVerify,
      recentlyActive: !!filters.recentlyActive,
      page: body.page,
      limit: body.limit,
    });
    SavedSearch.updateOne({ _id: row._id }, { $set: { lastRunAt: new Date() } }, { timestamps: false }).catch(() => {});
    if (noGender) return res.json({ status: true, message: NO_GENDER_MESSAGE, data: [], page, limit, total: 0 });

    const relMap = await resolveRelations(req.userId, rows.map((u) => u._id));
    const data = serializeMany(req.user, rows, relMap).map((card, i) => ({ ...card, matchPercent: computeMatchPercent(currentUser, rows[i]) }));
    return res.json({ status: true, message: 'Filtered profiles', data, page, limit, total });
  } catch (err) {
    console.error('[savedSearch] run failed:', err.message);
    return res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

exports.sanitizeFilters = sanitizeFilters;
