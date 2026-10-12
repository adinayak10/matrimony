'use strict';
/**
 * utils/log.js — thin console wrapper with secret redaction (A7.7).
 *
 * - Values of keys matching token/password/cookie/authorization/secret are
 *   replaced with '[REDACTED]' (deep, case-insensitive, any nesting).
 * - Any JWT-looking substring (eyJ...) inside strings is replaced with '[JWT]'.
 * - `log.patchConsole()` can be called once from index.js so legacy
 *   console.log calls in controllers are scrubbed too.
 *
 * No logger framework: pm2 captures stdout/stderr and pm2-logrotate bounds it.
 */

const REDACT_KEY = /(token|password|passwd|cookie|authorization|secret|api[_-]?key)/i;
// Base64url JWT header always starts with eyJ ({"alg"...). Match the three
// dot-separated parts, or a long bare eyJ... blob (truncated tokens in logs).
const JWT_RE = /eyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}/g;
const MAX_DEPTH = 6;

function redactString(s) {
  return s.replace(JWT_RE, '[JWT]');
}

function redact(value, depth = 0, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object') return value;
  if (value instanceof Error) {
    const out = { name: value.name, message: redactString(String(value.message || '')) };
    if (value.code) out.code = value.code;
    if (value.stack) out.stack = redactString(String(value.stack));
    return out;
  }
  if (depth >= MAX_DEPTH) return '[Object]';
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1, seen));
  if (value instanceof Date) return value;
  // mongoose docs / ObjectIds: stringify via toJSON when available
  if (typeof value.toJSON === 'function' && value.constructor && value.constructor.name !== 'Object') {
    try {
      const plain = value.toJSON();
      if (plain && typeof plain === 'object') return redact(plain, depth + 1, seen);
      return redact(plain, depth + 1, seen);
    } catch (_) {
      return '[Object]';
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = REDACT_KEY.test(k) ? '[REDACTED]' : redact(v, depth + 1, seen);
  }
  return out;
}

function fmt(args) {
  return args.map((a) => redact(a));
}

/* eslint-disable no-console */
const raw = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug ? console.debug.bind(console) : console.log.bind(console),
};
/* eslint-enable no-console */

const log = {
  info: (...a) => raw.info(...fmt(a)),
  log: (...a) => raw.log(...fmt(a)),
  warn: (...a) => raw.warn(...fmt(a)),
  error: (...a) => raw.error(...fmt(a)),
  debug: (...a) => {
    if (process.env.NODE_ENV !== 'production') raw.debug(...fmt(a));
  },
  redact,
  redactString,
};

let patched = false;
/**
 * Route the global console through the redactor. Idempotent.
 */
log.patchConsole = function patchConsole() {
  if (patched) return;
  patched = true;
  /* eslint-disable no-console */
  console.log = log.log;
  console.info = log.info;
  console.warn = log.warn;
  console.error = log.error;
  console.debug = log.debug;
  /* eslint-enable no-console */
};

module.exports = log;
