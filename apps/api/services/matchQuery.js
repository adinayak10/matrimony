'use strict';
/**
 * services/matchQuery.js — Mongo-side match/filter builders (A6.1, A6.4).
 *
 * buildMatchQuery(viewer, settings, { blockedIds, excludeIds })
 *   -> query object, or null when the viewer has no usable gender
 *      (caller answers {status:true, data:[], message:NO_GENDER_MESSAGE}).
 *   base: { _id: {$ne: viewer, $nin: blocked+excluded}, is_block: 0,
 *           gender: oppositeGender(viewer.gender) }
 *   gotra exogamy (settings.matching.enforceGotraExogamy !== false and the
 *   viewer has a gotra): candidate.gotra ∉ {viewer.gotra, viewer.family.motherGotra}
 *   and candidate.family.motherGotra ≠ viewer.gotra.
 *
 * Filter builders return a clause (object) or null; collect non-null clauses
 * into `$and` with andClauses(). All ObjectId inputs are validated.
 */
const mongoose = require('mongoose');

const NO_GENDER_MESSAGE = 'Set your gender to see matches';
const MAX_LIMIT = 50;

function oppositeGender(g) {
  if (g === 'Male') return 'Female';
  if (g === 'Female') return 'Male';
  return null;
}

/** Normalise id | ObjectId | populated doc -> ObjectId or null. */
function toId(v) {
  if (v === null || v === undefined || v === '') return null;
  const raw = typeof v === 'object' && v._id !== undefined ? v._id : v;
  if (raw instanceof mongoose.Types.ObjectId) return raw;
  const s = String(raw);
  return mongoose.isValidObjectId(s) ? new mongoose.Types.ObjectId(s) : null;
}

function toIds(values) {
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  return arr.map(toId).filter(Boolean);
}

/** Same semantics as UserController.calculateAge (line ~2216). */
function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function minusYears(date, years) {
  const d = new Date(date.getTime());
  d.setFullYear(d.getFullYear() - years);
  return d;
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Age → dob range with calculateAge semantics:
 *   age >= min  <=> dob <= today - min years
 *   age <= max  <=> dob >  today - (max+1) years
 * Users without dob are excluded only when a bound is set (dob:null never
 * satisfies $lte/$gt).
 */
function ageRangeToDobFilter(min, max, today = new Date()) {
  const lo = num(min);
  const hi = num(max);
  if (lo === null && hi === null) return null;
  const dob = {};
  if (lo !== null) dob.$lte = minusYears(today, Math.max(0, Math.floor(lo)));
  if (hi !== null) dob.$gt = minusYears(today, Math.max(0, Math.floor(hi)) + 1);
  return { dob };
}

/** Height in cm; users without a height are kept (same rule as before). */
function heightFilter(min, max) {
  const lo = num(min);
  const hi = num(max);
  if (lo === null && hi === null) return null;
  const range = {};
  if (lo !== null) range.$gte = lo;
  if (hi !== null) range.$lte = hi;
  return { $or: [{ height: null }, { height: { $exists: false } }, { height: range }] };
}

function idInFilter(field, values) {
  const ids = toIds(values);
  if (!ids.length) return null;
  return { [field]: { $in: ids } };
}

function enumInFilter(field, values, allowed) {
  const arr = (Array.isArray(values) ? values : values ? [values] : [])
    .map((v) => String(v))
    .filter((v) => !allowed || allowed.includes(v));
  if (!arr.length) return null;
  return { [field]: { $in: arr } };
}

function andClauses(clauses) {
  const list = (clauses || []).filter(Boolean);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  return { $and: list };
}

/** Merge extra clauses into a base query without clobbering keys. */
function mergeQuery(base, ...clauses) {
  const extra = andClauses(clauses);
  if (!extra) return base;
  if (extra.$and) return { ...base, $and: [...(base.$and || []), ...extra.$and] };
  return { ...base, $and: [...(base.$and || []), extra] };
}

/**
 * The viewer's own partner preferences applied to candidates
 * (matchMyPreference). Returns array of clauses.
 */
function preferenceMatchFilters(viewer) {
  const p = (viewer && viewer.preferences) || {};
  const out = [];
  out.push(idInFilter('caste', p.caste));
  out.push(idInFilter('gotra', p.gotra));
  out.push(idInFilter('qualification', p.qualification));
  out.push(idInFilter('profession', p.profession));
  if (p.age_range) out.push(ageRangeToDobFilter(p.age_range.min, p.age_range.max));
  if (p.height_range) out.push(heightFilter(p.height_range.min, p.height_range.max));
  if (Array.isArray(p.marital_status) && p.marital_status.length) {
    out.push({ maritalStatus: { $in: p.marital_status.map(String) } });
  }
  const income = toId(p.incomeRange);
  if (income) out.push({ incomeRange: income });
  return out.filter(Boolean);
}

/** `preferences.<X>` empty/missing OR contains myValue (null value => only empty). */
function listAccepts(path, myValue) {
  const or = [{ [path]: { $size: 0 } }, { [path]: { $exists: false } }];
  if (myValue !== null && myValue !== undefined) or.push({ [path]: myValue });
  return { $or: or };
}

/** `preferences.<range>` missing OR min <= value <= max. */
function rangeAccepts(path, value) {
  if (value === null || value === undefined) return null;
  return {
    $or: [
      { [`${path}.min`]: { $exists: false } },
      { $and: [{ [`${path}.min`]: { $lte: value } }, { [`${path}.max`]: { $gte: value } }] },
    ],
  };
}

/**
 * Candidates whose partner preferences accept the viewer
 * (matchTheirPreference). Returns array of clauses.
 */
function theirPreferenceFilters(viewer) {
  if (!viewer) return [];
  const out = [];
  out.push(listAccepts('preferences.caste', toId(viewer.caste)));
  out.push(listAccepts('preferences.gotra', toId(viewer.gotra)));
  out.push(listAccepts('preferences.qualification', toId(viewer.qualification)));
  out.push(listAccepts('preferences.profession', toId(viewer.profession)));
  out.push(listAccepts('preferences.marital_status', viewer.maritalStatus || null));
  out.push(rangeAccepts('preferences.age_range', calculateAge(viewer.dob)));
  out.push(rangeAccepts('preferences.height_range', num(viewer.height)));
  return out.filter(Boolean);
}

/**
 * Pagination clamp: page >= 1, 1 <= limit <= max. Strings accepted.
 */
function clampPage(page, limit, max = MAX_LIMIT) {
  let p = parseInt(page, 10);
  let l = parseInt(limit, 10);
  if (!Number.isFinite(p) || p < 1) p = 1;
  if (!Number.isFinite(l) || l < 1) l = 10;
  if (l > max) l = max;
  return { page: p, limit: l, skip: (p - 1) * l };
}

function gotraExogamyClauses(viewer, settings) {
  const enforce = !settings || !settings.matching || settings.matching.enforceGotraExogamy !== false;
  if (!enforce) return [];
  const own = toId(viewer && viewer.gotra);
  if (!own) return [];
  const mother = toId(viewer && viewer.family && viewer.family.motherGotra);
  const banned = [own, mother].filter(Boolean);
  return [{ gotra: { $nin: banned } }, { 'family.motherGotra': { $ne: own } }];
}

/**
 * Base candidate query for list/search/daily/nearby/trending/random.
 */
function buildMatchQuery(viewer, settings, { blockedIds = [], excludeIds = [] } = {}) {
  const target = oppositeGender(viewer && viewer.gender);
  if (!target) return null;
  const self = toId(viewer && viewer._id);
  const nin = [...toIds(Array.from(blockedIds || [])), ...toIds(Array.from(excludeIds || []))];
  if (self) nin.push(self);
  const base = {
    _id: self ? { $ne: self, $nin: nin } : { $nin: nin },
    is_block: 0,
    gender: target,
  };
  return mergeQuery(base, ...gotraExogamyClauses(viewer, settings));
}

module.exports = {
  NO_GENDER_MESSAGE,
  MAX_LIMIT,
  oppositeGender,
  toId,
  toIds,
  calculateAge,
  ageRangeToDobFilter,
  heightFilter,
  idInFilter,
  enumInFilter,
  andClauses,
  mergeQuery,
  preferenceMatchFilters,
  theirPreferenceFilters,
  clampPage,
  gotraExogamyClauses,
  buildMatchQuery,
};
