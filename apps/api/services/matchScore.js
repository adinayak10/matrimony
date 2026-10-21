'use strict';
/**
 * services/matchScore.js — computeMatchPercent(viewer, candidate) (feature
 * expansion A2). Pure: no DB, no I/O, safe to call per card.
 *
 * Scores the candidate against the criteria the VIEWER has actually set in
 * `preferences` and returns an integer 0..100, or null when the viewer has
 * set nothing (the UI then shows no chip instead of a fake number).
 *
 * "Set" means: arrays non-empty, incomeRange present, diet/smoke/drink/manglik
 * not 'Any' (manglik "Don't Know" counts as Any), and age/height ranges that
 * differ from the schema defaults (18-60 years, 121-213 cm), which every
 * account carries without ever choosing them.
 *
 * A criterion the candidate has no value for counts as not matched.
 * Ids are compared through matchQuery.toId so populated refs and raw ids mix.
 */
const { toId, calculateAge } = require('./matchQuery');

const DEFAULT_AGE = { min: 18, max: 60 };
const DEFAULT_HEIGHT = { min: 121, max: 213 };

const WEIGHTS = {
  age: 2,
  height: 1,
  caste: 2,
  qualification: 1,
  profession: 1,
  incomeRange: 1,
  marital_status: 2,
  diet: 1,
  smoke: 1,
  drink: 1,
  manglik: 1,
};

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function rangeOf(r, def) {
  if (!r || typeof r !== 'object') return null;
  const min = num(r.min);
  const max = num(r.max);
  if (min === null && max === null) return null;
  if ((min === null || min === def.min) && (max === null || max === def.max)) return null; // untouched default
  return { min, max };
}

function inRange(value, range) {
  if (value === null || value === undefined) return false;
  if (range.min !== null && value < range.min) return false;
  if (range.max !== null && value > range.max) return false;
  return true;
}

function idList(values) {
  const arr = Array.isArray(values) ? values : values ? [values] : [];
  return arr.map(toId).filter(Boolean).map(String);
}

function setEnum(v, anyValues) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || anyValues.includes(s)) return null;
  return s;
}

// 'Never Married' (preference vocabulary) and 'Single' (profile vocabulary) are the same thing
function maritalAccepts(prefList, value) {
  if (!value) return false;
  const v = String(value);
  return prefList.some((p) => p === v || (p === 'Never Married' && v === 'Single') || (p === 'Single' && v === 'Never Married'));
}

/**
 * Returns { percent, matched[], considered[] } — matched/considered are
 * criterion keys, handy for tests and future "why" chips.
 */
function explainMatch(viewer, candidate) {
  const p = (viewer && viewer.preferences) || {};
  const c = candidate || {};
  const checks = [];

  const age = rangeOf(p.age_range, DEFAULT_AGE);
  if (age) checks.push(['age', inRange(calculateAge(c.dob), age)]);

  const height = rangeOf(p.height_range, DEFAULT_HEIGHT);
  if (height) checks.push(['height', inRange(num(c.height), height)]);

  for (const key of ['caste', 'qualification', 'profession']) {
    const wanted = idList(p[key]);
    if (!wanted.length) continue;
    const have = toId(c[key]);
    checks.push([key, !!have && wanted.includes(String(have))]);
  }

  const income = toId(p.incomeRange);
  if (income) {
    const have = toId(c.incomeRange);
    checks.push(['incomeRange', !!have && String(have) === String(income)]);
  }

  const marital = (Array.isArray(p.marital_status) ? p.marital_status : []).map(String).filter(Boolean);
  if (marital.length) checks.push(['marital_status', maritalAccepts(marital, c.maritalStatus)]);

  for (const key of ['diet', 'smoke', 'drink']) {
    const wanted = setEnum(p[key], ['Any']);
    if (wanted) checks.push([key, c[key] === wanted]);
  }

  const manglik = setEnum(p.manglik, ['Any', "Don't Know"]);
  if (manglik) checks.push(['manglik', c.manglikStatus === manglik]);

  if (!checks.length) return { percent: null, matched: [], considered: [] };
  let total = 0;
  let got = 0;
  for (const [key, ok] of checks) {
    total += WEIGHTS[key];
    if (ok) got += WEIGHTS[key];
  }
  return {
    percent: Math.round((got / total) * 100),
    matched: checks.filter(([, ok]) => ok).map(([k]) => k),
    considered: checks.map(([k]) => k),
  };
}

function computeMatchPercent(viewer, candidate) {
  return explainMatch(viewer, candidate).percent;
}

module.exports = { computeMatchPercent, explainMatch, WEIGHTS };
