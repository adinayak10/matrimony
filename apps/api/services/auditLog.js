'use strict';
/**
 * services/auditLog.js (C4.12) — record(req, action, target, diff)
 *
 *   record(req, 'user.block', { type: 'user', id }, { before, after })
 *
 * Never throws and never blocks the response: failures are logged. The
 * admin identity comes from req.user/req.userId set by middleware/adminAuth.
 */
const AdminAuditLog = require('../models/AdminAuditLog');

const MAX_SNAPSHOT_BYTES = 8 * 1024;

function clip(value) {
  if (value === undefined) return null;
  try {
    const s = JSON.stringify(value);
    if (!s) return null;
    if (s.length <= MAX_SNAPSHOT_BYTES) return JSON.parse(s);
    return { _truncated: true, preview: s.slice(0, MAX_SNAPSHOT_BYTES) };
  } catch (_) {
    return null;
  }
}

function clientIp(req) {
  if (!req) return null;
  if (req.ip) return String(req.ip).slice(0, 64);
  const xf = req.headers && req.headers['x-forwarded-for'];
  return xf ? String(xf).split(',')[0].trim().slice(0, 64) : null;
}

async function record(req, action, target = {}, diff = {}) {
  try {
    const doc = {
      adminId: req && req.userId ? req.userId : null,
      adminEmail: req && req.user && req.user.email ? String(req.user.email) : null,
      action: String(action || 'unknown').slice(0, 80),
      targetType: target && target.type ? String(target.type).slice(0, 40) : null,
      targetId: target && target.id !== undefined && target.id !== null ? String(target.id).slice(0, 80) : null,
      before: clip(diff ? diff.before : undefined),
      after: clip(diff ? diff.after : undefined),
      ip: clientIp(req),
      userAgent: req && req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 200) : null,
    };
    await AdminAuditLog.create(doc);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[auditLog] record failed:', action, err.message);
  }
}

/** Fire-and-forget form for handlers that already responded. */
function recordAsync(req, action, target, diff) {
  record(req, action, target, diff).catch(() => {});
}

module.exports = { record, recordAsync, clip };
