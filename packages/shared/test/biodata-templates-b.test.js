'use strict';
// Track B templates: frame (royal-heritage, elegant-floral), hero
// (photo-focused) and classic (classic-family, hindu-classic,
// regional-adaptable), plus the thumbnail presence check.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const K = require('../biodata');

const NOW = '2026-10-22';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const HOSTILE = `<img src=x onerror=alert(1)>'"`;
const QUOTEY = `x" onmouseover="alert(1)" a='b' 1 < 2 & 3 > 0`;

const EXPECT = {
  'royal-heritage': 'frame',
  'elegant-floral': 'frame',
  'photo-focused': 'hero',
  'classic-family': 'classic',
  'hindu-classic': 'classic',
  'regional-adaptable': 'classic',
};
const IDS = Object.keys(EXPECT);

function render(input) {
  return K.renderBiodataParts(Object.assign({ now: NOW }, input));
}

function hostileData(payload) {
  const d = K.sampleData();
  d.invocation = payload;
  for (const f of K.schema.FIELDS) {
    const sec = d[f.section];
    if (['text', 'textarea', 'phone', 'email'].includes(f.type)) sec[f.key] = payload;
    if (f.type === 'multiselect') sec[f.key] = [payload, 'reading'];
  }
  for (const s of K.schema.SECTIONS) {
    d.custom[s] = [{ id: 'h', label: { en: payload, hi: payload }, value: payload }];
    d.sectionTitles[s] = { en: payload, hi: payload };
  }
  return d;
}

test('track B templates register with the right archetype and valid defaults', () => {
  for (const [id, arch] of Object.entries(EXPECT)) {
    const def = K.registry.get(id);
    assert.ok(def, `${id} registered`);
    assert.equal(def.archetype, arch, `${id} archetype`);
    assert.ok(K.TEMPLATE_IDS.includes(id));
    assert.ok(K.archetypes[arch], `${arch} archetype loaded`);
    for (const p of def.palettes) assert.ok(K.palettes[p], `${id} palette ${p}`);
    for (const role of Object.keys(def.ornaments)) assert.ok(K.ornaments[def.ornaments[role]], `${id} ornament ${role}`);
    const out = render({ templateId: id, data: K.sampleData() });
    assert.ok(out.body.includes(`bd-arch-${arch}`) && out.body.includes(`bd-t-${id}`));
    assert.ok(out.css.includes(`.bd-t-${id} `), `${id} template css present`);
  }
  assert.deepEqual(K.archetypes.frame.photoSlots, ['top-center', 'top-right']);
  assert.deepEqual(K.archetypes.hero.photoSlots, ['hero']);
});

test('archetype and template CSS stays scoped', () => {
  for (const id of IDS) {
    const def = K.registry.get(id);
    for (const labelLanguage of ['en', 'both']) {
      const design = K.registry.resolveDesign(def, { labelLanguage });
      const theme = { vars: K.palettes[design.palette].vars };
      const archCss = K.archetypes[def.archetype].css(theme, def, design);
      for (const rule of archCss.split('\n').filter(Boolean)) {
        assert.ok(rule.includes(`.bd-arch-${def.archetype}`), `${id} archetype rule unscoped: ${rule.slice(0, 80)}`);
      }
      const tCss = def.css ? def.css(theme, design) : '';
      for (const rule of tCss.split('\n').filter(Boolean)) {
        assert.ok(rule.startsWith(`.bd-t-${id}`), `${id} template rule unscoped: ${rule.slice(0, 80)}`);
      }
    }
  }
});

test('hostile strings are escaped in every track B template, mode and language', () => {
  for (const id of IDS) {
    for (const labelLanguage of ['en', 'hi', 'both']) {
      for (const mode of ['preview', 'pdf', 'thumbnail']) {
        for (const payload of [HOSTILE, QUOTEY]) {
          for (const photoUrl of [PNG, '']) {
            const out = render({ templateId: id, data: hostileData(payload), design: { labelLanguage, footerText: payload }, mode, photoUrl });
            const all = out.body + out.css;
            assert.ok(!all.includes('<img src=x'), `${id}/${labelLanguage}/${mode}: raw tag`);
            assert.ok(!all.includes('onmouseover="alert'), `${id}/${labelLanguage}/${mode}: attribute breakout`);
            assert.ok(!all.includes("a='b'"), `${id}: single quote`);
            assert.ok(!all.includes('1 < 2'), `${id}: lt`);
          }
        }
      }
    }
  }
});

test('label modes: en has no Hindi labels, hi and both emit lang="hi"', () => {
  for (const id of IDS) {
    const en = render({ templateId: id, data: K.sampleData(), design: { labelLanguage: 'en' } });
    assert.ok(!en.body.includes('व्यक्तिगत विवरण'), `${id} en`);
    assert.ok(en.body.includes('Personal Details'), `${id} en title`);
    const hi = render({ templateId: id, data: K.sampleData(), design: { labelLanguage: 'hi' } });
    assert.match(hi.body, /^<div class="[^"]*bd-lang-hi[^"]*" lang="hi"/, `${id} hi root`);
    assert.ok(hi.body.includes('व्यक्तिगत विवरण') && hi.body.includes('29 वर्ष'), `${id} hi labels and values`);
    const both = render({ templateId: id, data: K.sampleData(), design: { labelLanguage: 'both' } });
    assert.ok(both.body.includes('Personal Details') && both.body.includes('lang="hi"'), `${id} both`);
    assert.ok(both.fontFamilies.includes('Noto Sans Devanagari'), `${id} both loads Devanagari`);
  }
  assert.equal(K.registry.get('regional-adaptable').defaults.labelLanguage, 'both');
  assert.ok(render({ templateId: 'regional-adaptable', data: K.sampleData() }).body.includes('bd-lang-both'));
});

test('hidden sections and fields stay hidden (including the hero facts strip)', () => {
  for (const id of IDS) {
    const d = K.sampleData();
    d.hiddenFields = ['personal.dob', 'personal.age', 'contact.phone', 'contact.whatsapp'];
    const out = render({ templateId: id, data: d, design: { hiddenSections: ['family', 'income', 'education', 'contact'] }, photoUrl: PNG });
    for (const sec of ['family', 'income', 'education', 'contact']) assert.ok(!out.body.includes(`data-sec="${sec}"`), `${id} ${sec}`);
    assert.ok(!out.body.includes('Ramesh Rathod (') && !out.body.includes('Shri Ramesh Rathod'), `${id} family values`);
    assert.ok(!out.body.includes('Lakh per annum'), `${id} income`);
    assert.ok(!out.body.includes('14 March 1997') && !out.body.includes('29 years'), `${id} dob and age hidden`);
    assert.ok(!out.body.includes('98765'), `${id} phones hidden`);
    assert.ok(!out.body.includes('Post-graduate (M.Tech)'), `${id} education gone from facts`);
    assert.ok(out.body.includes('data-sec="personal"'));
  }
});

test('photo and no photo', () => {
  for (const id of IDS) {
    const def = K.registry.get(id);
    const withPhoto = render({ templateId: id, data: K.sampleData(), photoUrl: PNG });
    assert.ok(withPhoto.body.includes('<img src="data:image/png'), `${id} photo shown`);
    assert.ok(!withPhoto.body.includes('bd-photo-none'), `${id} photo class`);
    for (const placement of def.photoPlacements) {
      const out = render({ templateId: id, data: K.sampleData(), photoUrl: PNG, design: { photoPlacement: placement } });
      assert.equal(out.body.includes('<img '), placement !== 'none', `${id} ${placement}`);
    }
    const none = render({ templateId: id, data: K.sampleData() });
    assert.ok(!none.body.includes('<img '), `${id} no img`);
    assert.ok(none.body.includes('bd-photo-none'));
    const bad = render({ templateId: id, data: K.sampleData(), photoUrl: 'javascript:alert(1)' });
    assert.ok(!bad.body.includes('<img ') && bad.warnings.includes('PHOTO_REJECTED'), `${id} bad photo dropped`);
  }
  // Hero: photo cover vs typographic monogram cover.
  const hero = render({ templateId: 'photo-focused', data: K.sampleData(), photoUrl: PNG });
  assert.ok(hero.body.includes('bd-hero-photo') && hero.body.includes('bd-facts') && !hero.body.includes('bd-monogram'));
  const plain = render({ templateId: 'photo-focused', data: K.sampleData() });
  assert.ok(plain.body.includes('bd-hero-plain') && plain.body.includes('<span>AR</span>'));
  assert.ok(plain.body.includes('bd-facts') && plain.body.includes('Software Engineer'), 'facts strip without a photo too');
});

test('frame repeats on every page shell; hero chrome only on page 1', () => {
  for (const id of ['royal-heritage', 'elegant-floral']) {
    const out = render({ templateId: id, data: K.sampleData(), photoUrl: PNG });
    const first = out.body.match(/<template id="bd-shell-first">[\s\S]*?<\/template>/)[0];
    const cont = out.body.match(/<template id="bd-shell-cont">[\s\S]*?<\/template>/)[0];
    for (const shell of [first, cont]) {
      assert.ok(shell.includes('class="bd-fr"'), `${id} frame`);
      assert.equal((shell.match(/bd-fcorner-/g) || []).length, 4, `${id} four corners`);
    }
    assert.ok(cont.includes('bd-runhead'), `${id} running head`);
  }
  const out = render({ templateId: 'photo-focused', data: K.sampleData(), photoUrl: PNG });
  const first = out.body.match(/<template id="bd-shell-first">[\s\S]*?<\/template>/)[0];
  const cont = out.body.match(/<template id="bd-shell-cont">[\s\S]*?<\/template>/)[0];
  assert.ok(first.includes('bd-hero') && !cont.includes('bd-hero'));
  assert.ok(cont.includes('bd-runhead') && cont.includes('bd-edge'));
});

test('classic-family puts family first; order stays user-editable', () => {
  const def = K.registry.get('classic-family');
  assert.equal(def.defaults.sectionOrder[0], 'family');
  assert.deepEqual(def.defaults.sectionOrder.slice().sort(), K.schema.SECTIONS.slice().sort());
  const out = render({ templateId: 'classic-family', data: K.sampleData() });
  const pos = (s) => out.body.indexOf(`data-sec="${s}"`);
  assert.ok(pos('family') > 0 && pos('family') < pos('personal') && pos('personal') < pos('education'));
  const custom = render({ templateId: 'classic-family', data: K.sampleData(), design: { sectionOrder: ['personal', 'family'] } });
  assert.ok(custom.body.indexOf('data-sec="personal"') < custom.body.indexOf('data-sec="family"'));
});

test('culture only sets the default invocation; data and religion drive the rest', () => {
  const def = K.registry.get('hindu-classic');
  assert.equal(def.defaults.invocation, '॥ श्री गणेशाय नमः ॥');
  for (const id of ['royal-heritage', 'elegant-floral', 'photo-focused', 'classic-family', 'regional-adaptable']) {
    assert.equal(K.registry.get(id).defaults.invocation, '', `${id} has no invocation`);
  }
  // Preview/PDF use only data.invocation: empty stays empty, edits win.
  const d = K.sampleData();
  assert.ok(!render({ templateId: 'hindu-classic', data: d }).body.includes('bd-invocation'));
  d.invocation = 'Shubh Vivah';
  const own = render({ templateId: 'hindu-classic', data: d }).body;
  assert.ok(own.includes('>Shubh Vivah<') && !own.includes('गणेशाय'));
  assert.ok(render({ templateId: 'hindu-classic', data: K.sampleData(), mode: 'thumbnail' }).body.includes('गणेशाय'));
  // Hindu fields follow religion, not the template.
  const c = K.sampleData();
  c.religion.religion = 'christian';
  c.religion.denomination = 'Catholic';
  const out = render({ templateId: 'hindu-classic', data: c }).body;
  assert.ok(!out.includes('data-f="religion.raasi"') && out.includes('Catholic'));
  const h = render({ templateId: 'royal-heritage', data: K.sampleData() }).body;
  assert.ok(h.includes('data-f="religion.gotra"'), 'gotra shown for hindu data on a neutral template');
});

test('frame and hero style options are validated', () => {
  const base = (id, extra) => Object.assign(JSON.parse(JSON.stringify(Object.assign({}, K.registry.get(id), { css: undefined }))), extra);
  const bad = [
    base('royal-heritage', { id: 'x-b1', slug: 'x-b1', style: { border: 'zigzag' } }),
    base('royal-heritage', { id: 'x-b2', slug: 'x-b2', style: { cornerSize: 80 } }),
    base('royal-heritage', { id: 'x-b3', slug: 'x-b3', style: { nope: 1 } }),
    base('royal-heritage', { id: 'x-b4', slug: 'x-b4', photoPlacements: ['hero'] }),
    base('photo-focused', { id: 'x-b5', slug: 'x-b5', style: { heroHeight: 300 } }),
    base('photo-focused', { id: 'x-b6', slug: 'x-b6', photoPlacements: ['top-right'] }),
    base('hindu-classic', { id: 'x-b7', slug: 'x-b7', style: { titleStyle: 'wavy' } }),
  ];
  const before = K.registry.list().length;
  for (const def of bad) assert.throws(() => K.registry.register(def), (e) => e.code === 'INVALID_TEMPLATE', def.id);
  assert.equal(K.registry.list().length, before);
});

test('new ornaments render as decorative SVG', () => {
  for (const key of ['filigree', 'floral', 'scroll', 'vine', 'paisley', 'marigold', 'bloom']) {
    const html = K.ornament(key, 'x');
    assert.match(html, /^<span class="bd-orn bd-orn-[a-z]+ x" aria-hidden="true"><svg /, key);
    assert.ok(!/<script|on[a-z]+=|href=/i.test(html), `${key} is inert`);
  }
  for (const id of ['rose-sage', 'sage-rose', 'mauve-sage', 'midnight-gold', 'wine-gold', 'saffron-maroon', 'deccan-maroon',
    'rajasthani-pink', 'punjabi-saffron', 'kerala-green', 'bengal-red']) {
    const p = K.palettes[id];
    assert.ok(p && p.name, id);
    for (const v of ['primary', 'accent', 'ink', 'muted', 'paper', 'rule', 'band', 'bandInk']) assert.match(p.vars[v], /^#[0-9a-f]{6}$/, `${id}.${v}`);
  }
});

test('every registered template has a thumbnail file (run apps/web/scripts/biodata-thumbnails.js after adding one)', () => {
  const dir = path.join(__dirname, '..', '..', '..', 'apps', 'web', 'public', 'images', 'biodata');
  for (const def of K.registry.list()) {
    assert.ok(fs.existsSync(path.join(dir, `${def.id}.webp`)), `${def.id}.webp`);
    assert.ok(fs.existsSync(path.join(dir, `${def.id}@2x.webp`)), `${def.id}@2x.webp`);
  }
  assert.ok(fs.existsSync(path.join(dir, 'og-biodata-maker.jpg')), 'og image');
});
