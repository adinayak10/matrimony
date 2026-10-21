'use strict';
/**
 * tools/backfill-profile-completion.js (feature expansion A0.4)
 *
 * Recomputes User.profileCompletion for every member with
 * services/profileCompletion (the same rule fetchProfile/editProfile now
 * persist). Writes only rows whose percentage/missingFields changed.
 * Idempotent; dry run by default.
 *
 *   node tools/backfill-profile-completion.js
 *   node tools/backfill-profile-completion.js --apply --yes-i-know --prod
 */
const g = require('./_guard');
const User = require('../models/User');
const { computeProfileCompletion, REQUIRED_FIELDS } = require('../services/profileCompletion');

const SELECT = ['profileCompletion', ...new Set(REQUIRED_FIELDS.map((f) => f.key.split('.')[0]))].join(' ');

function same(a, b) {
  const x = (a && a.missingFields) || [];
  return !!a && a.percentage === b.percentage && x.length === b.missingFields.length && x.every((v, i) => v === b.missingFields[i]);
}

g.run(async ({ apply }) => {
  let scanned = 0;
  let changed = 0;
  let written = 0;
  const buckets = { '0-39': 0, '40-69': 0, '70-99': 0, '100': 0 };
  let ops = [];

  const flush = async () => {
    if (!ops.length) return;
    if (apply) {
      const r = await User.bulkWrite(ops, { ordered: false });
      written += r.modifiedCount || 0;
    }
    ops = [];
  };

  for await (const u of User.find({}).select(SELECT).lean().cursor()) {
    scanned++;
    const next = computeProfileCompletion(u);
    const p = next.percentage;
    buckets[p === 100 ? '100' : p >= 70 ? '70-99' : p >= 40 ? '40-69' : '0-39']++;
    if (same(u.profileCompletion, next)) continue;
    changed++;
    ops.push({ updateOne: { filter: { _id: u._id }, update: { $set: { profileCompletion: next } }, timestamps: false } });
    if (ops.length >= 500) await flush();
  }
  await flush();

  // eslint-disable-next-line no-console
  console.log({ scanned, needsUpdate: changed, written, applied: apply, distribution: buckets });
});
