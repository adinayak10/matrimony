'use strict';
/**
 * tools/cleanup/backfill-photo-status.js (A8.4)
 *
 * UserPhoto rows with a null/missing moderationStatus -> 'approved'
 * (5 rows today). Idempotent.
 *
 *   node tools/cleanup/backfill-photo-status.js
 *   node tools/cleanup/backfill-photo-status.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const UserPhoto = require('../../models/UserPhoto');

const FILTER = { $or: [{ moderationStatus: null }, { moderationStatus: { $exists: false } }] };

g.run(async ({ apply }) => {
  const pending = await UserPhoto.countDocuments(FILTER);
  let modified = 0;
  if (apply && pending) {
    const r = await UserPhoto.updateMany(FILTER, { $set: { moderationStatus: 'approved' } });
    modified = r.modifiedCount || 0;
  }
  // eslint-disable-next-line no-console
  console.log({ rowsWithoutStatus: pending, setApproved: modified, applied: apply });
});
