'use strict';
// Index rule for regional pages (D3.31, D4.36 noindex rule, D6.47).
//
// A city page is indexable only once the owner has written >= 300 unique
// words of CMS content for it; until then the catch-all renders it with
// `robots: noindex, follow` and the regional sitemap leaves it out. State
// pages are always indexed. Pages never 404 and stay linked either way.
//
//   uniqueCmsWords(page) -> number of distinct words across the CMS text
//   isIndexable(page)    -> true for state pages and cities at/above the threshold
//   robotsFor(page)      -> 'index, follow, max-image-preview:large' | 'noindex, follow'

const MIN_UNIQUE_WORDS = Number(process.env.CITY_INDEX_MIN_WORDS) || 300;

// Owner-written prose fields. Same list and same tokenizer as the API's
// contentWords() (apps/api/services/sanitize.js DEFAULT_CONTENT_FIELDS), so the
// number computed here from GET /api/{city,state}-pages/:slug matches the
// `contentWords` the API puts on its responses. Hero/CTA/"why choose" blocks
// are templated per city and are deliberately not counted.
const CONTENT_FIELDS = [
  'introSection', 'aboutSection', 'localitiesSection', 'faqSection',
  'introContent', 'aboutContent', 'faqs', 'customContentBlocks',
  'communityInsights', 'cityDemographics', 'stateInfo', 'heritageSection',
];

const stripHtml = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

function collectStrings(value, out) {
  if (typeof value === 'string') { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out); return; }
  if (value && typeof value === 'object') {
    // Populated refs and leaked ObjectIds/Dates carry no prose.
    if (value instanceof Date || value._bsontype || value.buffer) return;
    for (const v of Object.values(value)) collectStrings(v, out);
  }
}

// Local count, used while the API in production does not send `contentWords` yet.
function countContentWords(page) {
  const parts = [];
  for (const f of CONTENT_FIELDS) if (page[f] !== undefined) collectStrings(page[f], parts);
  const words = new Set();
  for (const part of parts) {
    // eslint-disable-next-line no-misleading-character-class -- whole Devanagari block on purpose
    for (const w of stripHtml(part).toLowerCase().split(/[^a-z0-9ऀ-ॿ]+/iu)) {
      if (w && w.length > 1) words.add(w);
    }
  }
  return words.size;
}

// The API's own `contentWords` wins when present (list rows and full pages of
// the current API carry it), so the catch-all and the sitemap generator always
// decide from the same number; otherwise the page is counted here.
function uniqueCmsWords(page) {
  if (!page || typeof page !== 'object') return 0;
  if (Number.isFinite(page.contentWords)) return page.contentWords;
  return countContentWords(page);
}

function isStatePage(page) {
  return !!page && (page.pageType === 'state' || (!page.city && !page.pageType));
}

function isIndexable(page) {
  if (!page) return false;
  if (page.isPublished === false) return false;
  if (isStatePage(page)) return true;
  return uniqueCmsWords(page) >= MIN_UNIQUE_WORDS;
}

function robotsFor(page) {
  return isIndexable(page) ? 'index, follow, max-image-preview:large' : 'noindex, follow';
}

module.exports = { MIN_UNIQUE_WORDS, CONTENT_FIELDS, uniqueCmsWords, isIndexable, isStatePage, robotsFor };
