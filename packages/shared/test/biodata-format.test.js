'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const K = require('../biodata');

const { fmt } = K;

test('computeAge counts completed calendar years', () => {
  assert.equal(fmt.computeAge('1996-03-14', '2026-03-14'), 30, 'on the birthday');
  assert.equal(fmt.computeAge('1996-03-14', '2026-03-13'), 29, 'the day before');
  assert.equal(fmt.computeAge('1996-03-14', '2026-12-31'), 30);
  assert.equal(fmt.computeAge('2026-10-22', '2026-10-22'), 0, 'born today');
});

test('computeAge handles 29 February', () => {
  assert.equal(fmt.computeAge('2000-02-29', '2027-02-28'), 26, 'common year: not yet on 28 Feb');
  assert.equal(fmt.computeAge('2000-02-29', '2027-03-01'), 27, 'common year: counts from 1 Mar');
  assert.equal(fmt.computeAge('2000-02-29', '2028-02-29'), 28, 'leap year: on the day');
});

test('computeAge rejects invalid and future dates', () => {
  for (const bad of ['', null, undefined, '1996-02-30', '1996-13-01', '14/03/1996', '1996-3-4', 'abc', 19960314]) {
    assert.equal(fmt.computeAge(bad, '2026-01-01'), null, String(bad));
  }
  assert.equal(fmt.computeAge('2030-01-01', '2026-01-01'), null, 'future');
  assert.equal(fmt.computeAge('2026-01-02', '2026-01-01'), null, 'tomorrow');
  assert.equal(fmt.computeAge('1996-03-14', new Date(2026, 2, 14)), 30, 'Date objects use the local calendar day');
});

test('displayAge: override wins only when 1..100', () => {
  const d = (dob, ageOverride) => ({ personal: { dob, ageOverride } });
  assert.deepEqual(fmt.displayAge(d('1996-03-14', '28'), '2026-10-22'), { value: 28, source: 'override' });
  assert.deepEqual(fmt.displayAge(d('1996-03-14', ''), '2026-10-22'), { value: 30, source: 'dob' });
  assert.deepEqual(fmt.displayAge(d('1996-03-14', '0'), '2026-10-22'), { value: 30, source: 'dob' });
  assert.deepEqual(fmt.displayAge(d('1996-03-14', '101'), '2026-10-22'), { value: 30, source: 'dob' });
  assert.deepEqual(fmt.displayAge(d('', ''), '2026-10-22'), { value: null, source: null });
  assert.deepEqual(fmt.displayAge({}, '2026-10-22'), { value: null, source: null });
});

test('formatDate in English and Hindi', () => {
  assert.equal(fmt.formatDate('1996-03-14', { lang: 'en' }), '14 March 1996');
  assert.equal(fmt.formatDate('1996-03-14', { lang: 'hi' }), '14 मार्च 1996');
  assert.equal(fmt.formatDate('1996-03-04', { lang: 'en', style: 'short' }), '4 Mar 1996');
  assert.equal(fmt.formatDate('1996-03-04', { style: 'numeric' }), '04/03/1996');
  assert.equal(fmt.formatDate('1996-02-30'), '');
  assert.equal(fmt.formatDate(''), '');
});

test('formatTime', () => {
  assert.equal(fmt.formatTime('06:45', 'en'), '6:45 AM');
  assert.equal(fmt.formatTime('00:05', 'en'), '12:05 AM');
  assert.equal(fmt.formatTime('12:00', 'en'), '12:00 PM');
  assert.equal(fmt.formatTime('17:20', 'hi'), '5:20 अपराह्न');
  assert.equal(fmt.formatTime('25:00', 'en'), '');
});

test('heights convert both ways and format', () => {
  assert.deepEqual(fmt.cmToFtIn(170), { ft: 5, inch: 7 });
  assert.deepEqual(fmt.cmToFtIn(183), { ft: 6, inch: 0 });
  assert.equal(fmt.ftInToCm(5, 7), 170);
  assert.equal(fmt.ftInToCm(6, 0), 183);
  assert.equal(fmt.cmToFtIn(''), null);
  assert.equal(fmt.formatHeight(170, 'both'), `5' 7" (170 cm)`);
  assert.equal(fmt.formatHeight('170', 'ft'), `5' 7"`);
  assert.equal(fmt.formatHeight(170, 'cm'), '170 cm');
  assert.equal(fmt.formatHeight('', 'both'), '');
});

test('Indian grouping and income in Lakh / Crore without Intl', () => {
  assert.equal(fmt.groupIndian(123456789), '12,34,56,789');
  assert.equal(fmt.groupIndian(1000), '1,000');
  assert.equal(fmt.groupIndian(999), '999');
  assert.equal(fmt.groupWestern(1234567), '1,234,567');
  assert.equal(fmt.formatIncome({ amount: '85000', currency: 'inr', period: 'monthly' }, 'en'), '₹85,000 per month');
  assert.equal(fmt.formatIncome({ amount: '1200000', currency: 'inr', period: 'annual' }, 'en'), '₹12 Lakh per annum');
  assert.equal(fmt.formatIncome({ amount: '1850000', period: 'annual' }, 'en'), '₹18.5 Lakh per annum');
  assert.equal(fmt.formatIncome({ amount: '25000000', period: 'annual' }, 'hi'), '₹2.5 करोड़ प्रति वर्ष');
  assert.equal(fmt.formatIncome({ amount: '120000', currency: 'usd', period: 'annual' }, 'en'), '$120,000 per annum');
  assert.equal(fmt.formatIncome({ amount: '', text: 'Will share on request' }, 'en'), 'Will share on request');
  assert.equal(fmt.formatIncome({ amount: '900000', text: 'plus bonus' }, 'en'), '₹9 Lakh · plus bonus');
  assert.equal(fmt.formatIncome({}, 'en'), '');
});

test('formatRange', () => {
  assert.equal(fmt.formatRange('24', '28', 'years', 'en'), '24 – 28 years');
  assert.equal(fmt.formatRange('28', '24', 'years', 'en'), '24 – 28 years', 'swapped ends are ordered');
  assert.equal(fmt.formatRange('24', '', 'years', 'en'), '24 years and above');
  assert.equal(fmt.formatRange('', '30', 'years', 'hi'), '30 वर्ष तक');
  assert.equal(fmt.formatRange('152', '168', 'height', 'en'), `5' 0" – 5' 6"`);
  assert.equal(fmt.formatRange('', '', 'years'), '');
});
