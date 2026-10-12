'use strict';
// POST /csp-report: CSP violation reports appended to logs/csp.log (D1.7).
// 1 KB body cap; reports are logged, never parsed into anything that renders.
// The directory is created lazily. Mount BEFORE indexRoutes.
//
// Reading it:  tail -f apps/web/logs/csp.log

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');

const router = express.Router();
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'csp.log');
const MAX_LINE = 1024;

const parse = express.json({
  limit: '1kb',
  type: ['application/csp-report', 'application/json', 'application/reports+json'],
});

let warned = false;
function append(line) {
  fs.mkdir(LOG_DIR, { recursive: true }, (mkErr) => {
    if (mkErr) {
      if (!warned) { warned = true; console.warn('[csp-report] cannot create log dir:', mkErr.message); }
      return;
    }
    fs.appendFile(LOG_FILE, line + '\n', (err) => {
      if (err && !warned) { warned = true; console.warn('[csp-report] cannot write log:', err.message); }
    });
  });
}

router.post('/csp-report', parse, (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const report = body['csp-report'] || body;
  const entry = {
    ts: new Date().toISOString(),
    ip: req.ip,
    ua: String(req.get('user-agent') || '').slice(0, 160),
    report,
  };
  let line = JSON.stringify(entry);
  if (line.length > MAX_LINE) line = line.slice(0, MAX_LINE);
  append(line);
  res.status(204).set('Cache-Control', 'no-store').end();
});

// A malformed or oversized report is not worth an error page.
router.use('/csp-report', (err, req, res, next) => {
  res.status(204).end();
});

module.exports = router;
