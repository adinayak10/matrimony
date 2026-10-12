'use strict';
/**
 * tools/cleanup/lowercase-emails.js (A8.8) — must run BEFORE A3 goes live
 * (services/firebaseAuth.js looks users up by lowercased email).
 *
 * Aborts (exit 1) when two users would collide case-insensitively; otherwise
 * $set email: lower for every user whose email has uppercase characters.
 * Idempotent.
 *
 *   node tools/cleanup/lowercase-emails.js
 *   node tools/cleanup/lowercase-emails.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const User = require('../../models/User');

g.run(async ({ apply }) => {
  const users = await User.find({ email: { $type: 'string', $ne: '' } })
    .select('_id email')
    .lean();

  const byLower = new Map();
  const collisions = [];
  for (const u of users) {
    const lower = u.email.trim().toLowerCase();
    if (byLower.has(lower)) collisions.push([byLower.get(lower), u]);
    else byLower.set(lower, u);
  }
  if (collisions.length) {
    for (const [a, b] of collisions) {
      // eslint-disable-next-line no-console
      console.error(`COLLISION: ${a._id} <${a.email}>  vs  ${b._id} <${b.email}>`);
    }
    throw new Error(`${collisions.length} case-insensitive email collision(s); resolve manually first`);
  }

  const toFix = users.filter((u) => u.email !== u.email.trim().toLowerCase());
  let modified = 0;
  for (const u of toFix) {
    // eslint-disable-next-line no-console
    console.log(`${apply ? 'fix' : 'would fix'} ${u._id}: ${u.email} -> ${u.email.trim().toLowerCase()}`);
    if (apply) {
      const r = await User.updateOne({ _id: u._id }, { $set: { email: u.email.trim().toLowerCase() } });
      modified += r.modifiedCount || 0;
    }
  }
  // eslint-disable-next-line no-console
  console.log({ usersWithEmail: users.length, needingLowercase: toFix.length, modified, applied: apply });
});
