// Biodata page create / edit (biodata maker, Phase 4) on /biodata-pages/new and /biodata-pages/:id/edit.
// Contract: docs/plans/02-biodata-maker-contract.md §2.
//   GET  /api/admin/biodata/pages/:id            → data (full BiodataPage)
//   POST /api/admin/biodata/pages                 body below → data { _id, … }
//   PUT  /api/admin/biodata/pages/:id             body below (no kind; no slug once published: SLUG_FROZEN)
//   POST /api/admin/biodata/pages/:id/publish     { published } (sitemap regeneration happens in the API)
//   GET  /api/admin/biodata/templates             only for the category slug suggestions (categories [{slug,name}])
// Body: { kind, slug, h1, intro (HTML, sanitised by the API), contentBlocks[≤20], faqs[≤15],
//         ctaConfig{heading,text,primaryLabel,primaryHref,secondaryLabel,secondaryHref},
//         relatedLinks[≤8 internal], metaTitle≤70, metaDescription≤170, canonicalOverride, ogImage }
// Publishing is a separate call made after a successful save, so a validation error never
// leaves a half-saved page published. Errors {status:false, code, message, field?} are shown as a
// toast and, when a field is named (or the code is about the slug), under that field.
import { api, errorMessage } from '../core/api.js';
import { html, appendHtml, el, els, delegate } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { confirm } from '../core/confirm.js';
import { bindCounters, invalid, clearInvalid, uid, listToText, textToList } from '../core/fields.js';
import { busy, webUrl } from '../core/ui.js';

const root = el('.page-biodata-page-form');
const pageId = root.dataset.pageId || '';
const form = el('#biodata-page-form');
const f = form.elements;
const errorBox = el('[data-form-error]');
const errorText = el('[data-form-error-text]');
const retryBtn = el('[data-retry]');
const blocksHost = el('[data-blocks]', form);
const faqsHost = el('[data-faqs]', form);
const linksHost = el('[data-links]', form);
const dirtyNote = el('[data-dirty-note]', form);
const liveLink = el('[data-live-link]', form);
const publishHelp = el('[data-publish-help]', form);

const GUIDE_SLUG = /^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$/;
const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANDING_SLUG = 'biodata-maker';
const INTERNAL_PATH = /^\/(?!\/)[^\s<>"'\\]*$/;
const INDEX_MIN_WORDS = 300;
const MAX_BLOCKS = 20;
const MAX_FAQS = 15;
const MAX_LINKS = 8;
const BLOCK_TYPES = {
  richText: { label: 'Rich text', fields: ['heading', 'html'] },
  steps: { label: 'Steps', fields: ['heading', 'items'] },
  checklist: { label: 'Checklist', fields: ['heading', 'items'] },
  table: { label: 'Table', fields: ['heading', 'rows'] },
  callout: { label: 'Callout', fields: ['heading', 'html'] },
  cta: { label: 'Call to action', fields: ['heading', 'html', 'ctaLabel', 'ctaHref'] },
};

let loaded = null;        // the page as last loaded/saved (edit only)
let categorySlugs = [];   // from the template registry, for the category kind
let dirty = false;

// ---- small helpers ------------------------------------------------------------------
const kindNow = () => (loaded && loaded.kind) || f.kind.value;
function liveUrl(p) {
  const slug = encodeURIComponent(p.slug || '');
  if (p.kind === 'landing') return webUrl('/biodata-maker');
  if (p.kind === 'category') return webUrl(`/biodata-maker/templates/${slug}`);
  return webUrl(`/${slug}`);
}
function setDirty(v) {
  dirty = v;
  dirtyNote.textContent = v ? 'Unsaved changes' : 'No unsaved changes';
}
function showError(message, { retry = false } = {}) {
  errorText.textContent = message;
  errorBox.hidden = false;
  retryBtn.hidden = !retry;
  errorBox.scrollIntoView({ block: 'nearest' });
}

// CSV for table rows: commas separate cells; "quoted" cells may hold commas and "" for a quote.
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"' && cur.trim() === '') { quoted = true; cur = ''; }
    else if (c === ',') { out.push(cur.trim()); cur = ''; }
    else cur += c;
  }
  out.push(cur.trim());
  return out;
}
const csvCell = (s) => (/[",]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));
const rowsToCsv = (rows) => (Array.isArray(rows) ? rows.map((r) => (Array.isArray(r) ? r : [r]).map((c) => csvCell(c == null ? '' : c)).join(', ')).join('\n') : '');

// ---- repeater rows ------------------------------------------------------------------
function blockRow(b = {}) {
  const type = BLOCK_TYPES[b.type] ? b.type : 'richText';
  const def = BLOCK_TYPES[type];
  const n = uid('blk');
  const has = (k) => def.fields.includes(k);
  return html`<div class="repeater__row" data-block data-type="${type}">
    <div class="repeater__head"><span data-block-title>${def.label}</span>
      <span class="btn-group">
        <button type="button" class="btn btn--ghost btn--sm" data-action="block-up">Up</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="block-down">Down</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="block-remove">Remove</button>
      </span>
    </div>
    ${has('heading') ? html`<div class="form-group"><label class="form-label" for="${n}-heading">Heading</label><input class="form-control" type="text" id="${n}-heading" data-b="heading" maxlength="150" value="${b.heading || ''}" autocomplete="off"></div>` : ''}
    ${has('html') ? html`<div class="form-group"><label class="form-label" for="${n}-html">${type === 'cta' ? 'Text (HTML, optional)' : 'Content (HTML)'}</label><textarea class="form-control mono" id="${n}-html" data-b="html" rows="${type === 'richText' ? 8 : 4}">${b.html || ''}</textarea></div>` : ''}
    ${has('items') ? html`<div class="form-group"><label class="form-label" for="${n}-items">Items, one per line</label><textarea class="form-control" id="${n}-items" data-b="items" rows="6">${listToText(b.items, '\n')}</textarea></div>` : ''}
    ${has('rows') ? html`<div class="form-group"><label class="form-label" for="${n}-rows">Rows, one per line, cells separated by commas (first line is the header)</label><textarea class="form-control mono" id="${n}-rows" data-b="rows" rows="6">${rowsToCsv(b.rows)}</textarea></div>` : ''}
    ${has('ctaLabel') ? html`<div class="form-row">
      <div class="form-group"><label class="form-label" for="${n}-cta-label">Button label</label><input class="form-control" type="text" id="${n}-cta-label" data-b="ctaLabel" maxlength="60" value="${b.ctaLabel || ''}" autocomplete="off"></div>
      <div class="form-group"><label class="form-label" for="${n}-cta-href">Button link</label><input class="form-control mono" type="text" id="${n}-cta-href" data-b="ctaHref" maxlength="300" value="${b.ctaHref || ''}" placeholder="/biodata-maker/create" autocomplete="off"></div>
    </div>` : ''}
  </div>`;
}

function faqRow(q = {}) {
  const n = uid('bfaq');
  return html`<div class="repeater__row" data-faq>
    <div class="repeater__head"><span data-faq-title>Question</span><button type="button" class="btn btn--ghost btn--sm" data-action="faq-remove">Remove</button></div>
    <div class="form-group"><label class="form-label" for="${n}-q">Question<span class="form-count" data-count-for="${n}-q" aria-hidden="true"></span></label><input class="form-control" type="text" id="${n}-q" data-faq-q maxlength="300" value="${q.question || ''}" autocomplete="off"></div>
    <div class="form-group mb-0"><label class="form-label" for="${n}-a">Answer<span class="form-count" data-count-for="${n}-a" aria-hidden="true"></span></label><textarea class="form-control" id="${n}-a" data-faq-a rows="3" maxlength="2000">${q.answer || ''}</textarea></div>
  </div>`;
}

function linkRow(l = {}) {
  const n = uid('blink');
  return html`<div class="repeater__row" data-link>
    <div class="repeater__head"><span>Link</span><button type="button" class="btn btn--ghost btn--sm" data-action="link-remove">Remove</button></div>
    <div class="form-row">
      <div class="form-group mb-0"><label class="form-label" for="${n}-label">Label</label><input class="form-control" type="text" id="${n}-label" data-link-label maxlength="100" value="${l.label || ''}" autocomplete="off"></div>
      <div class="form-group mb-0"><label class="form-label" for="${n}-href">Path</label><input class="form-control mono" type="text" id="${n}-href" data-link-href maxlength="300" value="${l.href || ''}" placeholder="/marriage-biodata-format" autocomplete="off"></div>
    </div>
  </div>`;
}

/** Numbers the blocks, labels their buttons and enforces the caps on the add buttons. */
function refreshRepeaters() {
  const blocks = els('[data-block]', blocksHost);
  blocks.forEach((row, i) => {
    const label = (BLOCK_TYPES[row.dataset.type] || BLOCK_TYPES.richText).label;
    el('[data-block-title]', row).textContent = `${i + 1}. ${label}`;
    const up = el('[data-action="block-up"]', row);
    const down = el('[data-action="block-down"]', row);
    const rm = el('[data-action="block-remove"]', row);
    up.disabled = i === 0;
    down.disabled = i === blocks.length - 1;
    up.setAttribute('aria-label', `Move block ${i + 1} (${label}) up`);
    down.setAttribute('aria-label', `Move block ${i + 1} (${label}) down`);
    rm.setAttribute('aria-label', `Remove block ${i + 1} (${label})`);
  });
  el('[data-action="add-block"]', form).disabled = blocks.length >= MAX_BLOCKS;
  els('[data-faq]', faqsHost).forEach((row, i) => { el('[data-faq-title]', row).textContent = `Question ${i + 1}`; });
  el('[data-action="add-faq"]', form).disabled = els('[data-faq]', faqsHost).length >= MAX_FAQS;
  el('[data-action="add-link"]', form).disabled = els('[data-link]', linksHost).length >= MAX_LINKS;
}

// ---- collect + count -----------------------------------------------------------------
function collect() {
  const val = (name) => String(f[name] ? f[name].value : '').trim();
  const contentBlocks = els('[data-block]', blocksHost).map((row) => {
    const type = row.dataset.type;
    const get = (k) => { const c = row.querySelector(`[data-b="${k}"]`); return c ? c.value : null; };
    const b = { type };
    if (get('heading') !== null) b.heading = get('heading').trim();
    if (get('html') !== null) b.html = get('html').trim();
    if (get('items') !== null) b.items = textToList(get('items'), '\n');
    if (get('rows') !== null) b.rows = get('rows').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map(parseCsvLine);
    if (get('ctaLabel') !== null) b.ctaLabel = get('ctaLabel').trim();
    if (get('ctaHref') !== null) b.ctaHref = get('ctaHref').trim();
    return b;
  });
  const faqs = els('[data-faq]', faqsHost)
    .map((row) => ({ question: el('[data-faq-q]', row).value.trim(), answer: el('[data-faq-a]', row).value.trim() }))
    .filter((q) => q.question || q.answer);
  const relatedLinks = els('[data-link]', linksHost)
    .map((row) => ({ label: el('[data-link-label]', row).value.trim(), href: el('[data-link-href]', row).value.trim() }))
    .filter((l) => l.label || l.href);
  return {
    kind: kindNow(),
    slug: val('slug').toLowerCase(),
    h1: val('h1'),
    intro: val('intro'),
    contentBlocks,
    faqs,
    ctaConfig: {
      heading: val('ctaConfig.heading'),
      text: val('ctaConfig.text'),
      primaryLabel: val('ctaConfig.primaryLabel'),
      primaryHref: val('ctaConfig.primaryHref'),
      secondaryLabel: val('ctaConfig.secondaryLabel'),
      secondaryHref: val('ctaConfig.secondaryHref'),
    },
    relatedLinks,
    metaTitle: val('metaTitle'),
    metaDescription: val('metaDescription'),
    canonicalOverride: val('canonicalOverride'),
    ogImage: val('ogImage'),
  };
}

const stripHtml = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
/** Mirrors services/sanitize.contentWords: unique words of 2+ letters, Latin digits and Devanagari. */
function countWords(page) {
  const parts = [page.h1, page.intro];
  for (const b of page.contentBlocks) {
    parts.push(b.heading, b.html, b.ctaLabel, ...(b.items || []));
    for (const r of b.rows || []) parts.push(...r);
  }
  for (const q of page.faqs) parts.push(q.question, q.answer);
  const words = new Set();
  for (const part of parts) {
    for (const w of stripHtml(part).toLowerCase().split(/[^a-z0-9\u0900-\u097f]+/iu)) if (w && w.length > 1) words.add(w);
  }
  return words.size;
}

let countTimer = null;
function recount() {
  const n = countWords(collect());
  const kind = kindNow();
  el('[data-words]', form).textContent = n.toLocaleString();
  const badge = el('[data-words-badge]', form);
  badge.textContent = '';
  const span = document.createElement('span');
  if (kind === 'landing') { span.className = 'badge badge--neutral'; span.textContent = 'Always indexed'; }
  else if (n >= INDEX_MIN_WORDS) { span.className = 'badge badge--success'; span.textContent = 'Indexable'; }
  else { span.className = 'badge badge--warning'; span.textContent = `<300 words: not indexed (${INDEX_MIN_WORDS - n} more)`; }
  badge.appendChild(span);
  const thin = kind !== 'landing' && n < INDEX_MIN_WORDS;
  publishHelp.textContent = `Applied when you save. Publishing freezes the slug and regenerates the sitemap.${thin && f.isPublished.checked ? ` With ${n} unique words this page is published with noindex and stays out of the sitemap until it reaches ${INDEX_MIN_WORDS}.` : ''}`;
}
const recountSoon = () => { clearTimeout(countTimer); countTimer = setTimeout(recount, 250); };

// ---- kind / slug ----------------------------------------------------------------------
function syncKind() {
  const kind = kindNow();
  const published = !!(loaded && loaded.isPublished);
  if (kind === 'landing') {
    f.slug.value = LANDING_SLUG;
    f.slug.readOnly = true;
  } else {
    if (!loaded && f.slug.value === LANDING_SLUG) f.slug.value = '';
    f.slug.readOnly = published;
  }
  const list = el('#bp-category-slugs');
  list.textContent = '';
  if (kind === 'category') categorySlugs.forEach((c) => list.appendChild(new Option(c.name || c.slug, c.slug)));
  f.slug.placeholder = kind === 'guide' ? 'marriage-biodata-format' : (kind === 'category' ? (categorySlugs[0] && categorySlugs[0].slug) || 'traditional' : LANDING_SLUG);
}

async function loadCategories() {
  try {
    const resp = await api('/admin/biodata/templates');
    const data = resp.data;
    const cats = Array.isArray(resp.categories) ? resp.categories : (data && Array.isArray(data.categories) ? data.categories : []);
    categorySlugs = cats.filter((c) => c && c.slug);
    syncKind();
  } catch (err) { /* suggestions only: the API validates the slug */ }
}

// ---- fill / load ----------------------------------------------------------------------
function fill(p) {
  loaded = p;
  if (![...f.kind.options].some((o) => o.value === p.kind)) f.kind.appendChild(new Option(p.kind, p.kind));
  f.kind.value = p.kind || 'guide';
  f.slug.value = p.slug || '';
  f.h1.value = p.h1 || '';
  f.intro.value = p.intro || '';
  const cta = p.ctaConfig || {};
  for (const k of ['heading', 'text', 'primaryLabel', 'primaryHref', 'secondaryLabel', 'secondaryHref']) f[`ctaConfig.${k}`].value = cta[k] || '';
  f.metaTitle.value = p.metaTitle || '';
  f.metaDescription.value = p.metaDescription || '';
  f.canonicalOverride.value = p.canonicalOverride || '';
  f.ogImage.value = p.ogImage || '';
  f.isPublished.checked = !!p.isPublished;

  blocksHost.textContent = '';
  faqsHost.textContent = '';
  linksHost.textContent = '';
  (Array.isArray(p.contentBlocks) ? p.contentBlocks : []).forEach((b) => appendHtml(blocksHost, blockRow(b)));
  (Array.isArray(p.faqs) ? p.faqs : []).forEach((q) => appendHtml(faqsHost, faqRow(q)));
  (Array.isArray(p.relatedLinks) ? p.relatedLinks : []).forEach((l) => appendHtml(linksHost, linkRow(l)));
  bindCounters(form);
  refreshRepeaters();

  el('[data-page-crumb]').textContent = p.slug ? `/${p.slug}` : 'Edit page';
  if (p.isPublished || p.kind === 'landing') {
    liveLink.href = liveUrl(p);
    liveLink.hidden = false;
  } else {
    liveLink.hidden = true;
  }
  // Non-bubbling input events refresh the counters without marking the form dirty.
  form.querySelectorAll('[maxlength]').forEach((c) => c.dispatchEvent(new Event('input')));
  syncKind();
  recount();
  setDirty(false);
}

async function load() {
  errorBox.hidden = true;
  form.setAttribute('aria-busy', 'true');
  Array.from(f).forEach((c) => { c.disabled = true; });
  try {
    const { data } = await api(`/admin/biodata/pages/${pageId}`);
    Array.from(f).forEach((c) => { c.disabled = c === f.kind; });
    fill(data || {});
    form.setAttribute('aria-busy', 'false');
  } catch (err) {
    showError(errorMessage(err, 'Could not load this page.'), { retry: err.status !== 404 });
  }
}

// ---- validation (mirrors the API's rules) --------------------------------------------------
function validate(body) {
  clearInvalid(form);
  if (!['landing', 'guide', 'category'].includes(body.kind)) return invalid(f.kind, 'Choose the kind of page.');
  const slugEditable = !f.slug.readOnly;
  if (slugEditable || !loaded) {
    if (body.kind === 'guide' && !GUIDE_SLUG.test(body.slug)) return invalid(f.slug, 'A guide slug starts with marriage-biodata- or banjara-biodata- followed by 2 to 60 lowercase letters, digits or hyphens.');
    if (body.kind === 'category') {
      if (!CATEGORY_SLUG.test(body.slug) || body.slug.length < 2 || body.slug.length > 60) return invalid(f.slug, 'Use the category slug: lowercase letters, digits and single hyphens.');
      if (categorySlugs.length && !categorySlugs.some((c) => c.slug === body.slug)) return invalid(f.slug, `Not a template category. Use one of: ${categorySlugs.map((c) => c.slug).join(', ')}.`);
    }
    if (body.kind === 'landing' && body.slug !== LANDING_SLUG) return invalid(f.slug, `The landing page slug is ${LANDING_SLUG}.`);
  }
  if (!body.h1) return invalid(f.h1, 'Enter the page heading.');
  if (body.h1.length > 120) return invalid(f.h1, 'Keep the heading to 120 characters.');

  const blockRows = els('[data-block]', blocksHost);
  if (body.contentBlocks.length > MAX_BLOCKS) return invalid(el('[data-b]', blockRows[MAX_BLOCKS]), `Use at most ${MAX_BLOCKS} blocks.`);
  for (let i = 0; i < body.contentBlocks.length; i += 1) {
    const b = body.contentBlocks[i];
    const row = blockRows[i];
    const ctl = (k) => row.querySelector(`[data-b="${k}"]`);
    if ((b.type === 'richText' || b.type === 'callout') && !b.html) return invalid(ctl('html'), 'Add the block content, or remove the block.');
    if ((b.type === 'steps' || b.type === 'checklist') && !b.items.length) return invalid(ctl('items'), 'Add at least one item, one per line.');
    if (b.type === 'table') {
      if (b.rows.length < 2) return invalid(ctl('rows'), 'Add a header line and at least one row.');
      const width = b.rows[0].length;
      if (b.rows.some((r) => r.length !== width)) return invalid(ctl('rows'), `Every line needs the same number of cells as the header (${width}).`);
    }
    if (b.type === 'cta') {
      if (!b.ctaLabel) return invalid(ctl('ctaLabel'), 'Enter the button label.');
      if (!INTERNAL_PATH.test(b.ctaHref)) return invalid(ctl('ctaHref'), 'Use a path on the website starting with /.');
    }
  }

  const faqRows = els('[data-faq]', faqsHost).filter((row) => el('[data-faq-q]', row).value.trim() || el('[data-faq-a]', row).value.trim());
  if (faqRows.length > MAX_FAQS) return invalid(el('[data-faq-q]', faqRows[MAX_FAQS]), `Use at most ${MAX_FAQS} questions.`);
  for (let i = 0; i < body.faqs.length; i += 1) {
    const q = body.faqs[i];
    if (!q.question) return invalid(el('[data-faq-q]', faqRows[i]), 'Enter the question, or remove it.');
    if (!q.answer) return invalid(el('[data-faq-a]', faqRows[i]), 'Enter the answer, or remove the question.');
    if (q.question.length > 300) return invalid(el('[data-faq-q]', faqRows[i]), 'Keep the question to 300 characters.');
    if (q.answer.length > 2000) return invalid(el('[data-faq-a]', faqRows[i]), 'Keep the answer to 2,000 characters.');
  }

  const cta = body.ctaConfig;
  if (cta.primaryLabel && !cta.primaryHref) return invalid(f['ctaConfig.primaryHref'], 'Add the link for this button.');
  if (cta.secondaryLabel && !cta.secondaryHref) return invalid(f['ctaConfig.secondaryHref'], 'Add the link for this button.');
  for (const name of ['ctaConfig.primaryHref', 'ctaConfig.secondaryHref']) {
    const v = f[name].value.trim();
    if (v && !INTERNAL_PATH.test(v)) return invalid(f[name], 'Use a path on the website starting with /.');
  }

  const linkRows = els('[data-link]', linksHost).filter((row) => el('[data-link-label]', row).value.trim() || el('[data-link-href]', row).value.trim());
  if (linkRows.length > MAX_LINKS) return invalid(el('[data-link-label]', linkRows[MAX_LINKS]), `Use at most ${MAX_LINKS} links.`);
  for (let i = 0; i < body.relatedLinks.length; i += 1) {
    const l = body.relatedLinks[i];
    if (!l.label) return invalid(el('[data-link-label]', linkRows[i]), 'Enter the link text.');
    if (!INTERNAL_PATH.test(l.href)) return invalid(el('[data-link-href]', linkRows[i]), 'Use a path on the website starting with / (no external links).');
  }

  if (body.metaTitle.length > 70) return invalid(f.metaTitle, 'Keep the meta title to 70 characters.');
  if (body.metaDescription.length > 170) return invalid(f.metaDescription, 'Keep the meta description to 170 characters.');
  if (body.canonicalOverride && !/^https:\/\/[^\s<>"']+$/i.test(body.canonicalOverride)) return invalid(f.canonicalOverride, 'Enter a full https:// address, or leave it empty.');
  if (body.ogImage && !INTERNAL_PATH.test(body.ogImage) && !/^https:\/\/[^\s<>"']+$/i.test(body.ogImage)) return invalid(f.ogImage, 'Use a path on the website such as /images/biodata/og.jpg.');
  return true;
}

function showServerError(err, fallback) {
  const message = errorMessage(err, fallback);
  const d = (err && err.data) || {};
  const code = String(d.code || '');
  let name = d.field || (Array.isArray(d.errors) && d.errors[0] && (d.errors[0].field || d.errors[0].path)) || '';
  if (!name && (/SLUG/.test(code) || (err && err.status === 409))) name = 'slug';
  const target = name ? form.querySelector(`[name="${CSS.escape(String(name))}"]`) : null;
  if (target && !target.disabled) invalid(target, message);
  toast.error(message);
}

// ---- save -----------------------------------------------------------------------------
async function save() {
  const body = collect();
  if (!validate(body)) return;
  errorBox.hidden = true;
  const wantPublished = f.isPublished.checked;
  if (!pageId) {
    let id = '';
    try {
      const resp = await api('/admin/biodata/pages', { method: 'POST', body });
      id = resp.data && resp.data._id;
    } catch (err) { showServerError(err, 'Could not create the page.'); return; }
    let query = 'created=1';
    if (id && wantPublished) {
      try { await api(`/admin/biodata/pages/${id}/publish`, { method: 'POST', body: { published: true } }); }
      catch (err) { query = 'created=1&publish=failed'; }
    }
    setDirty(false);
    location.assign(id ? `/biodata-pages/${id}/edit?${query}` : '/biodata-pages');
    return;
  }

  const wasPublished = !!(loaded && loaded.isPublished);
  const update = { ...body };
  delete update.kind;
  if (wasPublished) delete update.slug;
  let page;
  try {
    const resp = await api(`/admin/biodata/pages/${pageId}`, { method: 'PUT', body: update });
    page = resp.data && typeof resp.data === 'object' && resp.data.slug ? resp.data : { ...loaded, ...update };
  } catch (err) { showServerError(err, 'Could not save the page.'); return; }
  if (wantPublished !== wasPublished) {
    try {
      const resp = await api(`/admin/biodata/pages/${pageId}/publish`, { method: 'POST', body: { published: wantPublished } });
      page = resp.data && typeof resp.data === 'object' && resp.data.slug ? resp.data : { ...page, isPublished: wantPublished };
    } catch (err) {
      fill({ ...page, isPublished: wasPublished });
      showServerError(err, wantPublished ? 'Saved, but the page could not be published.' : 'Saved, but the page could not be unpublished.');
      return;
    }
  }
  fill(page);
  toast.success(wantPublished !== wasPublished ? (wantPublished ? 'Page saved and published' : 'Page saved and unpublished') : 'Page saved');
}

// ---- events ---------------------------------------------------------------------------
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(el('[data-save]', form), save);
});
form.addEventListener('input', () => { setDirty(true); recountSoon(); });
form.addEventListener('change', (ev) => {
  setDirty(true);
  if (ev.target === f.kind) syncKind();
  recount();
});

function addRow(host, markup, focusSel) {
  appendHtml(host, markup);
  bindCounters(host);
  refreshRepeaters();
  setDirty(true);
  recount();
  const added = host.lastElementChild;
  const target = added && added.querySelector(focusSel);
  if (target) target.focus();
}

function removeRow(row, fallbackSel) {
  const next = row.nextElementSibling || row.previousElementSibling;
  row.remove();
  refreshRepeaters();
  setDirty(true);
  recount();
  const target = (next && next.querySelector('input, textarea')) || el(fallbackSel, form);
  if (target) target.focus();
}

delegate(form, 'click', '[data-action]', (ev, btn) => {
  const a = btn.dataset.action;
  if (btn.disabled) return;
  if (a === 'add-block') {
    if (els('[data-block]', blocksHost).length >= MAX_BLOCKS) { toast.warning(`A page holds at most ${MAX_BLOCKS} blocks.`); return; }
    addRow(blocksHost, blockRow({ type: el('[data-block-type]', form).value }), 'input, textarea');
  } else if (a === 'add-faq') {
    if (els('[data-faq]', faqsHost).length >= MAX_FAQS) { toast.warning(`A page holds at most ${MAX_FAQS} questions.`); return; }
    addRow(faqsHost, faqRow(), '[data-faq-q]');
  } else if (a === 'add-link') {
    if (els('[data-link]', linksHost).length >= MAX_LINKS) { toast.warning(`A page holds at most ${MAX_LINKS} related links.`); return; }
    addRow(linksHost, linkRow(), '[data-link-label]');
  } else if (a === 'block-remove') removeRow(btn.closest('[data-block]'), '[data-action="add-block"]');
  else if (a === 'faq-remove') removeRow(btn.closest('[data-faq]'), '[data-action="add-faq"]');
  else if (a === 'link-remove') removeRow(btn.closest('[data-link]'), '[data-action="add-link"]');
  else if (a === 'block-up' || a === 'block-down') {
    const row = btn.closest('[data-block]');
    const sib = a === 'block-up' ? row.previousElementSibling : row.nextElementSibling;
    if (!sib) return;
    if (a === 'block-up') blocksHost.insertBefore(row, sib); else blocksHost.insertBefore(sib, row);
    refreshRepeaters();
    setDirty(true);
    const again = el(`[data-action="${a}"]:not([disabled])`, row) || el('[data-action^="block-"]:not([disabled])', row);
    if (again) again.focus();
  }
});

// Leaving through Cancel with unsaved work asks first (beforeunload covers everything else).
el('a[href="/biodata-pages"].btn', form).addEventListener('click', async (ev) => {
  if (!dirty) return;
  ev.preventDefault();
  const ok = await confirm({ title: 'Discard your changes?', message: 'The changes on this page have not been saved.', confirmText: 'Discard changes', danger: true });
  if (ok) { setDirty(false); location.assign('/biodata-pages'); }
});
retryBtn.addEventListener('click', load);
window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

bindCounters(form);
refreshRepeaters();
loadCategories();
if (pageId) {
  load();
  const url = new URL(location.href);
  if (url.searchParams.get('created')) {
    if (url.searchParams.get('publish') === 'failed') toast.warning('Page created as a draft: publishing failed. Check the content and publish again.');
    else toast.success('Page created.');
    url.searchParams.delete('created');
    url.searchParams.delete('publish');
    history.replaceState(history.state, '', url);
  }
} else {
  syncKind();
  recount();
  setDirty(false);
}
