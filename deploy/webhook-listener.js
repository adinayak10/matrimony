// GitHub push -> deploy listener (B3.25). Dependency-free (Node built-ins
// only) so it keeps working when node_modules is broken: it is the thing
// responsible for repairing a broken deploy.
//
//   POST /deploy-webhook  (nginx: https://www.banjaramatch.com/deploy-webhook -> 127.0.0.1:4003)
//     X-Hub-Signature-256: sha256=<HMAC of the raw body with WEBHOOK_SECRET>
//     X-GitHub-Event: ping | push
//
// A push to refs/heads/main is answered 202 first (GitHub's 10 s limit) and
// then `bash deploy.sh <after>` is spawned detached with a minimal env, so
// the secret never reaches pm2 --update-env.
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SHARED = process.env.BM_SHARED || '/var/www/banjaramatch-shared';
const DEPLOY_SCRIPT = path.join(__dirname, 'deploy.sh');

// deploy/.env is a symlink to SHARED/env/deploy.env on the server. It is read
// as data into local constants; WEBHOOK_SECRET deliberately never enters
// process.env (a child inherits process.env unless told otherwise).
function readEnvFile(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let v = m[2] || '';
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}
const fileEnv = readEnvFile(path.join(__dirname, '.env'));
const SECRET = fileEnv.WEBHOOK_SECRET || '';
const PORT = Number(process.env.WEBHOOK_PORT || fileEnv.WEBHOOK_PORT || 4003);

const SHARED_LOG_DIR = path.join(SHARED, 'logs');
const LOG_FILE = fs.existsSync(SHARED_LOG_DIR)
  ? path.join(SHARED_LOG_DIR, 'deploy.log')
  : path.join(__dirname, 'deploy.log');

// A push payload carries the commit list; 2 MB covers a large merge. Anything
// past that is not GitHub, and it is refused before the signature check so an
// unauthenticated caller cannot grow this process.
const MAX_BODY_BYTES = 2 * 1024 * 1024;

// A redelivery of the same X-GitHub-Delivery inside the window is a no-op.
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const seenDeliveries = new Map();

function log(msg) {
  const line = `[${new Date().toISOString()}] [hook] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch { process.stderr.write(line); }
}

function verifySignature(rawBody, signatureHeader, secret = SECRET) {
  if (!secret || !signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const actual = Buffer.from(signatureHeader);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function isDuplicate(deliveryId) {
  const now = Date.now();
  for (const [id, at] of seenDeliveries) {
    if (now - at > DEDUPE_WINDOW_MS) seenDeliveries.delete(id);
  }
  if (!deliveryId) return false;
  if (seenDeliveries.has(deliveryId)) return true;
  seenDeliveries.set(deliveryId, now);
  return false;
}

function parsePayload(headers, rawBody) {
  const contentType = String(headers['content-type'] || '');
  const text = rawBody.toString('utf8');
  if (contentType.includes('application/x-www-form-urlencoded')) {
    // GitHub's other content type wraps the JSON in a urlencoded "payload" field.
    return JSON.parse(new URLSearchParams(text).get('payload'));
  }
  return JSON.parse(text);
}

// Pure: decides what a verified request asks for. Returns { status, message }
// and, on 202, { sha }.
function classifyPush(headers, rawBody) {
  const event = String(headers['x-github-event'] || '');
  if (event === 'ping') return { status: 200, message: 'pong' };
  if (event !== 'push') return { status: 202, message: `ignored (${event || 'no event'})` };
  let payload;
  try {
    payload = parsePayload(headers, rawBody);
  } catch {
    return { status: 400, message: 'invalid payload' };
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: 400, message: 'invalid payload' };
  }
  if (payload.ref !== 'refs/heads/main') return { status: 202, message: `ignored (${payload.ref || 'unknown ref'})` };
  if (payload.deleted === true) return { status: 202, message: 'ignored (branch deleted)' };
  if (!/^[0-9a-f]{40}$/.test(String(payload.after))) return { status: 400, message: 'after is not a commit sha' };
  return { status: 202, message: 'deploying', sha: payload.after };
}

function runDeploy(sha) {
  const out = fs.openSync(LOG_FILE, 'a');
  // Detached: a deploy that reloads this listener outlives it. Minimal env:
  // no WEBHOOK_SECRET, nothing from pm2 that --update-env could pick up.
  const child = spawn('bash', [DEPLOY_SCRIPT, sha], {
    cwd: __dirname,
    detached: true,
    stdio: ['ignore', out, out],
    env: { PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME: '/root', LANG: 'C.UTF-8' },
  });
  child.on('error', (e) => log(`spawn failed: ${e.message}`));
  child.unref();
  fs.closeSync(out);
}

function handle(req, res) {
  if (req.method !== 'POST' || req.url !== '/deploy-webhook') {
    res.writeHead(404).end();
    return;
  }
  const chunks = [];
  let received = 0;
  let overflowed = false;
  req.on('data', (c) => {
    if (overflowed) return;
    received += c.length;
    if (received > MAX_BODY_BYTES) {
      overflowed = true;
      log(`Rejected request: body over ${MAX_BODY_BYTES} bytes`);
      res.writeHead(413).end('payload too large');
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    if (overflowed) return;
    const rawBody = Buffer.concat(chunks);

    if (!verifySignature(rawBody, req.headers['x-hub-signature-256'])) {
      log('Rejected request: bad or missing signature');
      res.writeHead(401).end('invalid signature');
      return;
    }
    // After the signature check on purpose: an unsigned request must not be
    // able to fill the table or shadow a real delivery's id.
    const deliveryId = req.headers['x-github-delivery'];
    if (deliveryId && isDuplicate(String(deliveryId))) {
      log(`Ignored duplicate delivery ${deliveryId}`);
      res.writeHead(202).end('duplicate delivery');
      return;
    }
    const verdict = classifyPush(req.headers, rawBody);
    if (!verdict.sha) {
      log(`${verdict.status} ${verdict.message}`);
      res.writeHead(verdict.status).end(verdict.message);
      return;
    }
    log(`Verified push to main (${verdict.sha}) - deploying`);
    res.writeHead(202).end('deploying');
    runDeploy(verdict.sha);
  });
}

function main() {
  if (!SECRET) {
    log('FATAL: WEBHOOK_SECRET not set in deploy/.env - refusing to start');
    process.exit(1);
  }
  const server = http.createServer(handle);
  // A client that opens a connection and never finishes would otherwise hold
  // it for Node's default five minutes.
  server.headersTimeout = 5000;
  server.requestTimeout = 10000;
  server.listen(PORT, '127.0.0.1', () => log(`Webhook listener up on 127.0.0.1:${PORT}`));
}

if (require.main === module) main();

module.exports = { verifySignature, classifyPush };
