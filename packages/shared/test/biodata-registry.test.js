'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const K = require('../biodata');

const DIR = path.join(__dirname, '..', 'biodata');

test('registry: ids and slugs unique, known ids, defaults valid', () => {
  const list = K.registry.list();
  assert.ok(list.length >= 2);
  const ids = list.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(list.map((d) => d.slug)).size, ids.length);
  assert.ok(ids.includes(K.DEFAULT_TEMPLATE));
  for (const def of list) {
    assert.ok(K.TEMPLATE_IDS.includes(def.id), `${def.id} is a contract template id`);
    assert.equal(def.thumbnail, `/images/biodata/${def.id}.webp`);
    const d = K.registry.resolveDesign(def, {});
    assert.equal(d.palette, def.defaults.palette);
    assert.equal(d.font, def.defaults.font);
    assert.equal(d.photoPlacement, def.defaults.photoPlacement);
    assert.deepEqual(d.sectionOrder, def.defaults.sectionOrder);
    assert.deepEqual(Object.keys(d).sort(), K.schema.DESIGN_KEYS.slice().sort());
    assert.ok(def.categories.every((c) => K.registry.CATEGORIES.some((x) => x.slug === c)));
  }
  assert.equal(K.registry.get('nope'), null);
  assert.equal(K.registry.get('__proto__'), null);
  assert.equal(K.registry.get('premium-traditional').defaults.invocation, '', 'neutral template has no invocation');
  assert.equal(K.registry.get('print-bw').printSafe, true);
});

test('categories', () => {
  assert.deepEqual(K.registry.CATEGORIES.map((c) => c.slug), ['traditional', 'modern', 'minimal', 'premium', 'photo', 'community', 'regional', 'print-friendly']);
  for (const c of K.registry.CATEGORIES) assert.ok(c.name && c.description);
});

test('summary rows are JSON-safe', () => {
  const rows = K.registry.summary();
  assert.deepEqual(JSON.parse(JSON.stringify(rows)), rows);
  for (const r of rows) {
    for (const k of ['id', 'slug', 'name', 'tagline', 'categories', 'culture', 'archetype', 'palettes', 'fonts', 'photoPlacements', 'defaults', 'thumbnail']) {
      assert.ok(r[k] !== undefined, `${r.id}.${k}`);
    }
    assert.equal(typeof r.name, 'string');
  }
});

test('resolveDesign merges cleaned user design over defaults', () => {
  const d = K.registry.resolveDesign('premium-traditional', { palette: 'emerald-gold', scale: 9, evil: 1, palette2: 'x' });
  assert.equal(d.palette, 'emerald-gold');
  assert.equal(d.scale, 1.15);
  assert.equal(d.shareContact, false);
  assert.equal(K.registry.resolveDesign('premium-traditional', { palette: 'ink' }).palette, 'maroon-gold');
  assert.throws(() => K.registry.resolveDesign('nope', {}), (e) => e.code === 'UNKNOWN_TEMPLATE');
});

test('register validates definitions', () => {
  const good = () => JSON.parse(JSON.stringify(Object.assign({}, K.registry.get('print-bw'), { css: undefined })));
  const bad = [
    Object.assign(good(), { id: 'print-bw' }),
    Object.assign(good(), { id: 'Bad Id' }),
    Object.assign(good(), { id: 'x-1', slug: K.registry.get('print-bw').slug }),
    Object.assign(good(), { id: 'x-2', slug: 'x-2', archetype: 'nope' }),
    Object.assign(good(), { id: 'x-3', slug: 'x-3', palettes: ['nope'] }),
    Object.assign(good(), { id: 'x-4', slug: 'x-4', categories: ['nope'] }),
    Object.assign(good(), { id: 'x-5', slug: 'x-5', photoPlacements: ['left-rail'] }),
    Object.assign(good(), { id: 'x-6', slug: 'x-6', name: { en: 'X' } }),
    Object.assign(good(), { id: 'x-7', slug: 'x-7', style: { frame: 'zigzag' } }),
    Object.assign(good(), { id: 'x-8', slug: 'x-8', ornaments: { divider: 'nope' } }),
    Object.assign(good(), { id: 'x-9', slug: 'x-9', css: 'body{}' }),
  ];
  const d1 = good(); d1.id = 'x-10'; d1.slug = 'x-10'; d1.defaults.palette = 'maroon-gold'; bad.push(d1);
  const d2 = good(); d2.id = 'x-11'; d2.slug = 'x-11'; d2.defaults.sectionOrder = ['personal']; bad.push(d2);
  const d3 = good(); d3.id = 'x-12'; d3.slug = 'x-12'; d3.defaults.scale = 2; bad.push(d3);
  const before = K.registry.list().length;
  for (const def of bad) assert.throws(() => K.registry.register(def), /Biodata template|register/, def.id);
  assert.equal(K.registry.list().length, before, 'nothing registered');
});

function walk(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

test('bundle-order lists every kit file exactly once', () => {
  const order = require('../biodata/bundle-order');
  assert.equal(new Set(order).size, order.length, 'no duplicates');
  const NODE_ONLY = new Set(['_ns.js', 'index.js', 'bundle-order.js']);
  const files = walk(DIR).filter((f) => !f.startsWith('content/') && !f.startsWith('fonts/') && !/(^|\/)README\.md$/.test(f) && !NODE_ONLY.has(f));
  assert.deepEqual(files.slice().sort(), order.slice().sort());
  assert.deepEqual(K.bundleFiles, order.map((f) => path.join(DIR, f)));
  const firstTemplate = order.findIndex((f) => f.startsWith('templates/'));
  assert.ok(order.slice(0, firstTemplate).every((f) => !f.startsWith('templates/')));
  assert.ok(order.findIndex((f) => f.startsWith('archetypes/')) < firstTemplate);
  for (const f of order) {
    const src = fs.readFileSync(path.join(DIR, f), 'utf8');
    assert.match(src, /\(typeof module === 'object' && module\.exports \? require\('\.\.\/_ns'\) : \(window\.BiodataKit = window\.BiodataKit \|\| \{\}\)\);\s*$/, `${f} wrapper`);
    assert.ok(!/\?\.|\?\?|^\s*class\s/m.test(src.replace(/'[^'\n]*'|"[^"\n]*"|\/\/.*$/gm, '')), `${f} stays ES2017`);
  }
  assert.equal(K.fontsDir, path.join(DIR, 'fonts'));
});

test('requiring the kit has no side effects beyond registration', () => {
  const script = `
    void process.stdout; void process.stderr;
    const before = new Set(Object.getOwnPropertyNames(globalThis));
    const timers = () => process.getActiveResourcesInfo().filter((r) => /Timeout|Immediate|Interval/.test(r)).length;
    const handles = timers();
    const K = require(${JSON.stringify(path.join(DIR, 'index.js'))});
    const added = Object.getOwnPropertyNames(globalThis).filter((k) => !before.has(k));
    process.stdout.write(JSON.stringify({ added, handles: timers() - handles, n: K.registry.list().length,
      win: typeof window }));`;
  const out = JSON.parse(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' }));
  assert.deepEqual(out.added, []);
  assert.equal(out.handles, 0);
  assert.equal(out.win, 'undefined');
  assert.ok(out.n >= 2);
  assert.equal(require('@banjaramatch/shared/biodata'), K, 'package subpath resolves to the same kit');
});
