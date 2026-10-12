'use strict';
// Server-side twin of public/js/esc.js: escape a value for an HTML text or
// attribute context. EJS's <%= %> already does this for templates; this is for
// helpers that assemble markup in JS (img(), legal strings, error pages).

const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => MAP[c]);
}

module.exports = escapeHtml;
