'use strict';
// Safe serialisation for data embedded in HTML (JSON-LD, inline config).
//
// JSON.stringify alone is not safe inside a <script>: a value containing
// "</script>" closes the block and the rest is executed as markup, and
// U+2028/U+2029 are line terminators in older JS engines. Every character that
// could do that is written as a \uXXXX escape, which JSON parsers and browsers
// both read back as the original character. (D0.2)

function safeJson(value) {
  const json = JSON.stringify(value === undefined ? null : value);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// One JSON-LD block. Templates use `<%- jsonLd(obj) %>`; the lint
// (scripts/check-ejs-raw-web.js) allows this prefix because the output is
// escaped here. Null/undefined renders nothing, so optional blocks need no guard.
function jsonLd(obj) {
  if (obj === null || obj === undefined) return '';
  return '<script type="application/ld+json">' + safeJson(obj) + '</script>';
}

const SITE_URL = 'https://www.banjaramatch.com';

// FAQPage from admin-managed categories [{title, faqs: [{question, answer}]}]
// (GET /api/faqs, normalised by routes/index.js). /faq carries exactly one.
function faqPageJsonLd(categories) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (categories || []).flatMap((c) => (c.faqs || []).map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    }))),
  };
}

// CollectionPage + ItemList of CreativeWork for /success-stories. No Review or
// rating markup: stories are not reviews of the service.
//   stories: API rows {groomName, brideName, story, photo, publishedAt}
//   opts: { url, page, pageSize, imageUrl(photo) }
function successStoriesJsonLd(stories, { url, page = 1, pageSize = 12, imageUrl = (p) => p } = {}) {
  const collection = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'BanjaraMatch Success Stories',
    url: url || SITE_URL + '/success-stories',
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
  const rows = Array.isArray(stories) ? stories : [];
  if (!rows.length) return collection;
  collection.mainEntity = {
    '@type': 'ItemList',
    numberOfItems: rows.length,
    itemListElement: rows.map((s, i) => {
      const work = {
        '@type': 'CreativeWork',
        name: [s.groomName, s.brideName].filter(Boolean).join(' & '),
        text: String(s.story || '').slice(0, 500),
      };
      if (s.photo) work.image = imageUrl(s.photo);
      const published = s.publishedAt ? new Date(s.publishedAt) : null;
      if (published && !isNaN(published)) work.datePublished = published.toISOString();
      return { '@type': 'ListItem', position: (page - 1) * pageSize + i + 1, item: work };
    }),
  };
  return collection;
}

module.exports = { safeJson, jsonLd, faqPageJsonLd, successStoriesJsonLd };
