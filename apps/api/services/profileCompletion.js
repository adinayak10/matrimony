'use strict';
/**
 * services/profileCompletion.js — one definition of "profile completeness"
 * (feature expansion A0.4). Extracted from the identical blocks that lived in
 * UserController.fetchProfile and editProfile.
 *
 *   computeProfileCompletion(user) -> { percentage, missingFields[], suggestion }
 *     `user` may be a lean object, a mongoose doc, populated or not (a
 *     populated ref and a raw id are both "present").
 *   persistProfileCompletion(userId, result) -> Promise<boolean>
 *     writes User.profileCompletion only when percentage/missingFields changed
 *     (the suggestion text is random, so it alone never causes a write).
 *
 * Pure apart from persistProfileCompletion; nothing runs at require time.
 */

const REQUIRED_FIELDS = [
  { key: 'full_name', label: 'your full name' },
  { key: 'dob', label: 'your date of birth' },
  { key: 'gender', label: 'your gender' },
  { key: 'height', label: 'your height' },
  { key: 'maritalStatus', label: 'your marital status' },
  { key: 'location.country', label: 'your country' },
  { key: 'location.state', label: 'your state' },
  { key: 'location.city', label: 'your city' },
  { key: 'profession', label: 'your profession' },
  { key: 'qualification', label: 'your qualification' },
  { key: 'profile', label: 'your profile photo' },
];

const SUGGESTIONS = [
  (field) => `Hey! Just adding ${field} can make your profile stand out more.`,
  (field) => `Profiles with ${field} tend to get more attention. Just saying 😉`,
  (field) => `Let others know more about you by filling in ${field}.`,
];
const COMPLETE_MESSAGE = `Your profile is complete! You're ready to shine 🌟`;

function plain(user) {
  if (user && typeof user.toObject === 'function') return user.toObject({ virtuals: false, getters: false });
  return user || {};
}

function valueAt(obj, path) {
  return path.split('.').reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);
}

function isMissing(key, val) {
  if (key === 'height') return typeof val !== 'number' || val <= 0;
  if (Array.isArray(val)) return val.length === 0;
  return !val || val === '' || val === 'Not specified';
}

function computeProfileCompletion(user, { random = Math.random } = {}) {
  const src = plain(user);
  const missingFields = REQUIRED_FIELDS.filter((f) => isMissing(f.key, valueAt(src, f.key))).map((f) => f.label);
  const percentage = Math.round(((REQUIRED_FIELDS.length - missingFields.length) / REQUIRED_FIELDS.length) * 100);
  const suggestion = missingFields.length
    ? SUGGESTIONS[Math.floor(random() * SUGGESTIONS.length) % SUGGESTIONS.length](missingFields[0])
    : COMPLETE_MESSAGE;
  return { percentage, missingFields, suggestion };
}

function sameList(a, b) {
  const x = Array.isArray(a) ? a : [];
  const y = Array.isArray(b) ? b : [];
  return x.length === y.length && x.every((v, i) => v === y[i]);
}

/**
 * Persist when it changed. `previous` (optional) is the stored
 * profileCompletion, so callers that already have it skip the read.
 */
async function persistProfileCompletion(userId, result, previous) {
  if (!userId || !result) return false;
  try {
    // eslint-disable-next-line global-require
    const User = require('../models/User');
    let prev = previous;
    if (prev === undefined) {
      const row = await User.findById(userId).select('profileCompletion').lean();
      if (!row) return false;
      prev = row.profileCompletion;
    }
    if (prev && prev.percentage === result.percentage && sameList(prev.missingFields, result.missingFields)) return false;
    await User.updateOne(
      { _id: userId },
      { $set: { profileCompletion: { percentage: result.percentage, missingFields: result.missingFields, suggestion: result.suggestion || '' } } },
      { timestamps: false }
    );
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[profileCompletion] persist failed:', err.message);
    return false;
  }
}

module.exports = { computeProfileCompletion, persistProfileCompletion, REQUIRED_FIELDS };
