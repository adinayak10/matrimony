#!/usr/bin/env node
// Env sanity check (B3.30, integrator #5/#11/#12). Prints key NAMES only,
// never values.
//
//   node deploy/check-env.js             server mode: SHARED/env/*.env vs apps/*/.env.example + rules
//   node deploy/check-env.js --examples  CI mode: every process.env.X read under apps/<x> is listed
//                                        in apps/<x>/.env.example (a missing example fails and lists the keys)
//   --strict                             warnings (a JWT_SECRET shorter than 32 chars, pending the Phase 2
//                                        rotation) count as failures
//
// Server rules: every example key present; PORT 4000/4002/4001; HOST=127.0.0.1;
// JWT_SECRET >= 32 chars and not a known default, identical in web+api,
// absent from admin; every *_URL/*_URI value is loopback (http://127.0.0.1:
// or mongodb://127.0.0.1:) except *PUBLIC* keys, which must be https://;
// deploy.env: WEBHOOK_SECRET >= 32 chars, WEBHOOK_PORT=4003.
const fs = require('fs');
const path = require('path');

const REPO = process.env.BM_REPO || path.resolve(__dirname, '..');
const SHARED = process.env.BM_SHARED || '/var/www/banjaramatch-shared';
const APPS = { web: 4000, api: 4002, admin: 4001 };
const DEFAULT_SECRETS = new Set([
  'your_jwt_secret', 'your_admin_jwt_secret', 'secret', 'changeme', 'change_me', 'jwt_secret', 'your_secret_key',
]);
// Set by pm2 (ecosystem.config.js), never expected in a .env file.
const PM2_PROVIDED = new Set(['RELEASE_SHA']);

const STRICT = process.argv.includes('--strict');
const problems = [];
const warnings = [];
const notes = [];
const fail = (m) => problems.push(m);
const warn = (m) => (STRICT ? problems : warnings).push(m);
const ok = (m) => notes.push(m);

function parseEnv(file) {
  const out = new Map();
  if (!fs.existsSync(file)) return null;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.replace(/^\s*export\s+/, '');
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, '');
    out.set(m[1], v);
  }
  return out;
}

function exampleKeys(app) {
  const file = app === 'deploy' ? path.join(REPO, 'deploy', '.env.example') : path.join(REPO, 'apps', app, '.env.example');
  const parsed = parseEnv(file);
  return parsed ? [...parsed.keys()] : null;
}

function checkUrls(app, env) {
  for (const [k, v] of env) {
    if (!/(_URL|_URI)$/.test(k) || !v) continue;
    if (/PUBLIC/.test(k)) {
      if (!/^https:\/\//.test(v)) fail(`${app}.env ${k} must be a public https:// URL`);
      else ok(`${app}.env ${k} is https`);
      continue;
    }
    if (!/^(http|mongodb):\/\/127\.0\.0\.1[:/]/.test(v)) {
      fail(`${app}.env ${k} must point at 127.0.0.1 (Node 22 resolves localhost to ::1 first)`);
    } else {
      ok(`${app}.env ${k} is loopback 127.0.0.1`);
    }
  }
}

function serverMode() {
  const envs = {};
  for (const app of Object.keys(APPS)) {
    const file = path.join(SHARED, 'env', `${app}.env`);
    const env = parseEnv(file);
    if (!env) { fail(`${file} is missing`); continue; }
    envs[app] = env;
    const keys = exampleKeys(app);
    if (!keys) {
      fail(`apps/${app}/.env.example is missing (cannot verify ${app}.env is complete)`);
    } else {
      const missing = keys.filter((k) => !PM2_PROVIDED.has(k) && !env.has(k));
      if (missing.length) fail(`${app}.env is missing: ${missing.join(', ')}`);
      else ok(`${app}.env has every key of apps/${app}/.env.example (${keys.length})`);
      const empty = keys.filter((k) => env.has(k) && env.get(k) === '');
      if (empty.length) ok(`${app}.env empty values (allowed): ${empty.join(', ')}`);
    }
    if (env.get('PORT') !== String(APPS[app])) fail(`${app}.env PORT must be ${APPS[app]}`);
    else ok(`${app}.env PORT=${APPS[app]}`);
    if (env.get('HOST') !== '127.0.0.1') fail(`${app}.env HOST must be 127.0.0.1`);
    if (env.get('NODE_ENV') !== 'production') fail(`${app}.env NODE_ENV must be production`);
    checkUrls(app, env);
  }

  // JWT_SECRET: api is the source of truth; web must match while it still
  // verifies tokens locally (until D10); admin never holds it.
  if (envs.api) {
    const s = envs.api.get('JWT_SECRET') || '';
    if (!s) fail('api.env JWT_SECRET is missing');
    else if (DEFAULT_SECRETS.has(s.toLowerCase())) fail('api.env JWT_SECRET is a default value');
    else if (s.length < 32) warn(`api.env JWT_SECRET is only ${s.length} chars; rotate to openssl rand -hex 48 (Phase 2)`);
    else ok(`api.env JWT_SECRET set (${s.length} chars)`);
    if (envs.web) {
      if (!envs.web.has('JWT_SECRET')) fail('web.env JWT_SECRET is missing (web verifies tokens locally until D10)');
      else if (envs.web.get('JWT_SECRET') !== s) fail('web.env JWT_SECRET differs from api.env');
      else ok('JWT_SECRET identical in web.env and api.env');
    }
  }
  if (envs.admin && envs.admin.has('JWT_SECRET')) fail('admin.env must not contain JWT_SECRET (admin never verifies tokens)');
  else if (envs.admin) ok('admin.env has no JWT_SECRET');
  if (envs.api) {
    const fsa = envs.api.get('FIREBASE_SERVICE_ACCOUNT_PATH');
    if (fsa && !fs.existsSync(fsa)) fail('api.env FIREBASE_SERVICE_ACCOUNT_PATH does not exist');
    const bid = envs.api.get('BLOG_IMAGE_DIR');
    if (bid && !fs.existsSync(bid)) fail('api.env BLOG_IMAGE_DIR does not exist');
  }

  const dep = parseEnv(path.join(SHARED, 'env', 'deploy.env'));
  if (!dep) fail(`${SHARED}/env/deploy.env is missing`);
  else {
    const keys = exampleKeys('deploy');
    if (keys) {
      const missing = keys.filter((k) => !dep.has(k));
      if (missing.length) ok(`deploy.env lacks optional keys: ${missing.join(', ')}`);
    }
    if ((dep.get('WEBHOOK_SECRET') || '').length < 32) fail('deploy.env WEBHOOK_SECRET must be at least 32 characters');
    else ok('deploy.env WEBHOOK_SECRET set');
    if (dep.get('WEBHOOK_PORT') !== '4003') fail('deploy.env WEBHOOK_PORT must be 4003');
    const days = Number(dep.get('BACKUP_RETENTION_DAYS') || 14);
    if (!(days >= 7)) fail('deploy.env BACKUP_RETENTION_DAYS must be >= 7');
  }
}

function walk(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'public', 'build', 'views', '.git', 'dist'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.isFile() && /\.(js|cjs|mjs)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

function examplesMode() {
  for (const app of Object.keys(APPS)) {
    const dir = path.join(REPO, 'apps', app);
    if (!fs.existsSync(dir)) { fail(`apps/${app} does not exist`); continue; }
    const used = new Set();
    for (const file of walk(dir, [])) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/process\.env(?:\.([A-Za-z_][A-Za-z0-9_]*)|\[\s*['"]([A-Za-z_][A-Za-z0-9_]*)['"]\s*\])/g)) {
        used.add(m[1] || m[2]);
      }
    }
    const keys = exampleKeys(app);
    const wanted = [...used].filter((k) => !PM2_PROVIDED.has(k)).sort();
    if (!keys) {
      fail(`apps/${app}/.env.example is missing; keys read by the code: ${wanted.join(', ') || '(none)'}`);
      continue;
    }
    const missing = wanted.filter((k) => !keys.includes(k));
    if (missing.length) fail(`apps/${app}/.env.example lacks: ${missing.join(', ')}`);
    else ok(`apps/${app}: ${wanted.length} process.env keys all listed in .env.example`);
  }
}

if (process.argv.includes('--examples')) examplesMode();
else serverMode();

for (const n of notes) console.log(`ok    ${n}`);
for (const w of warnings) console.log(`WARN  ${w}`);
for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `check-env: ${problems.length} problem(s)` : `check-env: OK${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
process.exit(problems.length ? 1 : 0);
