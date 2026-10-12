'use strict';
/**
 * test/socket.test.js (A9.3 / A5.5) — socket identity, room and block checks.
 *
 * Runs socket.io-client against the in-process server from createApp() on an
 * ephemeral 127.0.0.1 port (never a fixed one) with mongodb-memory-server.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
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
  let io;
  let url;
  let A;
  let B;
  let C;
  const sockets = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Resolves with the first payload of `event`, rejects after `ms`. */
  function once(socket, event, ms = 4000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      socket.once(event, (payload) => {
        clearTimeout(timer);
        resolve(payload);
      });
    });
  }

  /** Connects and resolves once the server accepted (or rejected) the handshake. */
  function connect(token) {
    const socket = connectClient(url, {
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
      auth: token ? { token } : {},
    });
    sockets.push(socket);
    return new Promise((resolve) => {
      socket.once('connect', () => resolve({ socket, error: null }));
      socket.once('connect_error', (error) => resolve({ socket, error }));
    });
  }

  async function setLegacy(value) {
    await factory.ensureSettings({ security: { legacySocketJoin: value } });
    require('../services/settingsCache').invalidate();
  }

  test.before(async () => {
    await harness.startDb();
    const created = require('../app').createApp();
    server = created.server;
    io = created.io;
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
    A = await factory.makeUser({ full_name: 'Asha A', gender: 'Female' });
    B = await factory.makeUser({ full_name: 'Bhanu B', gender: 'Male' });
    C = await factory.makeUser({ full_name: 'Chetan C', gender: 'Male' });
    await setLegacy(true);
  });

  test.after(async () => {
    for (const s of sockets) s.close();
    await sleep(150); // let disconnect handlers finish their writes
    await new Promise((resolve) => io.close(resolve));
    await harness.stopAll();
  });

  test('send_message stores the token user as sender, whatever senderId says', async () => {
    const Message = require('../models/Message');
    await factory.makeRoom(A, B, 'accepted');
    const { socket, error } = await connect(factory.tokenFor(A));
    assert.equal(error, null);
    const sent = once(socket, 'message_sent');
    socket.emit('send_message', { senderId: String(C._id), receiverId: String(B._id), content: 'hello there' });
    const ack = await sent;
    const row = await Message.findById(ack._id).lean();
    assert.equal(String(row.sender), String(A._id));
    assert.equal(String(row.receiver), String(B._id));
    assert.equal(await Message.countDocuments({ sender: C._id }), 0);
  });

  test('send_message is refused with message_blocked: blocked pair, no accepted room, contact info', async () => {
    const Message = require('../models/Message');
    const D = await factory.makeUser({ gender: 'Male' }); // blocked A
    const E = await factory.makeUser({ gender: 'Male' }); // no room, default allowMessages
    await factory.makeRoom(A, D, 'accepted');
    await factory.makeBlock(D, A);
    const { socket } = await connect(factory.tokenFor(A));

    let blocked = once(socket, 'message_blocked');
    socket.emit('send_message', { receiverId: String(D._id), content: 'hi' });
    assert.equal((await blocked).reason, 'blocked');

    blocked = once(socket, 'message_blocked');
    socket.emit('send_message', { receiverId: String(E._id), content: 'hi' });
    assert.equal((await blocked).reason, 'not_connected');

    blocked = once(socket, 'message_blocked');
    socket.emit('send_message', { receiverId: String(B._id), content: 'call me on 9876543210' });
    assert.equal((await blocked).reason, 'contact_info');

    assert.equal(await Message.countDocuments({ receiver: { $in: [D._id, E._id] } }), 0);
    assert.equal(await Message.countDocuments({ content: /9876543210/ }), 0);
  });

  test('accept_chat: only the non-initiating participant can accept a pending room', async () => {
    const ChatRoom = require('../models/ChatRoom');
    const F = await factory.makeUser({ gender: 'Male' });
    const ids = [String(A._id), String(F._id)].sort();
    const room = await ChatRoom.create({ participants: ids, isGroup: false, status: 'pending', pairKey: ids.join(':'), initiatedBy: A._id });

    const initiator = (await connect(factory.tokenFor(A))).socket;
    const outsider = (await connect(factory.tokenFor(C))).socket;
    initiator.emit('accept_chat', { roomId: String(room._id), userId: String(F._id) });
    outsider.emit('accept_chat', { roomId: String(room._id), userId: String(F._id) });
    await sleep(400);
    assert.equal((await ChatRoom.findById(room._id).lean()).status, 'pending');

    const recipient = (await connect(factory.tokenFor(F))).socket;
    const accepted = once(initiator, 'chat_accepted');
    recipient.emit('accept_chat', { roomId: String(room._id) });
    assert.equal(String((await accepted).roomId), String(room._id));
    assert.equal((await ChatRoom.findById(room._id).lean()).status, 'accepted');
  });

  test('mark_seen by a non-participant changes nothing', async () => {
    const Message = require('../models/Message');
    const room = await factory.makeRoom(B, C, 'accepted');
    const msg = await factory.makeMessage(room, B, C, 'for C only');
    const { socket } = await connect(factory.tokenFor(A));
    socket.emit('mark_seen', { roomId: String(room._id), receiverId: String(C._id) });
    await sleep(300);
    assert.notEqual((await Message.findById(msg._id).lean()).status, 'seen');
  });

  test('legacy mode: a socket without a token has no identity until join; a bad token never errors', async () => {
    const Message = require('../models/Message');
    const anon = await connect(null);
    assert.equal(anon.error, null);
    anon.socket.emit('send_message', { senderId: String(A._id), receiverId: String(B._id), content: 'spoofed without join' });
    await sleep(300);
    assert.equal(await Message.countDocuments({ content: 'spoofed without join' }), 0);

    const bad = await connect('not-a-jwt');
    assert.equal(bad.error, null, 'dual mode falls back to the legacy branch on an invalid token');
  });

  test('strict mode (legacySocketJoin=false): no token -> connect_error, valid token connects', async () => {
    await setLegacy(false);
    try {
      const anon = await connect(null);
      assert.ok(anon.error, 'handshake must be rejected');
      assert.equal(anon.error.message, 'AUTH_REQUIRED');
      const ok = await connect(factory.tokenFor(A));
      assert.equal(ok.error, null);
    } finally {
      await setLegacy(true);
    }
  });
}

if (harness.suiteReady(test, 'socket')) {
  if (clientAvailable()) defineSuite();
  else test.skip('socket: socket.io-client is not installed', () => {});
}

module.exports = { defineSuite };
