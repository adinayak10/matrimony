'use strict';
/**
 * test/visibility-lists.test.js — banned (is_block 1) and blocked (either
 * direction) members stay out of live activity, highlighted users,
 * notifications (+ unread badge) and profile visitors; room lists carry the
 * last message's msgType; visitor `total` is the real total.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');

  async function post(url, user, body = {}) {
    return harness
      .request()
      .post(url)
      .set(factory.bearer(factory.tokenFor(user)))
      .send({ my_user_id: 'spoofed', ...body });
  }

  /** viewer + one visible member and the three hidden kinds. */
  async function cast(gender = 'Female') {
    const viewer = await factory.makeUser({ gender: gender === 'Female' ? 'Male' : 'Female' });
    const ok = await factory.makeUser({ gender, full_name: 'Visible Member' });
    const banned = await factory.makeUser({ gender, full_name: 'Banned Member', is_block: 1 });
    const blocked = await factory.makeUser({ gender, full_name: 'Blocked By Viewer' });
    const blocker = await factory.makeUser({ gender, full_name: 'Blocks Viewer' });
    await factory.makeBlock(viewer, blocked);
    await factory.makeBlock(blocker, viewer);
    return { viewer, ok, banned, blocked, blocker, hidden: [banned, blocked, blocker] };
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('fetchLiveActivity: banned and blocked members never appear as matches, views or messages', async () => {
    const c = await cast();
    for (const u of [c.ok, ...c.hidden]) {
      await factory.makeVisit(u, c.viewer);
      await factory.makeRequest(u, c.viewer, 'accepted');
      await factory.makeMessage(factory.oid(), u, c.viewer, 'hi');
    }
    const res = await post('/api/fetchLiveActivity', c.viewer);
    assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
    const ids = res.body.data.map((a) => String(a.userId));
    const titles = res.body.data.map((a) => a.title);
    assert.ok(titles.includes('Visible Member viewed you'));
    assert.ok(titles.includes('New Match: Visible Member'));
    assert.ok(titles.includes('New message from Visible Member'));
    for (const h of c.hidden) assert.ok(!ids.includes(String(h._id)), `${h.full_name} leaked: ${titles}`);
  });

  test('fetchHighlightedUsers applies the discovery rules (gender, blocks, ban, gotra exogamy)', async () => {
    const gotraG = factory.oid();
    const gotraH = factory.oid();
    const viewer = await factory.makeUser({ gender: 'Male', gotra: gotraG });
    const ok = await factory.makeUser({ gender: 'Female', gotra: gotraH, is_highlighted: true });
    const sameGender = await factory.makeUser({ gender: 'Male', gotra: gotraH, is_highlighted: true });
    const sameGotra = await factory.makeUser({ gender: 'Female', gotra: gotraG, is_highlighted: true });
    const banned = await factory.makeUser({ gender: 'Female', gotra: gotraH, is_highlighted: true, is_block: 1 });
    const blocked = await factory.makeUser({ gender: 'Female', gotra: gotraH, is_highlighted: true });
    const blocker = await factory.makeUser({ gender: 'Female', gotra: gotraH, is_highlighted: true });
    await factory.makeBlock(viewer, blocked);
    await factory.makeBlock(blocker, viewer);

    const res = await post('/api/fetchHighlightedUsers', viewer);
    assert.equal(res.status, 200);
    const ids = res.body.data.map((u) => String(u._id));
    assert.ok(ids.includes(String(ok._id)));
    for (const u of [sameGender, sameGotra, banned, blocked, blocker]) {
      assert.ok(!ids.includes(String(u._id)), `${u.gender} ${u.full_name} leaked`);
    }
    for (const u of res.body.data) assert.equal(u.gender, 'Female');

    const noGender = await factory.makeUser({ gender: 'Not specified' });
    const empty = await post('/api/fetchHighlightedUsers', noGender);
    assert.equal(empty.status, 200);
    assert.equal(empty.body.status, true);
    assert.deepEqual(empty.body.data, []);
  });

  test('fetchUserNotification hides banned/deleted/blocked senders; unread badge agrees', async () => {
    const Notification = require('../models/Notification');
    const { countUnreadNotifications } = require('../services/notificationVisibility');
    const c = await cast();
    const deletedId = factory.oid();
    for (const from of [c.ok._id, ...c.hidden.map((u) => u._id), deletedId]) {
      await Notification.create({ type: 'interest_request', fromUser: from, toUser: c.viewer._id, content: 'x' });
    }
    const system = await Notification.create({ type: 'admin_message', fromUser: null, toUser: c.viewer._id, content: 'news' });

    const res = await post('/api/fetchUserNotification', c.viewer, { page: 1, limit: 20 });
    assert.equal(res.status, 200);
    const from = res.body.data.map((n) => (n.fromUser ? String(n.fromUser._id) : null));
    assert.equal(res.body.total, 2);
    assert.equal(res.body.data.length, 2);
    assert.ok(from.includes(String(c.ok._id)));
    assert.ok(res.body.data.some((n) => String(n._id) === String(system._id)), 'system notification kept');
    assert.equal(await countUnreadNotifications(c.viewer._id), 2);

    await post('/api/markNotificationsRead', c.viewer);
    assert.equal(await countUnreadNotifications(c.viewer._id), 0);
  });

  test('room lists return the last message type (msgType, mirrored in type)', async () => {
    const Message = require('../models/Message');
    const a = await factory.makeUser({ gender: 'Male' });
    const b = await factory.makeUser({ gender: 'Female' });
    const accepted = await factory.makeRoom(a, b, 'accepted');
    await Message.create({ room: accepted._id, sender: b._id, receiver: a._id, content: 'uploads/x.jpg', msgType: 'IMAGE' });
    const rooms = await post('/api/fetchUserRooms', a);
    assert.equal(rooms.status, 200);
    const last = rooms.body.data.find((r) => String(r._id) === String(accepted._id)).lastMessage;
    assert.equal(last.msgType, 'IMAGE');
    assert.equal(last.type, 'IMAGE');

    const c = await factory.makeUser({ gender: 'Female' });
    const pending = await factory.makeRoom(a, c, 'pending');
    await factory.makeMessage(pending, c, a, 'hello');
    const pend = await post('/api/fetchPendingRooms', a);
    assert.equal(pend.status, 200);
    const plast = pend.body.data.find((r) => String(r._id) === String(pending._id)).lastMessage;
    assert.equal(plast.msgType, 'TEXT');
    assert.equal(plast.type, 'TEXT');
  });

  test('getProfileVisitorSummary: real total across pages, blocked and banned excluded', async () => {
    const c = await cast();
    const ok2 = await factory.makeUser({ gender: 'Female' });
    const ok3 = await factory.makeUser({ gender: 'Female' });
    for (const u of [c.ok, ok2, ok3, ...c.hidden]) {
      await factory.makeVisit(u, c.viewer);
      await factory.makeVisit(c.viewer, u);
    }
    const hiddenIds = c.hidden.map((u) => String(u._id));

    for (const type of ['they_viewed_me', 'i_viewed', 'mutual']) {
      const p1 = await post('/api/getProfileVisitorSummary', c.viewer, { type, page: 1, limit: 2 });
      const p2 = await post('/api/getProfileVisitorSummary', c.viewer, { type, page: 2, limit: 2 });
      assert.equal(p1.status, 200);
      assert.equal(p1.body.total, 3, `${type} total`);
      assert.equal(p2.body.total, 3, `${type} total page 2`);
      assert.equal(p1.body.data.length, 2);
      assert.equal(p2.body.data.length, 1);
      const ids = [...p1.body.data, ...p2.body.data].map((u) => String(u._id));
      assert.equal(new Set(ids).size, 3);
      for (const h of hiddenIds) assert.ok(!ids.includes(h), `${type} leaked ${h}`);
    }
  });
}

if (harness.suiteReady(test, 'visibility-lists')) defineSuite();

module.exports = { defineSuite };
