'use strict';
// Templates track A: sidebar and band archetypes and their seven templates.
// Layout (page counts, no overflow, Devanagari) is checked in a real browser;
// these tests cover registration, escaping, labels, hiding and photo slots.
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../biodata');

const NOW = '2026-10-22';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAAABJRU5ErkJggg==';
const HOSTILE = `<img src=x onerror=alert(1)>'"`;
const QUOTEY = `x" onmouseover="alert(1)" a='b' 1 < 2 & 3 > 0 \`tick\``;

const SIDEBAR = ['contemporary-professional', 'clean-minimal', 'elegant-modern', 'christian-classic'];
const BAND = ['luxury-maroon-gold', 'muslim-classic', 'sikh-classic'];
const ALL = SIDEBAR.concat(BAND);

function render(templateId, input) {
  return K.renderBiodataParts(Object.assign({ templateId, now: NOW, data: K.sampleData() }, input));
}
function count(hay, needle) { return hay.split(needle).length - 1; }

// The first-page shell (where the rail / band live) and the flow, as strings.
function parts(body) {
  const first = body.slice(body.indexOf('<template id="bd-shell-first">'), body.indexOf('<template id="bd-shell-cont">'));
  const cont = body.slice(body.indexOf('<template id="bd-shell-cont">'), body.indexOf('<div id="bd-flow"'));
  const flow = body.slice(body.indexOf('<div id="bd-flow"'), body.indexOf('<div id="bd-pages"'));
  return { first, cont, flow };
}

function hostileData(payload) {
  const d = K.sampleData();
  d.invocation = payload;
  for (const f of K.schema.FIELDS) {
    const sec = d[f.section];
    if (['text', 'textarea', 'phone', 'email'].includes(f.type)) sec[f.key] = payload;
    if (f.type === 'multiselect') sec[f.key] = [payload, 'reading'];
    if (f.type === 'list') {
      sec[f.key] = [Object.fromEntries(f.itemFields.map((i) => [i.key, i.type === 'text' ? payload : i.type === 'select' ? i.options[0] : '2010']))];
    }
  }
  for (const s of K.schema.SECTIONS) {
    d.custom[s] = [{ id: 'h', label: { en: payload, hi: payload }, value: payload }];
    d.sectionTitles[s] = { en: payload, hi: payload };
  }
  return d;
}

test('track A templates register with their archetype and valid defaults', () => {
  for (const id of ALL) {
    const def = K.registry.get(id);
    assert.ok(def, id + ' is registered');
    assert.ok(K.TEMPLATE_IDS.includes(id));
    assert.equal(def.archetype, SIDEBAR.includes(id) ? 'sidebar' : 'band', id);
    assert.ok(def.palettes.every((p) => K.palettes[p]), id + ' palettes exist');
    assert.ok(def.fonts.every((f) => K.fontPresets[f]), id + ' font presets exist');
    const out = render(id, { photoUrl: PNG });
    assert.ok(out.body.includes('bd-arch-' + def.archetype) && out.body.includes('bd-t-' + id), id + ' root classes');
    // Template CSS stays scoped.
    const own = def.css({}, K.registry.resolveDesign(def, {}));
    for (const rule of own.split('\n')) assert.ok(rule.startsWith('.bd-t-' + id + ' '), id + ': scoped rule ' + rule.slice(0, 40));
  }
  const css = render('contemporary-professional').css + render('luxury-maroon-gold').css;
  const archRules = css.split('\n').filter((r) => /^\.bd-arch-(sidebar|band)/.test(r));
  assert.ok(archRules.length > 40, 'archetype CSS present and scoped');
  assert.equal(K.registry.get('clean-minimal').style.railFill, 'none');
});

test('culture sets only the default invocation; it stays editable and uses dir="auto"', () => {
  assert.equal(K.registry.get('muslim-classic').defaults.invocation, 'بسم الله الرحمن الرحيم');
  assert.equal(K.registry.get('sikh-classic').defaults.invocation, 'ੴ ਸਤਿ ਨਾਮੁ');
  assert.equal(K.registry.get('christian-classic').defaults.invocation, 'With God’s blessings');
  for (const id of ['contemporary-professional', 'clean-minimal', 'elegant-modern', 'luxury-maroon-gold']) {
    assert.equal(K.registry.get(id).defaults.invocation, '', id + ' is culture-neutral');
  }
  const thumb = render('muslim-classic', { mode: 'thumbnail' });
  assert.ok(thumb.body.includes('dir="auto">بسم الله الرحمن الرحيم'), 'thumbnail shows the default line');
  assert.ok(!render('muslim-classic', { mode: 'pdf' }).body.includes('بسم'), 'documents use only data.invocation');
  const d = K.sampleData();
  d.invocation = 'Bismillah';
  assert.ok(render('muslim-classic', { data: d }).body.includes('dir="auto">Bismillah'));
  // Community fields come from the schema, never from the template.
  const m = K.sampleData();
  m.religion.religion = 'muslim';
  m.religion.sect = 'Sunni';
  for (const id of ['muslim-classic', 'contemporary-professional']) {
    assert.ok(render(id, { data: m }).body.includes('Sunni'), id + ' shows sect for a Muslim biodata');
  }
  assert.ok(!render('muslim-classic').body.includes('data-f="religion.sect"'));
  const s = K.sampleData();
  s.religion.religion = 'sikh';
  s.religion.amritdhari = 'yes';
  assert.ok(render('sikh-classic', { data: s }).body.includes('data-f="religion.amritdhari"'));
  const c = K.sampleData();
  c.religion.religion = 'christian';
  c.religion.denomination = 'Catholic';
  assert.ok(render('christian-classic', { data: c }).body.includes('Catholic'));
});

test('hostile strings are escaped in rails, bands, titles and CSS', () => {
  for (const id of ALL) {
    for (const labelLanguage of ['en', 'hi', 'both']) {
      for (const mode of ['preview', 'pdf', 'thumbnail']) {
        for (const payload of [HOSTILE, QUOTEY]) {
          const out = render(id, { data: hostileData(payload), design: { labelLanguage, footerText: payload }, mode, photoUrl: PNG });
          const all = out.body + out.css;
          assert.ok(!all.includes('<img src=x'), `${id}/${labelLanguage}/${mode}: raw tag`);
          assert.ok(!all.includes('onmouseover="alert'), `${id}: attribute breakout`);
          assert.ok(!all.includes("a='b'"), `${id}: single quotes`);
          assert.ok(!all.includes('1 < 2'), `${id}: lt`);
          assert.ok(!all.includes('`tick`'), `${id}: backtick`);
        }
      }
    }
  }
  // The rail and the slim band carry user text: check it arrives escaped there.
  const d = hostileData(QUOTEY);
  const sb = parts(render('contemporary-professional', { data: d }).body);
  assert.ok(sb.first.includes('bd-rail') && sb.first.includes('x&quot; onmouseover'), 'rail holds escaped values');
  const bd = parts(render('luxury-maroon-gold', { data: d }).body);
  assert.ok(bd.cont.includes('bd-slim-name">x&quot; onmouseover'), 'slim band name escaped');
  assert.ok(bd.first.includes('<h1 class="bd-name bd-name-xl">x&quot;'), 'band name escaped');
});

test('label languages: en, hi and both', () => {
  for (const id of ALL) {
    const en = render(id, { design: { labelLanguage: 'en' } });
    assert.ok(en.body.includes('Personal Details') && !en.body.includes('व्यक्तिगत विवरण'), id + ' en');
    const hi = render(id, { design: { labelLanguage: 'hi' } });
    assert.match(hi.body, /^<div class="[^"]*bd-lang-hi[^"]*" lang="hi"/, id + ' hi root');
    assert.ok(hi.body.includes('व्यक्तिगत विवरण') && !hi.body.includes('>Personal Details<'), id + ' hi titles');
    assert.ok(hi.body.includes('29 वर्ष'), id + ' hi values');
    const both = render(id, { design: { labelLanguage: 'both' } });
    assert.ok(both.body.includes('<span class="bd-en">Personal Details</span><span class="bd-hi" lang="hi">व्यक्तिगत विवरण</span>'), id + ' both');
    assert.ok(both.fontFamilies.includes('Noto Sans Devanagari'));
  }
  const rail = parts(render('clean-minimal', { design: { labelLanguage: 'both' } }).body).first;
  assert.ok(rail.includes('<span class="bd-en">At a glance</span><span class="bd-hi" lang="hi">एक नज़र में</span>'));
  assert.ok(parts(render('clean-minimal', { design: { labelLanguage: 'hi' } }).body).first.includes('<span lang="hi">एक नज़र में</span>'));
});

test('sidebar: rail facts and contact live in the rail only, never twice', () => {
  for (const id of SIDEBAR) {
    const out = render(id, { photoUrl: PNG });
    const p = parts(out.body);
    assert.ok(p.first.includes('<aside class="bd-rail">'), id + ' rail on page 1');
    assert.ok(p.cont.includes('bd-strip') && !p.cont.includes('bd-rail') && !p.cont.includes('<img'), id + ' continuation: strip, no photo');
    assert.ok(p.cont.includes('bd-runhead'), id + ' running head on continuation pages');
    for (const f of ['personal.age', 'personal.heightCm', 'contact.phone', 'contact.email']) {
      assert.equal(count(out.body, `data-f="${f}"`), 1, `${id}: ${f} rendered once`);
      assert.ok(p.first.includes(`data-f="${f}"`), `${id}: ${f} in the rail`);
    }
    assert.ok(p.first.includes('<img'), id + ' photo in the rail');
    assert.ok(p.flow.includes('<h1 class="bd-name">Aarav Rathod</h1>'), id + ' name in the main column');
    // Every visible sample row is rendered exactly once somewhere.
    const ctx = K.makeRenderContext({ data: K.schema.clean(K.sampleData()).data, def: K.registry.get(id),
      design: K.registry.resolveDesign(id, {}), photoUrl: '', mode: 'pdf', now: NOW, theme: { sp: 1 } });
    for (const sec of K.schema.SECTIONS) {
      for (const r of ctx.rows(sec)) {
        const n = r.kind === 'prose' ? r.paras.length : 1; // one block per paragraph
        assert.equal(count(out.body, `data-f="${r.id}"`), n, `${id}: ${r.id} once`);
      }
    }
  }
});

test('sidebar: long values stay out of the rail and the rail budget shrinks with scale', () => {
  const d = K.sampleDataLong();
  const out = render('contemporary-professional', { data: d, photoUrl: PNG });
  const p = parts(out.body);
  assert.ok(!p.first.includes('data-f="contact.address"'), 'multi-line address stays in the main column');
  assert.ok(p.flow.includes('data-f="contact.address"'));
  assert.ok(!p.first.includes('data-f="education.highest"'), '80-character value stays in the main column');
  const railCount = (design) => (parts(render('contemporary-professional', { data: K.sampleData(), photoUrl: PNG, design }).body).first.match(/class="bd-rf"/g) || []).length;
  assert.ok(railCount({ scale: 1.15, spacing: 'relaxed', labelLanguage: 'both' }) <= railCount({}), 'bigger type, fewer rail rows');
  assert.ok(railCount({ photoPlacement: 'none' }) >= railCount({}), 'no photo, room for more');
});

test('band: header band on page 1, slim band and one column later, two wells on page 1', () => {
  for (const id of BAND) {
    const out = render(id, { photoUrl: PNG });
    const p = parts(out.body);
    assert.ok(p.first.includes('bd-band bd-band-full') && p.first.includes('<img'), id + ' band with photo');
    assert.equal(count(p.first, 'class="bd-well"'), 2, id + ' two wells on page 1');
    assert.ok(p.cont.includes('bd-band-slim') && p.cont.includes('Aarav Rathod') && !p.cont.includes('<img'), id + ' slim band');
    assert.equal(count(p.cont, 'class="bd-well"'), 1, id + ' one full-width column after page 1');
    assert.ok(!p.flow.includes('bd-name'), id + ' name lives in the band, not in the flow');
  }
  assert.ok(render('sikh-classic', { photoUrl: PNG }).body.includes('bd-band-photo-left'), 'sikh default photo on the left');
  assert.ok(render('sikh-classic', { photoUrl: PNG, design: { photoPlacement: 'band-right' } }).body.includes('bd-band-photo-right'));
  for (const [id, pat] of [['luxury-maroon-gold', 'circle cx'], ['muslim-classic', 'rect x'], ['sikh-classic', 'path d']]) {
    const css = render(id).css;
    assert.match(css, /background-image:url\("data:image\/svg\+xml,[^"]+"\)/, id + ' pattern tile');
    assert.ok(decodeURIComponent(css.match(/data:image\/svg\+xml,([^"]+)"/)[1]).includes(pat), id + ' distinct tile');
  }
});

test('hidden sections and fields are respected in chrome', () => {
  const d = K.sampleData();
  d.hiddenFields = ['contact.phone', 'contact.whatsapp', 'personal.age'];
  for (const id of ALL) {
    const out = render(id, { data: d, design: { hiddenSections: ['family', 'income'] } });
    assert.ok(!out.body.includes('98765'), id + ' phones hidden');
    assert.ok(!out.body.includes('data-f="personal.age"'), id + ' age hidden');
    assert.ok(!out.body.includes('data-sec="family"') && !out.body.includes('Shri Ramesh Rathod'), id + ' family hidden');
    assert.ok(!out.body.includes('Lakh per annum'), id + ' income hidden (also from the rail)');
    const noContact = render(id, { design: { hiddenSections: ['contact'] } });
    assert.ok(!noContact.body.includes('example.com') && !noContact.body.includes('98765'), id + ' contact section hidden everywhere');
    assert.ok(!noContact.body.includes('data-sec="contact"'));
  }
});

test('photo: none, rejected and every shape', () => {
  for (const id of ALL) {
    assert.ok(!render(id).body.includes('<img'), id + ' no photo given');
    assert.ok(!render(id, { photoUrl: PNG, design: { photoPlacement: 'none' } }).body.includes('<img'), id + ' placement none');
    assert.deepEqual(render(id, { photoUrl: 'javascript:alert(1)' }).warnings, ['PHOTO_REJECTED']);
    for (const photoShape of K.schema.PHOTO_SHAPES) {
      assert.ok(render(id, { photoUrl: PNG, design: { photoShape } }).body.includes('bd-shape-' + photoShape), `${id} ${photoShape}`);
    }
    const out = render(id, { photoUrl: PNG, design: { photoPlacement: 'top-right' } });
    assert.equal(out.body.includes('<img'), true, id + ' unknown placement falls back to the template default');
  }
});

test('archetype style options are validated', () => {
  const base = () => JSON.parse(JSON.stringify(Object.assign({}, K.registry.get('clean-minimal'), { css: undefined })));
  const before = K.registry.list().length;
  const bad = [
    Object.assign(base(), { id: 'ta-1', slug: 'ta-1', style: { railFill: 'stripes' } }),
    Object.assign(base(), { id: 'ta-2', slug: 'ta-2', style: { railFacts: ['personal.nope'] } }),
    Object.assign(base(), { id: 'ta-3', slug: 'ta-3', style: { wobble: true } }),
    Object.assign(base(), { id: 'ta-4', slug: 'ta-4', photoPlacements: ['band-right', 'none'] }),
    Object.assign(base(), { id: 'ta-5', slug: 'ta-5', archetype: 'band', photoPlacements: ['band-left', 'none'], style: { pattern: 'paisley' } }),
    Object.assign(base(), { id: 'ta-6', slug: 'ta-6', archetype: 'band', photoPlacements: ['band-left', 'none'], style: { patternOpacity: 2 } }),
  ];
  bad[3].defaults.photoPlacement = 'band-right';
  bad[4].defaults.photoPlacement = 'band-left';
  bad[5].defaults.photoPlacement = 'band-left';
  for (const def of bad) assert.throws(() => K.registry.register(def), (e) => e.code === 'INVALID_TEMPLATE', def.id);
  assert.equal(K.registry.list().length, before);
});
