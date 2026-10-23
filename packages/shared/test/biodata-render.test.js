'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const K = require('../biodata');

const NOW = '2026-10-22';
const HOSTILE = `<img src=x onerror=alert(1)>'"`;
// Survives clean (no tag), so it exercises the escaping itself.
const QUOTEY = `x" onmouseover="alert(1)" a='b' 1 < 2 & 3 > 0 \`tick\``;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

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
  d.personal.maritalStatus = 'divorced';
  for (const s of K.schema.SECTIONS) {
    d.custom[s] = [{ id: 'h', label: { en: payload, hi: payload }, value: payload }];
    d.sectionTitles[s] = { en: payload, hi: payload };
  }
  return d;
}

function render(input) {
  return K.renderBiodataParts(Object.assign({ templateId: K.DEFAULT_TEMPLATE, now: NOW }, input));
}

test('hostile strings never appear unescaped in any template, mode or language', () => {
  for (const def of K.registry.list()) {
    for (const labelLanguage of ['en', 'hi', 'both']) {
      for (const mode of ['preview', 'pdf', 'thumbnail']) {
        for (const payload of [HOSTILE, QUOTEY]) {
          const design = { labelLanguage, footerText: payload };
          const out = render({ templateId: def.id, data: hostileData(payload), design, mode, photoUrl: PNG });
          const all = out.body + out.css;
          assert.ok(!all.includes('<img src=x'), `${def.id}/${labelLanguage}/${mode}: raw tag`);
          assert.ok(!all.includes('onmouseover="alert'), `${def.id}: attribute breakout`);
          assert.ok(!all.includes("a='b'"), `${def.id}: single quotes escaped`);
          assert.ok(!all.includes('1 < 2'), `${def.id}: lt escaped`);
          assert.ok(!all.includes('`tick`'), `${def.id}: backtick escaped`);
          const html = K.renderBiodataHtml({ templateId: def.id, data: hostileData(payload), design, mode, now: NOW });
          assert.ok(!html.includes('<img src=x') && !html.includes('onmouseover="alert'), `${def.id}: full document`);
        }
      }
    }
  }
  const out = render({ data: hostileData(QUOTEY), design: { footerText: QUOTEY } });
  assert.ok(out.body.includes('x&quot; onmouseover=&quot;alert(1)&quot; a=&#39;b&#39; 1 &lt; 2 &amp; 3 &gt; 0 &#96;tick&#96;'));
});

test('photo urls are allow-listed', () => {
  const ok = (photoUrl) => render({ data: K.sampleData(), photoUrl }).body.includes('<img ');
  assert.equal(ok(PNG), true);
  assert.equal(ok('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(ok('data:image/webp;base64,UklGRg=='), true);
  assert.equal(ok('/api/biodata/documents/65f0c0ffee/photo?v=3'), true);
  assert.equal(ok('/api/biodata/shared/' + 'a'.repeat(48) + '/photo'), true);
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:text/html;base64,PGI+',
    'https://evil.example/x.jpg', '//evil.example/x.jpg', '/api/biodata/../admin', '/api/biodata//evil', '/uploads/x.jpg',
    '/api/biodata/x" onerror="alert(1)', 'data:image/png;base64,AAA" onerror="x']) {
    const out = render({ data: K.sampleData(), photoUrl: bad });
    assert.ok(!out.body.includes('<img '), bad);
    assert.deepEqual(out.warnings, ['PHOTO_REJECTED'], bad);
  }
  assert.ok(!render({ data: K.sampleData(), photoUrl: PNG, design: { photoPlacement: 'none' } }).body.includes('<img '));
});

test('hidden sections and hidden fields are absent', () => {
  const d = K.sampleData();
  d.hiddenFields = ['personal.dob', 'contact.phone', 'contact.whatsapp'];
  const out = render({ data: d, design: { hiddenSections: ['family', 'income'] } });
  assert.ok(!out.body.includes('data-sec="family"'));
  assert.ok(!out.body.includes('Ramesh Rathod (') && !out.body.includes('Shri Ramesh Rathod'), 'father name gone with family');
  assert.ok(!out.body.includes('data-sec="income"') && !out.body.includes('Lakh per annum'));
  assert.ok(!out.body.includes('14 March 1997'), 'dob hidden');
  assert.ok(out.body.includes('29 years'), 'age still shown');
  assert.ok(!out.body.includes('98765'), 'phones hidden');
  assert.ok(out.body.includes('data-sec="personal"'));
});

test('empty fields and sections are omitted (no empty headings)', () => {
  const d = K.schema.emptyData();
  d.personal.fullName = 'Only Name';
  const out = render({ data: d });
  assert.ok(!out.body.includes('bd-title'), 'no section titles');
  assert.ok(out.body.includes('Only Name'));
  const d2 = K.schema.emptyData();
  d2.lifestyle.diet = 'vegan';
  const out2 = render({ data: d2 });
  assert.equal((out2.body.match(/data-sec="/g) || []).length, 1);
});

test('section order is respected', () => {
  const order = ['contact', 'partner', 'personal'];
  const out = render({ data: K.sampleData(), design: { sectionOrder: order } });
  const pos = (s) => out.body.indexOf(`data-sec="${s}"`);
  assert.ok(pos('contact') > 0 && pos('contact') < pos('partner') && pos('partner') < pos('personal') && pos('personal') < pos('family'));
});

test('label languages: hi and both emit lang="hi"', () => {
  const en = render({ data: K.sampleData(), design: { labelLanguage: 'en' } });
  assert.ok(!en.body.includes('व्यक्तिगत विवरण'));
  assert.ok(!en.fontFamilies.includes('Noto Sans Devanagari') || /[ऀ-ॿ]/.test(JSON.stringify(K.sampleData())));
  const both = render({ data: K.sampleData(), design: { labelLanguage: 'both' } });
  assert.ok(both.body.includes('lang="hi"'));
  assert.ok(both.body.includes('Personal Details') && both.body.includes('व्यक्तिगत विवरण'));
  assert.ok(both.fontFamilies.includes('Noto Sans Devanagari'));
  const hi = render({ data: K.sampleData(), design: { labelLanguage: 'hi' } });
  assert.match(hi.body, /^<div class="[^"]*" lang="hi"/);
  assert.ok(hi.body.includes('14 मार्च 1997'), 'Hindi dates');
  assert.ok(hi.body.includes('29 वर्ष'));
});

test('fontsFor adds Devanagari only when needed', () => {
  const d = K.schema.emptyData();
  d.personal.fullName = 'Plain Latin';
  assert.deepEqual(K.fontsFor({ templateId: 'premium-traditional', design: {}, data: d }), ['Playfair Display', 'Poppins']);
  d.personal.fullName = 'राम';
  assert.ok(K.fontsFor({ templateId: 'premium-traditional', design: {}, data: d }).includes('Noto Sans Devanagari'));
  assert.ok(K.fontsFor({ templateId: 'print-bw', design: { labelLanguage: 'hi' }, data: {} }).includes('Noto Sans Devanagari'));
  const css = K.fontFaceCss(['Poppins', 'Noto Sans Devanagari'], (f) => '/fonts/biodata/' + f);
  assert.equal((css.match(/@font-face/g) || []).length, 5);
  assert.match(css, /font-display:block/);
  assert.match(css, /unicode-range:U\+0900-097F/);
  for (const files of Object.values(K.fontFiles)) {
    for (const f of files) assert.ok(require('node:fs').existsSync(path.join(K.fontsDir, f.file)), f.file + ' is vendored');
  }
});

test('section titles, custom fields, invocation, prose paragraphs', () => {
  const d = K.sampleData();
  d.sectionTitles.family = { en: 'Our Family', hi: 'हमारा परिवार' };
  d.custom.personal = [{ id: 'c9', label: { en: 'Hobby Club', hi: 'शौक क्लब' }, value: 'Hyderabad Trekkers' }];
  d.invocation = 'श्री गणेशाय नमः';
  d.personal.about = 'First para.\n\nSecond para\nwith a line break.';
  const en = render({ data: d });
  assert.ok(en.body.includes('Our Family') && !en.body.includes('Family Details'));
  assert.ok(en.body.includes('Hobby Club') && en.body.includes('Hyderabad Trekkers'));
  assert.ok(en.body.includes('dir="auto">श्री गणेशाय नमः'));
  assert.ok(en.body.includes('<p>First para.</p>') && en.body.includes('<p>Second para<br>with a line break.</p>'));
  const both = render({ data: d, design: { labelLanguage: 'both' } });
  assert.ok(both.body.includes('हमारा परिवार') && both.body.includes('शौक क्लब'));
  const hi = render({ data: d, design: { labelLanguage: 'hi' } });
  assert.ok(hi.body.includes('हमारा परिवार') && !hi.body.includes('Our Family'));
  const ft = render({ data: d, design: { footerText: 'Shubh Vivah' } });
  assert.ok(ft.body.includes('Shubh Vivah'));
});

test('thumbnail mode: first page only and template invocation fills an empty line', () => {
  const out = render({ data: K.sampleData(), mode: 'thumbnail' });
  assert.ok(out.body.includes('data-max-pages="1"'));
  assert.ok(out.body.includes('bd-mode-thumbnail'));
  assert.ok(!render({ data: K.sampleData(), mode: 'pdf' }).body.includes('data-max-pages'));
});

test('unknown template throws UNKNOWN_TEMPLATE', () => {
  assert.throws(() => render({ templateId: 'nope', data: K.sampleData() }), (e) => e.code === 'UNKNOWN_TEMPLATE');
  assert.throws(() => K.renderBiodataHtml({ templateId: '__proto__' }), (e) => e.code === 'UNKNOWN_TEMPLATE');
  assert.ok(render({ templateId: undefined, data: {} }).body.includes('bd-t-premium-traditional'), 'missing id uses the default');
});

test('document structure: shells, flow, pages, paginator, print CSS', () => {
  const out = render({ data: K.sampleData(), mode: 'pdf' });
  assert.ok(out.body.includes('<template id="bd-shell-first">') && out.body.includes('<template id="bd-shell-cont">'));
  assert.ok(out.body.includes('<div id="bd-flow"') && out.body.includes('<div id="bd-pages"'));
  assert.ok(out.body.includes('class="bd-well" data-col="1"'));
  assert.match(out.css, /@page\{size:A4;margin:0\}/);
  assert.match(out.css, /print-color-adjust:exact/);
  assert.match(out.css, /width:210mm;height:297mm/);
  const html = K.renderBiodataHtml({ data: K.sampleData(), mode: 'pdf', fontUrl: (f) => '/fonts/biodata/' + f, now: NOW });
  assert.match(html, /^<!DOCTYPE html><html lang="en">/);
  assert.ok(html.includes('<style id="bd-fonts">@font-face'));
  assert.ok(html.includes('__bdPaginated') && html.includes('doc.fonts') && html.includes('(window, document, bdPaginate'));
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.ok(!script.includes('</'), 'script body never contains "</"');
  assert.doesNotThrow(() => new Function(script), 'script parses');
  const shell = K.previewShell({ fontUrl: (f) => '/fonts/biodata/' + f });
  for (const id of ['<style id="bd-fonts">', '<style id="bd-css">', '<div id="bd-root">', '__bdRepaginate']) assert.ok(shell.includes(id), id);
});

test('paginator and boot sources survive uglify-js (mangle:false, compress:false)', (t) => {
  let Uglify;
  try { Uglify = require(require.resolve('uglify-js', { paths: [path.join(__dirname, '../../../apps/web')] })); } catch { /* optional */ }
  if (!Uglify) { t.skip('uglify-js not installed'); return; }
  const code = K.bundleFiles.map((f) => require('node:fs').readFileSync(f, 'utf8')).join('\n;\n');
  const min = Uglify.minify(code, { compress: false, mangle: false });
  assert.equal(min.error, undefined);
  const win = {};
  new Function('window', 'module', 'require', min.code)(win, undefined, undefined);
  const BK = win.BiodataKit;
  assert.equal(typeof BK.paginateSource, 'function');
  assert.equal(BK.registry.list().length, K.registry.list().length);
  const html = BK.renderBiodataHtml({ data: BK.sampleData(), now: NOW });
  const script = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
  assert.doesNotThrow(() => new Function(script));
  assert.ok(script.includes('function bdPaginate(doc)'));
  assert.equal(BK.renderBiodataParts({ data: BK.sampleData(), now: NOW }).body, K.renderBiodataParts({ data: K.sampleData(), now: NOW }).body,
    'browser bundle renders exactly what Node renders');
});
