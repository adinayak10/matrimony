'use strict';
/**
 * socket.js — chat / presence / badge counts / call signalling (A5).
 *
 * Identity: socket.userId is set by the handshake middleware (A5.1, dual
 * mode) or by a legacy `join(userId)` while settings.security.legacySocketJoin
 * is on. Every event below reads the identity from socket.userId and ignores
 * sender ids in the payload (A5.5).
 */
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const User = require('./models/User');
const Notification = require('./models/Notification');
const ActivityLog = require('./models/ActivityLog');
const FriendShipRequest = require('./models/FriendShipRequest');
const CallLog = require('./models/CallLog');
const mongoose = require('mongoose');
const { verifyUserToken, tokenFromHandshake } = require('./services/verifyUserToken');
const { getSettings } = require('./services/settingsCache');
const blocks = require('./services/blocks');
const { countUnreadNotifications } = require('./services/notificationVisibility');
const { effectiveVisibility } = require('./services/profileSerializer');
const { ALLOW_MESSAGES_ENUM } = require('./enum/enum');

const lazyIO = new Proxy({}, {
  get(_, prop) {
    if (!ioInstance) throw new Error('Socket.io not initialized');
    const v = ioInstance[prop];
    return typeof v === 'function' ? v.bind(ioInstance) : v;
  },
});
let ioInstance = null;
const onlineUsers = new Map(); // userId -> socket.id (last connection wins)

const MAX_MESSAGE_LENGTH = 2000;
const isId = (v) => mongoose.isValidObjectId(v);
const oid = (v) => new mongoose.Types.ObjectId(String(v));

/** Ids of everyone with an accepted FriendShipRequest with userId. */
async function acceptedConnectionIds(userId) {
  const rows = await FriendShipRequest.find({
    status: 'accepted',
    $or: [{ requester: userId }, { recipient: userId }],
  })
    .select('requester recipient')
    .lean();
  return rows.map((r) => (String(r.requester) === String(userId) ? String(r.recipient) : String(r.requester)));
}

/** Presence (A5.2): only accepted connections hear user_online/user_offline. */
async function emitToConnections(io, userId, event, payload) {
  const ids = await acceptedConnectionIds(userId);
  for (const id of ids) {
    if (await blocks.isBlockedEither(userId, id)) continue;
    io.to(id).emit(event, payload);
  }
}

/** Unread accepted-room count for a user (one aggregate instead of N queries). */
async function unreadRoomCount(userId) {
  const rooms = await ChatRoom.find({ participants: userId, status: 'accepted' }).select('_id').lean();
  if (!rooms.length) return 0;
  const agg = await Message.aggregate([
    { $match: { room: { $in: rooms.map((r) => r._id) }, receiver: oid(userId), status: { $in: ['sent', 'delivered'] } } },
    { $group: { _id: '$room' } },
    { $count: 'n' },
  ]);
  return (agg[0] && agg[0].n) || 0;
}

async function emitUnreadRoomCount(io, userId) {
  const socketId = onlineUsers.get(String(userId));
  if (!socketId) return;
  io.to(socketId).emit('unread_chatroom_count_update', { total: await unreadRoomCount(userId) });
}

/* ─── call helpers (feature expansion A5) ─────────────────────────────── */

// Tests shorten ringTimeoutMs; production keeps 45 s.
const callConfig = { ringTimeoutMs: 45 * 1000, busyWindowMs: 2 * 60 * 1000 };
const ringTimers = new Map(); // callId -> Timeout

// lazy: services/push requires firebase-admin
function pushService() {
  return require('./services/push');
}

function emitTo(userId, event, payload) {
  if (ioInstance) ioInstance.to(String(userId)).emit(event, payload);
}

/** Callee already ringing or in a call (as either side) within the busy window. */
async function isBusy(userId) {
  const since = new Date(Date.now() - callConfig.busyWindowMs);
  return !!(await CallLog.exists({
    $or: [{ caller: userId }, { callee: userId }],
    status: { $in: ['ringing', 'accepted'] },
    updatedAt: { $gte: since },
  }));
}

function clearRingTimeout(callId) {
  const key = String(callId);
  const t = ringTimers.get(key);
  if (t) clearTimeout(t);
  ringTimers.delete(key);
}

function armRingTimeout(callId) {
  clearRingTimeout(callId);
  const key = String(callId);
  const t = setTimeout(() => {
    ringTimers.delete(key);
    timeoutCall(key).catch((e) => console.error('[socket] call timeout failed:', e && e.message));
  }, callConfig.ringTimeoutMs);
  if (typeof t.unref === 'function') t.unref();
  ringTimers.set(key, t);
}

/** Notification 'missed_call' for the callee, plus a push when they are not connected. */
async function recordMissedCall(call, callerName, { pushToCallee = true } = {}) {
  try {
    let name = callerName;
    if (!name) {
      const caller = await User.findById(call.caller).select('full_name').lean();
      name = (caller && caller.full_name) || 'Someone';
    }
    const text = `Missed ${call.callType === 'video' ? 'video' : 'voice'} call from ${name}`;
    await Notification.create({
      type: 'missed_call',
      fromUser: call.caller,
      toUser: call.callee,
      content: text,
      data: { callId: String(call._id), roomId: String(call.chatRoom), callType: call.callType },
    });
    if (pushToCallee && !onlineUsers.get(String(call.callee))) {
      await pushService().sendToUser(call.callee, 'Missed call', text, {
        type: 'missed_call',
        callId: String(call._id),
        roomId: String(call.chatRoom),
        userId: String(call.caller),
        callType: call.callType,
      });
    }
  } catch (e) {
    console.error('[socket] missed call record failed:', e && e.message);
  }
}

async function timeoutCall(callId) {
  const call = await CallLog.findOneAndUpdate(
    { _id: callId, status: 'ringing' },
    { $set: { status: 'missed', endedAt: new Date() } },
    { new: true }
  );
  if (!call) return;
  const payload = { callId: call._id };
  emitTo(call.caller, 'call_timeout', payload);
  emitTo(call.callee, 'call_timeout', payload);
  await recordMissedCall(call);
}

/** A user's last socket went away: their ringing calls end (either side). */
async function endRingingCallsOf(userId) {
  const calls = await CallLog.find({ status: 'ringing', $or: [{ caller: userId }, { callee: userId }] });
  for (const call of calls) {
    clearRingTimeout(call._id);
    const byCaller = String(call.caller) === String(userId);
    const updated = await CallLog.findOneAndUpdate(
      { _id: call._id, status: 'ringing' },
      { $set: { status: 'missed', endedAt: new Date() } },
      { new: true }
    );
    if (!updated) continue;
    emitTo(byCaller ? call.callee : call.caller, 'call_end', { callId: call._id, reason: 'disconnected' });
    await recordMissedCall(updated);
  }
}

module.exports = {
  setupSocket: (io) => {
    ioInstance = io;

    // A5.1 handshake auth, dual mode (integrator conflict #2):
    // auth.token -> Authorization header -> bm_session|token cookie.
    // While settings.security.legacySocketJoin !== false an invalid or
    // missing token falls back to the legacy `join(userId)` branch; in
    // strict mode the connection is rejected with AUTH_REQUIRED.
    io.use(async (socket, next) => {
      try {
        const token = tokenFromHandshake(socket.handshake);
        const s = await getSettings();
        const legacy = !s || !s.security || s.security.legacySocketJoin !== false;
        if (token) {
          try {
            const { user } = await verifyUserToken(token);
            socket.userId = String(user._id);
            socket.join(socket.userId);
            return next();
          } catch (e) {
            if (!legacy) return next(new Error(e.code || 'AUTH_REQUIRED'));
            console.warn('socket_bad_token', e.code);
          }
        }
        if (legacy) {
          socket.legacy = true;
          return next();
        }
        return next(new Error('AUTH_REQUIRED'));
      } catch (err) {
        return next(new Error('AUTH_ERROR'));
      }
    });

    io.on('connection', (socket) => {
      // A5.4: every handler runs inside safe() so a thrown error never
      // becomes an unhandledRejection; the client gets error_event instead.
      const safe = (name, fn) => async (...a) => {
        try {
          await fn(...a);
        } catch (e) {
          console.error('[socket]', name, e && e.message);
          try { socket.emit('error_event', { event: name }); } catch (_) { /* ignore */ }
        }
      };
      const on = (name, fn) => socket.on(name, safe(name, fn));
      const me = () => socket.userId || null;

      // Bind the socket once the identity is known (token or legacy join)
      const bindOnline = async (userId) => {
        onlineUsers.set(userId, socket.id);
        socket.join(userId);

        await User.updateOne({ _id: userId }, { $set: { isOnline: true, lastSeen: null } });

        const totalUnread = await countUnreadNotifications(userId);
        io.to(socket.id).emit('notification_count', { total: totalUnread });

        await ActivityLog.create({ userId, timestamp: new Date() });

        // Presence only to accepted connections (A5.2)
        await emitToConnections(io, userId, 'user_online', { userId });

        // Deliver undelivered messages
        const undeliveredMessages = await Message.find({ receiver: userId, status: 'sent' }).sort({ createdAt: 1 }).limit(200);
        for (const msg of undeliveredMessages) {
          io.to(socket.id).emit('receive_message', msg);
          await Message.updateOne({ _id: msg._id }, { $set: { status: 'delivered' } });
          const senderSocketId = onlineUsers.get(String(msg.sender));
          if (senderSocketId) io.to(senderSocketId).emit('message_delivered', { messageId: msg._id });
        }
      };

      // Token-authenticated sockets are online as soon as they connect
      if (socket.userId) {
        safe('bind', bindOnline)(socket.userId);
      }

      on('join', async (payloadUserId) => {
        let userId;
        // Identity: the verified handshake token wins; the payload is only
        // honoured for legacy (no-token) connections while dual mode is on.
        if (socket.userId) {
          userId = socket.userId;
          if (onlineUsers.get(userId) === socket.id) {
            // already bound at connect: just refresh the badge for old clients
            const totalUnread = await countUnreadNotifications(userId);
            io.to(socket.id).emit('notification_count', { total: totalUnread });
            return;
          }
        } else if (socket.legacy && isId(payloadUserId)) {
          userId = String(payloadUserId);
          const user = await User.findById(userId).select('_id is_block').lean();
          if (!user || user.is_block === 1) return;
          socket.userId = userId;
          console.info('legacy_socket_join');
        } else {
          return;
        }
        await bindOnline(userId);
        // The O(N) high_match_online loop that used to run here was deleted (A5.2).
      });

      // ─── send_message (A5.5) ────────────────────────────────────────────
      on('send_message', async (data) => {
        const senderId = me();
        if (!senderId) return;
        const { receiverId, type = 'text' } = data || {};
        let content = data && typeof data.content === 'string' ? data.content.trim() : '';
        const msgType = typeof type === 'string' && type.length <= 20 ? type : 'text';

        if (!isId(receiverId) || String(receiverId) === senderId) return;
        if (!content && msgType === 'text') return;
        if (content.length > MAX_MESSAGE_LENGTH) {
          return socket.emit('message_blocked', { reason: 'too_long', max: MAX_MESSAGE_LENGTH });
        }
        if (detectSensitiveContentAdvanced(content)) {
          return socket.emit('message_blocked', { reason: 'contact_info' });
        }

        // Blocks both ways and banned receiver -> silently dropped
        if (await blocks.isBlockedEither(senderId, receiverId)) {
          return socket.emit('message_blocked', { reason: 'blocked' });
        }
        const receiver = await User.findById(receiverId).select('_id is_block settings').lean();
        if (!receiver || receiver.is_block === 1) {
          return socket.emit('message_blocked', { reason: 'unavailable' });
        }

        // Room: accepted -> ok; otherwise only when the receiver allows
        // messages from everyone (a new pending room, initiated by the sender)
        const pairKey = ChatRoom.pairKeyOf(senderId, receiverId);
        let room = await ChatRoom.findOne({ $or: [{ pairKey }, { participants: { $all: [senderId, receiverId], $size: 2 }, isGroup: false }] });

        if (!room || room.status !== 'accepted') {
          const allow = effectiveVisibility(receiver.settings && receiver.settings.allowMessages, ALLOW_MESSAGES_ENUM, 'onlyAccepted');
          if (allow !== 'everyone') {
            return socket.emit('message_blocked', { reason: room && room.status === 'declined' ? 'declined' : 'not_connected' });
          }
          if (room && room.status === 'declined') {
            return socket.emit('message_blocked', { reason: 'declined' });
          }
          if (!room) {
            try {
              room = await ChatRoom.create({
                participants: [senderId, receiverId].sort(),
                isGroup: false,
                status: 'pending',
                pairKey,
                initiatedBy: senderId,
              });
            } catch (e) {
              if (e.code !== 11000) throw e;
              room = await ChatRoom.findOne({ pairKey });
              if (!room) throw e;
            }
          }
        }

        // A deleted (hidden) room comes back for both when a message arrives
        if (!room.pairKey || (room.hiddenFor && room.hiddenFor.length)) {
          await ChatRoom.updateOne({ _id: room._id }, { $set: { pairKey: room.pairKey || pairKey, hiddenFor: [] } });
        }

        const message = await Message.create({
          room: room._id,
          sender: senderId,
          receiver: receiverId,
          content,
          msgType,
          status: 'sent',
        });
        await message.populate('sender', 'full_name profile');

        // ACK to sender
        io.to(socket.id).emit('message_sent', message);

        // Deliver to receiver if online
        const receiverSocket = onlineUsers.get(String(receiverId));
        if (receiverSocket) {
          io.to(receiverSocket).emit('receive_message', message);
          await Message.updateOne({ _id: message._id }, { $set: { status: 'delivered' } });
          io.to(socket.id).emit('message_delivered', { messageId: message._id });
          if (room.status === 'accepted') await emitUnreadRoomCount(io, receiverId);
          else io.to(receiverSocket).emit('chat_request', { roomId: room._id, fromUserId: senderId });
        }
      });

      // ─── mark_seen (A5.5): receiver = socket.userId, must be a participant ──
      on('mark_seen', async (data) => {
        const receiverId = me();
        const roomId = data && data.roomId;
        if (!receiverId || !isId(roomId)) return;

        const room = await ChatRoom.findOne({ _id: roomId, participants: receiverId }).select('_id').lean();
        if (!room) return;

        const toMark = await Message.find({ room: roomId, receiver: receiverId, status: { $ne: 'seen' } })
          .select('_id sender')
          .lean();
        if (toMark.length) {
          await Message.updateMany({ _id: { $in: toMark.map((m) => m._id) } }, { $set: { status: 'seen', isRead: true } });
          for (const msg of toMark) {
            const senderSocket = onlineUsers.get(String(msg.sender));
            if (senderSocket) io.to(senderSocket).emit('message_seen', { messageId: msg._id, roomId });
          }
        }
        await emitUnreadRoomCount(io, receiverId);
      });

      // ─── typing (A5.5): only between accepted, non-blocked rooms ─────────
      const typingRelay = (event) => async (data) => {
        const fromUserId = me();
        const toUserId = data && data.toUserId;
        if (!fromUserId || !isId(toUserId) || String(toUserId) === fromUserId) return;
        const toSocket = onlineUsers.get(String(toUserId));
        if (!toSocket) return;
        const room = await ChatRoom.exists({
          participants: { $all: [fromUserId, toUserId], $size: 2 },
          status: 'accepted',
        });
        if (!room) return;
        if (await blocks.isBlockedEither(fromUserId, toUserId)) return;
        io.to(toSocket).emit(event, { fromUserId });
      };
      on('typing', typingRelay('user_typing'));
      on('stop_typing', typingRelay('user_stop_typing'));

      // ─── accept_chat / decline_chat (A5.5): pending room, participant, not the initiator ──
      const decideChat = (status, event, notifType, text) => async (data) => {
        const userId = me();
        const roomId = data && data.roomId;
        if (!userId || !isId(roomId)) return;

        const room = await ChatRoom.findOneAndUpdate(
          { _id: roomId, status: 'pending', participants: userId, initiatedBy: { $ne: oid(userId) } },
          { $set: { status } },
          { new: true }
        );
        if (!room) return;

        const others = room.participants.filter((u) => String(u) !== userId);
        for (const other of others) {
          const userSocket = onlineUsers.get(String(other));
          if (userSocket) io.to(userSocket).emit(event, { roomId });
          await Notification.create({ type: notifType, fromUser: userId, toUser: other, content: text, data: { roomId } });
        }
        if (status === 'accepted') await emitUnreadRoomCount(io, userId);
      };
      on('accept_chat', decideChat('accepted', 'chat_accepted', 'chat_accepted', 'Your chat request has been accepted.'));
      on('decline_chat', decideChat('declined', 'chat_declined', 'chat_declined', 'Your chat request has been declined.'));

      // ─── badge counts (A5.5): always for socket.userId ────────────────────
      on('get_notification_count', async () => {
        const userId = me();
        if (!userId) return;
        const total = await countUnreadNotifications(userId);
        io.to(socket.id).emit('notification_count', { total });
      });

      on('get_match_request_count', async () => {
        const userId = me();
        if (!userId) return;
        const total = await FriendShipRequest.countDocuments({ recipient: userId, status: 'pending' });
        io.to(socket.id).emit('new_match_request', { total });
      });

      // Unread chat count by unique rooms ($roomId -> $room, cast ObjectId)
      on('get_unread_chat_count', async () => {
        const userId = me();
        if (!userId) return;
        const rooms = await Message.aggregate([
          { $match: { receiver: oid(userId), status: { $in: ['sent', 'delivered'] } } },
          { $group: { _id: '$room' } },
        ]);
        io.to(socket.id).emit('chat_update', { total: rooms.length });
      });

      on('get_unread_chatroom_count', async () => {
        const userId = me();
        if (!userId) return;
        io.to(socket.id).emit('unread_chatroom_count_update', { total: await unreadRoomCount(userId) });
      });

      // ─── Voice/video call signalling (Agora) ──────────────────────────────
      // Only between users with an ACCEPTED ChatRoom, never blocked, and every
      // follow-up event requires socket.userId ∈ {caller, callee} (A5.5).
      // Feature expansion A5: call_ringing to the caller, 45 s ring timeout
      // (call_timeout to both), busy check, push to an offline callee, and
      // missed_call notifications. See the helpers below setupSocket.
      on('call_invite', async (data) => {
        const fromUserId = me();
        const { toUserId, roomId, callType } = data || {};
        if (!fromUserId || !isId(toUserId) || !isId(roomId) || String(toUserId) === fromUserId) return;

        const notConnected = { reason: 'not_connected', message: 'Calls are only available between mutually accepted connections' };
        if (await blocks.isBlockedEither(fromUserId, toUserId)) {
          return io.to(socket.id).emit('call_failed', notConnected);
        }
        const room = await ChatRoom.findOne({ _id: roomId, status: 'accepted', participants: { $all: [fromUserId, toUserId] } });
        if (!room) {
          return io.to(socket.id).emit('call_failed', notConnected);
        }

        if (await isBusy(toUserId)) {
          return io.to(socket.id).emit('call_failed', { reason: 'busy', message: 'This member is on another call' });
        }

        const channelName = `call_${[fromUserId, String(toUserId)].sort().join('_')}_${Date.now()}`;
        const call = await CallLog.create({
          caller: fromUserId,
          callee: toUserId,
          chatRoom: roomId,
          channelName,
          callType: callType === 'video' ? 'video' : 'audio',
          status: 'ringing',
        });

        io.to(socket.id).emit('call_ringing', { callId: call._id, roomId, channelName, callType: call.callType });

        const fromUser = await User.findById(fromUserId).select('full_name profile').lean();
        const incoming = {
          callId: call._id,
          roomId,
          channelName,
          callType: call.callType,
          fromUserId,
          fromUserName: (fromUser && fromUser.full_name) || 'Someone',
          fromUserProfile: (fromUser && fromUser.profile) || null,
        };

        const calleeSocket = onlineUsers.get(String(toUserId));
        if (calleeSocket) {
          io.to(calleeSocket).emit('call_incoming', incoming);
        } else {
          // Offline: a high-priority data push lets the app show a full-screen
          // incoming call; the call keeps ringing until accept/reject/timeout.
          const pushed = await pushService().sendToUser(
            toUserId,
            `${incoming.fromUserName} is calling`,
            call.callType === 'video' ? 'Incoming video call' : 'Incoming voice call',
            { type: 'call', ...incoming, callId: String(call._id), roomId: String(roomId) }
          );
          if (!pushed || !pushed.ok) {
            const missed = await CallLog.findOneAndUpdate(
              { _id: call._id, status: 'ringing' },
              { $set: { status: 'missed', endedAt: new Date() } },
              { new: true }
            );
            if (missed) await recordMissedCall(missed, incoming.fromUserName, { pushToCallee: false });
            return io.to(socket.id).emit('call_failed', { reason: 'offline', callId: call._id, message: 'User is not online right now' });
          }
        }
        armRingTimeout(call._id);
      });

      const participantCall = async (callId, userId) => {
        if (!userId || !isId(callId)) return null;
        return CallLog.findOne({ _id: callId, $or: [{ caller: userId }, { callee: userId }] });
      };

      on('call_accept', async (data) => {
        const userId = me();
        const callId = data && data.callId;
        if (!userId || !isId(callId)) return;
        const call = await CallLog.findOneAndUpdate(
          { _id: callId, callee: userId, status: 'ringing' },
          { $set: { status: 'accepted', answeredAt: new Date() } },
          { new: true }
        );
        if (!call) return;
        clearRingTimeout(call._id);
        io.to(String(call.caller)).emit('call_accepted', { callId: call._id, channelName: call.channelName });
      });

      on('call_reject', async (data) => {
        const userId = me();
        const callId = data && data.callId;
        if (!userId || !isId(callId)) return;
        const call = await CallLog.findOneAndUpdate(
          { _id: callId, callee: userId, status: 'ringing' },
          { $set: { status: 'rejected', endedAt: new Date() } },
          { new: true }
        );
        if (!call) return;
        clearRingTimeout(call._id);
        io.to(String(call.caller)).emit('call_rejected', { callId: call._id });
      });

      on('call_end', async (data) => {
        const userId = me();
        const call = await participantCall(data && data.callId, userId);
        if (!call) return;
        clearRingTimeout(call._id);
        const wasRinging = call.status === 'ringing';
        const byCaller = String(call.caller) === userId;
        if (wasRinging) call.status = byCaller ? 'missed' : 'rejected'; // caller cancelled / callee declined
        else if (call.status === 'accepted') call.status = 'ended';
        if (!call.endedAt) call.endedAt = new Date();
        await call.save();
        if (wasRinging && byCaller) await recordMissedCall(call);
        const otherUserId = byCaller ? String(call.callee) : String(call.caller);
        io.to(otherUserId).emit('call_end', { callId: call._id });
      });

      on('disconnect', async () => {
        const userId = socket.userId;
        if (!userId) return;
        // Another connection of the same user may have replaced this one
        if (onlineUsers.get(userId) !== socket.id) return;
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.updateOne({ _id: userId }, { $set: { isOnline: false, lastSeen } });
        await emitToConnections(io, userId, 'user_offline', { userId, lastSeen });
        await endRingingCallsOf(userId);
      });
    });
  },
  // Controllers capture `io` at require time, before setupSocket() has run
  // (and tests never run it): hand out a lazy proxy that resolves the real
  // instance on first use instead of throwing at module load.
  getIO: () => ioInstance || lazyIO,
  onlineUsers,
  detectSensitiveContentAdvanced,
  acceptedConnectionIds,
  callConfig,
  _ringTimers: ringTimers,
};

/**
 * Contact-info detector (A5.5): word-boundary patterns so "Hawaii", "figure"
 * or "football" are delivered while "wa.me/…", "my ig", "fb me" are blocked.
 */
function detectSensitiveContentAdvanced(message) {
  if (!message || typeof message !== 'string') return false;

  const original = message.toLowerCase();
  const normalized = original
    .replace(/[\s\-_.]/g, '')
    .replace(/zero/g, '0').replace(/one/g, '1')
    .replace(/two/g, '2').replace(/three/g, '3')
    .replace(/four/g, '4').replace(/five/g, '5')
    .replace(/six/g, '6').replace(/seven/g, '7')
    .replace(/eight/g, '8').replace(/nine/g, '9');

  let score = 0;

  // 1. Phone number detection
  if (/(?:\+91)?\d{10,12}/.test(normalized)) score += 3;

  // 2. Email
  if (/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(original)) score += 3;

  // 3. Handle detection
  if (/(^|\s)[@#][a-z0-9_.]{3,}/.test(original)) score += 2;

  // 4. Link / platform shorthand (word-boundary, incl. obfuscated "insta dot com")
  if (/\b(insta|fb|t\.?me|wa\.?me|linkdin|linkedin|snap)\b\s*(dot|\.)\s*(com|me)\b/.test(original)) score += 3;
  if (/\bwa\.me\b|\bt\.me\b|https?:\/\/|\bwww\./.test(original)) score += 3;

  // 5. Keywords and app hints
  const behaviorHints = [
    'text me', 'ping me', 'call me', 'connect on', 'whatsapp',
    'my number', 'my insta', 'my handle', 'reach me', 'you know where',
    'blue app', 'green app', 'chat me', 'find me', 'message me',
  ];
  for (const hint of behaviorHints) {
    if (new RegExp(`\\b${hint.replace(/\s+/g, '\\s+')}\\b`).test(original)) score += 2;
  }

  // 6. Social platform code words (whole words only)
  const keywords = [
    'instagram', 'facebook', 'telegram', 'snapchat', 'linkedin', 'twitter',
    'ig', 'fb', 'wame', 'linkdin', 'discord', 'skype',
  ];
  for (const kw of keywords) {
    if (new RegExp(`\\b${kw}\\b`).test(original)) score += 3;
  }

  // 7. Emojis (📞, 📲, 📧, 💬)
  const emojiHints = ['📞', '📲', '📧', '💬', '🟦', '🟢', '📱'];
  for (const e of emojiHints) if (original.includes(e)) score += 2;

  // 8. Suspicious digit sequences even without +91
  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 8 && digits.length <= 12) score += 2;

  // 9. Spelling tricks ("watsapp", "t dot me")
  if (/\bt\s?dot\s?me\b|\bwatsapp\b|\blink\s?din\b|\big\s?dot\s?com\b/.test(original)) score += 2;

  return score >= 5;
}
