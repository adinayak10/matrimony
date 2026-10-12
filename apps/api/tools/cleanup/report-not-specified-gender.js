'use strict';
/**
 * tools/cleanup/report-not-specified-gender.js (A8.1) — READ ONLY.
 *
 * Lists users whose gender is 'Not specified' (or missing). Nothing is
 * changed: the server now returns empty match lists for them and the web
 * checkProfileCompletion / app missingFields route them to onboarding. The
 * owner may use the list for a broadcast email.
 *
 *   node tools/cleanup/report-not-specified-gender.js
 */
const g = require('../_guard');
const User = require('../../models/User');

g.run(
  async () => {
    const users = await User.find({ $or: [{ gender: 'Not specified' }, { gender: null }, { gender: { $exists: false } }] })
      .select('_id email phone full_name gender lastSeen updatedAt createdAt last_login_platform is_block')
      .sort({ lastSeen: -1, updatedAt: -1 })
      .lean();

    // eslint-disable-next-line no-console
    console.log(`users without a usable gender: ${users.length}`);
    for (const u of users) {
      const last = u.lastSeen || u.updatedAt || u.createdAt;
      // eslint-disable-next-line no-console
      console.log(
        [
          String(u._id),
          (u.email || u.phone || '-').padEnd(32),
          String(u.full_name || '-').slice(0, 24).padEnd(24),
          `platform=${u.last_login_platform || '-'}`,
          `blocked=${u.is_block || 0}`,
          `last=${last ? new Date(last).toISOString().slice(0, 10) : '-'}`,
        ].join('  ')
      );
    }
  },
  { writes: false }
);
