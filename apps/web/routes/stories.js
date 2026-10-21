'use strict';
// Success stories (feature expansion C1/C2).
//
//   GET /success-stories        public, list only (no per-story URLs yet). SSR from
//                               GET /api/success-stories?page&limit=12, 10-min SWR cache;
//                               an API failure renders the empty state, never a 503.
//   GET /share-success-story    member form; SSR list of POST /api/fetchMySuccessStories.
//                               The browser posts multipart to /api/submitSuccessStory
//                               through the same-origin proxy (middleware/apiProxy.js).
//
// Mounted in app.js before routes/index.js (its /:slug catch-all stays last).

const express = require('express');
const { apiGet, apiPost, forwardAuth, UpstreamError } = require('../utils/apiClient');
const { listOf } = require('../utils/apiHelpers');
const { optionalUser, ensureAuth, checkProfileCompletion } = require('../middleware/session');
const { pageMeta } = require('../config/pageMeta');
const photoUrl = require('../utils/photoUrl');
const { successStoriesJsonLd } = require('../utils/jsonLd');

const router = express.Router();

const SITE_URL = 'https://www.banjaramatch.com';
const PAGE_SIZE = 12;
const MAX_PAGE = 500;

function pageParam(req) {
  const raw = parseInt(req.query.page, 10);
  return Number.isInteger(raw) && raw > 0 ? Math.min(raw, MAX_PAGE) : 1;
}

// Total pages from the user-route envelope {data, total, page, limit} or a
// blog-style {pagination: {totalPages}}; falls back to "one more page" when a
// full page came back without a total.
function totalPagesOf(body, page, count) {
  if (body && body.pagination && Number(body.pagination.totalPages) >= 0) return Number(body.pagination.totalPages);
  if (body && Number.isFinite(Number(body.total))) {
    const limit = Number(body.limit) > 0 ? Number(body.limit) : PAGE_SIZE;
    return Math.ceil(Number(body.total) / limit);
  }
  return count >= PAGE_SIZE ? page + 1 : page;
}

const pageUrl = (n) => (n <= 1 ? '/success-stories' : '/success-stories?page=' + n);

router.get('/success-stories', optionalUser, async (req, res, next) => {
  const page = pageParam(req);
  let body = null;
  try {
    body = await apiGet(`/api/success-stories?page=${page}&limit=${PAGE_SIZE}`, {
      key: `stories:list:${page}`,
      ttl: 10 * 60e3,
    });
  } catch (err) {
    console.warn('[success-stories] API unavailable, rendering the empty state:', err.message);
  }
  const stories = listOf(body);
  const totalPages = Math.max(1, totalPagesOf(body, page, stories.length));
  // Past the last page (or an empty later page): a real 404, like /blogs.
  if (page > 1 && (!stories.length || page > totalPages)) return next();

  const title = 'Banjara Matrimony Success Stories';
  res.render('pages/success-stories', {
    title,
    meta: pageMeta('successStories', {
      ...(page > 1 ? { title: `${title} - Page ${page}`, prev: pageUrl(page - 1) } : {}),
      ...(page < totalPages ? { next: pageUrl(page + 1) } : {}),
      canonical: pageUrl(page),
      jsonLd: [successStoriesJsonLd(stories, { url: SITE_URL + pageUrl(page), page, pageSize: PAGE_SIZE, imageUrl: photoUrl })],
    }),
    stories,
    currentPage: page,
    totalPages,
    user: req.user || null,
    breadcrumbs: [{ name: 'Success Stories', url: '/success-stories' }],
  });
});

router.get('/share-success-story', ensureAuth, checkProfileCompletion, async (req, res, next) => {
  const headers = forwardAuth(req);
  let myStories = [];
  let loadError = false;
  try {
    myStories = listOf(await apiPost('/api/fetchMySuccessStories', {}, { headers }));
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    loadError = true;
    console.warn('[share-success-story] fetchMySuccessStories failed:', err.message);
  }
  res.render('pages/share-success-story', {
    title: 'Share Your Success Story - Banjara Match',
    meta: pageMeta('shareSuccessStory'),
    user: req.user,
    myStories,
    loadError,
  });
});

module.exports = router;
module.exports.totalPagesOf = totalPagesOf;
