'use strict';
/**
 * test/calls.test.js (feature expansion A5/A6) — call signalling over
 * socket.io: call_ringing, accept/reject/end, ring timeout, busy, offline
 * callee (no push possible -> call_failed offline + missed_call), caller
 * disconnect, plus /api/calls/token {channelName} and /api/calls/history.
 * The ring timeout is shortened through socket.callConfig.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// Fake Agora credentials so /calls/token can mint (set before .env loads)
process.env.AGORA_APP_ID = '0123456789abcdef0123456789abcdef';
process.env.AGORA_APP_CERTIFICATE = 'fedcba9876543210fedcba9876543210';

const harness = require('./helpers/harness');

function clientAvailable() {
  try {
    require.resolve('socket.io-client');
    return true;
  } catch (_) {
    return false;
  }
}

function defineSuite() {
  const factory = require('./helpers/factory');
  const { io: connectClient } = require('socket.io-client');
  let server;
  let app;
  const api = () => require('supertest')(app);
  let io;
  let url;
  let socketMod;
  let CallLog;
  let Notification;
  const sockets = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function once(socket, event, ms = 4000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      socket.once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }
  function never(socket, event, ms = 300) {
    return new Promise((resolve, reject) => {
      const h = () => reject(new Error(`unexpected ${event}`));
      socket.once(event, h);
      setTimeout(() => { socket.off(event, h); resolve(); }, ms);
    });
  }

  /** Connect with a token and wait until the server has bound the user online. */
  async function online(user) {
    const socket = connectClient(url, { transports: ['websocket'], forceNew: true, reconnection: false, auth: { token: factory.tokenFor(user) } });
    sockets.push(socket);
    await once(socket, 'connect');
    for (let i = 0; i < 100 && socketMod.onlineUsers.get(String(user._id)) !== socket.id; i++) await sleep(20);
    assert.equal(socketMod.onlineUsers.get(String(user._id)), socket.id, 'socket bound');
    return socket;
  }

  async function pair() {
    const a = await factory.makeUser({ gender: 'Male', full_name: 'Caller Person' });
    const b = await factory.makeUser({ gender: 'Female', full_name: 'Callee Person' });
    const room = await factory.makeRoom(a, b, 'accepted');
    return { a, b, room };
  }

  test.before(async () => {
    await harness.startDb();
    const created = require('../app').createApp();
    server = created.server;
    app = created.app;
    io = created.io;
    socketMod = require('../socket');
    socketMod.callConfig.ringTimeoutMs = 400;
    CallLog = require('../models/CallLog');
    Notification = require('../models/Notification');
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    for (const s of sockets) s.close();
    await sleep(150);
    await new Promise((resolve) => io.close(resolve));
    await harness.stopAll();
  });

  test('invite -> caller gets call_ringing, callee call_incoming; accept; end', async () => {
    const { a, b, room } = await pair();
    const sa = await online(a);
    const sb = await online(b);
    const ringing = once(sa, 'call_ringing');
    const incoming = once(sb, 'call_incoming');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id), callType: 'video' });
    const r = await ringing;
    const inc = await incoming;
    assert.equal(String(r.callId), String(inc.callId));
    assert.equal(r.channelName, inc.channelName);
    assert.equal(r.callType, 'video');
    assert.equal(String(r.roomId), String(room._id));
    assert.equal(inc.fromUserName, 'Caller Person');
    assert.equal(String(inc.fromUserId), String(a._id));

    // Accept first: the ring timeout is only 400 ms here, and the token checks
    // below can take longer than that under parallel test load.
    const accepted = once(sa, 'call_accepted');
    sb.emit('call_accept', { callId: inc.callId });
    const acc = await accepted;
    assert.equal(acc.channelName, r.channelName);
    let row = await CallLog.findById(r.callId).lean();
    assert.equal(row.status, 'accepted');
    assert.ok(row.answeredAt);

    // token by channelName only (both sides), never for a stranger
    const tokenRes = await api().post('/api/calls/token').set(factory.bearer(factory.tokenFor(b))).send({ channelName: r.channelName });
    assert.equal(tokenRes.status, 200, JSON.stringify(tokenRes.body));
    assert.equal(tokenRes.body.data.channelName, r.channelName);
    assert.ok(tokenRes.body.data.token);
    const stranger = await factory.makeUser();
    assert.equal((await api().post('/api/calls/token').set(factory.bearer(factory.tokenFor(stranger))).send({ channelName: r.channelName })).status, 403);
    assert.equal((await api().post('/api/calls/token').set(factory.bearer(factory.tokenFor(a))).send({})).status, 400);

    // accepted call is not timed out
    await never(sb, 'call_timeout', 600);
    const ended = once(sb, 'call_end');
    sa.emit('call_end', { callId: r.callId });
    await ended;
    row = await CallLog.findById(r.callId).lean();
    assert.equal(row.status, 'ended');
    assert.ok(row.endedAt);
  });

  test('no answer -> call_timeout to both, status missed, missed_call notification', async () => {
    const { a, b, room } = await pair();
    const sa = await online(a);
    const sb = await online(b);
    const ringing = once(sa, 'call_ringing');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id), callType: 'audio' });
    const { callId } = await ringing;
    const [ta, tb] = await Promise.all([once(sa, 'call_timeout', 3000), once(sb, 'call_timeout', 3000)]);
    assert.equal(String(ta.callId), String(callId));
    assert.equal(String(tb.callId), String(callId));
    assert.equal((await CallLog.findById(callId).lean()).status, 'missed');
    // call_timeout is emitted before the notification write finishes: poll briefly.
    let note;
    for (let i = 0; i < 40 && !(note = await Notification.findOne({ type: 'missed_call', toUser: b._id }).lean()); i++) await sleep(25);
    assert.ok(note);
    assert.equal(note.data.callId, String(callId));
    assert.equal(String(note.fromUser), String(a._id));
  });

  test('reject -> call_rejected to the caller, no timeout afterwards', async () => {
    const { a, b, room } = await pair();
    const sa = await online(a);
    const sb = await online(b);
    const incoming = once(sb, 'call_incoming');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id) });
    const { callId } = await incoming;
    const rejected = once(sa, 'call_rejected');
    sb.emit('call_reject', { callId });
    await rejected;
    assert.equal((await CallLog.findById(callId).lean()).status, 'rejected');
    await never(sa, 'call_timeout', 700);
  });

  test('busy callee -> call_failed {reason:"busy"}', async () => {
    const { a, b, room } = await pair();
    const c = await factory.makeUser({ gender: 'Male' });
    const room2 = await factory.makeRoom(c, b, 'accepted');
    const sa = await online(a);
    const sb = await online(b);
    const sc = await online(c);
    const incoming = once(sb, 'call_incoming');
    sc.emit('call_invite', { toUserId: String(b._id), roomId: String(room2._id) });
    const first = await incoming;
    const failed = once(sa, 'call_failed');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id) });
    assert.equal((await failed).reason, 'busy');
    sc.emit('call_end', { callId: first.callId });
    await sleep(100);
  });

  test('offline callee without a push token -> call_failed offline + missed_call', async () => {
    const { a, b, room } = await pair();
    const sa = await online(a);
    const ringing = once(sa, 'call_ringing');
    const failed = once(sa, 'call_failed');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id) });
    await ringing;
    const f = await failed;
    assert.equal(f.reason, 'offline');
    assert.equal((await CallLog.findById(f.callId).lean()).status, 'missed');
    assert.equal(await Notification.countDocuments({ type: 'missed_call', toUser: b._id }), 1);
  });

  test('not connected / blocked -> call_failed not_connected, no CallLog', async () => {
    const a = await factory.makeUser({ gender: 'Male' });
    const b = await factory.makeUser({ gender: 'Female' });
    const pending = await factory.makeRoom(a, b, 'pending');
    const sa = await online(a);
    const failed = once(sa, 'call_failed');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(pending._id) });
    assert.equal((await failed).reason, 'not_connected');
    assert.equal(await CallLog.countDocuments({ caller: a._id }), 0);
  });

  test('caller disconnecting while ringing ends the call for the callee', async () => {
    const { a, b, room } = await pair();
    const sa = await online(a);
    const sb = await online(b);
    const incoming = once(sb, 'call_incoming');
    sa.emit('call_invite', { toUserId: String(b._id), roomId: String(room._id) });
    const { callId } = await incoming;
    const ended = once(sb, 'call_end');
    sa.close();
    const e = await ended;
    assert.equal(String(e.callId), String(callId));
    assert.equal((await CallLog.findById(callId).lean()).status, 'missed');
  });

  test('history: pagination, total, direction, durationSeconds, otherUser', async () => {
    const a = await factory.makeUser({ gender: 'Male', full_name: 'Hist A' });
    const b = await factory.makeUser({ gender: 'Female', full_name: 'Hist B' });
    const room = await factory.makeRoom(a, b, 'accepted');
    const t0 = new Date(Date.now() - 600 * 1000);
    await CallLog.create([
      { caller: a._id, callee: b._id, chatRoom: room._id, channelName: 'h1', status: 'ended', startedAt: t0, answeredAt: new Date(t0.getTime() + 5000), endedAt: new Date(t0.getTime() + 95000) },
      { caller: b._id, callee: a._id, chatRoom: room._id, channelName: 'h2', status: 'missed', startedAt: t0, endedAt: t0 },
      { caller: a._id, callee: b._id, chatRoom: room._id, channelName: 'h3', status: 'rejected', startedAt: t0, endedAt: t0 },
    ]);
    const res = await api().get('/api/calls/history?page=1&limit=2').set(factory.bearer(factory.tokenFor(a)));
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.page, 1);
    assert.equal(res.body.limit, 2);
    assert.equal(res.body.data.length, 2);
    const all = await api().get('/api/calls/history?limit=10').set(factory.bearer(factory.tokenFor(a)));
    const byChannel = Object.fromEntries(all.body.data.map((c) => [c.channelName, c]));
    assert.equal(byChannel.h1.direction, 'outgoing');
    assert.equal(byChannel.h1.durationSeconds, 90);
    assert.equal(byChannel.h1.otherUser.full_name, 'Hist B');
    assert.equal(byChannel.h2.direction, 'incoming');
    assert.equal(byChannel.h2.durationSeconds, 0);
    assert.equal(byChannel.h2.caller.full_name, 'Hist B', 'populated caller kept');
    assert.equal((await api().get('/api/calls/history')).status, 401);
  });
}

if (!clientAvailable()) {
  test.skip('calls: socket.io-client not installed', () => {});
} else if (harness.suiteReady(test, 'calls')) {
  defineSuite();
}
