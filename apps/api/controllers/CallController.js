const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const ChatRoom = require('../models/ChatRoom');
const CallLog = require('../models/CallLog');

const TOKEN_TTL_SECONDS = 3600; // 1 hour

/**
 * POST /api/calls/token
 * Body: { channelName, user_id? }
 *
 * Mints an Agora RTC token for a call between two users. Requires
 * AGORA_APP_ID/AGORA_APP_CERTIFICATE env vars.
 *
 * Gate: the channel must belong to a ringing/accepted CallLog the caller is
 * part of, and the two users must have an ACCEPTED ChatRoom. `user_id` (the
 * other party) is optional since the feature-expansion clients send only
 * channelName; when present it must match the call's other participant.
 */
exports.generateCallToken = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { resolveCaller } = require('../middleware/identity');
    const my_user_id = resolveCaller(req); // token identity (A1.2)
    const { user_id, channelName } = req.body || {};

    if (!my_user_id || !channelName || typeof channelName !== 'string' || channelName.length > 128) {
      return res.status(400).json({ status: false, message: 'channelName is required' });
    }
    if (user_id !== undefined && user_id !== null && user_id !== '' && (!mongoose.isValidObjectId(user_id) || String(user_id) === my_user_id)) {
      return res.status(400).json({ status: false, message: 'Invalid user_id' });
    }

    // The channel must belong to a live call the caller is part of (A4.6)
    const callQuery = {
      channelName,
      status: { $in: ['ringing', 'accepted'] },
      $or: user_id
        ? [{ caller: my_user_id, callee: user_id }, { caller: user_id, callee: my_user_id }]
        : [{ caller: my_user_id }, { callee: my_user_id }],
    };
    const call = await CallLog.findOne(callQuery).select('_id caller callee').lean();
    if (!call) {
      return res.status(403).json({ status: false, message: 'No active call on this channel' });
    }
    const otherId = String(call.caller) === String(my_user_id) ? call.callee : call.caller;

    const room = await ChatRoom.findOne({
      participants: { $all: [my_user_id, otherId] },
      status: 'accepted',
    }).select('_id').lean();

    if (!room) {
      return res.status(403).json({ status: false, message: 'Calls are only available between mutually accepted connections' });
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
      console.error('[Calls] AGORA_APP_ID / AGORA_APP_CERTIFICATE not configured');
      return res.status(503).json({ status: false, message: 'Calling is not configured on this server yet' });
    }

    const uid = 0; // let Agora assign a session UID; we identify users via our own signaling
    const role = RtcRole.PUBLISHER;
    const expireTs = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

    const token = RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, expireTs);

    return res.json({
      status: true,
      message: 'Token generated',
      data: { appId, channelName, token, uid, expiresAt: expireTs },
    });
  } catch (err) {
    console.error('[Calls] Token generation error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

function durationSeconds(call) {
  if (!call || !call.endedAt) return 0;
  if (call.status !== 'ended') return 0;
  const from = call.answeredAt || call.startedAt;
  if (!from) return 0;
  return Math.max(0, Math.round((new Date(call.endedAt) - new Date(from)) / 1000));
}

/**
 * GET /api/calls/history?page&limit (default 1 / 50, limit <= 100)
 * Calls of the token user, newest first. Rows keep the CallLog shape
 * (caller/callee populated) and gain `direction` ('outgoing'|'incoming'),
 * `durationSeconds` and `otherUser`; the envelope gains total/page/limit.
 */
exports.getCallHistory = async (req, res) => {
  try {
    const my_user_id = req.userId; // token identity (A1.2); query my_user_id ignored
    if (!my_user_id) {
      return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
    }
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const query = { $or: [{ caller: my_user_id }, { callee: my_user_id }] };

    const [total, calls] = await Promise.all([
      CallLog.countDocuments(query),
      CallLog.find(query)
        .populate('caller', 'full_name profile')
        .populate('callee', 'full_name profile')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    const data = calls.map((c) => {
      const callerId = c.caller && c.caller._id ? String(c.caller._id) : String(c.caller);
      const outgoing = callerId === String(my_user_id);
      const other = outgoing ? c.callee : c.caller;
      return {
        ...c,
        direction: outgoing ? 'outgoing' : 'incoming',
        durationSeconds: durationSeconds(c),
        otherUser: other && other._id ? { _id: other._id, full_name: other.full_name, profile: other.profile || null } : null,
      };
    });

    return res.json({ status: true, data, total, page, limit });
  } catch (err) {
    console.error('[Calls] History error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports._durationSeconds = durationSeconds;
