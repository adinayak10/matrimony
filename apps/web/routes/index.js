'use strict';

const express = require('express');
const { apiGet, apiPost, forwardAuth, UpstreamError } = require('../utils/apiClient');
const { listOf, cachedPost, upstreamStatus } = require('../utils/apiHelpers');
const { optionalUser, ensureAuth, redirectIfAuthenticated, checkProfileCompletion } = require('../middleware/session');
const { SwrCache } = require('../utils/swrCache');
const blogCategories = require('../config/blogCategories');
const { pageMeta } = require('../config/pageMeta');
const { robotsFor, uniqueCmsWords } = require('../utils/regionalIndexing');
const site = require('../config/site');
const { faqPageJsonLd } = require('../utils/jsonLd');
const { RETURN_TO_COOKIE } = require('./auth');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const SITE_URL = 'https://www.banjaramatch.com';
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const BLOG_SLUG_RE = /^[A-Za-z0-9._-]{1,200}$/;

// Session middleware and data helpers live in middleware/session.js and
// utils/apiHelpers.js (shared with routes/member.js and routes/stories.js).

// ---------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------

// Featured posts for the content pages: never fails a page.
const featuredBlogs = () => apiGet('/api/blogs/featured?limit=3', { key: 'blogs:featured' })
  .then(listOf)
  .catch(() => []);

function blogsQuery(req) {
  const rawPage = parseInt(req.query.page, 10);
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
  return { page, search };
}

async function loadBlogList({ page, search, category }) {
  const qs = new URLSearchParams({ page: String(page), limit: '6' });
  if (category) qs.set('category', category);
  if (search) qs.set('search', search);
  // Searches are not cached: arbitrary strings would churn the LRU.
  const key = search ? undefined : `blogs:list:${category || 'all'}:${page}`;
  const [list, trending] = await Promise.all([
    apiGet('/api/blogs?' + qs.toString(), { key, ttl: 120e3 }),
    apiGet('/api/blogs/trending?limit=5', { key: 'blogs:trending' }).catch(() => null),
  ]);
  return { list, trending: listOf(trending) };
}

function blogNotFound(req, res) {
  return res.status(404).render('pages/blog-detail', {
    title: 'Blog Not Found - BanjaraMatch',
    meta: { title: 'Blog Not Found - BanjaraMatch', description: '', robots: 'noindex, nofollow', canonical: undefined, pageCategory: 'blog_post' },
    blog: null,
    relatedBlogs: [],
    user: req.user || null
  });
}

// Absolute URL for a blog image path ('images/blog/x.jpg' or already absolute).
const blogImageUrl = (p) => (!p ? null : /^https?:\/\//.test(p) ? p : `${SITE_URL}/${String(p).replace(/^\/+/, '')}`);

function blogPostingJsonLd(blog, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.metaDescription || blog.description || '',
    ...(blogImageUrl(blog.featuredImage) ? { image: blogImageUrl(blog.featuredImage) } : {}),
    datePublished: new Date(blog.publishedAt || blog.createdAt || Date.now()).toISOString(),
    dateModified: new Date(blog.updatedAt || blog.publishedAt || blog.createdAt || Date.now()).toISOString(),
    author: blog.author && blog.author.name && !/banjaramatch/i.test(blog.author.name)
      ? { '@type': 'Person', name: blog.author.name }
      : { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    articleSection: blog.category,
    keywords: (blog.metaKeywords && blog.metaKeywords.length ? blog.metaKeywords : blog.tags) || [],
  };
}

// Article + FAQPage for /banjara-gotra-list (counts come from the live gotra list).
function gotraListJsonLd(count) {
  const org = { '@id': `${SITE_URL}/#organization` };
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `Complete Banjara Gotra List — ${count} Gotras Grouped by Clan`,
      description: `Comprehensive reference of all ${count} Banjara gotras, organised by major clans (Gor Samuh), with Banjara marriage rules.`,
      url: `${SITE_URL}/banjara-gotra-list`,
      inLanguage: 'en-IN',
      author: org,
      publisher: org,
      datePublished: '2026-06-17',
      dateModified: '2026-06-17',
      mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE_URL}/banjara-gotra-list` },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        ['What is a Banjara gotra?', 'A Banjara gotra is a patrilineal clan identifier — a unique lineage name passed from father to children. In the Banjara community, gotra determines marriage eligibility: same-gotra marriage is strictly forbidden (gotra exogamy). Every Banjara person belongs to one gotra, inherited from their father.'],
        ['How many gotras are there in the Banjara community?', `The BanjaraMatch database contains ${count} documented Banjara gotras verified from community records across Telangana, Andhra Pradesh, Maharashtra, Karnataka, Rajasthan, Gujarat, and Madhya Pradesh.`],
        ['What is the difference between a Banjara gotra and a clan?', 'A clan (Gor Samuh) is a broader grouping of multiple related gotras sharing a common ancestral origin. A gotra is the specific individual lineage name within a clan. For marriage eligibility, you must match at the gotra level.'],
        ['Can Banjara from the same gotra marry?', 'No. Same-gotra marriage is strictly forbidden. People sharing a gotra are considered siblings. This is enforced by the Tanda Panchayat across all states.'],
        ['What are the major Banjara clans?', 'There are 4 major Banjara clans (Gor Samuh): Rathod (Bhukya), Pawar, Chavan (Chauhan), and Jadhav (Vadatiya). Each clan contains many individual gotras (Jaaths) — for example, the Rathod clan alone contains over 50 gotras, including Ramavath, Nenavath, and Rajavath. Banoth and Turi are usually grouped here too, though some sources classify them as independent clans rather than Rathod sub-divisions.'],
      ].map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
    },
  ];
}

// ---------------------------------------------------------------------------
// Public pages
// ---------------------------------------------------------------------------

// --- Account Deletion Info Page ---
router.get('/account-deletion', optionalUser, (req, res) => {
  res.render('pages/account-deletion', {
    title: 'Account & Data Deletion Request | BanjaraMatch',
    meta: pageMeta('accountDeletion'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Account & Data Deletion', url: '/account-deletion' }
    ]
  });
});

// --- AI Matrimony App Landing Page ---
router.get('/banjara-matrimony-app', optionalUser, (req, res) => {
  res.render('pages/ai-matrimony-app', {
    title: 'Banjara Matrimony App - Find Lambadi Brides & Grooms | Free Download',
    meta: pageMeta('app'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Banjara Matrimony App', url: '/banjara-matrimony-app' }
    ]
  });
});

// --- Lambadi Matrimony Landing Page ---
router.get('/lambadi-matrimony', optionalUser, async (req, res) => {
  res.render('pages/lambadi-matrimony', {
    title: 'Lambadi Matrimony – Find Lambadi Brides & Grooms | BanjaraMatch',
    meta: pageMeta('lambadi'),
    user: req.user || null,
    featuredBlogs: await featuredBlogs(),
    breadcrumbs: [{ name: 'Lambadi Matrimony', url: '/lambadi-matrimony' }],
  });
});

// --- Gormati Matrimony Landing Page ---
router.get('/gormati-matrimony', optionalUser, async (req, res) => {
  res.render('pages/gormati-matrimony', {
    title: 'Gormati Matrimony – Find Gormati Brides & Grooms | BanjaraMatch',
    meta: pageMeta('gormati'),
    user: req.user || null,
    featuredBlogs: await featuredBlogs(),
    breadcrumbs: [{ name: 'Gormati Matrimony', url: '/gormati-matrimony' }],
  });
});

// --- Banjara Gotra List Reference Page ---
// No data is a 503 (stale copy served when the API is down), never a "0 Gotras" page.
router.get('/banjara-gotra-list', optionalUser, async (req, res, next) => {
  try {
    const [blogs, gotraRes, clanRes] = await Promise.all([
      featuredBlogs(),
      cachedPost('/api/fetchGotraList', {}, { key: 'lookup:gotras' }),
      apiGet('/api/fetchClanList', { key: 'lookup:clans' }),
    ]);
    const gotras = listOf(gotraRes).filter((g) => g && g.name).sort((a, b) => a.name.localeCompare(b.name));
    if (!gotras.length) {
      return next(new UpstreamError('fetchGotraList returned no data', { path: '/api/fetchGotraList' }));
    }
    const clans = listOf(clanRes).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
    const title = `Banjara Gotra List – ${gotras.length} Lambadi Gotras & Clans | BanjaraMatch`;
    res.render('pages/banjara-gotra-list', {
      title,
      meta: pageMeta('gotraList', { title, jsonLd: gotraListJsonLd(gotras.length) }),
      user: req.user || null,
      featuredBlogs: blogs,
      gotras,
      clans,
      breadcrumbs: [{ name: 'Banjara Gotra List', url: '/banjara-gotra-list' }],
    });
  } catch (err) {
    next(err);
  }
});

router.get('/banjara-community-history', optionalUser, async (req, res) => {
  res.render('pages/banjara-community-history', {
    title: 'Banjara Community History — Origin, Culture & Heritage of Banjara People | BanjaraMatch',
    meta: pageMeta('history'),
    user: req.user || null,
    featuredBlogs: await featuredBlogs(),
    breadcrumbs: [{ name: 'Banjara Community History', url: '/banjara-community-history' }],
  });
});

// --- Legacy / Missing Page Redirects (SEO: fix 404s; public URLs are only ever 301'd) ---
router.get('/terms-condition',    (req, res) => res.redirect(301, '/terms-conditions'));
router.get('/plans',              (req, res) => res.redirect(301, '/features'));
router.get('/signup',             (req, res) => res.redirect(301, '/register'));
router.get('/banjara-matrimony-bangalore', (req, res) => res.redirect(301, '/banjara-matrimony-bengaluru'));
router.get('/banjara-matrimony-pune',      (req, res) => res.redirect(301, '/banjara-matrimony-maharashtra'));

// --- Public Pages ---
router.get('/', optionalUser, async (req, res) => {
  // Prefer featured blogs, but fall back to recent blogs so the homepage never shows static placeholders.
  const featured = await featuredBlogs();
  if (featured.length < 3) {
    const recent = await apiGet('/api/blogs?page=1&limit=3', { key: 'blogs:recent:3' }).then(listOf).catch(() => []);
    const seen = new Set(featured.map((blog) => String(blog._id)));
    for (const blog of recent) {
      if (featured.length >= 3) break;
      if (!seen.has(String(blog._id))) {
        featured.push(blog);
        seen.add(String(blog._id));
      }
    }
  }
  res.render('pages/index', {
    title: 'Banjara Match - Find Your Life Partner',
    meta: pageMeta('home', {
      canonical: '/',
      jsonLd: [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' }] }],
    }),
    featuredBlogs: featured,
    user: req.user || null
  });
});

router.get('/about', optionalUser, async (req, res) => {
  res.render('pages/about', {
    title: 'About Us - Banjara Match',
    meta: pageMeta('about'),
    user: req.user || null,
    featuredBlogs: await featuredBlogs(),
    breadcrumbs: [
      { name: 'About Us', url: '/about' }
    ]
  });
});

// FAQ categories from GET /api/faqs ([{id, _id, title, faqs: [{question, answer}]}]),
// cached 10 min. Empty categories/questions are dropped; [] on any failure, and
// the page then keeps its static markup.
async function loadFaqCategories() {
  try {
    const body = await apiGet('/api/faqs', { key: 'faqs:public', ttl: 10 * 60e3 });
    const rows = Array.isArray(body) ? body : listOf(body);
    return rows
      .map((c) => ({
        title: String((c && c.title) || '').trim(),
        faqs: (Array.isArray(c && c.faqs) ? c.faqs : [])
          .map((f) => ({ question: String((f && f.question) || '').trim(), answer: String((f && f.answer) || '').trim() }))
          .filter((f) => f.question && f.answer),
      }))
      .filter((c) => c.title && c.faqs.length);
  } catch (err) {
    console.warn('[faq] /api/faqs unavailable, using the static FAQ:', err.message);
    return [];
  }
}

// FAQ Hub Page: dynamic when the admin has published FAQs, static otherwise.
router.get('/faq', optionalUser, async (req, res) => {
  const [faqCategories, blogs] = await Promise.all([loadFaqCategories(), featuredBlogs()]);
  // Exactly one FAQPage either way: the data-built block replaces the static one.
  const meta = faqCategories.length ? { ...pageMeta('faq'), jsonLd: [faqPageJsonLd(faqCategories)] } : pageMeta('faq');
  res.render('pages/faq', {
    title: 'FAQ - Frequently Asked Questions | BanjaraMatch',
    meta,
    faqCategories,
    user: req.user || null,
    featuredBlogs: blogs,
    breadcrumbs: [
      { name: 'FAQ', url: '/faq' }
    ]
  });
});

// Platform Features Page
router.get('/features', optionalUser, (req, res) => {
  res.render('pages/features', {
    title: 'BanjaraMatch Features – Free AI-Powered Banjara Matrimony App & Website',
    meta: pageMeta('features'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Features', url: '/features' }
    ]
  });
});

// Beta Tester Program Page
router.get('/beta-tester', optionalUser, (req, res) => {
  res.render('pages/beta-tester', {
    title: 'Join BanjaraMatch Beta Testing Program | Get Lifetime Premium Access',
    meta: pageMeta('betaTester'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Beta Testing Program', url: '/beta-tester' }
    ]
  });
});

// Biodata Builder was removed from the platform; the URL was indexed, so it redirects.
router.get('/biodata-builder', (req, res) => res.redirect(301, '/'));

router.get('/child-safety-policy', optionalUser, (req, res) => {
  res.render('pages/child-safety-policy', {
    title: 'Child Safety Policy & Standards | BanjaraMatch - CSAE/CSAM Prevention',
    meta: pageMeta('childSafety'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Child Safety Policy', url: '/child-safety-policy' }
    ]
  });
});

router.get('/community-feedback', optionalUser, (req, res) => {
  res.render('pages/community-feedback', {
    title: 'Community Feedback & Feature Suggestions | BanjaraMatch - Your Voice Matters',
    meta: pageMeta('communityFeedback'),
    user: req.user || null,
    breadcrumbs: [
      { name: 'Community Feedback', url: '/community-feedback' }
    ]
  });
});

router.get('/contact', optionalUser, async (req, res) => {
  res.render('pages/contact', {
    title: 'Contact Us - Banjara Match',
    meta: pageMeta('contact'),
    user: req.user || null,
    featuredBlogs: await featuredBlogs(),
    breadcrumbs: [
      { name: 'Contact Us', url: '/contact' }
    ]
  });
});

// HTML Sitemap Page (SEO Best Practice)
router.get('/sitemap', optionalUser, async (req, res) => {
  // Same cache keys as middleware/regionalIndex.js (same bodies). Empty on failure.
  const [cityRes, stateRes] = await Promise.all([
    apiGet('/api/city-pages', { key: 'regional:cities' }).catch(() => null),
    apiGet('/api/state-pages', { key: 'regional:states' }).catch(() => null),
  ]);
  const cityPages = listOf(cityRes);
  const statePages = listOf(stateRes);
  res.render('pages/sitemap', {
    title: 'Site Map - BanjaraMatch',
    meta: pageMeta('sitemap'),
    user: req.user || null,
    regionalPages: [...statePages, ...cityPages],
    cityPages,
    statePages,
    breadcrumbs: [
      { name: 'Site Map', url: '/sitemap' }
    ]
  });
});

// Primary login page (Email/Password authentication)
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('pages/login', {
    title: 'Login - Banjara Matrimony | BanjaraMatch.com',
    meta: pageMeta('login'),
    user: null
  });
});

// SEO-friendly registration page
// A guest's hero search (D5.41) lands here with ?next=<encoded /all-profiles?…>
// or with the raw search fields + intent=search; either way the destination is
// stored in the returnTo cookie that routes/auth.js honours after login.
const SEARCH_FIELDS = ['gender', 'age', 'maritalStatus', 'city', 'state'];
function searchReturnTo(req) {
  const q = req.query || {};
  if (typeof q.next === 'string' && /^\/[A-Za-z0-9/_?&=%.-]*$/.test(q.next) && !q.next.startsWith('//')) return q.next.slice(0, 500);
  if (q.intent !== 'search') return null;
  const qs = new URLSearchParams();
  for (const f of SEARCH_FIELDS) if (typeof q[f] === 'string' && q[f]) qs.set(f, q[f].slice(0, 60));
  const s = qs.toString();
  return '/all-profiles' + (s ? '?' + s : '');
}

router.get('/register', redirectIfAuthenticated, (req, res) => {
  const returnTo = searchReturnTo(req);
  if (returnTo) {
    res.cookie(RETURN_TO_COOKIE, returnTo, { httpOnly: true, secure: isProd || req.secure, sameSite: 'lax', path: '/', maxAge: 600000 });
  }
  res.render('pages/register', {
    title: 'Register Free - Banjara Matrimony | BanjaraMatch.com',
    meta: pageMeta('register', { canonical: '/register' }),
    breadcrumbs: [{ name: 'Register Free', url: '/register' }],
    user: null
  });
});

// Forgot password page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('pages/forgot-password', {
    title: 'Forgot Password - Banjara Matrimony | BanjaraMatch.com',
    meta: pageMeta('forgotPassword'),
    user: null
  });
});

// Reset password page (custom Firebase action handler)
router.get('/reset-password', redirectIfAuthenticated, (req, res) => {
  res.render('pages/reset-password', {
    title: 'Reset Password - Banjara Matrimony | BanjaraMatch.com',
    meta: pageMeta('resetPassword'),
    user: null
  });
});


// Hidden email-based registration (for admin/future use only - not linked anywhere)
router.get('/admin-email-register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register', {
    title: 'Admin Register - Banjara Match',
    meta: pageMeta('adminEmailRegister'),
    user: null
  });
});

// Thank You page route (for conversion tracking) - shown once: routes/auth.js
// sets bm_welcome on a registration and this consumes it (D1.15).
router.get('/thank-you', ensureAuth, (req, res) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  if (!req.cookies || !req.cookies.bm_welcome) return res.redirect(302, '/dashboard');
  res.clearCookie('bm_welcome', { path: '/' });

  res.render('pages/thank-you', {
    title: 'Thank You - Registration Successful | BanjaraMatch',
    meta: pageMeta('thankYou'),
    user: req.user,
    userId: req.user?._id || ''
  });
});

// ---------------------------------------------------------------------------
// Blog (D1.8, D1.10)
// ---------------------------------------------------------------------------

router.get('/blogs', optionalUser, async (req, res, next) => {
  // ?category=Culture (old footer links): known -> 301 /blogs/culture, unknown -> 404.
  if (req.query.category !== undefined) {
    const slug = String(req.query.category).toLowerCase();
    if (!blogCategories.includes(slug)) return next();
    const rest = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
      if (k !== 'category' && typeof v === 'string') rest.set(k, v);
    }
    const qs = rest.toString();
    return res.redirect(301, '/blogs/' + slug + (qs ? '?' + qs : ''));
  }

  const { page, search } = blogsQuery(req);
  try {
    const { list, trending } = await loadBlogList({ page, search });
    if (!list || !list.status) return next();
    const pagination = list.pagination || { currentPage: page, totalPages: 1 };
    if (page > pagination.totalPages && pagination.totalPages > 0) return next();

    const title = 'Blog & Articles - BanjaraMatch';
    res.render('pages/blog', {
      title,
      posts: listOf(list),
      trending,
      currentPage: pagination.currentPage || page,
      totalPages: pagination.totalPages || 1,
      category: null,
      search: search || null,
      user: req.user || null,
      breadcrumbs: [{ name: 'Blog', url: '/blogs' }],
      meta: {
        title: page > 1 ? `${title} - Page ${page}` : title,
        description: 'Read the latest articles, tips, and stories about Banjara marriages, relationships, traditions, and community events on BanjaraMatch blog.',
        keywords: ['banjara matrimony blog', 'marriage tips', 'wedding articles', 'banjara culture'],
        pageCategory: 'blog',
        canonical: page > 1 ? '/blogs?page=' + page : '/blogs',
        robots: search ? 'noindex, follow' : undefined,
        prev: page > 1 ? (page === 2 ? '/blogs' : '/blogs?page=' + (page - 1)) : undefined,
        next: page < pagination.totalPages ? '/blogs?page=' + (page + 1) : undefined,
      }
    });
  } catch (err) {
    return next(err);
  }
});

// Category listing: /blogs/:category
router.get('/blogs/:category', optionalUser, async (req, res, next) => {
  const rawCategory = req.params.category;

  // Canonicalize case: /blogs/CULTURE or /blogs/Culture -> /blogs/culture (preserve query string)
  if (rawCategory !== rawCategory.toLowerCase()) {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, `/blogs/${rawCategory.toLowerCase()}${qs}`);
  }

  // Legacy pseudo-categories that were linked publicly (integrator URL contract).
  if (rawCategory === 'regional') return res.redirect(301, '/sitemap');
  if (rawCategory === 'success stories') return res.redirect(301, '/blogs/stories');

  // Unknown category: a real 404, the value is never reflected into the page.
  if (!blogCategories.includes(rawCategory)) return next();
  const category = blogCategories.toEnumValue(rawCategory);

  const { page, search } = blogsQuery(req);
  try {
    const { list, trending } = await loadBlogList({ page, search, category });
    if (!list || !list.status) return next();
    const pagination = list.pagination || { currentPage: page, totalPages: 1 };
    if (page > pagination.totalPages && pagination.totalPages > 0) return next();

    const base = `/blogs/${rawCategory}`;
    const title = `${category} Articles - BanjaraMatch Blog`;
    res.render('pages/blog', {
      title,
      posts: listOf(list),
      trending,
      currentPage: pagination.currentPage || page,
      totalPages: pagination.totalPages || 1,
      category,
      search: search || null,
      user: req.user || null,
      breadcrumbs: [
        { name: 'Blog', url: '/blogs' },
        { name: category, url: base }
      ],
      meta: {
        title: page > 1 ? `${title} - Page ${page}` : title,
        description: `${category} articles, tips and stories for the Banjara community — read the latest ${rawCategory} posts on BanjaraMatch.`,
        keywords: ['banjara matrimony blog', 'marriage tips', 'wedding articles', 'banjara culture', rawCategory],
        pageCategory: 'blog',
        canonical: page > 1 ? base + '?page=' + page : base,
        robots: search ? 'noindex, follow' : undefined,
        prev: page > 1 ? (page === 2 ? base : base + '?page=' + (page - 1)) : undefined,
        next: page < pagination.totalPages ? base + '?page=' + (page + 1) : undefined,
      }
    });
  } catch (err) {
    return next(err);
  }
});

const blogTitle = (blog) => {
  const t = String(blog.metaTitle || blog.title || 'Blog Post').trim();
  return /banjaramatch/i.test(t) ? t : `${t} - BanjaraMatch`;
};

// Individual blog post: /blogs/:category/:slug
router.get('/blogs/:category/:slug', optionalUser, async (req, res, next) => {
  const { category, slug } = req.params;

  // Canonicalize case: /blogs/CULTURE/slug or /blogs/Culture/slug -> /blogs/culture/slug
  if (category !== category.toLowerCase()) {
    return res.redirect(301, `/blogs/${category.toLowerCase()}/${encodeURIComponent(slug)}`);
  }
  if (!blogCategories.includes(category)) return next();
  if (!BLOG_SLUG_RE.test(slug)) return next();

  try {
    const data = await apiGet('/api/blogs/' + encodeURIComponent(slug), { key: 'blog:' + slug });
    if (!data || !data.status || !data.data || !data.data.blog) return blogNotFound(req, res);

    const { blog, relatedBlogs } = data.data;
    const blogCategory = String(blog.category || '').toLowerCase();

    // Verify category matches (case-insensitive); redirect to the correct category URL
    if (blogCategory !== category) {
      return res.redirect(301, `/blogs/${blogCategory}/${encodeURIComponent(slug)}`);
    }

    const postUrl = `${SITE_URL}/blogs/${blogCategory}/${slug}`;
    res.render('pages/blog-detail', {
      title: `${blog.title} - BanjaraMatch Blog`,
      // Brand suffix only when metaTitle lacks "BanjaraMatch" (D3.24), in the " - BanjaraMatch" form the posts were live with.
      meta: {
        title: blogTitle(blog),
        description: blog.metaDescription || blog.description || '',
        keywords: blog.metaKeywords && blog.metaKeywords.length ? blog.metaKeywords : undefined,
        canonical: `/blogs/${blogCategory}/${slug}`,
        ogType: 'article',
        ogImage: blogImageUrl(blog.featuredImage) || undefined,
        pageCategory: 'blog_post',
        jsonLd: [blogPostingJsonLd(blog, postUrl)],
      },
      blog,
      relatedBlogs: relatedBlogs || [],
      user: req.user || null,
      breadcrumbs: [
        { name: 'Blog', url: '/blogs' },
        { name: blog.category, url: `/blogs/${blogCategory}` },
        { name: blog.title, url: `/blogs/${blogCategory}/${slug}` }
      ],
      shareUrl: `${SITE_URL}/blogs/${blogCategory}/${slug}`,
      shareTitle: blog.title,
      shareDescription: blog.metaDescription || blog.excerpt,
      shareImage: blogImageUrl(blog.featuredImage) || blog.image || `${SITE_URL}/images/banjaramatch-preview.jpg`
    });
  } catch (err) {
    return next(err);
  }
});

// Legacy redirects for old URLs
router.get('/blog/:slug', optionalUser, async (req, res, next) => {
  const { slug } = req.params;
  if (!BLOG_SLUG_RE.test(slug)) return next();

  try {
    const data = await apiGet('/api/blogs/' + encodeURIComponent(slug), { key: 'blog:' + slug });
    if (!data || !data.status || !data.data || !data.data.blog) return blogNotFound(req, res);
    const { blog } = data.data;
    // Redirect to new path structure
    return res.redirect(301, `/blogs/${String(blog.category || '').toLowerCase()}/${encodeURIComponent(slug)}`);
  } catch (err) {
    return next(err);
  }
});

router.get('/blog/:category/:slug', optionalUser, async (req, res, next) => {
  const { category, slug } = req.params;
  if (!blogCategories.includes(category.toLowerCase())) return next();
  if (!BLOG_SLUG_RE.test(slug)) return next();
  // Redirect old /blog/ URLs to /blogs/
  return res.redirect(301, `/blogs/${category.toLowerCase()}/${encodeURIComponent(slug)}`);
});

// ---------------------------------------------------------------------------
// Logged-in pages (Bearer forwarded from bm_session||token, D1.10/D1.13)
// ---------------------------------------------------------------------------

// --- Onboarding Page (New Users) ---
router.get('/onboarding', ensureAuth, (req, res) => {
  res.render('pages/onboarding', {
    title: 'Complete Your Profile - Banjara Match',
    meta: pageMeta('onboarding'),
    user: req.user,
  });
});

// --- Ice Breaker Game Page ---
router.get('/ice-breaker-game', ensureAuth, (req, res) => {
  res.render('pages/ice-breaker-game', {
    title: 'Ice Breaker Game - Banjara Match',
    meta: pageMeta('iceBreaker'),
    user: req.user
  });
});

// --- Protected Page ---
router.get('/dashboard', ensureAuth, checkProfileCompletion, async (req, res, next) => {
  const user = req.user;
  const headers = forwardAuth(req);
  const post = (path, body) => apiPost(path, body, { headers }).then((d) => d, (err) => err);
  const my = { my_user_id: user._id };

  const results = await Promise.all([
    post('/api/fetchUsersList', { ...my, page: 1, limit: 10, sortByNewUsers: true }),
    post('/api/getInterestList', { ...my, type: 'received', limit: 20, start: 1 }),
    post('/api/getInterestList', { ...my, type: 'sent', limit: 20, start: 1 }),
    post('/api/getInterestList', { ...my, type: 'accepted', limit: 20, start: 1 }),
    post('/api/getProfileVisitorSummary', { ...my, type: 'they_viewed_me', page: 1, limit: 10 }),
    post('/api/getProfileVisitorSummary', { ...my, type: 'i_viewed', page: 1, limit: 10 }),
    post('/api/getProfileVisitorSummary', { ...my, type: 'mutual', page: 1, limit: 10 }),
    post('/api/getShortListedUsers', { ...my }),
    post('/api/getTopDailyMatches', { ...my, limit: 10 }),
  ]);

  // The API is down for every call: 503, not an empty dashboard.
  if (results.every((r) => r instanceof UpstreamError)) return next(results[0]);
  const failed = results.filter((r) => r instanceof Error);
  if (failed.length) console.warn('[Dashboard] %d of %d calls failed: %s', failed.length, results.length, failed.map((e) => e.message).join('; '));

  const data = (r) => (r instanceof Error ? [] : listOf(r));
  const [newProfiles, received, interestSent, accepted, whoViewedMe, iViewedProfiles, mutualViews, shortlistedProfiles, dailyMatches] = results.map(data);
  const interestReceived = received.filter((r) => r.status === 'pending');
  const acceptedRequests = accepted.filter((r) => r.status === 'accepted');

  res.render('pages/user-dashboard', {
    title: 'Dashboard - Banjara Match',
    meta: pageMeta('dashboard'),
    user,
    newProfiles,
    interestReceived,
    interestSent,
    newRequests: interestReceived, // alias for pending requests
    acceptedRequests,
    whoViewedMe,
    iViewedProfiles,
    mutualViews,
    shortlistedProfiles,
    dailyMatches,
    error: failed.length ? 'Some dashboard data could not be loaded' : undefined
  });
});



router.get('/update-profile', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/update-profile', {
    title: 'Edit Profile - Banjara Match',
    meta: pageMeta('updateProfile'),
    user: req.user,
  });
});

router.get('/user-interests', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-interests', {
    title: 'Interests - Banjara Match',
    meta: pageMeta('userInterests'),
    user: req.user,
  });
});

router.get('/user-chat', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-chat', {
    title: 'Chat - Banjara Match',
    meta: pageMeta('userChat'),
    user: req.user,
  });
});

router.get('/user-setting', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-setting', {
    title: 'Privacy Settings - Banjara Match',
    meta: pageMeta('userSetting'),
    user: req.user,
  });
});

// Dedicated shortlist page — previously only a 5-item preview on the
// dashboard, whose "See All" link already pointed at /shortlisted with no
// route behind it (a live 404).
router.get('/shortlisted', ensureAuth, checkProfileCompletion, async (req, res, next) => {
  const user = req.user;
  try {
    const data = await apiPost('/api/getShortListedUsers', { my_user_id: user._id }, { headers: forwardAuth(req) });
    res.render('pages/shortlisted', {
      title: 'My Shortlist - Banjara Match',
      meta: pageMeta('shortlisted'),
      user,
      shortlistedProfiles: listOf(data)
    });
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    console.warn('[Shortlisted] Load Error:', err.message);
    res.render('pages/shortlisted', {
      title: 'My Shortlist - Banjara Match',
      meta: pageMeta('shortlisted'),
      user,
      shortlistedProfiles: []
    });
  }
});

// Dedicated blocked-users page — this functionality already worked embedded
// inside /user-setting; pulled out to its own page for discoverability.
router.get('/blocked-users', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/blocked-users', {
    title: 'Blocked Users - Banjara Match',
    meta: pageMeta('blockedUsers'),
    user: req.user,
  });
});

// Notifications — fetchUserNotification/markNotificationsRead already work
// server-side but were never surfaced anywhere in the web app before now.
router.get('/notifications', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/notifications', {
    title: 'Notifications - Banjara Match',
    meta: pageMeta('notifications'),
    user: req.user,
  });
});

// Profile visitors — dashboard's "See All" link pointed here with no route
// behind it (a live 404). Consolidates all three getProfileVisitorSummary
// types (they_viewed_me / i_viewed / mutual) into one tabbed page — the
// dashboard's other two "See All" links (?filter=mutual, ?filter=viewed)
// pointed at /all-profiles, which silently ignores unknown query params, so
// those are redirected here too instead of to a no-op.
router.get('/profile-visitors', ensureAuth, checkProfileCompletion, (req, res) => {
  const validTypes = ['they_viewed_me', 'i_viewed', 'mutual'];
  const type = validTypes.includes(req.query.type) ? req.query.type : 'they_viewed_me';
  res.render('pages/profile-visitors', {
    title: 'Profile Visitors - Banjara Match',
    meta: pageMeta('profileVisitors'),
    user: req.user,
    activeType: type,
  });
});

router.get('/all-profiles', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/all-profiles', {
    title: 'Browse Profiles - Banjara Match',
    meta: pageMeta('allProfiles'),
    user: req.user,
    breadcrumbs: [
      { name: 'Browse Profiles', url: '/all-profiles' }
    ]
  });
});

router.get('/profile/:userId', ensureAuth, checkProfileCompletion, async (req, res, next) => {
  const { userId } = req.params;
  const notFound = (error) => res.status(404).render('pages/profile-details', {
    title: 'Profile Not Found - Banjara Match',
    meta: pageMeta('profile', { title: 'Profile Not Found - Banjara Match' }),
    user: req.user,
    profile: null,
    relatedProfiles: [],
    connectionStatus: null,
    error
  });
  if (!OBJECT_ID_RE.test(userId)) return notFound('Profile not found');

  const headers = forwardAuth(req);
  try {
    // Fetch profile details
    const profileResponse = await apiPost('/api/fetchProfile', { user_id: userId }, { headers });
    if (!profileResponse || !profileResponse.status || !profileResponse.data) return notFound('Profile not found');

    const profile = profileResponse.data;

    // Connection status is already included in the fetchProfile response.
    const connectionStatus = {
      isFriend:          !!profile.isFriend,
      isRequestSent:     !!profile.isRequestSent,
      isRequestReceived: !!profile.isRequestReceived,
      requestStatus:     profile.requestStatus  || 'none',
      relationshipType:  profile.relationshipType || null,
      isShortListed:     !!profile.isShortListed,
    };

    // Related profiles (opposite gender, similar age range); optional.
    const related = await apiPost('/api/fetchUsersList', {
      my_user_id: req.user._id,
      page: 1,
      limit: 6,
      gender: profile.gender === 'male' ? 'female' : 'male', // Opposite gender for matrimony
      ageFrom: Math.max(18, (profile.age || 25) - 5),
      ageTo: Math.min(60, (profile.age || 25) + 5)
    }, { headers }).catch(() => null);

    res.render('pages/profile-details', {
      title: `${profile.full_name || 'Profile'} - Banjara Match`,
      meta: pageMeta('profile', { title: `${profile.full_name || 'Profile'} - Banjara Match` }),
      user: req.user,
      profile,
      relatedProfiles: listOf(related),
      connectionStatus
    });
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    if (upstreamStatus(err) === 404) return notFound('Profile not found');
    console.warn('[Profile Details] Load Error:', err.message);
    return notFound('Failed to load profile');
  }
});

// --- Terms & Conditions Page ---
router.get('/terms-conditions', optionalUser, (req, res) => {
  res.render('pages/terms-conditions', {
    title: 'Terms & Conditions - BanjaraMatch',
    meta: pageMeta('terms'),
    user: req.user || null,
    breadcrumbs: [{ name: 'Terms & Conditions', url: '/terms-conditions' }],
  });
});

// --- Privacy Policy Page ---
router.get('/privacy-policy', optionalUser, (req, res) => {
  res.render('pages/privacy-policy', {
    title: 'Privacy Policy - BanjaraMatch',
    meta: pageMeta('privacy'),
    user: req.user || null,
    breadcrumbs: [{ name: 'Privacy Policy', url: '/privacy-policy' }],
  });
});

// --- Logout ---
// Firebase sign-out in the browser, then POST /auth/logout (routes/auth.js
// clears bm_session + the legacy cookie server-side), then /login.
router.get('/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex">
  <title>Logging out...</title>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
</head>
<body>
  <p>Logging out...</p>
  <script>
    (function () {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        fetch('/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
          credentials: 'same-origin'
        }).catch(function () {}).then(function () {
          try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
          location.href = '/login';
        });
      }
      try {
        firebase.initializeApp({
          apiKey: "AIzaSyBEQVygTdSOOUczWmUezTt0CyoGm4l5Qe8",
          authDomain: "socialmedia-dcdd8.firebaseapp.com",
          projectId: "socialmedia-dcdd8"
        });
        firebase.auth().signOut().then(finish, finish);
      } catch (e) {
        finish();
      }
      setTimeout(finish, 4000);
    })();
  </script>
</body>
</html>`);
});

// --- Regional Landing Pages (SEO) ---
const nameOf = (ref) => (ref && typeof ref === 'object' ? ref.name : ref) || '';
const regionName = (page, pageType) => (pageType === 'city' ? nameOf(page.city) : nameOf(page.state));

// <head> data for a regional page: CMS meta with the same fallbacks the
// templates used, FAQPage from the CMS FAQs, and the index rule (D3.31/D6.47):
// state pages are always indexed, a city page only once it carries >= 300
// unique CMS words. Pages never 404 and stay linked either way.
function regionalMeta(page, pageType, slug) {
  const stateName = nameOf(page.state);
  const cityName = nameOf(page.city);
  const place = pageType === 'city' ? cityName : stateName;
  const title = page.metaTitle || (pageType === 'city'
    ? `Banjara Matrimony in ${cityName}, ${stateName} - Free Lambani Matches`
    : `Banjara Matrimony in ${stateName} - Free Lambani Matches Across the State`);
  const description = page.metaDescription || (pageType === 'city'
    ? `Find verified Banjara/Lambani/Gormati brides and grooms in ${cityName}, ${stateName} — 100% free matrimonial service, verified profiles.`
    : `Find verified Banjara/Lambani/Gormati brides and grooms across ${stateName} — 100% free matrimonial service with verified profiles.`);
  const lower = place.toLowerCase();
  const keywords = Array.isArray(page.metaKeywords) && page.metaKeywords.length ? page.metaKeywords : [
    `banjara matrimony ${lower}`, `lambadi matrimony ${lower}`, `lambani brides ${lower}`, `banjara grooms ${lower}`,
    `gormati matrimony ${lower}`, `${place} banjara wedding`, `free banjara matrimony ${lower}`, `lambani matrimony ${stateName.toLowerCase()}`,
  ];
  const faqs = (page.faqs && page.faqs.length ? page.faqs : (page.faqSection && page.faqSection.faqs) || [])
    .filter((f) => f && f.question && f.answer);
  const banner = Array.isArray(page.bannerImages) && page.bannerImages[0] && page.bannerImages[0].url;
  const robots = robotsFor({ ...page, pageType });
  const words = pageType === 'city' ? uniqueCmsWords(page) : null;
  return {
    title,
    description,
    keywords,
    canonical: '/' + slug,
    brandSuffix: false, // CMS/meta titles stay exactly as they were live
    robots,
    ogImage: banner || site.defaultImage,
    pageCategory: 'regional',
    // Hero preload (partials/head.ejs): the CSS background on phones; the default slider image on desktop unless the CMS supplies banners.
    hints: [{ hero: '/images/ban-bg.jpg', mobileOnly: Boolean(banner) }],
    jsonLd: faqs.length ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({ '@type': 'Question', name: faq.question, acceptedAnswer: { '@type': 'Answer', text: faq.answer } })),
    }] : [],
    // Surfaced for the templates/tests; not emitted by head.ejs.
    indexable: !/noindex/.test(robots),
    uniqueWords: words,
  };
}

// IMPORTANT: This must be LAST to avoid catching other routes
router.get('/:slug', optionalUser, async (req, res, next) => {
  const { slug } = req.params;

  // Skip if not a regional page slug pattern
  if (!/^banjara-matrimony-[a-z0-9-]+$/.test(slug)) return next();

  try {
    // API 404 -> null (cached 60 s); API down with no stale copy -> UpstreamError -> 503, never a 404.
    const [city, state, blogs] = await Promise.all([
      apiGet('/api/city-pages/' + slug, { key: 'city:' + slug }),
      apiGet('/api/state-pages/' + slug, { key: 'state:' + slug }),
      featuredBlogs(),
    ]);
    const cityPage = city && city.status && city.data ? city.data : null;
    const statePage = state && state.status && state.data ? state.data : null;
    const page = cityPage || statePage;
    if (!page || page.isPublished === false) return next(); // Pass to 404 handler
    const pageType = cityPage ? 'city' : 'state';

    res.render(pageType === 'state' ? 'pages/regional-page-state' : 'pages/regional-page-city', {
      title: page.metaTitle,
      meta: regionalMeta(page, pageType, slug),
      page,
      user: req.user || null,
      featuredBlogs: blogs,
      breadcrumbs: Array.isArray(page.breadcrumbs) && page.breadcrumbs.length
        ? page.breadcrumbs.map((b) => ({ name: b.name, url: b.url }))
        : [{ name: regionName(page, pageType), url: '/' + slug }],
    });
  } catch (err) {
    return next(err);
  }
});

// ---------------------------------------------------------------------------
// Internal JSON endpoints (mounted before the /api proxy, integrator #18)
// ---------------------------------------------------------------------------

// --- Sitemap Regeneration API (Internal; the API's sitemapService calls it with X-Sitemap-Secret, D1.19) ---
router.post('/api/regenerate-sitemap', async (req, res) => {
  const secret = process.env.SITEMAP_REGEN_SECRET;
  if (!secret || req.get('X-Sitemap-Secret') !== secret) {
    return res.status(401).set('Cache-Control', 'no-store').json({ success: false });
  }
  try {
    console.log('🔄 Sitemap regeneration requested');

    const generateAllSitemaps = require('../utils/generateAllSitemaps');
    const success = await generateAllSitemaps();

    res.json({
      success,
      message: success ? 'Sitemaps regenerated successfully' : 'Sitemap regeneration failed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Sitemap regeneration error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error regenerating sitemaps'
    });
  }
});

// Proxy: cities for the search/onboarding pickers. Body whitelisted, 10-min cache.
const citiesCache = new SwrCache({ max: 300 });
router.post('/api/proxy/cities', async (req, res) => {
  const search = String((req.body && req.body.search) || '').trim().slice(0, 50);
  const limit = Math.min(Number(req.body && req.body.limit) || 50, 200);
  res.set('Cache-Control', 'no-store');
  try {
    const data = await cachedPost('/api/cities', { search, limit }, {
      key: `cities:${search.toLowerCase()}:${limit}`,
      ttl: 10 * 60e3,
      stale: 60 * 60e3,
      store: citiesCache,
      timeout: 5000,
    });
    res.json(data);
  } catch (err) {
    res.json({ status: false, data: [] });
  }
});

module.exports = router;
