'use strict';
// Server-side calls to the API over the loopback URL (API_INTERNAL_URL).
// Only three calls exist on purpose: the admin server authenticates sessions
// and nothing else; every other API call is the browser's, through routes/proxy.js.
//
// Uses Node 22's global fetch with a 5 s AbortController timeout. A network
// error or timeout is surfaced as ApiUnreachableError so requireAdmin can show
// a 503 page instead of bouncing the admin to /login in a loop.
const env = require('../config/env');

const TIMEOUT_MS = 5000;

class ApiUnreachableError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ApiUnreachableError';
    this.cause = cause;
  }
}

/**
 * request('/api/admin/auth/me', { token }) → { ok, status, data }
 * `data` is the parsed JSON body (or {} when the body is not JSON).
 * Throws ApiUnreachableError on timeout / connection failure / 5xx.
 */
async function request(path, { method = 'GET', token, body, timeout = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = { accept: 'application/json', 'x-requested-with': 'admin-server' };
  if (token) headers.authorization = `Bearer ${token}`;
  let init = { method, headers, signal: controller.signal, redirect: 'manual' };
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`${env.API_INTERNAL_URL}${path}`, init);
  } catch (err) {
    const why = err && err.name === 'AbortError' ? 'timeout' : (err && err.message) || 'network error';
    throw new ApiUnreachableError(`API ${method} ${path}: ${why}`, err);
  } finally {
    clearTimeout(timer);
  }
  let data = {};
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch (e) { data = {}; }
  }
  if (res.status >= 500) {
    throw new ApiUnreachableError(`API ${method} ${path}: HTTP ${res.status}`);
  }
  return { ok: res.ok, status: res.status, data };
}

/**
 * Validates an admin token. Resolves { ok:true, admin:{_id,email,full_name} } or
 * { ok:false, status } for 401/403/404 (invalid, expired, not admin, deleted).
 */
async function me(token) {
  const r = await request('/api/admin/auth/me', { token });
  const u = r.ok && r.data && r.data.status !== false ? r.data.data : null;
  if (!u || !u._id) return { ok: false, status: r.status || 401 };
  if (u.role && u.role !== 'admin') return { ok: false, status: 403 };
  return {
    ok: true,
    admin: { _id: String(u._id), email: u.email || '', full_name: u.full_name || '' },
  };
}

/**
 * Logs in against the API. The token is read from the JSON body (the API sets no
 * cookie for admin logins once integrator conflict #3 lands; until then any
 * Set-Cookie it sends is ignored here — fetch never forwards it to the browser).
 * Resolves { ok:true, token, admin } or { ok:false, status, message }.
 */
async function login(email, password) {
  const r = await request('/api/admin/auth/login', { method: 'POST', body: { email, password } });
  const token = r.ok && r.data ? r.data.token : null;
  if (!r.ok || r.data.status === false || typeof token !== 'string' || !token) {
    return { ok: false, status: r.status || 401, message: (r.data && r.data.message) || 'Invalid email or password' };
  }
  const d = r.data.data || {};
  return {
    ok: true,
    token,
    admin: { _id: String(d._id || ''), email: d.email || email, full_name: d.full_name || '' },
  };
}

/** Best-effort server-side logout; never throws. */
async function logout(token) {
  if (!token) return { ok: false };
  try {
    const r = await request('/api/admin/auth/logout', { method: 'POST', token });
    return { ok: r.ok };
  } catch (e) {
    return { ok: false };
  }
}

module.exports = { me, login, logout, request, ApiUnreachableError, TIMEOUT_MS };
