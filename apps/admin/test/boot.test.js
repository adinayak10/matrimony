'use strict';
// Boot test: every router of the admin server must require() cleanly without
// the API or network. server.js is skipped because it binds a port.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['routes', 'middleware', 'lib', 'config'];

process.env.NODE_ENV = 'test';
process.env.API_BASE_URL = 'http://127.0.0.1:4002';
process.env.API_INTERNAL_URL = 'http://127.0.0.1:4002';
process.env.API_PUBLIC_URL = 'https://api.banjaramatch.com';
process.env.SESSION_TTL_HOURS = '8';

function listJs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => listJs(path.join(ROOT, d))).sort();

test('admin: module list is not empty', () => {
  assert.ok(files.length > 0, 'no modules found under ' + DIRS.join(', '));
});

for (const file of files) {
  const rel = path.relative(ROOT, file);
  test(`admin: require ${rel}`, () => {
    assert.doesNotThrow(() => require(file), `${rel} failed to load`);
  });
}
