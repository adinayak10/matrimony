'use strict';
// Page rendering: views/pages/<name>.ejs is rendered to a string first, then
// views/layouts/<layout>.ejs receives it as `body`. Same pattern as
// /var/www/feribazaar.com/website/src/lib/render.js — no express-ejs-layouts,
// and a page can pick a different layout (login uses `auth`) or none.
//
// Escaping contract (enforced by scripts/check-admin-raw.js): templates emit
// every dynamic value with <%= %>. The only raw outputs are `<%- body %>` in a
// layout, `<%- include(...) %>` and `<%- icon(...) %>`. icon() below builds its
// markup from literals and a whitelisted id, so it can never carry data.
const path = require('path');
const ejs = require('ejs');
const env = require('../config/env');
const { NAV, activeKeyFor, BY_KEY } = require('../config/nav');

const VIEWS = path.join(__dirname, '..', 'views');
const EJS_OPTS = { async: false, views: [VIEWS], cache: env.IS_PROD, rmWhitespace: false };

const ICON_ID = /^[a-z0-9-]+$/;

/**
 * <svg class="icon"><use href="/img/icons.svg#id"></use></svg>
 * `id` is restricted to [a-z0-9-]; anything else renders the "circle" icon so
 * a bad id can never break out of the attribute.
 */
function icon(id, opts = {}) {
  const safeId = ICON_ID.test(String(id || '')) ? id : 'circle';
  const size = Number.isFinite(opts.size) ? opts.size : 20;
  const cls = String(opts.cls || '').replace(/[^A-Za-z0-9_ -]/g, '');
  const label = opts.label ? String(opts.label).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c])) : '';
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon${cls ? ` ${cls}` : ''}" width="${size}" height="${size}" ${a11y}>`
    + `<use href="/img/icons.svg?v=${env.ASSET_VERSION}#${safeId}"></use></svg>`;
}

function baseLocals(req, locals) {
  const activeKey = locals.activeKey !== undefined ? locals.activeKey : activeKeyFor(req.path);
  const navItem = activeKey ? BY_KEY[activeKey] : null;
  return {
    nav: NAV,
    activeKey,
    admin: req.admin || null,
    assetVersion: env.ASSET_VERSION,
    apiPublicUrl: env.API_PUBLIC_URL,
    releaseSha: env.RELEASE_SHA,
    appVersion: env.APP_VERSION,
    flash: null,
    title: navItem ? navItem.label : 'Admin',
    pageScript: null,
    currentPath: req.path,
    icon,
    ...locals,
  };
}

/**
 * renderPage(res, 'users', { title, pageScript, ... })
 * Renders pages/<name>.ejs inside layouts/<locals.layout || 'base'>.ejs.
 * Returns a promise (so route handlers can `return renderPage(...)`) and never
 * throws into the caller: a template error goes to next() as a 500.
 */
async function renderPage(res, name, locals = {}) {
  const req = res.req;
  const all = baseLocals(req, locals);
  const layout = locals.layout === null ? null : (locals.layout || 'base');
  const body = await ejs.renderFile(path.join(VIEWS, 'pages', `${name}.ejs`), all, EJS_OPTS);
  const html = layout
    ? await ejs.renderFile(path.join(VIEWS, 'layouts', `${layout}.ejs`), { ...all, body }, EJS_OPTS)
    : body;
  if (locals.status) res.status(locals.status);
  res.type('html').send(html);
}

/**
 * renderError(res, 503, { title: 'API unreachable', message, retryHref })
 * Always safe to call from the error handler: if the error template itself
 * fails, falls back to a plain-text response so nothing leaks a stack.
 */
async function renderError(res, status, opts = {}) {
  const req = res.req;
  const title = opts.title || (status === 404 ? 'Page not found' : status === 503 ? 'API unreachable' : 'Something went wrong');
  const locals = {
    status,
    title,
    message: opts.message || '',
    retryHref: opts.retryHref || (req ? req.originalUrl : '/dashboard'),
    layout: req && req.admin ? 'base' : 'auth',
    activeKey: null,
    pageScript: null,
  };
  try {
    await renderPage(res, 'error', locals);
  } catch (e) {
    if (!res.headersSent) res.status(status).type('text').send(`${status} ${title}`);
  }
}

module.exports = { renderPage, renderError, icon, VIEWS };
