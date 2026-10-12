'use strict';
/**
 * tools/_guard.js — shared safety rail for every maintenance script (A4.7).
 *
 *   const g = require('../_guard');          // from tools/cleanup/*.js
 *   g.run(async ({ apply }) => { ... });     // connects, runs, disconnects
 *
 * Rules
 *   - MONGODB_URI comes from the environment (apps/api/.env is loaded); there
 *     is no hardcoded mongodb://localhost/aasd anywhere.
 *   - The target host/db is always printed (credentials redacted).
 *   - Any run that WRITES (--apply, or guard({writes:true}) for scripts that
 *     always write) refuses unless --yes-i-know is passed, and refuses the
 *     production db name 'aasd' unless --prod is also passed.
 *   - Dry runs (default for tools/cleanup/*) only need a reachable DB.
 *
 * Flags: --apply  --dry-run  --yes-i-know  --prod  --limit=N  --id=<id> (repeatable)
 */
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const PROD_DB_NAME = 'aasd';

function parseArgs(argv = process.argv.slice(2)) {
  const flags = { _: [] };
  for (const a of argv) {
    if (!a.startsWith('--')) {
      flags._.push(a);
      continue;
    }
    const eq = a.indexOf('=');
    const key = (eq > 0 ? a.slice(2, eq) : a.slice(2)).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const val = eq > 0 ? a.slice(eq + 1) : true;
    if (flags[key] === undefined) flags[key] = val;
    else flags[key] = [].concat(flags[key], val);
  }
  return flags;
}

const args = parseArgs();
const apply = args.apply === true && args.dryRun !== true;

function describeUri(uri) {
  try {
    const u = new URL(uri);
    const db = (u.pathname || '/').replace(/^\//, '') || '(default)';
    return { host: u.host || '(srv)', db, protocol: u.protocol.replace(':', '') };
  } catch (_) {
    // mongodb+srv or odd forms: best effort
    const m = /@?([^/@]+)\/([^?]+)/.exec(uri || '');
    return { host: m ? m[1] : '?', db: m ? m[2] : '?', protocol: '?' };
  }
}

function fail(msg) {
  // eslint-disable-next-line no-console
  console.error(`[guard] ${msg}`);
  process.exit(2);
}

/**
 * Validate flags for this run. `writes` = this run will modify data.
 * Returns { uri, host, db, apply }.
 */
function guard({ writes = apply } = {}) {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) fail('MONGODB_URI is not set (apps/api/.env). Refusing to guess a database.');
  const { host, db } = describeUri(uri);
  // eslint-disable-next-line no-console
  console.log(`[guard] target ${host}/${db}  mode=${writes ? 'APPLY (writes)' : 'dry-run (read-only)'}`);
  if (writes) {
    if (args.yesIKnow !== true) fail('This run writes to the database. Re-run with --yes-i-know to confirm.');
    if (db === PROD_DB_NAME && args.prod !== true) {
      fail(`Target database is the production db '${PROD_DB_NAME}'. Add --prod to confirm.`);
    }
  }
  return { uri, host, db, apply: writes };
}

async function connect() {
  const { uri } = guard({ writes: false });
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  return mongoose.connection;
}

async function disconnect() {
  try {
    await mongoose.disconnect();
  } catch (_) {
    /* ignore */
  }
}

/**
 * run(main, {writes}) — guard, connect, run main({apply, args}), disconnect,
 * exit 0/1. Scripts that always write pass {writes:true}.
 */
async function run(main, { writes = apply } = {}) {
  const info = guard({ writes });
  const started = Date.now();
  let code = 0;
  try {
    await mongoose.connect(info.uri, { serverSelectionTimeoutMS: 10000 });
    await main({ apply: writes, args, db: mongoose.connection.db, info });
    // eslint-disable-next-line no-console
    console.log(`[guard] done in ${((Date.now() - started) / 1000).toFixed(1)}s${writes ? '' : ' (dry-run, nothing written)'}`);
  } catch (err) {
    code = 1;
    // eslint-disable-next-line no-console
    console.error('[guard] failed:', err && err.stack ? err.stack : err);
  } finally {
    await disconnect();
  }
  process.exit(code);
}

module.exports = { args, apply, guard, connect, disconnect, run, parseArgs, describeUri, PROD_DB_NAME };
