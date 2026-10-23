#!/usr/bin/env node
'use strict';
// Vendors the biodata fonts (all SIL OFL 1.1) into packages/shared/biodata/fonts
// and rewrites fonts/LICENSES.md. Run once by a developer; nothing at runtime
// depends on npm or the network.
//
//   node packages/shared/scripts/fetch-biodata-fonts.js [--work <dir>]
//
// How: `npm pack` each @fontsource package into a temp directory (never into
// the repo, never touching package-lock.json), extract with `tar`, copy the
// exact woff2 files listed below, collect each package's LICENSE.
// Offline fallback: Poppins and Playfair Display are copied from
// apps/web/public/fonts (same files as @fontsource 5.x); the others are
// reported as missing and the kit falls back to system fonts for them.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const OUT = path.resolve(__dirname, '..', 'biodata', 'fonts');
const WEB_FONTS = path.join(ROOT, 'apps', 'web', 'public', 'fonts');

const PACKAGES = [
  {
    pkg: '@fontsource/poppins', family: 'Poppins',
    files: ['poppins-latin-400-normal.woff2', 'poppins-latin-500-normal.woff2', 'poppins-latin-600-normal.woff2'],
    fallback: WEB_FONTS,
  },
  {
    pkg: '@fontsource-variable/playfair-display', family: 'Playfair Display (variable)',
    files: ['playfair-display-latin-wght-normal.woff2'],
    fallback: WEB_FONTS,
  },
  {
    pkg: '@fontsource/cormorant-garamond', family: 'Cormorant Garamond',
    files: ['cormorant-garamond-latin-600-normal.woff2', 'cormorant-garamond-latin-600-italic.woff2'],
  },
  { pkg: '@fontsource-variable/lora', family: 'Lora (variable)', files: ['lora-latin-wght-normal.woff2'] },
  { pkg: '@fontsource-variable/dm-sans', family: 'DM Sans (variable)', files: ['dm-sans-latin-wght-normal.woff2'] },
  {
    pkg: '@fontsource/noto-sans-devanagari', family: 'Noto Sans Devanagari',
    files: ['noto-sans-devanagari-devanagari-400-normal.woff2', 'noto-sans-devanagari-devanagari-600-normal.woff2'],
  },
];

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' }).toString();
}

function main() {
  const work = path.resolve(arg('--work') || fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-fonts-')));
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(OUT, { recursive: true });
  const licenses = [];
  const missing = [];

  for (const p of PACKAGES) {
    let dir = null;
    let version = '';
    try {
      const tgz = run('npm', ['pack', p.pkg, '--silent'], work).trim().split(/\r?\n/).pop();
      // Relative paths only: GNU tar (Git for Windows) reads 'C:' as a remote host.
      const rel = 'x-' + tgz.replace(/\.tgz$/, '');
      dir = path.join(work, rel);
      fs.mkdirSync(dir, { recursive: true });
      run('tar', ['-xzf', tgz, '-C', rel], work);
      dir = path.join(dir, 'package');
      version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
    } catch (err) {
      console.warn(`[fonts] npm pack ${p.pkg} failed (${err.message.split('\n')[0]})`);
      dir = null;
    }
    for (const file of p.files) {
      const fromPkg = dir && path.join(dir, 'files', file);
      const fromFallback = p.fallback && path.join(p.fallback, file);
      const src = fromPkg && fs.existsSync(fromPkg) ? fromPkg : fromFallback && fs.existsSync(fromFallback) ? fromFallback : null;
      if (!src) { missing.push(file); continue; }
      fs.copyFileSync(src, path.join(OUT, file));
      console.log(`[fonts] ${file} <- ${src === fromPkg ? p.pkg + '@' + version : 'apps/web/public/fonts'}`);
    }
    const lic = dir && path.join(dir, 'LICENSE');
    licenses.push({
      family: p.family, pkg: p.pkg, version, files: p.files,
      text: lic && fs.existsSync(lic) ? fs.readFileSync(lic, 'utf8').trim() : 'SIL Open Font License 1.1 (license text unavailable offline; see https://openfontlicense.org).',
    });
  }

  const md = [
    '# Biodata fonts: licenses',
    '',
    'Every font in this folder is licensed under the SIL Open Font License 1.1.',
    'Files were taken unmodified from the @fontsource npm packages listed below',
    '(regenerate with `node packages/shared/scripts/fetch-biodata-fonts.js`).',
    '',
  ];
  for (const l of licenses) {
    md.push(`## ${l.family}`, '', `Package: \`${l.pkg}${l.version ? '@' + l.version : ''}\``, '', 'Files:', '');
    for (const f of l.files) md.push(`- \`${f}\``);
    md.push('', '```', l.text, '```', '');
  }
  fs.writeFileSync(path.join(OUT, 'LICENSES.md'), md.join('\n'));
  console.log(`[fonts] wrote ${path.relative(ROOT, path.join(OUT, 'LICENSES.md'))} (work dir: ${work})`);
  if (missing.length) {
    console.warn(`[fonts] MISSING (offline?): ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

main();
