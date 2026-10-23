'use strict';
// Node entry: require('@banjaramatch/shared/biodata').
// Loads every bundled kit file in bundle order (templates register themselves)
// and adds the Node-only extras. No I/O, timers or globals at require time.
const path = require('node:path');
const order = require('./bundle-order');
const K = require('./_ns');

for (const rel of order) require(path.join(__dirname, rel));

K.fontsDir = path.join(__dirname, 'fonts');
K.bundleFiles = order.map((rel) => path.join(__dirname, rel));

module.exports = K;
