#!/usr/bin/env node
'use strict';
// Fetch every URL in a site's sitemaps and check the JSON-LD on each page (D6 verification).
//
//   node scripts/validate-jsonld.js [https://www.banjaramatch.com] [--require-breadcrumbs] [--concurrency=4]
//
// Per page: every <script type="application/ld+json"> must parse; at most one
// BreadcrumbList (item names unique, Home only once) — exactly one with
// --require-breadcrumbs; exactly one Organization; no AggregateRating anywhere;
// no `telephone` anywhere; at most one FAQPage. Exit 1 on any failure.
// Node 22 global fetch, no dependencies.

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) || 'https://www.banjaramatch.com').replace(/\/+$/, '');
const requireBreadcrumbs = args.includes('--require-breadcrumbs');
const concurrency = Number((args.find((a) => a.startsWith('--concurrency=')) || '').split('=')[1]) || 4;
const UA = 'banjaramatch-validate-jsonld/1.0';

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xml' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });
  return { status: res.status, text: await res.text(), url: res.url };
}

const locs = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

async function collectUrls() {
  const { text, status } = await get(`${base}/sitemap.xml`);
  if (status !== 200) throw new Error(`sitemap.xml returned ${status}`);
  const first = locs(text);
  if (/<sitemapindex/i.test(text)) {
    const out = new Set();
    for (const child of first) {
      const r = await get(child);
      if (r.status !== 200) { console.error(`  ! ${child} -> ${r.status}`); continue; }
      locs(r.text).forEach((u) => out.add(u));
    }
    return [...out];
  }
  return [...new Set(first)];
}

function blocksOf(html) {
  const out = [];
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

function* nodes(value) {
  if (Array.isArray(value)) { for (const v of value) yield* nodes(v); return; }
  if (value && typeof value === 'object') {
    yield value;
    for (const k of Object.keys(value)) yield* nodes(value[k]);
  }
}

const typesOf = (node) => (Array.isArray(node['@type']) ? node['@type'] : node['@type'] ? [node['@type']] : []);

function checkPage(url, html) {
  const problems = [];
  const parsed = [];
  for (const [i, raw] of blocksOf(html).entries()) {
    try { parsed.push(JSON.parse(raw)); } catch (e) { problems.push(`block #${i + 1} does not parse: ${e.message}`); }
  }
  const all = [];
  for (const p of parsed) for (const n of nodes(p)) all.push(n);

  const count = (type) => all.filter((n) => typesOf(n).includes(type)).length;
  const breadcrumbs = all.filter((n) => typesOf(n).includes('BreadcrumbList'));
  if (breadcrumbs.length > 1) problems.push(`${breadcrumbs.length} BreadcrumbList blocks`);
  if (requireBreadcrumbs && breadcrumbs.length === 0) problems.push('no BreadcrumbList');
  for (const b of breadcrumbs) {
    const names = (b.itemListElement || []).map((li) => (li && li.name) || (li && li.item && li.item.name) || '');
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) problems.push(`BreadcrumbList repeats: ${[...new Set(dupes)].join(', ')}`);
    if (names.filter((n) => /^home$/i.test(n)).length > 1) problems.push('BreadcrumbList has Home twice');
  }
  const orgs = count('Organization');
  if (orgs !== 1) problems.push(`${orgs} Organization blocks (expected 1)`);
  if (count('AggregateRating') || all.some((n) => n.aggregateRating)) problems.push('AggregateRating present');
  if (all.some((n) => Object.prototype.hasOwnProperty.call(n, 'telephone'))) problems.push('telephone present');
  const faqs = count('FAQPage');
  if (faqs > 1) problems.push(`${faqs} FAQPage blocks`);
  return { problems, blocks: parsed.length };
}

async function main() {
  const urls = await collectUrls();
  console.log(`${urls.length} URLs from ${base}/sitemap.xml`);
  let failed = 0;
  let i = 0;
  async function worker() {
    while (i < urls.length) {
      const url = urls[i++];
      try {
        const r = await get(url);
        if (r.status !== 200) { failed++; console.error(`FAIL ${url} -> HTTP ${r.status}`); continue; }
        const { problems, blocks } = checkPage(url, r.text);
        if (problems.length) { failed++; console.error(`FAIL ${url}\n    ${problems.join('\n    ')}`); }
        else console.log(`ok   ${url} (${blocks} blocks)`);
      } catch (e) {
        failed++;
        console.error(`FAIL ${url} -> ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  console.log(failed ? `\n${failed} page(s) failed` : '\nall pages valid');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
