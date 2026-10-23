'use strict';
// Marriage Biodata Maker pages (docs/plans/02-biodata-maker.md, Phase 3).
//
//   GET /biodata-maker                      landing (indexable): hero, gallery, features, FAQ
//   GET /biodata-maker/templates            gallery; ?category=x -> 301 /biodata-maker/templates/x (unknown -> bare)
//   GET /biodata-maker/templates/:category  gallery for one registry category (index only with >= 300 published words)
//   GET /biodata-maker/create               builder shell (view owned by the builder track), boot payload per contract §3
//   GET /biodata-maker/my                   the member's biodatas (ensureAuth only, noindex)
//   GET /biodata-maker/s/:token             private share link (noindex meta + X-Robots-Tag, uncached)
//   GET /(marriage|banjara)-biodata-<slug>  guide pages from BiodataPage (kind 'guide')
//   GET /js/biodata-kit.js                  the browser kit concatenated at request time (no build yet)
//
// Mounted in app.js after routes/member and before routes/index (its /:slug
// catch-all stays last). `fonts` is mounted separately on /fonts/biodata.
//
// The shared kit (@banjaramatch/shared/biodata) and the seed content module are
// loaded lazily: a missing kit degrades the gallery to the API rows (or an
// empty state), it never stops the app from booting.

const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { apiGet, forwardAuth, UpstreamError } = require('../utils/apiClient');
const { listOf, upstreamStatus } = require('../utils/apiHelpers');
const { optionalUser, ensureAuth, redirectToLogin } = require('../middleware/session');
const { clearSession } = require('./auth');
const { pageMeta } = require('../config/pageMeta');
const assets = require('../utils/assets');

const router = express.Router();

const SITE_URL = 'https://www.banjaramatch.com';
const BASE = '/biodata-maker';
const OG_IMAGE = '/images/biodata/og-biodata-maker.jpg';
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const SHARE_TOKEN_RE = /^[a-f0-9]{48}$/;
const TEMPLATE_ID_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;
const CATEGORY_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
// Contract §2: guide slugs. The RegExp route below anchors the same pattern.
const GUIDE_SLUG_RE = /^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$/;
const GUIDE_ROUTE_RE = /^\/((?:marriage|banjara)-biodata-[a-z0-9-]{2,60})$/;
const MIN_INDEX_WORDS = 300;
const SHARE_DAYS = [7, 30, 90];

// The two existing biodata articles (blog posts) linked from the landing page.
const BIODATA_ARTICLES = [
  { label: 'How to write a Banjara marriage biodata that gets serious responses', href: '/blogs/tips/how-to-write-a-banjara-marriage-biodata-that-gets-serious-responses' },
  { label: 'Banjara biodata to baraat: a first-timer\'s guide to the modern matrimony process', href: '/blogs/general/banjara-biodata-to-baraat-a-first-timer-s-guide-to-the-modern-matrimony-process' },
];

const CONFIG_DEFAULTS = Object.freeze({
  enabled: true,
  guestDownloads: true,
  maxPerUser: 10,
  languages: ['en', 'hi'],
  shareDefaultDays: 30,
  pdf: 'unavailable',
});

// ---------------------------------------------------------------------------
// Lazy modules
// ---------------------------------------------------------------------------

function lazyModule(id) {
  let mod = null;
  let triedAt = 0;
  return function load() {
    if (mod) return mod;
    // A missing module is retried at most every 30 s (it may be deployed while we run).
    if (triedAt && Date.now() - triedAt < 30e3) return null;
    triedAt = Date.now();
    try {
      mod = require(id);
    } catch (err) {
      if (!(err && err.code === 'MODULE_NOT_FOUND')) console.warn(`[biodata] ${id} failed to load:`, err.message);
      mod = null;
    }
    return mod;
  };
}

const kit = lazyModule('@banjaramatch/shared/biodata');
const seedPages = lazyModule('@banjaramatch/shared/biodata/content/pages');

// ---------------------------------------------------------------------------
// Data helpers (every reader degrades; none of them throws for the public pages)
// ---------------------------------------------------------------------------

const textOf = (v) => {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && typeof v.en === 'string') return v.en.trim();
  return '';
};
const isSlug = (s) => typeof s === 'string' && CATEGORY_RE.test(s);
const OWN_IMAGE_RE = /^\/images\/[A-Za-z0-9/_.-]+\.(webp|png|jpe?g)$/;
const isInternalHref = (h) => typeof h === 'string' && /^\/(?!\/)[A-Za-z0-9/_.#?=&%-]*$/.test(h);
const dataOf = (body) => (body && body.status !== false && body.data && typeof body.data === 'object' ? body.data : null);

function thumbnailOf(id, given) {
  return typeof given === 'string' && OWN_IMAGE_RE.test(given) ? given : `/images/biodata/${id}.webp`;
}

// A file under public/ (cached per process by utils/assets).
const publicFile = (p) => typeof p === 'string' && p.startsWith('/') && assets.publicFileExists(p.slice(1));

// One gallery row, from an API row or a kit summary row.
function normalizeTemplate(row, index) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.templateId || row.id || '');
  if (!TEMPLATE_ID_RE.test(id)) return null;
  let categories = Array.isArray(row.categories) ? row.categories.filter(isSlug) : [];
  if (!categories.length && isSlug(row.category)) categories = [row.category];
  const thumbnail = thumbnailOf(id, row.thumbnail || row.thumbnailUrl);
  const retina = thumbnail.replace(/\.(webp|png|jpe?g)$/, '@2x.$1');
  return {
    id,
    name: textOf(row.displayName) || textOf(row.name) || id,
    tagline: textOf(row.tagline),
    description: textOf(row.description),
    categories,
    culture: typeof row.culture === 'string' ? row.culture : '',
    isFeatured: Boolean(row.isFeatured),
    order: Number.isFinite(row.order) ? row.order : index,
    thumbnail,
    hasThumb: publicFile(thumbnail),
    thumb2x: publicFile(retina) ? retina : null,
  };
}

function normalizeCategories(rows, templates) {
  const counts = {};
  for (const t of templates) for (const c of t.categories) counts[c] = (counts[c] || 0) + 1;
  return (Array.isArray(rows) ? rows : [])
    .filter((c) => c && isSlug(c.slug))
    .map((c) => ({ slug: c.slug, name: textOf(c.name) || c.slug, description: textOf(c.description), count: counts[c.slug] || 0 }));
}

// Active templates + categories: API first (admin order/visibility), the kit's
// registry when the API is unavailable, [] when neither is there.
async function loadTemplates() {
  let body = null;
  try {
    body = await apiGet('/api/biodata/templates', { key: 'biodata:templates', ttl: 5 * 60e3, timeout: 2500 });
  } catch (err) {
    console.warn('[biodata] /api/biodata/templates unavailable, using the kit registry:', err.message);
  }
  const K = kit();
  let source = 'api';
  let rows = body && Array.isArray(body.data) ? body.data : null;
  let catRows = body && Array.isArray(body.categories) ? body.categories : null;
  if (!rows || !rows.length) {
    source = K ? 'kit' : 'none';
    rows = [];
    try { if (K && K.registry) rows = K.registry.summary(); } catch (err) { console.warn('[biodata] registry.summary failed:', err.message); }
  }
  if (!catRows || !catRows.length) catRows = (K && K.registry && K.registry.CATEGORIES) || [];
  const templates = rows.map(normalizeTemplate).filter(Boolean)
    .sort((a, b) => (Number(b.isFeatured) - Number(a.isFeatured)) || (a.order - b.order));
  return { templates, categories: normalizeCategories(catRows, templates), source };
}

async function loadConfig() {
  try {
    const body = await apiGet('/api/biodata/config', { key: 'biodata:config', ttl: 60e3, timeout: 2000 });
    const data = dataOf(body);
    if (data) return { ...CONFIG_DEFAULTS, ...data };
  } catch (err) {
    console.warn('[biodata] /api/biodata/config unavailable, using defaults:', err.message);
  }
  return { ...CONFIG_DEFAULTS };
}

// A published BiodataPage, or null (404 or API down: never throws).
async function loadPage(slug) {
  try {
    return dataOf(await apiGet('/api/biodata/pages/' + encodeURIComponent(slug), { key: 'biodata:page:' + slug, ttl: 5 * 60e3, timeout: 2500 }));
  } catch (err) {
    console.warn(`[biodata] page ${slug} unavailable:`, err.message);
    return null;
  }
}

// Published guide rows for the "guides" links ([] when unavailable).
async function loadGuideLinks() {
  try {
    const body = await apiGet('/api/biodata/pages?published=1', { key: 'biodata:pages:published', ttl: 10 * 60e3, timeout: 2000 });
    return listOf(body)
      .filter((p) => p && p.kind === 'guide' && GUIDE_SLUG_RE.test(p.slug || ''))
      .map((p) => ({ href: '/' + p.slug, label: textOf(p.h1) || textOf(p.metaTitle) || p.slug.replace(/-/g, ' ') }));
  } catch (err) {
    return [];
  }
}

const featuredBlogs = () => apiGet('/api/blogs/featured?limit=3', { key: 'blogs:featured' }).then(listOf).catch(() => []);

function seedPage(slug) {
  const mod = seedPages();
  const list = Array.isArray(mod) ? mod : (mod && Array.isArray(mod.pages) ? mod.pages : []);
  return list.find((p) => p && p.slug === slug) || null;
}

const cleanFaqs = (faqs) => (Array.isArray(faqs) ? faqs : [])
  .map((f) => ({ question: textOf(f && f.question), answer: textOf(f && f.answer) }))
  .filter((f) => f.question && f.answer)
  .slice(0, 15);

const faqPageLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
});

const cleanLinks = (links) => (Array.isArray(links) ? links : [])
  .filter((l) => l && textOf(l.label) && isInternalHref(l.href))
  .map((l) => ({ label: textOf(l.label), href: l.href }))
  .slice(0, 8);

// Links to guide pages are kept only when that guide is published (no links to 404s).
function publishedOnly(links, guides) {
  const live = new Set((guides || []).map((g) => g.href));
  return links.filter((l) => !GUIDE_SLUG_RE.test(l.href.slice(1).split(/[?#]/)[0]) || live.has(l.href));
}

function cleanCta(cta, fallback) {
  const c = cta && typeof cta === 'object' ? cta : {};
  return {
    heading: textOf(c.heading) || fallback.heading,
    text: textOf(c.text) || fallback.text,
    primaryLabel: textOf(c.primaryLabel) || fallback.primaryLabel,
    primaryHref: isInternalHref(c.primaryHref) ? c.primaryHref : fallback.primaryHref,
    secondaryLabel: textOf(c.secondaryLabel) || fallback.secondaryLabel || '',
    secondaryHref: isInternalHref(c.secondaryHref) ? c.secondaryHref : (fallback.secondaryHref || ''),
  };
}

const DEFAULT_CTA = {
  heading: 'Your biodata, ready in minutes',
  text: 'Pick a template, fill in the details at your own pace and download a print-ready PDF. Free, with no watermark.',
  primaryLabel: 'Create Biodata Free',
  primaryHref: BASE + '/create',
  secondaryLabel: 'Explore Templates',
  secondaryHref: BASE + '/templates',
};

const indexable = (page) => Boolean(page && page.isPublished !== false && Number(page.contentWords) >= MIN_INDEX_WORDS);
const robotsFor = (page) => (indexable(page) ? 'index, follow, max-image-preview:large' : 'noindex, follow');

// ?category=x on the bare gallery: known slug -> its sub-path, anything else -> the bare URL.
function categoryRedirect(query, categories) {
  if (!query || query.category === undefined) return null;
  const slug = String(Array.isArray(query.category) ? query.category[0] : query.category).trim().toLowerCase();
  const known = (categories || []).some((c) => c && c.slug === slug);
  return known ? `${BASE}/templates/${slug}` : `${BASE}/templates`;
}

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

router.get(BASE, optionalUser, async (req, res, next) => {
  try {
    const [{ templates, categories }, apiPage, guides, blogs, config] = await Promise.all([
      loadTemplates(), loadPage('biodata-maker'), loadGuideLinks(), featuredBlogs(), loadConfig(),
    ]);
    const page = apiPage && apiPage.kind === 'landing' ? apiPage : seedPage('biodata-maker');
    const faqs = cleanFaqs(page && page.faqs);
    const overrides = { jsonLd: faqs.length ? [faqPageLd(faqs)] : [] };
    if (apiPage && apiPage.kind === 'landing') {
      if (textOf(apiPage.metaTitle)) overrides.title = textOf(apiPage.metaTitle);
      if (textOf(apiPage.metaDescription)) overrides.description = textOf(apiPage.metaDescription);
    }
    res.render('pages/biodata-landing', {
      meta: pageMeta('biodataMaker', overrides),
      user: req.user || null,
      breadcrumbs: [{ name: 'Biodata Maker', url: BASE }],
      templates,
      categories: categories.filter((c) => c.count > 0),
      page,
      faqs,
      cta: cleanCta(page && page.ctaConfig, DEFAULT_CTA),
      relatedLinks: publishedOnly(cleanLinks(page && page.relatedLinks), guides),
      guides,
      articles: BIODATA_ARTICLES,
      featuredBlogs: blogs,
      guestDownloads: config.guestDownloads !== false,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Template gallery
// ---------------------------------------------------------------------------

function renderGallery(req, res, { templates, categories, category, page }) {
  const list = category ? templates.filter((t) => t.categories.includes(category.slug)) : templates;
  const url = category ? `${BASE}/templates/${category.slug}` : `${BASE}/templates`;
  const overrides = { canonical: url };
  if (category) {
    const words = page ? textOf(page.metaTitle) : '';
    overrides.title = words || `${category.name} Marriage Biodata Templates`;
    overrides.description = (page && textOf(page.metaDescription))
      || `Free ${category.name.toLowerCase()} marriage biodata templates: ${list.slice(0, 4).map((t) => t.name).join(', ')}${list.length > 4 ? ' and more' : ''}. Fill in your details and download a print-ready PDF.`.slice(0, 170);
    overrides.robots = robotsFor(page);
  }
  const faqs = cleanFaqs(page && page.faqs);
  if (faqs.length) overrides.jsonLd = [faqPageLd(faqs)];
  const crumbs = [{ name: 'Biodata Maker', url: BASE }, { name: 'Templates', url: `${BASE}/templates` }];
  if (category) crumbs.push({ name: category.name, url });
  res.render('pages/biodata-templates', {
    meta: pageMeta('biodataTemplates', overrides),
    user: req.user || null,
    breadcrumbs: crumbs,
    templates: list,
    allCount: templates.length,
    categories: categories.filter((c) => c.count > 0),
    category: category || null,
    page: page || null,
    faqs,
  });
}

router.get(`${BASE}/templates`, optionalUser, async (req, res, next) => {
  try {
    const { templates, categories } = await loadTemplates();
    const target = categoryRedirect(req.query, categories);
    if (target) return res.redirect(301, target);
    renderGallery(req, res, { templates, categories, category: null, page: null });
  } catch (err) {
    next(err);
  }
});

router.get(`${BASE}/templates/:category`, optionalUser, async (req, res, next) => {
  const slug = req.params.category;
  if (!CATEGORY_RE.test(slug)) return next();
  try {
    const { templates, categories } = await loadTemplates();
    const category = categories.find((c) => c.slug === slug);
    if (!category) return next();
    const page = await loadPage(slug);
    renderGallery(req, res, { templates, categories, category, page: page && page.kind === 'category' ? page : null });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Builder (view: pages/biodata-maker-create.ejs, builder track)
// ---------------------------------------------------------------------------

// Kit summary rows (palettes, fonts, defaults: what the builder needs), limited
// to the templates the API lists as active and in the API's order.
function builderTemplates(active) {
  const K = kit();
  let summary = [];
  try { if (K && K.registry) summary = K.registry.summary(); } catch (err) { summary = []; }
  if (!active.length) return summary;
  const byId = new Map(summary.map((s) => [s.id, s]));
  return active.map((t) => byId.get(t.id) && { ...byId.get(t.id), displayName: t.name, isFeatured: t.isFeatured }).filter(Boolean);
}

async function loadOwnDocument(req, id) {
  try {
    const body = await apiGet('/api/biodata/documents/' + id, { headers: forwardAuth(req), timeout: 3000 });
    return dataOf(body);
  } catch (err) {
    if (upstreamStatus(err) !== 404) console.warn('[biodata] document load failed:', err.message);
    return null;
  }
}

async function buildBoot(req) {
  const docId = typeof req.query.doc === 'string' && OBJECT_ID_RE.test(req.query.doc) ? req.query.doc.toLowerCase() : null;
  const [{ templates: active, categories, source }, config, document] = await Promise.all([
    loadTemplates(),
    loadConfig(),
    docId && req.user ? loadOwnDocument(req, docId) : Promise.resolve(null),
  ]);
  const templates = builderTemplates(source === 'api' ? active : []);
  const ids = new Set(templates.map((t) => t.id));
  const K = kit();
  const wanted = typeof req.query.template === 'string' ? req.query.template.trim().toLowerCase() : '';
  let templateId = ids.has(wanted) ? wanted : '';
  if (!templateId && document && ids.has(document.templateId)) templateId = document.templateId;
  if (!templateId) templateId = (K && ids.has(K.DEFAULT_TEMPLATE)) ? K.DEFAULT_TEMPLATE : ((templates[0] && templates[0].id) || '');
  const u = req.user;
  return {
    user: u ? { id: String(u._id || u.id || ''), name: String(u.full_name || u.name || '') } : null,
    document: document || null,
    templateId,
    templates,
    categories,
    config,
    pdfAvailable: config.pdf === 'ready',
    loginUrl: '/login?returnTo=/biodata-maker/create',
  };
}

router.get(`${BASE}/create`, optionalUser, async (req, res, next) => {
  try {
    const boot = await buildBoot(req);
    if (req.user) res.set('Cache-Control', 'private, no-store');
    res.render('pages/biodata-maker-create', {
      meta: pageMeta('biodataBuilder'),
      user: req.user || null,
      breadcrumbs: [{ name: 'Biodata Maker', url: BASE }, { name: 'Create', url: `${BASE}/create` }],
      boot,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// My biodatas (ensureAuth only: the tool needs no completed matrimony profile)
// ---------------------------------------------------------------------------

router.get(`${BASE}/my`, ensureAuth, async (req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  let rows = [];
  let max = CONFIG_DEFAULTS.maxPerUser;
  let loadError = false;
  const [config, list] = await Promise.all([
    loadConfig(),
    apiGet('/api/biodata/documents', { headers: forwardAuth(req), timeout: 3000 }).catch((err) => err),
  ]);
  if (list instanceof Error) {
    const status = upstreamStatus(list);
    if (status === 401) { clearSession(req, res); return redirectToLogin(req, res); }
    if (status === null || status >= 500) return next(list instanceof UpstreamError ? list : new UpstreamError(list.message, { path: '/api/biodata/documents' }));
    loadError = true;
    console.warn('[biodata] documents list failed:', list.message);
  } else {
    rows = listOf(list);
    if (list && Number.isFinite(Number(list.max)) && Number(list.max) > 0) max = Number(list.max);
    else if (Number(config.maxPerUser) > 0) max = Number(config.maxPerUser);
  }
  const docs = rows
    .filter((d) => d && OBJECT_ID_RE.test(String(d._id || '')))
    .map((d) => ({
      id: String(d._id),
      title: textOf(d.title) || 'Untitled biodata',
      templateId: TEMPLATE_ID_RE.test(String(d.templateId || '')) ? d.templateId : '',
      status: d.status === 'completed' ? 'completed' : 'draft',
      version: Number(d.version) || 1,
      updatedAt: d.updatedAt || null,
      hasPhoto: Boolean(d.hasPhoto),
      shareActive: Boolean(d.shareActive),
      shareExpiresAt: d.shareExpiresAt || null,
      thumbnail: TEMPLATE_ID_RE.test(String(d.templateId || '')) ? thumbnailOf(d.templateId) : null,
    }))
    .map((d) => ({ ...d, hasThumb: d.thumbnail ? publicFile(d.thumbnail) : false }));
  const days = Number(config.shareDefaultDays);
  res.render('pages/biodata-my', {
    meta: pageMeta('biodataMy'),
    user: req.user,
    breadcrumbs: [{ name: 'Biodata Maker', url: BASE }, { name: 'My biodatas', url: `${BASE}/my` }],
    docs,
    max,
    loadError,
    pdfAvailable: config.pdf === 'ready',
    shareDays: SHARE_DAYS,
    shareDefaultDays: SHARE_DAYS.includes(days) ? days : 30,
  });
});

// ---------------------------------------------------------------------------
// Private share link
// ---------------------------------------------------------------------------

const fontUrl = (file) => '/fonts/biodata/' + encodeURIComponent(String(file));

// The script that runs inside the sandboxed share iframe: paginate after the
// fonts load, scale the A4 pages to the frame width, report the height to the
// parent page, print on request. It is ours (no user data in it).
const SHARE_BRIDGE = '<style>html,body{margin:0;overflow:hidden;background:transparent}#bd-root{transform-origin:0 0}'
  + '@media print{#bd-root{transform:none!important}html,body{overflow:visible!important}}</style>'
  + '<script>(function(){'
  + 'function size(){var r=document.getElementById("bd-root");if(!r)return;r.style.transform="";'
  + 'var p=r.querySelector(".bd-page");var w=p?p.offsetWidth:r.scrollWidth;var a=document.documentElement.clientWidth;'
  + 'var s=w>a&&w>0?a/w:1;if(s<1)r.style.transform="scale("+s+")";'
  + 'var h=Math.ceil(r.getBoundingClientRect().bottom)+8;'
  + 'parent.postMessage({bmBiodata:"size",height:h,pages:window.__bdPaginated||0},"*");}'
  + 'function run(){try{if(typeof window.__bdRepaginate==="function")window.__bdRepaginate();}catch(e){}size();}'
  + 'var f=document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve();f.then(run,run);'
  + 'window.addEventListener("resize",size);setTimeout(size,800);setTimeout(size,2500);'
  + 'if(document.fonts&&document.fonts.addEventListener)document.fonts.addEventListener("loadingdone",function(){setTimeout(size,60);});'
  + 'window.addEventListener("message",function(e){if(e.source===parent&&e.data&&e.data.bmBiodata==="print")window.print();});'
  + '})();</script>';

// The document shown in the share iframe (srcdoc, escaped as an attribute by
// the view): the kit's preview shell with the API's kit-rendered html/css.
// Every user string in `html` was escaped by the kit renderer on the API.
function shareDocument(shared, K) {
  // "<" has no place in kit CSS outside strings; as a CSS escape it can never close the <style>.
  const css = String(shared.css || '').replace(/</g, '\\3c ');
  const body = String(shared.html || '').replace(/<\/?(script|iframe|object|embed)\b[^>]*>/gi, '');
  let fontsCss = '';
  try {
    if (K && typeof K.fontFaceCss === 'function') fontsCss = K.fontFaceCss(Array.isArray(shared.fontFamilies) ? shared.fontFamilies : [], fontUrl) || '';
  } catch (err) { fontsCss = ''; }
  let shell = '';
  try { if (K && typeof K.previewShell === 'function') shell = String(K.previewShell({ fontUrl }) || ''); } catch (err) { shell = ''; }
  const rootRe = /(<div id="bd-root"[^>]*>)([\s\S]*?)(<\/div>)/;
  if (shell && rootRe.test(shell) && /<\/body>/i.test(shell)) {
    let doc = shell;
    if (fontsCss) doc = doc.replace(/(<style id="bd-fonts"[^>]*>)[\s\S]*?(<\/style>)/, (m, a, b) => a + fontsCss + b);
    doc = /<style id="bd-css"[^>]*>[\s\S]*?<\/style>/.test(doc)
      ? doc.replace(/(<style id="bd-css"[^>]*>)[\s\S]*?(<\/style>)/, (m, a, b) => a + css + b)
      : doc.replace(/<\/head>/i, () => `<style>${css}</style></head>`);
    doc = doc.replace(rootRe, (m, a, inner, c) => a + body + c);
    return doc.replace(/<\/body>/i, () => SHARE_BRIDGE + '</body>');
  }
  // No kit shell (should not happen in a deploy): show the flow unpaginated.
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
    + `<style>${fontsCss}</style><style>${css}</style><style>#bd-flow{display:block!important;visibility:visible!important}</style>`
    + `</head><body><div id="bd-root">${body}</div>${SHARE_BRIDGE}</body></html>`;
}

function shareHeaders(res) {
  res.set({
    'X-Robots-Tag': 'noindex, nofollow',
    'Cache-Control': 'private, no-store',
    'Referrer-Policy': 'no-referrer',
  });
}

function renderShareMissing(req, res) {
  shareHeaders(res);
  return res.status(404).render('pages/biodata-shared', {
    meta: pageMeta('biodataShared', { title: 'Biodata link not available', canonical: undefined }),
    user: req.user || null,
    breadcrumbs: [{ name: 'Biodata Maker', url: BASE }, { name: 'Shared biodata' }],
    shared: null,
    token: null,
    srcdoc: '',
  });
}

router.get(`${BASE}/s/:token`, async (req, res, next) => {
  const token = req.params.token;
  if (!SHARE_TOKEN_RE.test(token)) return renderShareMissing(req, res);
  let body;
  try {
    // Uncached on purpose: a disabled or rotated link must stop working at once.
    body = await apiGet('/api/biodata/shared/' + token, { timeout: 3000 });
  } catch (err) {
    shareHeaders(res);
    return next(err);
  }
  const shared = dataOf(body);
  if (!shared || typeof shared.html !== 'string') return renderShareMissing(req, res);
  shareHeaders(res);
  res.render('pages/biodata-shared', {
    meta: pageMeta('biodataShared', { canonical: undefined }),
    user: null,
    breadcrumbs: [{ name: 'Biodata Maker', url: BASE }, { name: 'Shared biodata' }],
    shared: {
      title: textOf(shared.title) || 'Marriage biodata',
      expiresAt: shared.expiresAt || null,
      lang: shared.design && shared.design.labelLanguage === 'hi' ? 'hi' : 'en',
    },
    token,
    srcdoc: shareDocument(shared, kit()),
  });
});

// ---------------------------------------------------------------------------
// Guide pages: /marriage-biodata-* and /banjara-biodata-* (BiodataPage kind 'guide')
// ---------------------------------------------------------------------------

function canonicalFor(page, slug) {
  const o = typeof page.canonicalOverride === 'string' ? page.canonicalOverride.trim() : '';
  if (o && (isInternalHref(o) || o.startsWith(SITE_URL + '/'))) return o;
  return '/' + slug;
}

function guideJsonLd(page, slug, canonical, faqs) {
  const url = canonical.startsWith('http') ? canonical : SITE_URL + canonical;
  const org = { '@id': `${SITE_URL}/#organization` };
  const image = SITE_URL + (typeof page.ogImage === 'string' && OWN_IMAGE_RE.test(page.ogImage) ? page.ogImage : OG_IMAGE);
  const date = (v) => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d.toISOString() : undefined; };
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: (textOf(page.h1) || textOf(page.metaTitle) || slug).slice(0, 110),
    description: textOf(page.metaDescription),
    image,
    url,
    inLanguage: 'en-IN',
    author: org,
    publisher: org,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const published = date(page.publishedAt);
  const modified = date(page.updatedAt) || published;
  if (published) article.datePublished = published;
  if (modified) article.dateModified = modified;
  return faqs.length ? [article, faqPageLd(faqs)] : [article];
}

router.get(GUIDE_ROUTE_RE, optionalUser, async (req, res, next) => {
  const slug = req.params[0];
  if (!GUIDE_SLUG_RE.test(slug)) return next();
  try {
    // API 404 -> null (cached 60 s) -> 404 page; API down without a stale copy -> 503.
    const body = await apiGet('/api/biodata/pages/' + slug, { key: 'biodata:page:' + slug, ttl: 5 * 60e3 });
    const page = dataOf(body);
    if (!page || page.kind !== 'guide' || page.isPublished === false) return next();
    const [{ templates }, guides] = await Promise.all([loadTemplates(), loadGuideLinks()]);
    const faqs = cleanFaqs(page.faqs);
    const canonical = canonicalFor(page, slug);
    const title = textOf(page.metaTitle) || textOf(page.h1) || slug.replace(/-/g, ' ');
    res.render('pages/biodata-guide', {
      meta: pageMeta('biodataGuide', {
        title,
        description: textOf(page.metaDescription),
        canonical,
        robots: robotsFor(page),
        ogImage: typeof page.ogImage === 'string' && OWN_IMAGE_RE.test(page.ogImage) ? page.ogImage : OG_IMAGE,
        jsonLd: guideJsonLd(page, slug, canonical, faqs),
      }),
      user: req.user || null,
      breadcrumbs: [{ name: 'Biodata Maker', url: BASE }, { name: textOf(page.h1) || title, url: '/' + slug }],
      page,
      slug,
      faqs,
      cta: cleanCta(page.ctaConfig, DEFAULT_CTA),
      relatedLinks: publishedOnly(cleanLinks(page.relatedLinks), guides).filter((l) => l.href !== '/' + slug),
      guides: guides.filter((g) => g.href !== '/' + slug),
      templates: templates.slice(0, 6),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// Assets: kit bundle (dev / no build) and the biodata fonts
// ---------------------------------------------------------------------------

router.get('/js/biodata-kit.js', (req, res, next) => {
  const K = kit();
  if (!K || !Array.isArray(K.bundleFiles) || !K.bundleFiles.length) return next();
  try {
    const code = K.bundleFiles.map((f) => `/* ${path.basename(f)} */\n${fs.readFileSync(f, 'utf8')}\n;`).join('\n');
    res.set({ 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' }).send(code);
  } catch (err) {
    next(err);
  }
});

// /fonts/biodata/* -> the kit's fonts dir. CORS-open because the share view's
// sandboxed iframe has an opaque origin (OFL fonts, nothing private).
let fontsStatic;
function fonts(req, res, next) {
  if (fontsStatic === undefined) {
    const K = kit();
    const dir = K && typeof K.fontsDir === 'string' && fs.existsSync(K.fontsDir) ? K.fontsDir : null;
    fontsStatic = dir ? express.static(dir, {
      index: false,
      etag: true,
      maxAge: '30d',
      setHeaders: (r) => r.setHeader('Access-Control-Allow-Origin', '*'),
    }) : null;
    // Not there yet: try again on a later request instead of caching the miss.
    if (!fontsStatic) { fontsStatic = undefined; return next(); }
  }
  return fontsStatic(req, res, next);
}

module.exports = router;
module.exports.fonts = fonts;
module.exports.categoryRedirect = categoryRedirect;
module.exports.normalizeTemplate = normalizeTemplate;
module.exports.loadTemplates = loadTemplates;
module.exports.buildBoot = buildBoot;
module.exports.shareDocument = shareDocument;
module.exports.cleanFaqs = cleanFaqs;
module.exports.robotsFor = robotsFor;
module.exports.GUIDE_SLUG_RE = GUIDE_SLUG_RE;
module.exports.GUIDE_ROUTE_RE = GUIDE_ROUTE_RE;
module.exports.SHARE_TOKEN_RE = SHARE_TOKEN_RE;
module.exports.MIN_INDEX_WORDS = MIN_INDEX_WORDS;
module.exports.CONFIG_DEFAULTS = CONFIG_DEFAULTS;
module.exports.BIODATA_ARTICLES = BIODATA_ARTICLES;
