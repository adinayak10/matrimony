'use strict';
/**
 * test/biodata-admin.test.js (biodata maker, Phase 2) — /api/admin/biodata/*
 * (stats, template overrides, CMS pages), biodata settings clamping, the
 * public page endpoints and the seed tool.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-admin-'));
process.env.PRIVATE_UPLOADS_DIR = path.join(TMP, 'private');
process.env.CHROMIUM_PATH = '';

const harness = require('./helpers/harness');

function kitAvailable() {
  try {
    const K = require('@banjaramatch/shared/biodata');
    return !!(K && K.schema && K.registry && K.registry.list().length);
  } catch (_) {
    return false;
  }
}

async function audited(query) {
  const AdminAuditLog = require('../models/AdminAuditLog');
  for (let i = 0; i < 40; i++) {
    if (await AdminAuditLog.exists(query)) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

const LONG = Array.from({ length: 320 }, (_, i) => `word${i}`).join(' ');

function defineSuite() {
  const factory = require('./helpers/factory');
  const K = require('@banjaramatch/shared/biodata');
  let adminToken;
  let memberAuth;
  let BiodataPage;
  let sitemapCalls = 0;
  const admin = (method, url) => harness.request()[method](url).set(factory.bearer(adminToken));

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    // observe sitemap regeneration without network
    const sitemapService = require('../services/sitemapService');
    sitemapService.triggerSitemapRegeneration = async () => {
      sitemapCalls++;
      return true;
    };
    BiodataPage = require('../models/BiodataPage');
    await BiodataPage.init();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    const a = await factory.makeUser({ role: 'admin', email: `admin_bd_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(a._id), email: a.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    memberAuth = factory.bearer(factory.tokenFor(await factory.makeUser()));
  });
  test.after(async () => {
    await harness.stopAll();
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  async function waitSitemap(prev) {
    for (let i = 0; i < 40 && sitemapCalls === prev; i++) await new Promise((r) => setTimeout(r, 10));
    return sitemapCalls;
  }

  test('admin routes: 401 without a token, 403 for a member token', async () => {
    for (const [m, p] of [
      ['get', '/stats'],
      ['get', '/templates'],
      ['post', '/templates/reorder'],
      ['get', '/pages'],
      ['post', '/pages'],
    ]) {
      assert.equal((await harness.request()[m](`/api/admin/biodata${p}`).send({})).status, 401, p);
      assert.equal((await harness.request()[m](`/api/admin/biodata${p}`).set(memberAuth).send({})).status, 403, p);
    }
  });

  test('stats are counts only', async () => {
    const res = await admin('get', '/api/admin/biodata/stats');
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(typeof d.documents.total, 'number');
    assert.equal(typeof d.documents.last30Days, 'number');
    assert.equal(typeof d.documents.users, 'number');
    assert.equal(typeof d.shares.active, 'number');
    assert.equal(d.templates.total, K.registry.list().length);
    assert.equal(typeof d.pages.published, 'number');
    assert.equal(d.pdf, 'unavailable');
  });

  test('template overrides: update, public listing reflects them, reorder, reset, audit', async () => {
    const ids = K.registry.list().map((t) => t.id);
    const id = ids[1];
    const list = await admin('get', '/api/admin/biodata/templates');
    assert.equal(list.status, 200);
    const row = list.body.data.find((r) => r.templateId === id);
    for (const k of ['templateId', 'isActive', 'isFeatured', 'order', 'usageCount', 'hasOverrides', 'displayName', 'description', 'category', 'tags', 'thumbnailUrl', 'registry']) assert.ok(k in row, k);
    assert.equal(row.hasOverrides, false);
    assert.equal(row.displayName, '', 'raw override, not the merged name');
    assert.ok(row.registry.name);
    assert.ok(Array.isArray(list.body.categories) && list.body.categories[0].slug);

    const bad = await admin('put', `/api/admin/biodata/templates/${id}`).send({ thumbnailUrl: 'https://evil.example/x.png' });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.field, 'thumbnailUrl');
    assert.equal((await admin('put', '/api/admin/biodata/templates/not-a-template').send({ isActive: false })).status, 404);
    const badCat = await admin('put', `/api/admin/biodata/templates/${id}`).send({ category: 'nonsense' });
    assert.equal(badCat.body.field, 'category');

    const up = await admin('put', `/api/admin/biodata/templates/${id}`).send({
      displayName: '<b>Shiny</b> name',
      description: 'Custom & bold',
      tags: 'Gold, red , gold',
      isFeatured: true,
      category: K.registry.CATEGORIES[0].slug,
      thumbnailUrl: '/images/biodata/custom.webp',
    });
    assert.equal(up.status, 200, JSON.stringify(up.body));
    assert.equal(up.body.data.displayName, 'Shiny name');
    assert.equal(up.body.data.description, 'Custom & bold', 'plain text stored as typed');
    assert.deepEqual(up.body.data.tags, ['gold', 'red']);
    assert.equal(up.body.data.hasOverrides, true);
    assert.ok(await audited({ action: 'biodataTemplate.update', targetId: id }));

    const pub = await harness.request().get('/api/biodata/templates');
    const prow = pub.body.data.find((r) => r.templateId === id);
    assert.equal(prow.name, 'Shiny name');
    assert.equal(prow.isFeatured, true);
    assert.equal(prow.thumbnail, '/images/biodata/custom.webp');

    const off = await admin('put', `/api/admin/biodata/templates/${id}`).send({ isActive: false });
    assert.equal(off.body.data.isActive, false);
    const pub2 = await harness.request().get('/api/biodata/templates');
    assert.ok(!pub2.body.data.some((r) => r.templateId === id), 'inactive templates are hidden');
    // a new document cannot use an inactive template
    const create = await harness.request().post('/api/biodata/documents').set(memberAuth).send({ templateId: id, data: K.sampleData() });
    assert.equal(create.status, 400);
    assert.equal(create.body.code, 'UNKNOWN_TEMPLATE');

    const reversed = ids.slice().reverse();
    const re = await admin('post', '/api/admin/biodata/templates/reorder').send({ templateIds: reversed });
    assert.equal(re.status, 200);
    assert.ok(await audited({ action: 'biodataTemplate.reorder' }));
    const pub3 = await harness.request().get('/api/biodata/templates');
    assert.deepEqual(pub3.body.data.map((r) => r.templateId), reversed.filter((x) => x !== id));
    assert.equal((await admin('post', '/api/admin/biodata/templates/reorder').send({ templateIds: [ids[0], ids[0]] })).status, 400);
    assert.equal((await admin('post', '/api/admin/biodata/templates/reorder').send({ templateIds: ['nope'] })).status, 400);

    const reset = await admin('delete', `/api/admin/biodata/templates/${id}/overrides`);
    assert.equal(reset.status, 200);
    assert.equal(reset.body.data.hasOverrides, false);
    assert.equal(reset.body.data.isActive, true);
    assert.ok(await audited({ action: 'biodataTemplate.reset', targetId: id }));
  });

  test('pages: create, slug rules, sanitizing, publish, frozen slug, landing protected, sitemap, audit', async () => {
    const guide = {
      kind: 'guide',
      slug: 'marriage-biodata-checklist',
      metaTitle: 'Marriage biodata checklist & tips',
      metaDescription: 'What to put in a biodata.',
      h1: '<em>Checklist</em>',
      intro: `<p onclick="x()">Intro <script>alert(1)</script><a href="javascript:alert(1)">bad</a> ${LONG}</p>`,
      contentBlocks: [
        { type: 'richText', heading: 'Basics', html: '<h2>Hi</h2><img src=x onerror=alert(1)>' },
        { type: 'table', heading: 'Fields', rows: [['Field', 'Example'], ['Name', '<b>Asha</b>']] },
        { type: 'cta', heading: 'Start', ctaLabel: 'Create', ctaHref: '/biodata-maker/create' },
      ],
      faqs: [{ question: 'Is it free?', answer: 'Yes & always.' }],
      ctaConfig: { heading: 'Make yours', primaryLabel: 'Start', primaryHref: '/biodata-maker/create' },
      relatedLinks: [{ label: 'Gotra list', href: '/banjara-gotra-list' }],
    };

    const badSlug = await admin('post', '/api/admin/biodata/pages').send({ ...guide, slug: 'banjara-matrimony-delhi' });
    assert.equal(badSlug.status, 400);
    assert.equal(badSlug.body.field, 'slug');
    const extLink = await admin('post', '/api/admin/biodata/pages').send({ ...guide, relatedLinks: [{ label: 'x', href: 'https://evil.example/' }] });
    assert.equal(extLink.status, 400);
    assert.equal(extLink.body.field, 'relatedLinks');
    const protoRel = await admin('post', '/api/admin/biodata/pages').send({ ...guide, ctaConfig: { primaryHref: '//evil.example' } });
    assert.equal(protoRel.status, 400);
    const badLanding = await admin('post', '/api/admin/biodata/pages').send({ ...guide, kind: 'landing' });
    assert.equal(badLanding.status, 400);
    const badCategory = await admin('post', '/api/admin/biodata/pages').send({ ...guide, kind: 'category', slug: 'nope' });
    assert.equal(badCategory.status, 400);

    const created = await admin('post', '/api/admin/biodata/pages').send(guide);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const p = created.body.data;
    assert.ok(p._id);
    assert.equal(p.isPublished, false);
    assert.ok(!/script|onclick|javascript:/i.test(p.intro), p.intro.slice(0, 200));
    assert.ok(!/onerror/i.test(p.contentBlocks[0].html));
    assert.equal(p.h1, 'Checklist');
    assert.equal(p.contentBlocks[1].rows[1][1], 'Asha');
    assert.equal(p.metaTitle, 'Marriage biodata checklist & tips');
    assert.equal(p.faqs[0].answer, 'Yes & always.');
    assert.ok(p.contentWords >= 300, `contentWords ${p.contentWords}`);
    assert.ok(await audited({ action: 'biodataPage.create', targetId: String(p._id) }));

    const dup = await admin('post', '/api/admin/biodata/pages').send(guide);
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'SLUG_TAKEN');
    assert.equal(dup.body.field, 'slug');

    // unpublished: invisible publicly; slug may change
    assert.equal((await harness.request().get(`/api/biodata/pages/${guide.slug}`)).status, 404);
    const renamed = await admin('put', `/api/admin/biodata/pages/${p._id}`).send({ slug: 'marriage-biodata-checklist-2026' });
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.data.slug, 'marriage-biodata-checklist-2026');

    const before = sitemapCalls;
    const pub = await admin('post', `/api/admin/biodata/pages/${p._id}/publish`).send({ published: true });
    assert.equal(pub.status, 200);
    assert.equal(pub.body.data.isPublished, true);
    assert.ok(pub.body.data.publishedAt);
    assert.ok((await waitSitemap(before)) > before, 'publish triggers sitemap regeneration');
    assert.ok(await audited({ action: 'biodataPage.publish', targetId: String(p._id) }));

    const pubList = await harness.request().get('/api/biodata/pages?published=1');
    const row = pubList.body.data.find((r) => r.slug === 'marriage-biodata-checklist-2026');
    assert.deepEqual(Object.keys(row).sort(), ['contentWords', 'kind', 'metaTitle', 'slug', 'updatedAt']);
    const full = await harness.request().get('/api/biodata/pages/marriage-biodata-checklist-2026');
    assert.equal(full.status, 200);
    assert.equal(full.body.data.contentBlocks.length, 3);
    assert.ok(!('createdBy' in full.body.data));

    const frozen = await admin('put', `/api/admin/biodata/pages/${p._id}`).send({ slug: 'marriage-biodata-other' });
    assert.equal(frozen.status, 409);
    assert.equal(frozen.body.code, 'SLUG_FROZEN');
    assert.equal(frozen.body.field, 'slug');
    const kind = await admin('put', `/api/admin/biodata/pages/${p._id}`).send({ kind: 'category' });
    assert.equal(kind.status, 400);
    const edit = await admin('put', `/api/admin/biodata/pages/${p._id}`).send({ metaTitle: 'New title' });
    assert.equal(edit.status, 200);
    assert.equal(edit.body.data.slug, 'marriage-biodata-checklist-2026');

    const adminList = await admin('get', '/api/admin/biodata/pages?kind=guide&published=true');
    assert.equal(adminList.status, 200);
    assert.ok(adminList.body.data.some((r) => String(r._id) === String(p._id)));
    for (const k of ['_id', 'slug', 'kind', 'metaTitle', 'isPublished', 'contentWords', 'updatedAt']) assert.ok(k in adminList.body.data[0], k);
    assert.equal(adminList.body.pagination.limit, 50);
    assert.equal((await admin('get', '/api/admin/biodata/pages?published=false')).body.data.filter((r) => String(r._id) === String(p._id)).length, 0);
    assert.equal((await admin('get', `/api/admin/biodata/pages/${p._id}`)).status, 200);
    assert.equal((await admin('get', '/api/admin/biodata/pages/bad-id')).status, 404);

    const beforeUnpub = sitemapCalls;
    const unpub = await admin('post', `/api/admin/biodata/pages/${p._id}/publish`).send({ published: false });
    assert.equal(unpub.body.data.isPublished, false);
    assert.ok((await waitSitemap(beforeUnpub)) > beforeUnpub);
    assert.equal((await harness.request().get('/api/biodata/pages/marriage-biodata-checklist-2026')).status, 404);
    assert.equal((await admin('post', `/api/admin/biodata/pages/${p._id}/publish`).send({})).status, 400);

    const beforeDel = sitemapCalls;
    const del = await admin('delete', `/api/admin/biodata/pages/${p._id}`);
    assert.equal(del.status, 200);
    assert.ok((await waitSitemap(beforeDel)) > beforeDel);
    assert.ok(await audited({ action: 'biodataPage.delete', targetId: String(p._id) }));

    // landing: exactly one slug, cannot be deleted
    const landing = await admin('post', '/api/admin/biodata/pages').send({ kind: 'landing', slug: 'biodata-maker', metaTitle: 'Biodata maker', h1: 'Make a biodata' });
    assert.equal(landing.status, 201, JSON.stringify(landing.body));
    const noDel = await admin('delete', `/api/admin/biodata/pages/${landing.body.data._id}`);
    assert.equal(noDel.status, 409);
    assert.equal(noDel.body.code, 'LANDING_PROTECTED');

    // category page
    const cat = await admin('post', '/api/admin/biodata/pages').send({ kind: 'category', slug: K.registry.CATEGORIES[0].slug, metaTitle: 'Traditional' });
    assert.equal(cat.status, 201);
  });

  test('settings: biodata keys clamp, langs coerce (comma string or array), cache invalidated', async () => {
    const res = await admin('put', '/api/admin/settings').send({ biodata: { enabled: 'false', guestDownloads: false, maxPerUser: 500, shareDefaultDays: 0, languages: 'en, hi' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.biodata.maxPerUser, 50);
    assert.equal(res.body.data.biodata.shareDefaultDays, 1);
    assert.equal(res.body.data.biodata.enabled, false);
    assert.deepEqual(res.body.data.biodata.languages, ['en', 'hi']);
    const cfg = await harness.request().get('/api/biodata/config');
    assert.equal(cfg.body.data.enabled, false);
    assert.equal(cfg.body.data.maxPerUser, 50);

    const arr = await admin('put', '/api/admin/settings').send({ biodata: { languages: ['hi'], enabled: true, maxPerUser: 0 } });
    assert.deepEqual(arr.body.data.biodata.languages, ['en', 'hi'], 'en always kept');
    assert.equal(arr.body.data.biodata.maxPerUser, 1);
    const bad = await admin('put', '/api/admin/settings').send({ biodata: { languages: 'en, fr' } });
    assert.equal(bad.status, 400);
    const { buildSettingsUpdate } = require('../controllers/admin/settingsController');
    assert.deepEqual(buildSettingsUpdate({ biodata: { languages: 'en' } }).$set['biodata.languages'], ['en']);
    await admin('put', '/api/admin/settings').send({ biodata: { enabled: true, guestDownloads: true, maxPerUser: 10, shareDefaultDays: 30, languages: 'en,hi' } });
  });

  test('seed tool: content validates, idempotent upsert, publish only on insert', async () => {
    const { seed, preparePage } = require('../tools/seedBiodataPages');
    const pages = require('@banjaramatch/shared/biodata/content/pages');
    for (const p of pages) {
      const r = preparePage(p);
      assert.ok(!r.error, `${p.slug}: ${r.error}`);
      if (r.fields.kind === 'guide') assert.ok(r.fields.contentWords >= 300, `${p.slug} has ${r.fields.contentWords} unique words`);
    }
    await BiodataPage.deleteMany({});
    const quiet = () => {};
    const dry = await seed({ apply: false, pages, log: quiet });
    assert.ok(dry.every((r) => r.action === 'create'));
    assert.equal(await BiodataPage.countDocuments(), 0, 'dry run writes nothing');

    await seed({ apply: true, publish: true, pages, log: quiet });
    assert.equal(await BiodataPage.countDocuments({ isPublished: true }), pages.length);
    await BiodataPage.updateOne({ slug: pages[1].slug }, { $set: { metaTitle: 'Admin edit', isPublished: false } });
    const again = await seed({ apply: true, publish: true, pages, log: quiet });
    assert.ok(again.every((r) => r.action.startsWith('skip')));
    assert.equal((await BiodataPage.findOne({ slug: pages[1].slug }).lean()).metaTitle, 'Admin edit', 'admin edits win without --force');
    await seed({ apply: true, force: true, publish: true, pages, log: quiet });
    const forced = await BiodataPage.findOne({ slug: pages[1].slug }).lean();
    assert.notEqual(forced.metaTitle, 'Admin edit');
    assert.equal(forced.isPublished, false, '--force never changes publish state');
    assert.equal(await BiodataPage.countDocuments(), pages.length);
  });
}

if (harness.suiteReady(test, 'biodata-admin')) {
  if (kitAvailable()) defineSuite();
  else test.skip('biodata-admin: @banjaramatch/shared/biodata kit not complete yet', () => {});
}
