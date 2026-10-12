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

// Fields that are not owner-written prose: identifiers, meta, counters, media,
// relations and anything the API computes per request.
const SKIP_KEYS = new Set([
  '_id', 'id', 'slug', 'pageType', 'canonicalUrl', 'metaTitle', 'metaDescription', 'metaKeywords',
  'bannerImages', 'stats', 'statsSection', 'featuredMembers', 'topCities', 'citiesSection',
  'relatedCityPages', 'sameStateCities', 'breadcrumbs', 'interlinking', 'statePage',
  'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'views', 'registrationsFromPage',
  'isActive', 'isPublished', 'state', 'city', 'icon', 'image', 'url', 'link', 'ctaText',
  'primaryButtonText', 'secondaryButtonText', 'buttonText', 'showStats', 'showTestimonials',
  'showInsights', 'showLocalities', 'showNearbyCities', 'showFaq', 'customStatsLabels',
  'communityInsights', 'stateDemographics', 'cityDemographics', 'nearbyCities', 'popularLocalities',
  '__v',
]);

const stripHtml = (s) => String(s).replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');

function collectStrings(value, out) {
  if (typeof value === 'string') { out.push(value); return; }
  if (Array.isArray(value)) { for (const v of value) collectStrings(v, out); return; }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (SKIP_KEYS.has(k)) continue;
      collectStrings(v, out);
    }
  }
}

function uniqueCmsWords(page) {
  if (!page || typeof page !== 'object') return 0;
  const parts = [];
  collectStrings(page, parts);
  const words = new Set();
  for (const part of parts) {
    for (const w of stripHtml(part).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []) words.add(w);
  }
  return words.size;
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

module.exports = { MIN_UNIQUE_WORDS, uniqueCmsWords, isIndexable, isStatePage, robotsFor };
