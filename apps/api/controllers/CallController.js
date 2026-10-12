const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const ChatRoom = require('../models/ChatRoom');
const CallLog = require('../models/CallLog');

const TOKEN_TTL_SECONDS = 3600; // 1 hour

/**
 * POST /api/calls/token
 * Body: { my_user_id, user_id, channelName }
 *
 * Mints an Agora RTC token for a call between two users. Requires
 * AGORA_APP_ID/AGORA_APP_CERTIFICATE env vars (an Agora console account is
 * a real external dependency not yet set up — see README note below).
 *
 * Non-negotiable server-side gate: only mints a token when the two users
 * have an ACCEPTED ChatRoom between them — never between strangers or a
 * pending request, mirroring the mutual-connection checks used elsewhere
 * in this app and keeping real phone numbers out of the picture entirely.
 */
exports.generateCallToken = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { resolveCaller } = require('../middleware/identity');
    const my_user_id = resolveCaller(req); // token identity (A1.2)
    const { user_id, channelName } = req.body;

    if (!my_user_id || !user_id || !channelName || typeof channelName !== 'string') {
      return res.status(400).json({ status: false, message: 'user_id and channelName are required' });
    }
    if (!mongoose.isValidObjectId(user_id) || String(user_id) === my_user_id) {
      return res.status(400).json({ status: false, message: 'Invalid user_id' });
    }

    const room = await ChatRoom.findOne({
      participants: { $all: [my_user_id, user_id] },
      status: 'accepted',
    });

    if (!room) {
      return res.status(403).json({ status: false, message: 'Calls are only available between mutually accepted connections' });
    }

    // The channel must belong to a live call the caller is part of (A4.6)
    const call = await CallLog.findOne({
      channelName,
      status: { $in: ['ringing', 'accepted'] },
      $or: [{ caller: my_user_id, callee: user_id }, { caller: user_id, callee: my_user_id }],
    }).select('_id').lean();
    if (!call) {
      return res.status(403).json({ status: false, message: 'No active call on this channel' });
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

/**
 * GET /api/calls/history?my_user_id=...
 * Simple call log listing for a user (most recent first).
 */
exports.getCallHistory = async (req, res) => {
  try {
    const my_user_id = req.userId; // token identity (A1.2); query my_user_id ignored
    if (!my_user_id) {
      return res.status(401).json({ status: false, code: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const calls = await CallLog.find({ $or: [{ caller: my_user_id }, { callee: my_user_id }] })
      .populate('caller', 'full_name profile')
      .populate('callee', 'full_name profile')
      .sort('-createdAt')
      .limit(50);

    return res.json({ status: true, data: calls });
  } catch (err) {
    console.error('[Calls] History error:', err);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
