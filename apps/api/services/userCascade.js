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
 *   Verification              user (+ files in PRIVATE_UPLOADS_DIR/verification)
 *   SavedSearch               user
 *   SuccessStory              submittedBy (unpublished deleted, published unlinked), partnerUser (unlinked)
 *   AdminRecommendation       user | target
 *   PushJob                   targetUser (unlinked)
 *   BiodataDocument(Version)  user (+ photos in PRIVATE_UPLOADS_DIR/biodata)
 *
 * ChatIntentLog / SecondChanceQueue entries were dropped (2026-10): nothing
 * writes those collections and their jobs are no longer scheduled.
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
const Room = require('../models/Room');
const RoomUser = require('../models/RoomUser');
const Follow = require('../models/Follow');
const CallLog = require('../models/CallLog');
const Verification = require('../models/Verification');
const SavedSearch = require('../models/SavedSearch');
const SuccessStory = require('../models/SuccessStory');
const AdminRecommendation = require('../models/AdminRecommendation');
const PushJob = require('../models/PushJob');
const BiodataDocument = require('../models/BiodataDocument');
const BiodataDocumentVersion = require('../models/BiodataDocumentVersion');
// The Ice Breaker game was removed (2026-10); its old rows are still purged
// straight from the collection so a deleted account leaves nothing behind.
const iceBreakerGames = () => mongoose.connection.collection('icebreakergames');

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
    ['follows', () => Follow.deleteMany({ $or: [{ my_user_id: id }, { user_id: id }] })],
    ['callLogs', () => CallLog.deleteMany({ $or: [{ caller: id }, { callee: id }] })],
    ['iceBreakerGames', () => iceBreakerGames().deleteMany({ $or: [{ player1: id }, { player2: id }] })],
    // feature expansion (2026-10); verification files are unlinked below
    ['verifications', () => Verification.deleteMany({ user: id })],
    ['savedSearches', () => SavedSearch.deleteMany({ user: id })],
    // published stories stay public but lose the member link; unpublished ones go (photos unlinked with fileRefs)
    ['successStoriesUnlinked', () => SuccessStory.updateMany({ submittedBy: id, status: 'published' }, { $set: { submittedBy: null } })],
    ['successStoriesPartnerUnlinked', () => SuccessStory.updateMany({ partnerUser: id }, { $set: { partnerUser: null } })],
    ['successStories', () => SuccessStory.deleteMany({ submittedBy: id, status: { $ne: 'published' } })],
    ['adminRecommendations', () => AdminRecommendation.deleteMany({ $or: [{ user: id }, { target: id }] })],
    ['pushJobsUnlinked', () => PushJob.updateMany({ targetUser: id }, { $set: { targetUser: null } })],
    // biodata maker; private photo files are unlinked below
    ['biodataVersions', () => BiodataDocumentVersion.deleteMany({ user: id })],
    ['biodataDocuments', () => BiodataDocument.deleteMany({ user: id })],
  ];

  // Photos of the member's unpublished success stories are unlinked with the profile files
  const storyPhotos = await SuccessStory.find({ submittedBy: id, status: { $ne: 'published' }, photo: { $ne: null } }).select('photo').lean();
  for (const st of storyPhotos) if (st.photo) fileRefs.push(st.photo);

  // Verification documents live in PRIVATE_UPLOADS_DIR, not uploads/: collect before the rows go
  const verificationRows = await Verification.find({ user: id }).select('documentFiles selfieFile').lean();
  // Biodata photos too (PRIVATE_UPLOADS_DIR/biodata, basenames)
  const biodataPhotos = (await BiodataDocument.find({ user: id, 'photo.file': { $type: 'string' } }).select('photo.file').lean())
    .map((d) => d.photo && d.photo.file)
    .filter(Boolean);

  const counts = {};
  if (dryRun) {
    for (const name of Object.keys(COUNTERS)) counts[name] = await countFor(name, id);
    counts.user = 1;
    return { found: true, dryRun: true, counts, files: { candidates: fileRefs.length } };
  }

  for (const [name, fn] of ops) {
    const r = await fn();
    counts[name] = r && typeof r.deletedCount === 'number' ? r.deletedCount : (r && typeof r.modifiedCount === 'number' ? r.modifiedCount : 0);
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

  if (unlinkFiles && verificationRows.length) {
    // lazy: verificationService pulls in push/firebase
    // eslint-disable-next-line global-require
    const { removeFiles } = require('./verificationService');
    for (const row of verificationRows) files.unlinked += await removeFiles(row);
  }

  if (unlinkFiles && biodataPhotos.length) {
    // eslint-disable-next-line global-require
    const { removePhoto } = require('./biodataService');
    for (const name of biodataPhotos) if (await removePhoto(name)) files.unlinked++;
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
  follows: (id) => Follow.countDocuments({ $or: [{ my_user_id: id }, { user_id: id }] }),
  callLogs: (id) => CallLog.countDocuments({ $or: [{ caller: id }, { callee: id }] }),
  iceBreakerGames: (id) => iceBreakerGames().countDocuments({ $or: [{ player1: id }, { player2: id }] }),
  verifications: (id) => Verification.countDocuments({ user: id }),
  savedSearches: (id) => SavedSearch.countDocuments({ user: id }),
  successStories: (id) => SuccessStory.countDocuments({ submittedBy: id, status: { $ne: 'published' } }),
  adminRecommendations: (id) => AdminRecommendation.countDocuments({ $or: [{ user: id }, { target: id }] }),
  biodataVersions: (id) => BiodataDocumentVersion.countDocuments({ user: id }),
  biodataDocuments: (id) => BiodataDocument.countDocuments({ user: id }),
};

async function countFor(name, id) {
  const fn = COUNTERS[name];
  return fn ? fn(id) : 0;
}

module.exports = { cascadeDeleteUser, resolveUploadPath, DEFAULT_UPLOADS_DIR };
