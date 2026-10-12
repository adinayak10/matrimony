'use strict';
/**
 * tools/cleanup/purge-fake-users.js (A8.5)
 *
 * Users with is_fake:true (legacy /user/fake-batch) or full_name matching
 * /^Test User \d+$/ that have NO messages and NO interest requests are
 * cascade-deleted through services/userCascade.js (0 today; keep the tool).
 *
 *   node tools/cleanup/purge-fake-users.js
 *   node tools/cleanup/purge-fake-users.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const User = require('../../models/User');
const Message = require('../../models/Message');
const FriendShipRequest = require('../../models/FriendShipRequest');
const { cascadeDeleteUser } = require('../../services/userCascade');

g.run(async ({ apply }) => {
  const candidates = await User.find({ $or: [{ is_fake: true }, { full_name: /^Test User \d+$/ }] })
    .setOptions({ strictQuery: false })
    .select('_id full_name email createdAt')
    .lean();

  let deleted = 0;
  let kept = 0;
  for (const u of candidates) {
    const [msgs, reqs] = await Promise.all([
      Message.countDocuments({ $or: [{ sender: u._id }, { receiver: u._id }] }),
      FriendShipRequest.countDocuments({ $or: [{ requester: u._id }, { recipient: u._id }] }),
    ]);
    if (msgs || reqs) {
      kept++;
      // eslint-disable-next-line no-console
      console.log(`keep ${u._id} ${u.full_name}: ${msgs} messages, ${reqs} requests`);
      continue;
    }
    // eslint-disable-next-line no-console
    console.log(`${apply ? 'delete' : 'would delete'} ${u._id} ${u.full_name} (${u.email || '-'})`);
    const r = await cascadeDeleteUser(u._id, { unlinkFiles: true, dryRun: !apply });
    if (r.found) deleted++;
  }

  // eslint-disable-next-line no-console
  console.log({ candidates: candidates.length, deleted, keptWithActivity: kept, applied: apply });
});
