'use strict';
/**
 * tools/cleanup/dedupe-chat-rooms.js (A8.2)
 *
 * For every isGroup:false room with exactly two participants compute
 * pairKey = sorted ids joined with ':'. Duplicate keys: keep the oldest room,
 * move its messages (Message.updateMany({room: dup}, {room: keep})), delete
 * the dup. Backfill pairKey on every kept room. Idempotent.
 *
 * Run BEFORE the first boot with the ChatRoom.pairKey unique index.
 *
 *   node tools/cleanup/dedupe-chat-rooms.js                 (dry-run)
 *   node tools/cleanup/dedupe-chat-rooms.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const ChatRoom = require('../../models/ChatRoom');
const Message = require('../../models/Message');

function pairKeyOf(participants) {
  return participants
    .map(String)
    .sort()
    .join(':');
}

g.run(async ({ apply }) => {
  const rooms = await ChatRoom.find({ isGroup: { $ne: true } })
    .select('_id participants pairKey createdAt')
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const byKey = new Map();
  let odd = 0;
  for (const r of rooms) {
    const parts = (r.participants || []).filter(Boolean);
    if (parts.length !== 2 || String(parts[0]) === String(parts[1])) {
      odd++;
      // eslint-disable-next-line no-console
      console.log(`skip room ${r._id}: ${parts.length} participant(s)`);
      continue;
    }
    const key = pairKeyOf(parts);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(r);
  }

  let dupRooms = 0;
  let movedMessages = 0;
  let backfilled = 0;
  for (const [key, list] of byKey) {
    const keep = list[0];
    for (const dup of list.slice(1)) {
      dupRooms++;
      const n = await Message.countDocuments({ room: dup._id });
      // eslint-disable-next-line no-console
      console.log(`dup ${key}: keep ${keep._id}, merge ${dup._id} (${n} messages)`);
      if (apply) {
        const mv = await Message.updateMany({ room: dup._id }, { $set: { room: keep._id } });
        movedMessages += mv.modifiedCount || 0;
        await ChatRoom.deleteOne({ _id: dup._id });
      } else {
        movedMessages += n;
      }
    }
    if (keep.pairKey !== key) {
      backfilled++;
      if (apply) await ChatRoom.updateOne({ _id: keep._id }, { $set: { pairKey: key } }, { strict: false });
    }
  }

  // eslint-disable-next-line no-console
  console.log({
    rooms: rooms.length,
    pairs: byKey.size,
    duplicateRooms: dupRooms,
    messagesMoved: movedMessages,
    pairKeyBackfilled: backfilled,
    skippedOddRooms: odd,
    applied: apply,
  });
});
