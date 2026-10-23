'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../biodata');

const S = K.schema;

test('constants match the contract', () => {
  assert.deepEqual(S.STEPS, ['personal', 'photo', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional', 'design']);
  assert.deepEqual(S.SECTIONS, ['personal', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional']);
  assert.deepEqual(S.DEFAULT_ORDER, S.SECTIONS);
  assert.deepEqual(S.DESIGN_KEYS, ['palette', 'font', 'scale', 'spacing', 'photoPlacement', 'photoShape', 'sectionOrder', 'hiddenSections', 'labelLanguage', 'footerText', 'shareContact']);
  assert.equal(S.LIMITS.customPerSection, 6);
  assert.equal(S.LIMITS.customTotal, 20);
  assert.equal(S.LIMITS.maxDataBytes, 65536);
  assert.equal(S.LIMITS.titleMax, 80);
});

test('emptyData has the contract shape', () => {
  const d = S.emptyData();
  assert.equal(d.invocation, '');
  assert.deepEqual(d.hiddenFields, []);
  assert.deepEqual(Object.keys(d.personal), ['fullName', 'gender', 'dob', 'ageOverride', 'birthTime', 'birthPlace', 'heightCm', 'weightKg', 'complexion', 'bloodGroup', 'maritalStatus', 'childrenDetails', 'motherTongue', 'languages', 'nationality', 'about']);
  assert.deepEqual(Object.keys(d.family), ['fatherName', 'fatherOccupation', 'motherName', 'motherOccupation', 'siblings', 'familyType', 'familyStatus', 'familyValues', 'nativePlace', 'familyAbout']);
  assert.deepEqual(Object.keys(d.education), ['highest', 'degrees', 'details']);
  assert.deepEqual(Object.keys(d.profession), ['occupation', 'employer', 'designation', 'workLocation', 'details']);
  assert.deepEqual(Object.keys(d.income), ['amount', 'period', 'currency', 'text', 'familyIncomeText']);
  assert.deepEqual(Object.keys(d.religion), ['religion', 'caste', 'subCaste', 'gotra', 'motherGotra', 'clan', 'tanda', 'raasi', 'nakshatra', 'manglik', 'sect', 'denomination', 'church', 'amritdhari', 'note']);
  assert.deepEqual(Object.keys(d.lifestyle), ['diet', 'smoking', 'drinking', 'hobbies', 'interests']);
  assert.deepEqual(Object.keys(d.partner), ['ageMin', 'ageMax', 'heightMinCm', 'heightMaxCm', 'education', 'profession', 'location', 'maritalStatus', 'religionCaste', 'other']);
  assert.deepEqual(Object.keys(d.contact), ['contactPerson', 'relation', 'phone', 'altPhone', 'whatsapp', 'email', 'address', 'city', 'state', 'country', 'bestTime']);
  assert.deepEqual(Object.keys(d.additional), ['horoscopeNote', 'expectations', 'note']);
  assert.deepEqual(Object.keys(d.custom), S.SECTIONS);
  assert.deepEqual(d.sectionTitles, {});
  assert.notEqual(S.emptyData().personal, d.personal, 'fresh object every call');
});

test('FIELDS are well formed and privacy flags are set', () => {
  const ids = new Set();
  for (const f of S.FIELDS) {
    assert.ok(!ids.has(f.id), `duplicate ${f.id}`);
    ids.add(f.id);
    assert.equal(f.id, `${f.section}.${f.key}`);
    assert.ok(['text', 'textarea', 'select', 'multiselect', 'date', 'time', 'height', 'number', 'income', 'phone', 'email', 'list'].includes(f.type), f.id);
    if (f.type === 'text' || f.type === 'textarea') assert.ok(f.max > 0 && f.max <= 600, `${f.id} max`);
    if (f.type === 'select' || f.type === 'multiselect') assert.ok(Array.isArray(f.options) && f.options.length, `${f.id} options`);
    if (f.type === 'list') assert.ok(f.itemFields.length && f.maxItems > 0, f.id);
  }
  for (const id of ['personal.dob', 'personal.birthTime', 'contact.phone', 'contact.altPhone', 'contact.whatsapp', 'contact.email', 'contact.address']) {
    assert.equal(S.field(id).privacy, true, id);
  }
  assert.deepEqual(S.FIELDS.filter((f) => f.required).map((f) => f.id), ['personal.fullName', 'personal.gender', 'personal.dob']);
  assert.ok(S.field('religion.religion').options.includes('hindu') && S.field('religion.religion').options.includes('other'));
});

test('conditional fields follow religion and marital status', () => {
  const d = S.emptyData();
  const when = (id) => S.isApplicable(S.field(id), d);
  assert.equal(when('personal.childrenDetails'), false);
  d.personal.maritalStatus = 'divorced';
  assert.equal(when('personal.childrenDetails'), true);
  d.religion.religion = 'hindu';
  assert.equal(when('religion.gotra'), true);
  assert.equal(when('religion.sect'), false);
  d.religion.religion = 'muslim';
  assert.equal(when('religion.gotra'), false);
  assert.equal(when('religion.manglik'), false);
  assert.equal(when('religion.sect'), true);
  d.religion.religion = 'christian';
  assert.equal(when('religion.denomination'), true);
  assert.equal(when('religion.church'), true);
  d.religion.religion = 'sikh';
  assert.equal(when('religion.amritdhari'), true);
  assert.equal(when('religion.raasi'), true);
  assert.equal(when('religion.clan'), true, 'Banjara fields are always available');
  assert.equal(when('religion.tanda'), true);
});

test('clean drops unknown keys, trims, strips tags and control characters', () => {
  const { data, errors } = S.clean({
    evil: 1,
    __proto__x: 2,
    personal: { fullName: '  <b>Aarav</b>   Rathod <img src=x onerror=alert(1)> ', hacked: 'x', about: 'Line one\u0007\r\n\r\n\r\n\r\nLine two  ', gender: 'male' },
    contact: { phone: '+91 98765-43210', email: ' a@b.co ' },
  });
  assert.equal(data.evil, undefined);
  assert.equal(data.personal.hacked, undefined);
  assert.equal(data.personal.fullName, 'Aarav Rathod');
  assert.equal(data.personal.about, 'Line one\n\nLine two', 'newlines kept (collapsed) only in multiline fields');
  assert.equal(data.contact.phone, '+91 98765-43210');
  assert.equal(data.contact.email, 'a@b.co');
  assert.deepEqual(errors, []);
});

test('clean keeps newlines out of single-line fields and enforces max lengths', () => {
  const { data } = S.clean({ personal: { fullName: 'A\nB', birthPlace: 'x'.repeat(500), about: 'y'.repeat(5000) } });
  assert.equal(data.personal.fullName, 'A B');
  assert.equal(data.personal.birthPlace.length, S.field('personal.birthPlace').max);
  assert.equal(data.personal.about.length, S.field('personal.about').max);
});

test('clean coerces numbers and rejects bad enums, dates and numbers', () => {
  const { data, errors } = S.clean({
    personal: { heightCm: 170.4, weightKg: '72', ageOverride: '300', dob: '1996-02-30', birthTime: '6:05', gender: 'robot', maritalStatus: 'never_married' },
    income: { amount: '12,00,000' },
    lifestyle: { hobbies: ['reading', 'Reading', 'Trekking', '<b>x</b>'], diet: 'vegetarian' },
  });
  assert.equal(data.personal.heightCm, '170');
  assert.equal(data.personal.weightKg, '72');
  assert.equal(data.personal.ageOverride, '');
  assert.equal(data.personal.dob, '');
  assert.equal(data.personal.birthTime, '06:05');
  assert.equal(data.personal.gender, '');
  assert.equal(data.personal.maritalStatus, 'never_married');
  assert.equal(data.income.amount, '1200000');
  assert.deepEqual(data.lifestyle.hobbies, ['reading', 'Trekking', 'x']);
  const paths = errors.map((e) => e.path).sort();
  assert.deepEqual(paths, ['personal.ageOverride', 'personal.dob', 'personal.gender']);
  assert.ok(errors.every((e) => e.code === 'VALIDATION_ERROR' && e.message));
});

test('clean: phone and email format errors are soft and keep the value', () => {
  const { data, errors } = S.clean({ contact: { phone: '123', email: 'not-an-email' } });
  assert.equal(data.contact.phone, '123');
  assert.equal(data.contact.email, 'not-an-email');
  assert.equal(errors.length, 2);
  assert.ok(errors.every((e) => e.soft === true));
});

test('clean: lists drop empty items and cap the count', () => {
  const sib = { relation: 'brother', maritalStatus: 'married', details: 'x' };
  const { data } = S.clean({ family: { siblings: [sib, {}, { relation: 'nope' }, ...Array(20).fill(sib)] } });
  assert.equal(data.family.siblings.length, S.field('family.siblings').maxItems);
  assert.deepEqual(data.family.siblings[0], sib);
});

test('clean caps custom fields per section and in total', () => {
  const item = (i) => ({ id: 'c' + i, label: { en: 'L<script>' + i, hi: 'हि' }, value: 'v' + i });
  const per = S.clean({ custom: { personal: Array.from({ length: 9 }, (_, i) => item(i)) } });
  assert.equal(per.data.custom.personal.length, 6);
  assert.ok(per.errors.some((e) => e.code === 'TOO_MANY_CUSTOM_FIELDS'));
  assert.equal(per.data.custom.personal[0].label.en, 'L0');
  const custom = {};
  for (const s of S.SECTIONS) custom[s] = Array.from({ length: 4 }, (_, i) => item(i));
  const tot = S.clean({ custom });
  const n = S.SECTIONS.reduce((a, s) => a + tot.data.custom[s].length, 0);
  assert.equal(n, 20);
  assert.ok(tot.errors.some((e) => e.code === 'TOO_MANY_CUSTOM_FIELDS'));
  const bogus = S.clean({ custom: { nosuch: [item(1)] } });
  assert.equal(bogus.data.custom.nosuch, undefined);
});

test('clean filters hiddenFields and sectionTitles', () => {
  const { data } = S.clean({
    hiddenFields: ['personal.dob', 'personal.dob', 'evil.field', 42, 'personal.age'],
    sectionTitles: { family: { en: '<i>My</i> Family', hi: 'परिवार' }, nosuch: { en: 'x' }, contact: { en: '', hi: '' } },
  });
  assert.deepEqual(data.hiddenFields, ['personal.dob', 'personal.age']);
  assert.deepEqual(data.sectionTitles, { family: { en: 'My Family', hi: 'परिवार' } });
});

test('clean never throws on junk input', () => {
  for (const junk of [null, undefined, 42, 'str', [], { personal: 'x' }, { personal: { languages: { a: 1 } } }]) {
    const r = S.clean(junk);
    assert.ok(r.data.personal && Array.isArray(r.errors));
  }
});

test('validate reports required fields and contact rule', () => {
  const v = S.validate(S.emptyData(), '2026-10-22');
  assert.ok(v['personal.fullName'] && v['personal.gender'] && v['personal.dob']);
  assert.ok(v['contact.phone']);
  const ok = S.validate(K.sampleData(), '2026-10-22');
  assert.deepEqual(ok, {});
  const d = K.sampleData();
  d.contact.phone = ''; d.contact.email = 'x@';
  d.personal.dob = '2015-01-01';
  d.partner.ageMin = '30'; d.partner.ageMax = '25';
  const bad = S.validate(d, '2026-10-22');
  assert.ok(bad['contact.email']);
  assert.ok(bad['personal.dob']);
  assert.ok(bad['partner.ageMax']);
});

test('stepStatus', () => {
  const empty = S.emptyData();
  assert.equal(S.stepStatus(empty, 'personal'), 'empty');
  assert.equal(S.stepStatus(empty, 'design'), 'complete');
  assert.equal(S.stepStatus(empty, 'photo'), 'empty');
  const d = S.emptyData();
  d.personal.fullName = 'A';
  assert.equal(S.stepStatus(d, 'personal'), 'partial');
  const s = K.sampleData();
  for (const sec of S.SECTIONS) assert.equal(S.stepStatus(s, sec, '2026-10-22'), 'complete', sec);
});

test('cleanDesign allowlists keys and clamps values', () => {
  const r = S.cleanDesign({
    palette: 'maroon-gold', font: 'nope', scale: 3, spacing: 'compact', photoPlacement: 'top-center', photoShape: 'circle',
    sectionOrder: ['contact', 'personal', 'contact', 'bogus'], hiddenSections: ['family', 'x'], labelLanguage: 'both',
    footerText: '<b>Shubh</b> ' + 'x'.repeat(200), shareContact: 'true', evil: 1,
  }, 'premium-traditional');
  assert.deepEqual(r.errors.map((e) => [e.path, e.code]), [['design.evil', 'UNKNOWN_DESIGN_KEY']]);
  const d = r.design;
  assert.equal(d.palette, 'maroon-gold');
  assert.equal(d.font, undefined, 'font not offered by the template is dropped');
  assert.equal(d.scale, 1.15);
  assert.equal(S.cleanDesign({ scale: 0.1 }).design.scale, 0.85);
  assert.equal(d.spacing, 'compact');
  assert.equal(d.photoPlacement, 'top-center');
  assert.equal(d.photoShape, 'circle');
  assert.deepEqual(d.sectionOrder, ['contact', 'personal', 'family', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'additional']);
  assert.deepEqual(d.hiddenSections, ['family']);
  assert.equal(d.labelLanguage, 'both');
  assert.ok(d.footerText.startsWith('Shubh x') && d.footerText.length <= 80);
  assert.equal(d.shareContact, true);
  assert.equal(S.cleanDesign({ labelLanguage: 'fr', palette: 'ink' }, 'premium-traditional').design.labelLanguage, undefined);
  assert.equal(S.cleanDesign({ palette: 'ink' }, 'premium-traditional').design.palette, undefined, 'palette must be offered by the template');
  assert.deepEqual(S.cleanDesign('x').errors.map((e) => e.code), ['VALIDATION_ERROR']);
  assert.deepEqual(S.cleanDesign(null), { design: {}, errors: [] });
});

test('sampleData is valid, clearly fictional, and sampleDataLong hits every max', () => {
  for (const g of ['male', 'female']) {
    const s = K.sampleData(g);
    const r = S.clean(s);
    assert.deepEqual(r.errors, [], g);
    assert.deepEqual(r.data, s, 'sample survives clean unchanged');
    assert.match(s.additional.note, /fictional/i);
    assert.match(s.contact.email, /@example\.com$/);
  }
  const long = K.sampleDataLong();
  const c = S.clean(long);
  assert.deepEqual(c.errors, []);
  for (const f of S.FIELDS) {
    if (f.type === 'textarea' || f.type === 'text') assert.ok(c.data[f.section][f.key].length >= f.max - 2, f.id);
  }
});

test('labels: every field, section and enum value has English and Hindi', () => {
  const dev = /[ऀ-ॿ]/;
  for (const s of S.STEPS) {
    assert.ok(K.labels.en.sections[s], s);
    assert.match(K.labels.hi.sections[s], dev, s);
  }
  const ids = [];
  for (const f of S.FIELDS) {
    ids.push(f.id);
    if (f.itemFields) f.itemFields.forEach((i) => ids.push(i.id));
    for (const opt of f.options || []) {
      const key = (f.enumKey || f.key) + '.' + opt;
      assert.ok(K.labels.en.values[f.enumKey || f.key][opt], 'en ' + key);
      assert.ok(K.labels.hi.values[f.enumKey || f.key][opt], 'hi ' + key);
    }
    for (const i of f.itemFields || []) {
      for (const opt of i.options || []) assert.ok(K.labels.hi.values[i.enumKey][opt], i.id + opt);
    }
  }
  for (const id of ids.concat(S.DERIVED_IDS)) {
    assert.ok(K.labels.en.fields[id], 'en ' + id);
    assert.match(K.labels.hi.fields[id], dev, 'hi ' + id);
  }
  assert.equal(K.labels.hi.months.length, 12);
  assert.equal(K.labels.hi.fields['personal.heightCm'], 'ऊँचाई');
  assert.equal(K.labels.hi.sections.personal, 'व्यक्तिगत विवरण');
  assert.equal(K.t('hi', 'values', 'diet.vegetarian'), 'शाकाहारी');
  assert.equal(K.t('hi', 'fields', 'no.such'), 'no.such');
  assert.equal(K.label('fields', 'personal.dob', 'hi'), '<span lang="hi">जन्म तिथि</span>');
  assert.match(K.label('fields', 'personal.dob', 'both'), /Date of Birth.*lang="hi">जन्म तिथि/);
});
