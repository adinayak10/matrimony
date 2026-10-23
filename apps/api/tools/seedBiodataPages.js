'use strict';
/**
 * tools/seedBiodataPages.js — seed the biodata maker's CMS pages (landing +
 * guides) from @banjaramatch/shared/biodata/content/pages (contract §2b).
 *
 * Every page goes through the same reader as the admin API
 * (controllers/admin/biodataAdminController.readPage: sanitizeRich for html,
 * plain text elsewhere, internal links only, slug rules per kind) and gets its
 * contentWords computed (>= 300 unique words makes a guide indexable).
 *
 * Idempotent upsert by slug. Existing pages are left alone (admin edits win)
 * unless --force, which overwrites their content but never their publish
 * state. A new page is created unpublished unless --publish.
 * Dry run by default (prints what it would do).
 *
 *   node tools/seedBiodataPages.js
 *   node tools/seedBiodataPages.js --apply --yes-i-know [--prod] [--force] [--publish]
 *
 * After publishing on production, regenerate the sitemaps (any admin
 * publish does it, or the web's /api/regenerate-sitemap).
 */
const g = require('./_guard');
const BiodataPage = require('../models/BiodataPage');
const { pagesContent } = require('../services/biodataKit');
const { readPage, slugError, wordsOf } = require('../controllers/admin/biodataAdminController');

const PAGE_KEYS = ['slug', 'kind', 'metaTitle', 'metaDescription', 'canonicalOverride', 'ogImage', 'h1', 'intro', 'contentBlocks', 'faqs', 'ctaConfig', 'relatedLinks'];

/** Validate one content entry; returns {fields} or {error}. Exported for tests. */
function preparePage(entry) {
  const src = {};
  for (const k of PAGE_KEYS) if (entry && entry[k] !== undefined) src[k] = entry[k];
  const r = readPage(src, { partial: false });
  if (r.error) return { error: r.error };
  const se = slugError(r.fields.kind, r.fields.slug);
  if (se) return { error: se };
  return { fields: { ...r.fields, contentWords: wordsOf(r.fields) } };
}

async function seed({ apply, force = false, publish = false, pages, now = new Date(), log = console.log }) {
  const report = [];
  for (const entry of pages) {
    const slug = entry && entry.slug;
    const p = preparePage(entry);
    if (p.error) throw new Error(`${slug || '(no slug)'}: ${p.error}`);
    const existing = await BiodataPage.findOne({ slug: p.fields.slug }).select('_id kind isPublished contentWords').lean();
    let action;
    if (existing && existing.kind !== p.fields.kind) throw new Error(`${slug}: exists with kind ${existing.kind}, content says ${p.fields.kind}`);
    if (!existing) action = 'create';
    else if (force) action = 'overwrite';
    else action = 'skip (exists; --force overwrites)';

    if (apply && action !== 'skip (exists; --force overwrites)') {
      const { slug: s, ...content } = p.fields;
      await BiodataPage.updateOne(
        { slug: s },
        {
          $set: content,
          $setOnInsert: { slug: s, isPublished: !!publish, publishedAt: publish ? now : null },
        },
        { upsert: true, runValidators: true }
      );
    }
    report.push({ slug: p.fields.slug, kind: p.fields.kind, contentWords: p.fields.contentWords, indexable: p.fields.contentWords >= 300, action });
  }
  log(JSON.stringify(report, null, 2));
  return report;
}

if (require.main === module) {
  g.run(async ({ apply, args }) => {
    const pages = pagesContent();
    if (!pages || !pages.length) throw new Error('@banjaramatch/shared/biodata/content/pages is missing or empty');
    await seed({ apply, force: args.force === true, publish: args.publish === true, pages });
    if (!apply) console.log('[seedBiodataPages] dry run; add --apply --yes-i-know to write');
  });
}

module.exports = { seed, preparePage };
