'use strict';
/**
 * services/userCascade.js — cascadeDeleteUser(userId, opts) (A6.12).
 *
 * Built from tools/deleteUsers.js:80-238 with the field names corrected
 * against apps/api/models/*.js:
 *   UserPhoto                 { userId }            (was { user })
 *   SearchLog                 searcher | target     (was { userId })
 *   ReportStatus              reporter | reportedUser
 *   RemainingProfileImageView viewer | profileOwner
 *   Notification              fromUser | toUser     (was sender/receiver)
 *   FriendShipRequest         requester | recipient
 *   RoomUser                  { user_id }           (was { userId })
 *   Room                      { admin_id }          (was { participants })
 *   SavedNotification         my_user_id | user_id  (was { userId })
 *   CallLog                   caller | callee       (new)
 *
 * Files: only paths that resolve INSIDE the uploads dir are unlinked
 * (User.profile, User.background_image, UserPhoto.imageUrl — stored as
 * 'uploads/profile_images/<name>' by multer). Missing files are ignored.
 *
 * Reused by UserController.deleteUser (self) and admin/userController.deleteUser.
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const User = require('../models/User');
const UserPhoto = require('../models/UserPhoto');
const FriendShipRequest = require('../models/FriendShipRequest');
const Message = require('../models/Message');
const ChatRoom = require('../models/ChatRoom');
const Shortlist = require('../models/ShortList');
const Block = require('../models/Block');
const Notification = require('../models/Notification');
const SavedNotification = require('../models/SavedNotification');
const ActivityLog = require('../models/ActivityLog');
const UserReport = require('../models/UserReport');
const ReportStatus = require('../models/ReportStatus');
const RecentVisitor = require('../models/RecentVisitor');
const SearchLog = require('../models/SearchLog');
const RemainingProfileImageView = require('../models/RemainingProfileImageView');
const ProfilePicRequest = require('../models/ProfilePicRequest');
const ChatIntentLog = require('../models/ChatIntentLog');
const Room = require('../models/Room');
const RoomUser = require('../models/RoomUser');
const SecondChanceQueue = require('../models/SecondChanceQueue');
const Follow = require('../models/Follow');
const CallLog = require('../models/CallLog');
require('../models/IceBreakerGame'); // registers 'IceBreakerGame'

const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');

/**
 * Resolve a stored image reference to an absolute path inside uploadsDir, or
 * null when it points elsewhere (absolute URLs, traversal, other dirs).
 */
function resolveUploadPath(value, uploadsDir = DEFAULT_UPLOADS_DIR) {
  if (!value || typeof value !== 'string') return null;
  let rel = value.trim().replace(/\\/g, '/');
  // strip an origin if a full URL was stored
  rel = rel.replace(/^https?:\/\/[^/]+/i, '');
  rel = rel.replace(/^\/+/, '');
  if (rel.startsWith('uploads/')) rel = rel.slice('uploads/'.length);
  if (!rel || rel.includes('\0')) return null;
  const root = path.resolve(uploadsDir);
  const abs = path.resolve(root, rel);
  if (abs !== root && abs.startsWith(root + path.sep)) return abs;
  return null;
}

async function unlinkQuiet(abs) {
  try {
    await fs.promises.unlink(abs);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    // eslint-disable-next-line no-console
    console.warn('[userCascade] unlink failed:', abs, err.message);
    return false;
  }
}

async function cascadeDeleteUser(userId, { unlinkFiles = true, uploadsDir = DEFAULT_UPLOADS_DIR, dryRun = false } = {}) {
  if (!mongoose.isValidObjectId(userId)) {
    const err = new Error('Invalid user id');
    err.code = 'INVALID_ID';
    throw err;
  }
  const id = new mongoose.Types.ObjectId(String(userId));
  const user = await User.findById(id).select('_id profile background_image full_name email').lean();
  if (!user) return { found: false, counts: {}, files: { unlinked: 0, skipped: 0 } };

  const photos = await UserPhoto.find({ userId: id }).select('imageUrl').lean();
  const fileRefs = [user.profile, user.background_image, ...photos.map((p) => p.imageUrl)].filter(Boolean);

  const ops = [
    ['userPhotos', () => UserPhoto.deleteMany({ userId: id })],
    ['friendshipRequests', () => FriendShipRequest.deleteMany({ $or: [{ requester: id }, { recipient: id }] })],
    ['messages', () => Message.deleteMany({ $or: [{ sender: id }, { receiver: id }] })],
    ['chatRooms', () => ChatRoom.deleteMany({ participants: id })],
    ['roomUsers', () => RoomUser.deleteMany({ $or: [{ user_id: id }, { invited_by: id }] })],
    ['rooms', () => Room.deleteMany({ admin_id: id })],
    ['shortlists', () => Shortlist.deleteMany({ $or: [{ userId: id }, { shortlistedUserId: id }] })],
    ['blocks', () => Block.deleteMany({ $or: [{ blocker: id }, { blocked: id }] })],
    ['notifications', () => Notification.deleteMany({ $or: [{ fromUser: id }, { toUser: id }] })],
    ['savedNotifications', () => SavedNotification.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] })],
    ['activityLogs', () => ActivityLog.deleteMany({ userId: id })],
    ['reports', () => UserReport.deleteMany({ $or: [{ reportedBy: id }, { reportedUser: id }] })],
    ['reportStatus', () => ReportStatus.deleteMany({ $or: [{ reporter: id }, { reportedUser: id }] })],
    ['visitors', () => RecentVisitor.deleteMany({ $or: [{ visitor: id }, { visited: id }] })],
    ['searchLogs', () => SearchLog.deleteMany({ $or: [{ searcher: id }, { target: id }] })],
    ['profileImageViews', () => RemainingProfileImageView.deleteMany({ $or: [{ viewer: id }, { profileOwner: id }] })],
    ['profilePicRequests', () => ProfilePicRequest.deleteMany({ $or: [{ requester: id }, { requestedUser: id }] })],
    ['chatIntentLogs', () => ChatIntentLog.deleteMany({ $or: [{ userId: id }, { targetUser: id }] })],
    ['secondChanceQueue', () => SecondChanceQueue.deleteMany({ $or: [{ userId: id }, { profileId: id }] })],
    ['follows', () => Follow.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] })],
    ['callLogs', () => CallLog.deleteMany({ $or: [{ caller: id }, { callee: id }] })],
    ['iceBreakerGames', () => mongoose.model('IceBreakerGame').deleteMany({ $or: [{ player1: id }, { player2: id }] })],
  ];

  const counts = {};
  if (dryRun) {
    for (const name of Object.keys(COUNTERS)) counts[name] = await countFor(name, id);
    counts.user = 1;
    return { found: true, dryRun: true, counts, files: { candidates: fileRefs.length } };
  }

  for (const [name, fn] of ops) {
    const r = await fn();
    counts[name] = r && typeof r.deletedCount === 'number' ? r.deletedCount : 0;
  }

  const pulled = await User.updateMany({ blocked: id }, { $pull: { blocked: id } });
  counts.blockedArraysUpdated = pulled.modifiedCount || 0;

  const removed = await User.deleteOne({ _id: id });
  counts.user = removed.deletedCount || 0;

  const files = { unlinked: 0, skipped: 0 };
  if (unlinkFiles) {
    const seen = new Set();
    for (const ref of fileRefs) {
      const abs = resolveUploadPath(ref, uploadsDir);
      if (!abs || seen.has(abs)) {
        if (!abs) files.skipped++;
        continue;
      }
      seen.add(abs);
      if (await unlinkQuiet(abs)) files.unlinked++;
    }
  }

  return { found: true, counts, files };
}

// dry-run counts (used by tools/cleanup/purge-fake-users.js)
const COUNTERS = {
  userPhotos: (id) => UserPhoto.countDocuments({ userId: id }),
  friendshipRequests: (id) => FriendShipRequest.countDocuments({ $or: [{ requester: id }, { recipient: id }] }),
  messages: (id) => Message.countDocuments({ $or: [{ sender: id }, { receiver: id }] }),
  chatRooms: (id) => ChatRoom.countDocuments({ participants: id }),
  roomUsers: (id) => RoomUser.countDocuments({ $or: [{ user_id: id }, { invited_by: id }] }),
  rooms: (id) => Room.countDocuments({ admin_id: id }),
  shortlists: (id) => Shortlist.countDocuments({ $or: [{ userId: id }, { shortlistedUserId: id }] }),
  blocks: (id) => Block.countDocuments({ $or: [{ blocker: id }, { blocked: id }] }),
  notifications: (id) => Notification.countDocuments({ $or: [{ fromUser: id }, { toUser: id }] }),
  savedNotifications: (id) => SavedNotification.countDocuments({ $or: [{ my_user_id: id }, { user_id: id }] }),
  activityLogs: (id) => ActivityLog.countDocuments({ userId: id }),
  reports: (id) => UserReport.countDocuments({ $or: [{ reportedBy: id }, { reportedUser: id }] }),
  reportStatus: (id) => ReportStatus.countDocuments({ $or: [{ reporter: id }, { reportedUser: id }] }),
  visitors: (id) => RecentVisitor.countDocuments({ $or: [{ visitor: id }, { visited: id }] }),
  searchLogs: (id) => SearchLog.countDocuments({ $or: [{ searcher: id }, { target: id }] }),
  profileImageViews: (id) => RemainingProfileImageView.countDocuments({ $or: [{ viewer: id }, { profileOwner: id }] }),
  profilePicRequests: (id) => ProfilePicRequest.countDocuments({ $or: [{ requester: id }, { requestedUser: id }] }),
  chatIntentLogs: (id) => ChatIntentLog.countDocuments({ $or: [{ userId: id }, { targetUser: id }] }),
  secondChanceQueue: (id) => SecondChanceQueue.countDocuments({ $or: [{ userId: id }, { profileId: id }] }),
  follows: (id) => Follow.countDocuments({ $or: [{ my_user_id: id }, { user_id: id }] }),
  callLogs: (id) => CallLog.countDocuments({ $or: [{ caller: id }, { callee: id }] }),
  iceBreakerGames: (id) => mongoose.model('IceBreakerGame').countDocuments({ $or: [{ player1: id }, { player2: id }] }),
};

async function countFor(name, id) {
  const fn = COUNTERS[name];
  return fn ? fn(id) : 0;
}

module.exports = { cascadeDeleteUser, resolveUploadPath, DEFAULT_UPLOADS_DIR };
