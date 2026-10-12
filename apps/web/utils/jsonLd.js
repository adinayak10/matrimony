'use strict';
// Safe serialisation for data embedded in HTML (JSON-LD, inline config).
//
// JSON.stringify alone is not safe inside a <script>: a value containing
// "</script>" closes the block and the rest is executed as markup, and
// U+2028/U+2029 are line terminators in older JS engines. Every character that
// could do that is written as a \uXXXX escape, which JSON parsers and browsers
// both read back as the original character. (D0.2)

function safeJson(value) {
  const json = JSON.stringify(value === undefined ? null : value);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// One JSON-LD block. Templates use `<%- jsonLd(obj) %>`; the lint
// (scripts/check-ejs-raw-web.js) allows this prefix because the output is
// escaped here. Null/undefined renders nothing, so optional blocks need no guard.
function jsonLd(obj) {
  if (obj === null || obj === undefined) return '';
  return '<script type="application/ld+json">' + safeJson(obj) + '</script>';
}

module.exports = { safeJson, jsonLd };
