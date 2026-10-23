'use strict';
// Boot test: every module the API loads at startup must require() cleanly
// without Mongo, Firebase credentials or network. This catches the failure
// class a deploy would hit (missing module, syntax error, bad top-level code).
//
// Skipped on purpose (they bind ports, connect or start timers at require time):
//   index.js             creates the http server, connects to Mongo, listens
//   db.js                connects to Mongo when connectDB() is called by index.js
//   schedular/           node-cron schedules jobs at require time (process never exits)
//   schemas/             legacy duplicates of models/ (re-register User/Setting -> OverwriteModelError); nothing requires them
//   tools/               one-off maintenance scripts, not part of the server
// socket.js is loaded transitively by services/*; it only exports functions at
// require time.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIRS = ['routes', 'controllers', 'models', 'middleware', 'services', 'util', 'utils', 'enum'];

// Throwaway environment: a real RSA key so firebase-admin's cert() accepts the
// fake service account, and a scratch cwd so multer's mkdir never touches the repo.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-api-boot-'));
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const saPath = path.join(tmp, 'service-account.json');
fs.writeFileSync(saPath, JSON.stringify({
  type: 'service_account',
  project_id: 'test',
  private_key_id: 'test-key',
  private_key: privateKey,
  client_email: 'test@test.iam.gserviceaccount.com',
  client_id: '0',
  token_uri: 'https://oauth2.googleapis.com/token',
}));

process.env.NODE_ENV = 'test';
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = saPath;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'boot-test-secret-boot-test-secret-0000';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/bm_boot_test';
process.env.BLOG_IMAGE_DIR = path.join(tmp, 'blog-images');
process.env.FRONTEND_URL = 'http://127.0.0.1:4000';
process.env.SITEMAP_REGEN_URL = 'http://127.0.0.1:4000/api/regenerate-sitemap';
process.chdir(tmp);

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

test('api: module list is not empty', () => {
  assert.ok(files.length > 0, 'no modules found under ' + DIRS.join(', '));
});

for (const file of files) {
  const rel = path.relative(ROOT, file);
  test(`api: require ${rel}`, () => {
    assert.doesNotThrow(() => require(file), `${rel} failed to load`);
  });
}

test('api: fake service account is used, not a real key', () => {
  assert.equal(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, saPath);
});
