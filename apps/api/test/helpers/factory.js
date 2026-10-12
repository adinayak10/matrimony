'use strict';
/**
 * test/helpers/factory.js — fixtures for the API suites (A9.2).
 *
 *   makeUser({ gender, gotra, motherGotra, settings, is_block, ... })
 *   tokenFor(user, { tv, expiresIn })   signs with the test JWT_SECRET (HS256,
 *                                        payload {_id, email, tv} like A2.3)
 *   makeBlock(a, b)                      Block row a -> b
 *   makeRoom(a, b, status)               1:1 ChatRoom (participants sorted,
 *                                        pairKey set when the schema has it)
 *   makeRequest(a, b, status)            FriendShipRequest a -> b
 *   makePhoto(user, overrides)           UserPhoto row
 *   makeVisit(visitor, visited)          RecentVisitor row
 *   oid()                                fresh ObjectId
 *
 * Requires are lazy (see harness.js). Always require harness.js first so
 * NODE_ENV/JWT_SECRET are set before config/env.js loads.
 */
require('./harness');

let counter = 0;

function mongoose() {
  return require('mongoose');
}

function oid() {
  return new (mongoose().Types.ObjectId)();
}

function model(name) {
  // models register themselves on require; map friendly names -> files
  const files = {
    User: '../../models/User',
    Block: '../../models/Block',
    ChatRoom: '../../models/ChatRoom',
    FriendShipRequest: '../../models/FriendShipRequest',
    UserPhoto: '../../models/UserPhoto',
    RecentVisitor: '../../models/RecentVisitor',
    Message: '../../models/Message',
    Setting: '../../models/settings',
  };
  return require(files[name]);
}

async function makeUser(overrides = {}) {
  const User = model('User');
  const n = ++counter;
  const { motherGotra, ...rest } = overrides;
  const doc = {
    login_type: 2,
    email: `user${n}_${Date.now()}@test.local`,
    full_name: `Test Person ${n}`,
    gender: 'Male',
    dob: new Date(Date.now() - 28 * 365.25 * 24 * 3600 * 1000),
    height: 170,
    maritalStatus: 'Single',
    is_block: 0,
    is_verified: 1,
    last_login_platform: 'mobile',
    coordinates: { type: 'Point', coordinates: [78.4867, 17.385] },
    ...rest,
  };
  if (motherGotra !== undefined) {
    doc.family = { ...(doc.family || {}), motherGotra };
  }
  const user = await User.create(doc);
  return user;
}

function tokenFor(user, { tv, expiresIn = '7d' } = {}) {
  const jwt = require('jsonwebtoken');
  const { JWT_SECRET } = require('../../config/env');
  const id = user && user._id ? user._id : user;
  const payload = {
    _id: String(id),
    email: user && user.email ? user.email : undefined,
    tv: tv !== undefined ? tv : (user && user.tokenVersion) || 0,
  };
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function makeBlock(a, b) {
  const Block = model('Block');
  return Block.create({ blocker: a._id || a, blocked: b._id || b });
}

async function makeRoom(a, b, status = 'accepted') {
  const ChatRoom = model('ChatRoom');
  const ids = [String(a._id || a), String(b._id || b)].sort();
  const doc = { participants: ids, isGroup: false, status };
  if (ChatRoom.schema.path('pairKey')) doc.pairKey = ids.join(':');
  if (ChatRoom.schema.path('initiatedBy')) doc.initiatedBy = ids[0];
  return ChatRoom.create(doc);
}

async function makeRequest(a, b, status = 'pending') {
  const FriendShipRequest = model('FriendShipRequest');
  const doc = { requester: a._id || a, recipient: b._id || b, status };
  if (FriendShipRequest.schema.path('pairKey')) {
    doc.pairKey = [String(doc.requester), String(doc.recipient)].sort().join(':');
  }
  return FriendShipRequest.create(doc);
}

async function makePhoto(user, overrides = {}) {
  const UserPhoto = model('UserPhoto');
  return UserPhoto.create({
    userId: user._id || user,
    imageUrl: `uploads/profile_images/${oid()}.jpg`,
    moderationStatus: 'approved',
    ...overrides,
  });
}

async function makeVisit(visitor, visited) {
  const RecentVisitor = model('RecentVisitor');
  return RecentVisitor.create({ visitor: visitor._id || visitor, visited: visited._id || visited });
}

async function makeMessage(room, sender, receiver, content = 'hello') {
  const Message = model('Message');
  return Message.create({ room: room._id || room, sender: sender._id || sender, receiver: receiver._id || receiver, content });
}

async function ensureSettings(overrides = {}) {
  const Setting = model('Setting');
  const existing = await Setting.findOne().sort({ _id: 1 });
  if (existing) {
    Object.assign(existing, overrides);
    await existing.save();
    return existing;
  }
  return Setting.create({ appName: 'BanjaraMatch', ...overrides });
}

module.exports = {
  oid,
  makeUser,
  tokenFor,
  bearer,
  makeBlock,
  makeRoom,
  makeRequest,
  makePhoto,
  makeVisit,
  makeMessage,
  ensureSettings,
};
