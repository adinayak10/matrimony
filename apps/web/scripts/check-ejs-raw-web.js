#!/usr/bin/env node
'use strict';
// Where can a string reach the browser as markup without being escaped? (D0.3)
//
//   1. `<%- expr %>` in an EJS template. `<%= %>` escapes; `<%- %>` does not.
//   2. `el.innerHTML = `…${data}…`` in browser JS (public/js/*.js and the
//      inline <script> blocks inside views/**/*.ejs).
//
// Both are refused unless the expression is one known to return markup it
// built itself (include, jsonLd, safeJson, asset, img) or the site is marked
// `/* raw-ok: why */` at the start of the expression (CMS HTML sanitised on
// write by the API — Track A). Client-side, every `${…}` inside an innerHTML
// template literal must go through esc() (public/js/esc.js) or be marked with
// a `raw-ok:` comment on the line above.
//
//   node scripts/check-ejs-raw-web.js        exit 0 = clean, 1 = findings
//
// Adapted from /var/www/feribazaar.com/scripts/check-ejs-raw.js. No deps.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// Expressions a `<%-` may start with. Each returns markup assembled from
// literals or escapes its input (utils/jsonLd.js, utils/img.js).
const EJS_ALLOWED_PREFIXES = ['include(', 'jsonLd(', 'safeJson(', 'asset(', 'img('];

// Bare locals a `<%-` may emit whole (none yet; a layout `body` slot would go here).
const EJS_ALLOWED_EXACT = new Set([]);

const RAW_OK = /^\/\*\s*raw-ok:\s*\S[^*]*\*\//;

// Sites allowed by file and expression, with the reason here. Keep empty until
// Track A's sanitize-html lands on regional CMS fields and blog content; until
// then those templates mark their sinks inline or switch to <%= %>.
const EJS_ALLOWED_SITES = [];

const JS_ESCAPER = /\besc(?:Html)?\(/;
const JS_RAW_OK = /raw-ok:/;

// Vendor bundles are not ours to lint.
const JS_SKIP = /(\.min\.js$|^Chart\.js$|^jquery|^popper|^slick\.js$|^bootstrap)/;

const walk = (dir, exts, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === '_r') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
};

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function checkTemplates(files) {
  const findings = [];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /<%-([\s\S]*?)%>/g;
    let m;
    while ((m = re.exec(text))) {
      const expr = m[1].trim();
      const ok = EJS_ALLOWED_EXACT.has(expr)
        || EJS_ALLOWED_PREFIXES.some((p) => expr.startsWith(p))
        || EJS_ALLOWED_SITES.some((s) => s.file === rel(file) && (s.prefix ? expr.startsWith(s.expr) : expr === s.expr))
        || RAW_OK.test(expr);
      if (!ok) findings.push(`${rel(file)}:${lineOf(text, m.index)}  <%- ${expr.split('\n')[0].slice(0, 70)} %>`);
    }
  }
  return findings;
}

// innerHTML = `…`, innerHTML += `…`, outerHTML = `…`, insertAdjacentHTML(…, `…`):
// walk to the closing backtick and check every top-level ${…}.
function checkInnerHtml(files) {
  const findings = [];
  const opener = /(?:\.(?:inner|outer)HTML\s*\+?=\s*|insertAdjacentHTML\([^,]*,\s*)`/g;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split('\n');
    let m;
    while ((m = opener.exec(text))) {
      const start = m.index + m[0].length;
      const startLine = lineOf(text, m.index);
      const marked = JS_RAW_OK.test(lines[startLine - 1] || '') || JS_RAW_OK.test(lines[startLine - 2] || '');
      const interpolations = [];
      let i = start;
      let depth = 0;
      let exprStart = -1;
      for (; i < text.length; i += 1) {
        const c = text[i];
        if (c === '\\') { i += 1; continue; }
        if (depth === 0) {
          if (c === '`') break;
          if (c === '$' && text[i + 1] === '{') { depth = 1; exprStart = i + 2; i += 1; }
        } else if (c === '{') depth += 1;
        else if (c === '}') {
          depth -= 1;
          if (depth === 0) interpolations.push({ at: exprStart, expr: text.slice(exprStart, i) });
        }
      }
      opener.lastIndex = i;
      if (marked) continue;
      for (const { at, expr } of interpolations) {
        if (!JS_ESCAPER.test(expr)) {
          findings.push(`${rel(file)}:${lineOf(text, at)}  \${${expr.trim().slice(0, 60)}} inside innerHTML without esc()`);
        }
      }
    }
  }
  return findings;
}

const templates = walk(path.join(ROOT, 'views'), ['.ejs']);
const clientJs = walk(path.join(ROOT, 'public', 'js'), ['.js']).filter((f) => !JS_SKIP.test(path.basename(f)));

const findings = [
  ...checkTemplates(templates),
  ...checkInnerHtml([...templates, ...clientJs]),
];

if (!findings.length) {
  console.log('raw output check: clean');
  process.exit(0);
}

console.error('\nUnescaped output reaching the browser:\n');
for (const f of findings) console.error(`  ${f}`);
console.error('\nEscape it (<%= %>, textContent, esc()), route it through a helper on the');
console.error('allow-list in scripts/check-ejs-raw-web.js, or — for sanitised CMS HTML only —');
console.error('start the expression with /* raw-ok: <why> */.\n');
process.exit(1);
