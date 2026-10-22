'use strict';
/**
 * tools/applyCityPageContent.js
 *
 * Applies a reviewed CMS content file (docs/content/regional/<slug>.json) to
 * one regional city page. Only the top-level fields listed under `fields` are
 * replaced; slug, city, state, stats, banners and counters are never touched.
 * Rich text goes through the same sanitizer as the admin API
 * (services/sanitize.sanitizeDeep), and the report shows the unique-word count
 * the index rule uses (>= 300 makes the city page indexable).
 * Dry run by default.
 *
 *   node tools/applyCityPageContent.js ../../docs/content/regional/banjara-matrimony-ahmedabad.json
 *   node tools/applyCityPageContent.js <file> --apply --yes-i-know [--prod]
 *
 * After applying on production, regenerate the sitemaps (admin panel, or any
 * admin save on a regional page) so an indexable page is listed.
 */
const fs = require('fs');
const path = require('path');
const g = require('./_guard');
const CityRegionalPage = require('../models/CityRegionalPage');
const { sanitizeDeep, contentWords } = require('../services/sanitize');

// Never written by this tool, whatever the content file says.
const PROTECTED = new Set(['_id', 'slug', 'city', 'state', 'stats', 'views', 'registrationsFromPage', 'createdBy', 'updatedBy', 'createdAt', 'updatedAt', 'bannerImages']);

// Plain-text head fields: tags are stripped but `&` stays `&` (the page head
// escapes them; an HTML-entity copy would show up as "&amp;" in the title).
const PLAIN_TEXT = new Set(['metaTitle', 'metaDescription', 'metaKeywords']);
const stripTags = (v) => (Array.isArray(v) ? v.map(stripTags) : typeof v === 'string' ? v.replace(/<[^>]*>/g, '').trim() : v);

// Mongoose silently drops paths the schema does not define; list them instead
// so a typo in a content file fails loudly (also in a dry run).
function unknownPaths(schema, obj, prefix = '', out = []) {
  for (const [key, value] of Object.entries(obj || {})) {
    const full = prefix + key;
    const type = schema.pathType(full);
    if (type === 'adhocOrUndefined') out.push(full);
    else if (type === 'nested' && value && typeof value === 'object') unknownPaths(schema, value, full + '.', out);
    else if (type === 'real' && Array.isArray(value) && schema.path(full).schema) {
      value.forEach((item, i) => {
        const bad = unknownPaths(schema.path(full).schema, item);
        bad.forEach((p) => out.push(`${full}[${i}].${p}`));
      });
    }
  }
  return out;
}

g.run(async ({ apply, args }) => {
  const file = args._[0];
  if (!file) throw new Error('Usage: node tools/applyCityPageContent.js <content.json> [--apply --yes-i-know]');
  const doc = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!doc.slug || !doc.fields || typeof doc.fields !== 'object') throw new Error('content file needs "slug" and "fields"');

  const page = await CityRegionalPage.findOne({ slug: doc.slug }).lean();
  if (!page) throw new Error(`No city page with slug ${doc.slug}`);

  const update = {};
  for (const [key, value] of Object.entries(doc.fields)) {
    if (PROTECTED.has(key)) throw new Error(`Field "${key}" is protected and cannot be set by this tool`);
    update[key] = PLAIN_TEXT.has(key) ? stripTags(value) : sanitizeDeep(value);
  }

  const unknown = unknownPaths(CityRegionalPage.schema, update);
  if (unknown.length) throw new Error(`Not in the CityRegionalPage schema (would be dropped): ${unknown.join(', ')}`);

  const before = contentWords(page);
  const after = contentWords({ ...page, ...update });
  // eslint-disable-next-line no-console
  console.log({
    slug: doc.slug,
    fields: Object.keys(update),
    uniqueWordsBefore: before,
    uniqueWordsAfter: after,
    indexableAfter: after >= (Number(process.env.CITY_INDEX_MIN_WORDS) || 300),
    applied: apply,
  });

  if (apply) {
    await CityRegionalPage.updateOne({ _id: page._id }, { $set: update });
  }
}, { writes: g.apply });
