'use strict';
// One place for every server-sent push (feature expansion, 2026-10).
//
//   sendToUser(userOrId, title, body, data)  one device, honours settings.allowNotifications
//   sendToTopic(topic, title, body, data)    FCM topic the app subscribes to at startup
//   broadcast({ title, body, data, platform }) 'all' | 'android' | 'ios' -> [{ topic, messageId|error }]
//
// Payload rules mirror util/sendNotification.js and the app's own topic format
// (apps/mobile/lib/common/api_service/notification_service.dart): Android gets a
// data message (the app renders it), iOS also gets a `notification` block.
// Every data value is stringified (FCM rejects non-string data values).
// Nothing here throws: callers get { ok, error } and carry on. Under NODE_ENV=test
// ../firebase.js is a stub whose messaging().send() throws, so results are ok:false.
const firebase = require('../firebase');
const User = require('../models/User');

const TOPIC_ANDROID = 'banjaramatch_android';
const TOPIC_IOS = 'banjaramatch_ios';

function stringData(data = {}, title, body) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (v === undefined || v === null) continue;
    out[k] = typeof v === 'string' ? v : (typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  out.title = String(title || '');
  out.body = String(body || '');
  return out;
}

function baseMessage(title, body, data, { withNotification = true } = {}) {
  const msg = {
    data: stringData(data, title, body),
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'chatter', clickAction: 'FLUTTER_NOTIFICATION_CLICK' },
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { alert: { title: String(title || ''), body: String(body || '') }, sound: 'default' } },
    },
  };
  if (!withNotification) delete msg.android.notification;
  return msg;
}

async function send(message) {
  try {
    const messageId = await firebase.messaging().send(message);
    return { ok: true, messageId };
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Push to one member. `userOrId` may be a user doc/lean object (with device_token
 * and settings) or an id; the token is loaded when missing.
 * Skips silently (ok:false, error:'no_token' | 'disabled') when nothing can be sent.
 */
async function sendToUser(userOrId, title, body, data = {}) {
  try {
    let user = userOrId;
    if (!user || typeof user !== 'object' || user.device_token === undefined || user.settings === undefined) {
      const id = user && typeof user === 'object' ? user._id : user;
      if (!id) return { ok: false, error: 'no_user' };
      user = await User.findById(id).select('device_token settings.allowNotifications is_block').lean();
      if (!user) return { ok: false, error: 'no_user' };
    }
    if (user.is_block === 1) return { ok: false, error: 'blocked' };
    if (user.settings && user.settings.allowNotifications === false) return { ok: false, error: 'disabled' };
    if (!user.device_token) return { ok: false, error: 'no_token' };
    return await send({ token: user.device_token, ...baseMessage(title, body, data) });
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

async function sendToTopic(topic, title, body, data = {}) {
  const isIos = topic === TOPIC_IOS;
  // Android topic: data-only so the app shows it through its own channel.
  return send({ topic, ...baseMessage(title, body, data, { withNotification: isIos }), ...(isIos ? { notification: { title: String(title || ''), body: String(body || '') } } : {}) });
}

function topicsFor(platform) {
  if (platform === 'android') return [TOPIC_ANDROID];
  if (platform === 'ios') return [TOPIC_IOS];
  return [TOPIC_ANDROID, TOPIC_IOS];
}

async function broadcast({ title, body, data = {}, platform = 'all' }) {
  const results = [];
  for (const topic of topicsFor(platform)) {
    const r = await sendToTopic(topic, title, body, data);
    results.push(r.ok ? { topic, messageId: r.messageId } : { topic, error: r.error });
  }
  return results;
}

module.exports = { sendToUser, sendToTopic, broadcast, topicsFor, TOPIC_ANDROID, TOPIC_IOS, _stringData: stringData };
