'use strict';
/**
 * services/broadcastQuery.js — the member filter shared by the email broadcast
 * (routes/admin.js) and admin push (controllers/admin/pushController.js).
 * Moved verbatim from routes/admin.js; behaviour unchanged.
 *
 *   buildBroadcastQuery({ gender, minAge, maxAge, verified, blocked, platform })
 *     platform here is last_login_platform: 'mobile' | 'web'
 */
/** Build Mongoose query from admin filter params */
function buildBroadcastQuery(filter) {
  const query = {};
  const { gender, minAge, maxAge, verified, blocked, platform } = filter;

  if (gender && gender !== 'all' && ['Male', 'Female', 'Not specified'].includes(gender)) query.gender = gender;

  if (minAge || maxAge) {
    const now = new Date();
    query.dob = {};
    // dob is stored as a date — older dob means higher age
    if (minAge && Number.isFinite(parseInt(minAge, 10))) {
      const maxDob = new Date(now);
      maxDob.setFullYear(maxDob.getFullYear() - parseInt(minAge, 10));
      query.dob.$lte = maxDob;
    }
    if (maxAge && Number.isFinite(parseInt(maxAge, 10))) {
      const minDob = new Date(now);
      minDob.setFullYear(minDob.getFullYear() - parseInt(maxAge, 10) - 1);
      query.dob.$gte = minDob;
    }
    if (!Object.keys(query.dob).length) delete query.dob;
  }

  if (verified === '1' || verified === true) query.is_verified = 1;
  if (verified === '0' || verified === false) query.is_verified = 0;

  if (blocked === '1' || blocked === true) query.is_block = 1;
  if (blocked === '0' || blocked === false) query.is_block = 0;

  if (platform && ['mobile', 'web'].includes(platform)) query.last_login_platform = platform;

  return query;
}

module.exports = { buildBroadcastQuery };
