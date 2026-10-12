#!/usr/bin/env node
// Where can a string reach the browser as markup without being escaped?
// (adapted from /var/www/feribazaar.com/scripts/check-ejs-raw.js for apps/admin)
//
//   1. `<%- expr %>` in apps/admin/views. Only the layout's `body` slot, an
//      include() and the icon() helper (lib/render.js — whitelisted id, literals)
//      may be raw. Everything else is data and goes through <%= %>.
//
//   2. `el.innerHTML = \`…${data}…\`` (also +=, outerHTML, insertAdjacentHTML)
//      in apps/admin/public/js. A plain template literal there is a finding
//      unless every ${} goes through esc(); the html`` tag from core/dom.js is
//      the sanctioned way (it escapes every interpolation) and is not matched
//      because the backtick is not immediately after the `=`.
//
//   node scripts/check-admin-raw.js      exit 0 = clean, 1 = findings (file:line)
//
// No dependencies on purpose: it runs in CI before any workspace is installed.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'apps', 'admin', 'views');
const JS = path.join(ROOT, 'apps', 'admin', 'public', 'js');

const EJS_ALLOWED_EXACT = new Set(['body']);
const EJS_ALLOWED_PREFIXES = ['include(', 'icon('];
const RAW_OK = /^\/\*\s*raw-ok:\s*\S[^*]*\*\//;

const JS_ESCAPER = /\besc\(/;
const JS_RAW_OK = /raw-ok:/;
// Legacy shims that the un-migrated public/*.html pages load; deleted in C6.
const JS_SKIP = new Set(['api.js', 'auth.js', 'notifications.js']);

const walk = (dir, exts, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'vendor') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, out);
    else if (exts.some((ext) => entry.name.endsWith(ext))) out.push(full);
  }
  return out;
};

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function checkTemplates() {
  const findings = [];
  for (const file of walk(VIEWS, ['.ejs'])) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /<%-([\s\S]*?)%>/g;
    let m;
    while ((m = re.exec(text))) {
      const expr = m[1].trim();
      const ok = EJS_ALLOWED_EXACT.has(expr)
        || EJS_ALLOWED_PREFIXES.some((p) => expr.startsWith(p))
        || RAW_OK.test(expr);
      if (!ok) findings.push(`${rel(file)}:${lineOf(text, m.index)}  <%- ${expr.split('\n')[0].slice(0, 70)} %>`);
    }
  }
  return findings;
}

function checkClientJs() {
  const findings = [];
  const opener = /(?:\.(?:inner|outer)HTML\s*\+?=\s*|insertAdjacentHTML\([^,]*,\s*)`/g;
  for (const file of walk(JS, ['.js'])) {
    if (JS_SKIP.has(path.basename(file)) && path.dirname(file) === JS) continue;
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
          findings.push(`${rel(file)}:${lineOf(text, at)}  \${${expr.trim().slice(0, 60)}} inside innerHTML without esc() — use html\`\` + setHtml()`);
        }
      }
    }
  }
  return findings;
}

const findings = [...checkTemplates(), ...checkClientJs()];

if (!findings.length) {
  console.log('admin raw output check: clean');
  process.exit(0);
}

console.error('\nUnescaped output reaching the browser:\n');
for (const f of findings) console.error(`  ${f}`);
console.error('\nEscape it (<%= %>, textContent, html``/esc()), or — for sanitised HTML only —');
console.error('start the expression with /* raw-ok: <why> */.\n');
process.exit(1);
