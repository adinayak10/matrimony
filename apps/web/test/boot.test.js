'use strict';
// Boot test: every server-side module of the web app must require() cleanly
// without the API or network. app.js itself is skipped because it binds a port
// and schedules sitemap generation; routes/index.js only needs
// express/jsonwebtoken/axios at require time.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['routes', 'utils', 'models'];

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'boot-test-secret-boot-test-secret-0000';
process.env.AUTH_SERVER_URL = 'http://127.0.0.1:4002';
process.env.API_URL = 'http://127.0.0.1:4002';

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

test('web: module list is not empty', () => {
  assert.ok(files.length > 0, 'no modules found under ' + DIRS.join(', '));
});

for (const file of files) {
  const rel = path.relative(ROOT, file);
  test(`web: require ${rel}`, () => {
    assert.doesNotThrow(() => require(file), `${rel} failed to load`);
  });
}

test('web: sitemap generators read API_URL from the environment', () => {
  const src = fs.readFileSync(path.join(ROOT, 'utils', 'generateBlogSitemap.js'), 'utf8')
    + fs.readFileSync(path.join(ROOT, 'utils', 'generateRegionalSitemap.js'), 'utf8');
  assert.match(src, /process\.env\.API_URL/);
});
