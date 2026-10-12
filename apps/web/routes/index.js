
const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
// const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'http://localhost:4000';
const AUTH_SERVER_URL = process.env.AUTH_SERVER_URL || 'https://api.banjaramatch.com';

// --- Middleware: Optional User Check (for all pages) ---
async function optionalUser(req, res, next) {
  const token = req.cookies?.token;
  
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { data } = await axios.get(`${AUTH_SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    req.user = data?.user || null;
  } catch (err) {
    console.warn('[optionalUser] Auth check failed:', err.message);
    req.user = null;
    res.clearCookie('token');
  }
  
  next();
}

// --- Account Deletion Info Page ---
router.get('/account-deletion', optionalUser, (req, res) => {
  res.render('pages/account-deletion', {
    title: 'Account & Data Deletion Request - Banjara Match',
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
    user: req.user || null,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Banjara Matrimony App', url: '/banjara-matrimony-app' }
    ]
  });
});

// --- Lambadi Matrimony Landing Page ---
router.get('/lambadi-matrimony', optionalUser, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];
    res.render('pages/lambadi-matrimony', {
      title: 'Lambadi Matrimony – Find Lambadi Brides & Grooms | BanjaraMatch',
      user: req.user || null,
      featuredBlogs,
    });
  } catch (error) {
    console.error('Error fetching blogs for lambadi-matrimony:', error.message);
    res.render('pages/lambadi-matrimony', {
      title: 'Lambadi Matrimony – Find Lambadi Brides & Grooms | BanjaraMatch',
      user: req.user || null,
      featuredBlogs: [],
    });
  }
});

// --- Gormati Matrimony Landing Page ---
router.get('/gormati-matrimony', optionalUser, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];
    res.render('pages/gormati-matrimony', {
      title: 'Gormati Matrimony – Find Gormati Brides & Grooms | BanjaraMatch',
      user: req.user || null,
      featuredBlogs,
    });
  } catch (error) {
    console.error('Error fetching blogs for gormati-matrimony:', error.message);
    res.render('pages/gormati-matrimony', {
      title: 'Gormati Matrimony – Find Gormati Brides & Grooms | BanjaraMatch',
      user: req.user || null,
      featuredBlogs: [],
    });
  }
});

// --- Banjara Gotra List Reference Page ---
router.get('/banjara-gotra-list', optionalUser, async (req, res) => {
  try {
    const [blogsRes, gotraRes, clanRes] = await Promise.all([
      axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`),
      axios.post(`${AUTH_SERVER_URL}/api/fetchGotraList`, {}),
      axios.get(`${AUTH_SERVER_URL}/api/fetchClanList`),
    ]);
    const featuredBlogs = blogsRes.data?.data || [];
    const gotras = (gotraRes.data?.data || []).sort((a, b) => a.name.localeCompare(b.name));
    const clans = (clanRes.data?.data || []).sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
    res.render('pages/banjara-gotra-list', {
      title: `Banjara Gotra List – ${gotras.length} Lambadi Gotras & Clans | BanjaraMatch`,
      user: req.user || null,
      featuredBlogs,
      gotras,
      clans,
    });
  } catch (error) {
    console.error('Error fetching data for banjara-gotra-list:', error.message);
    res.render('pages/banjara-gotra-list', {
      title: 'Banjara Gotra List – Lambadi Gotras & Clans | BanjaraMatch',
      user: req.user || null,
      featuredBlogs: [],
      gotras: [],
      clans: [],
    });
  }
});

router.get('/banjara-community-history', optionalUser, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];
    res.render('pages/banjara-community-history', {
      title: 'Banjara Community History — Origin, Culture & Heritage of Banjara People | BanjaraMatch',
      user: req.user || null,
      featuredBlogs,
    });
  } catch (error) {
    console.error('Error fetching blogs for banjara-community-history:', error.message);
    res.render('pages/banjara-community-history', {
      title: 'Banjara Community History — Origin, Culture & Heritage of Banjara People | BanjaraMatch',
      user: req.user || null,
      featuredBlogs: [],
    });
  }
});

// --- Middleware: Auth Check ---
async function ensureAuth(req, res, next) {
  const token = req.cookies?.token;
  console.log('[ensureAuth] Token from cookie:', token);

  if (!token) {
    console.log('[ensureAuth] No token, redirecting to /login');
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[ensureAuth] JWT decoded:', decoded);

    const { data } = await axios.get(`${AUTH_SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[ensureAuth] /me response:', data);

    req.user = data?.user;
    next();
  } catch (err) {
    console.error('[ensureAuth] Auth failed:', err.message || err);
    res.clearCookie('token');
    return res.redirect('/login');
  }
}

// --- Middleware: Redirect if Authenticated ---
async function redirectIfAuthenticated(req, res, next) {
  const token = req.cookies?.token;
  console.log('[redirectIfAuthenticated] Token from cookie:', token);

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('[redirectIfAuthenticated] JWT decoded:', decoded);

    const { data } = await axios.get(`${AUTH_SERVER_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[redirectIfAuthenticated] /me response:', data);

    if (data?.user) {
      console.log('[redirectIfAuthenticated] Already authenticated, redirecting to /dashboard');
      return res.redirect('/dashboard');
    }

    return next();
  } catch (err) {
    console.warn('[redirectIfAuthenticated] Token invalid or /me failed:', err.message || err);
    return next();
  }
}

// --- Middleware: Check Profile Completion ---
function checkProfileCompletion(req, res, next) {
  const user = req.user;
  
  // Skip onboarding check if already on onboarding page
  if (req.path === '/onboarding') {
    return next();
  }

  // Check if mandatory fields are completed (removed username as it's optional and captured during registration)
  const mandatoryFields = ['gender', 'dob', 'height', 'maritalStatus', 'caste', 'gotra'];
  const missingFields = mandatoryFields.filter(field => !user[field]);

  if (missingFields.length > 0) {
    console.log('[checkProfileCompletion] Missing fields:', missingFields, '- redirecting to /onboarding');
    return res.redirect('/onboarding');
  }

  return next();
}

// --- Legacy / Missing Page Redirects (SEO: fix 404s) ---
router.get('/terms-condition',    (req, res) => res.redirect(301, '/terms-conditions'));
router.get('/plans',              (req, res) => res.redirect(301, '/features'));
router.get('/banjara-matrimony-bangalore', (req, res) => res.redirect(301, '/banjara-matrimony-karnataka'));
router.get('/banjara-matrimony-pune',      (req, res) => res.redirect(301, '/banjara-matrimony-maharashtra'));

// --- Public Pages ---
router.get('/', optionalUser, async (req, res) => {
  try {
    // Prefer featured blogs, but fall back to recent blogs so the homepage never shows static placeholders.
    const featuredResponse = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    let featuredBlogs = Array.isArray(featuredResponse.data?.data) ? featuredResponse.data.data : [];

    if (featuredBlogs.length < 3) {
      const blogsResponse = await axios.get(`${AUTH_SERVER_URL}/api/blogs?page=1&limit=3`);
      const recentBlogs = Array.isArray(blogsResponse.data?.data) ? blogsResponse.data.data : [];
      const seenBlogIds = new Set(featuredBlogs.map((blog) => String(blog._id)));

      recentBlogs.forEach((blog) => {
        const blogId = String(blog._id);
        if (featuredBlogs.length < 3 && !seenBlogIds.has(blogId)) {
          featuredBlogs.push(blog);
          seenBlogIds.add(blogId);
        }
      });
    }

    res.render('pages/index', {
      title: 'Banjara Match - Find Your Life Partner',
      featuredBlogs,
      user: req.user || null
    });
  } catch (error) {
    console.error('Error fetching featured blogs:', error.message);
    res.render('pages/index', {
      title: 'Banjara Match - Find Your Life Partner',
      featuredBlogs: [],
      user: req.user || null
    });
  }
});

router.get('/about', optionalUser, async (req, res) => {
  try {
    // Fetch featured blogs for about page
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];
    
    res.render('pages/about', { 
      title: 'About Us - Banjara Match',
      user: req.user || null,
      featuredBlogs,
      breadcrumbs: [
        { name: 'About Us', url: '/about' }
      ]
    });
  } catch (error) {
    console.error('Error fetching blogs for about page:', error.message);
    res.render('pages/about', { 
      title: 'About Us - Banjara Match',
      user: req.user || null,
      featuredBlogs: [],
      breadcrumbs: [
        { name: 'About Us', url: '/about' }
      ]
    });
  }
});

// FAQ Hub Page
router.get('/faq', optionalUser, async (req, res) => {
  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];

    res.render('pages/faq', {
      title: 'FAQ - Frequently Asked Questions | BanjaraMatch',
      user: req.user || null,
      featuredBlogs,
      breadcrumbs: [
        { name: 'FAQ', url: '/faq' }
      ]
    });
  } catch (error) {
    console.error('Error fetching blogs for FAQ page:', error.message);
    res.render('pages/faq', {
      title: 'FAQ - Frequently Asked Questions | BanjaraMatch',
      user: req.user || null,
      featuredBlogs: [],
      breadcrumbs: [
        { name: 'FAQ', url: '/faq' }
      ]
    });
  }
});

// Platform Features Page
router.get('/features', optionalUser, (req, res) => {
  res.render('pages/features', {
    title: 'BanjaraMatch Features – Free AI-Powered Banjara Matrimony App & Website',
    user: req.user || null,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Features', url: '/features' }
    ]
  });
});

// Beta Tester Program Page
router.get('/beta-tester', optionalUser, (req, res) => {
  res.render('pages/beta-tester', {
    title: 'Join BanjaraMatch Beta Testing Program | Get Lifetime Premium Access',
    user: req.user || null,
    breadcrumbs: [
      { name: 'Beta Testing Program', url: '/beta-tester' }
    ]
  });
});

// Biodata Builder Page
router.get('/biodata-builder', optionalUser, (req, res) => {
  res.sendFile('biodata-builder.html', { root: './public' });
});

router.get('/child-safety-policy', optionalUser, (req, res) => {
  res.render('pages/child-safety-policy', {
    title: 'Child Safety Policy & Standards | BanjaraMatch - CSAE/CSAM Prevention',
    user: req.user || null,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Child Safety Policy', url: '/child-safety-policy' }
    ]
  });
});

router.get('/community-feedback', optionalUser, (req, res) => {
  res.render('pages/community-feedback', {
    title: 'Community Feedback & Feature Suggestions | BanjaraMatch - Your Voice Matters',
    user: req.user || null,
    breadcrumbs: [
      { name: 'Home', url: '/' },
      { name: 'Community Feedback', url: '/community-feedback' }
    ]
  });
});

router.get('/contact', optionalUser, async (req, res) => {
  try {
    // Fetch featured blogs for contact page
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
    const featuredBlogs = response.data?.data || [];
    
    res.render('pages/contact', { 
      title: 'Contact Us - Banjara Match',
      user: req.user || null,
      featuredBlogs,
      breadcrumbs: [
        { name: 'Contact Us', url: '/contact' }
      ]
    });
  } catch (error) {
    console.error('Error fetching blogs for contact page:', error.message);
    res.render('pages/contact', { 
      title: 'Contact Us - Banjara Match',
      user: req.user || null,
      featuredBlogs: [],
      breadcrumbs: [
        { name: 'Contact Us', url: '/contact' }
      ]
    });
  }
});

// HTML Sitemap Page (SEO Best Practice)
router.get('/sitemap', optionalUser, async (req, res) => {
  try {
    // Fetch city and state pages from new endpoints
    const [cityResponse, stateResponse] = await Promise.all([
      axios.get(`${AUTH_SERVER_URL}/api/city-pages`).catch(() => ({ data: { data: [] } })),
      axios.get(`${AUTH_SERVER_URL}/api/state-pages`).catch(() => ({ data: { data: [] } }))
    ]);
    
    const cityPages = cityResponse.data?.data || [];
    const statePages = stateResponse.data?.data || [];
    const regionalPages = [...statePages, ...cityPages]; // Combine both
    
    res.render('pages/sitemap', {
      title: 'Site Map - BanjaraMatch',
      user: req.user || null,
      regionalPages,
      cityPages,
      statePages,
      breadcrumbs: [
        { name: 'Site Map', url: '/sitemap' }
      ]
    });
  } catch (error) {
    console.error('Error fetching regional pages for sitemap:', error.message);
    // Render with empty regional pages if API fails
    res.render('pages/sitemap', {
      title: 'Site Map - BanjaraMatch',
      user: req.user || null,
      regionalPages: [],
      cityPages: [],
      statePages: [],
      breadcrumbs: [
        { name: 'Site Map', url: '/sitemap' }
      ]
    });
  }
});

// Primary login page (Email/Password authentication)
router.get('/login', redirectIfAuthenticated, (req, res) => {
  res.render('pages/login', { 
    title: 'Login - Banjara Matrimony | BanjaraMatch.com',
    user: null
  });
});

// SEO-friendly registration page
router.get('/register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register', { 
    title: 'Register Free - Banjara Matrimony | BanjaraMatch.com',
    user: null
  });
});

// SEO-friendly alias for sign-up searches
router.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register', { 
    title: 'Sign Up - Banjara Matrimony | BanjaraMatch.com',
    user: null
  });
});

// Forgot password page
router.get('/forgot-password', redirectIfAuthenticated, (req, res) => {
  res.render('pages/forgot-password', { 
    title: 'Forgot Password - Banjara Matrimony | BanjaraMatch.com',
    user: null
  });
});

// Reset password page (custom Firebase action handler)
router.get('/reset-password', redirectIfAuthenticated, (req, res) => {
  res.render('pages/reset-password', { 
    title: 'Reset Password - Banjara Matrimony | BanjaraMatch.com',
    user: null
  });
});


// Hidden email-based registration (for admin/future use only - not linked anywhere)
router.get('/admin-email-register', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register', { 
    title: 'Admin Register - Banjara Match',
    user: null
  });
});

// Thank You page route (for conversion tracking) - show only once after registration
router.get('/thank-you', ensureAuth, (req, res) => {
  // Set cache control headers to prevent caching
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  // Initialize session if not exists
  if (!req.session) {
    req.session = {};
  }
  
  // If user already seen thank-you page in this session, redirect to dashboard
  if (req.session.thankYouShown === true) {
    return res.redirect('/dashboard');
  }
  
  // Mark as shown for this session
  req.session.thankYouShown = true;
  
  res.render('pages/thank-you', {
    title: 'Thank You - Registration Successful | BanjaraMatch',
    user: req.user,
    userId: req.user?._id || ''
  });
});

router.get('/blogs', optionalUser, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const search = req.query.search;
  // Support ?category=Culture query param (used by footer links and other pages)
  const rawCategory = req.query.category;
  const category = rawCategory ? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase() : null;

  try {
    let apiUrl = `${AUTH_SERVER_URL}/api/blogs?page=${page}&limit=${limit}`;
    if (category) apiUrl += `&category=${encodeURIComponent(category)}`;
    if (search) apiUrl += `&search=${encodeURIComponent(search)}`;

    const response = await axios.get(apiUrl);
    const { data: blogs, pagination } = response.data;

    // Fetch trending posts
    const trendingResponse = await axios.get(`${AUTH_SERVER_URL}/api/blogs/trending?limit=5`);
    const trendingPosts = trendingResponse.data?.data || [];

    res.render('pages/blog', {
      title: category ? `${category} Articles - BanjaraMatch Blog` : 'Blog & Articles - BanjaraMatch',
      posts: blogs,
      trending: trendingPosts,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      category: category,
      search: search || null,
      user: req.user || null,
      breadcrumbs: category
        ? [{ name: 'Blog', url: '/blogs' }, { name: category, url: `/blogs/${category.toLowerCase()}` }]
        : [{ name: 'Blog', url: '/blogs' }]
    });
  } catch (error) {
    console.error('Error fetching blogs:', error.message);
    res.render('pages/blog', {
      title: 'Blog & Articles - BanjaraMatch',
      posts: [],
      trending: [],
      currentPage: 1,
      totalPages: 1,
      category: category,
      search: null,
      user: req.user || null
    });
  }
});

// Category listing: /blogs/:category
router.get('/blogs/:category', optionalUser, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  // Capitalise first letter so 'culture' matches the DB enum value 'Culture'
  const rawCategory = req.params.category;

  // Canonicalize case: /blogs/CULTURE or /blogs/Culture -> /blogs/culture (preserve query string)
  if (rawCategory !== rawCategory.toLowerCase()) {
    const qs = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
    return res.redirect(301, `/blogs/${rawCategory.toLowerCase()}${qs}`);
  }

  const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
  const search = req.query.search;

  try {
    let apiUrl = `${AUTH_SERVER_URL}/api/blogs?page=${page}&limit=${limit}&category=${encodeURIComponent(category)}`;
    if (search) apiUrl += `&search=${encodeURIComponent(search)}`;

    const response = await axios.get(apiUrl);
    const { data: blogs, pagination } = response.data;

    // Fetch trending posts
    const trendingResponse = await axios.get(`${AUTH_SERVER_URL}/api/blogs/trending?limit=5`);
    const trendingPosts = trendingResponse.data?.data || [];

    res.render('pages/blog', {
      title: `${category} Articles - BanjaraMatch Blog`,
      posts: blogs,
      trending: trendingPosts,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      category: category,
      search: search || null,
      user: req.user || null,
      breadcrumbs: [
        { name: 'Blog', url: '/blogs' },
        { name: category, url: `/blogs/${category.toLowerCase()}` }
      ]
    });
  } catch (error) {
    console.error('Error fetching blogs:', error.message);
    res.render('pages/blog', {
      title: 'Blog & Articles - BanjaraMatch',
      posts: [],
      trending: [],
      currentPage: 1,
      totalPages: 1,
      category: category,
      search: null,
      user: req.user || null
    });
  }
});

// Individual blog post: /blogs/:category/:slug
router.get('/blogs/:category/:slug', optionalUser, async (req, res) => {
  const { category, slug } = req.params;

  // Canonicalize case: /blogs/CULTURE/slug or /blogs/Culture/slug -> /blogs/culture/slug
  if (category !== category.toLowerCase()) {
    return res.redirect(301, `/blogs/${category.toLowerCase()}/${slug}`);
  }

  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/${slug}`);

    if (!response.data.status) {
      return res.status(404).render('pages/blog-detail', {
        title: 'Blog Not Found - BanjaraMatch',
        blog: null,
        relatedBlogs: [],
        user: req.user || null
      });
    }

    const { blog, relatedBlogs } = response.data.data;

    // Verify category matches (case-insensitive)
    if (blog.category.toLowerCase() !== category.toLowerCase()) {
      // Redirect to correct category URL
      return res.redirect(301, `/blogs/${blog.category.toLowerCase()}/${slug}`);
    }

    res.render('pages/blog-detail', {
      title: `${blog.title} - BanjaraMatch Blog`,
      blog,
      relatedBlogs: relatedBlogs || [],
      user: req.user || null,
      breadcrumbs: [
        { name: 'Blog', url: '/blogs' },
        { name: blog.category, url: `/blogs/${blog.category.toLowerCase()}` },
        { name: blog.title, url: `/blogs/${blog.category.toLowerCase()}/${slug}` }
      ],
      shareUrl: `https://www.banjaramatch.com/blogs/${blog.category.toLowerCase()}/${slug}`,
      shareTitle: blog.title,
      shareDescription: blog.metaDescription || blog.excerpt,
      shareImage: blog.image || 'https://www.banjaramatch.com/images/banjaramatch-preview.jpg'
    });
  } catch (error) {
    console.error('Error fetching blog:', error.message);
    res.status(404).render('pages/blog-detail', {
      title: 'Blog Not Found - BanjaraMatch',
      blog: null,
      relatedBlogs: [],
      user: req.user || null
    });
  }
});

// Legacy redirects for old URLs
router.get('/blog/:slug', optionalUser, async (req, res) => {
  const { slug } = req.params;

  try {
    const response = await axios.get(`${AUTH_SERVER_URL}/api/blogs/${slug}`);
    
    if (!response.data.status) {
      return res.status(404).render('pages/blog-detail', {
        title: 'Blog Not Found - BanjaraMatch',
        blog: null,
        relatedBlogs: [],
        user: req.user || null
      });
    }

    const { blog } = response.data.data;
    
    // Redirect to new path structure
    return res.redirect(301, `/blogs/${blog.category.toLowerCase()}/${slug}`);
  } catch (error) {
    console.error('Error fetching blog for redirect:', error.message);
    res.status(404).render('pages/blog-detail', {
      title: 'Blog Not Found - BanjaraMatch',
      blog: null,
      relatedBlogs: [],
      user: req.user || null
    });
  }
});

router.get('/blog/:category/:slug', optionalUser, async (req, res) => {
  const { category, slug } = req.params;
  // Redirect old /blog/ URLs to /blogs/
  return res.redirect(301, `/blogs/${category.toLowerCase()}/${slug}`);
});

// --- Onboarding Page (New Users) ---
router.get('/onboarding', ensureAuth, (req, res) => {
  res.render('pages/onboarding', {
    title: 'Complete Your Profile - Banjara Match',
    user: req.user,
  });
});

// --- Ice Breaker Game Page ---
router.get('/ice-breaker-game', ensureAuth, async (req, res) => {
  try {
    res.render('pages/ice-breaker-game', {
      title: 'Ice Breaker Game - Banjara Match',
      user: req.user
    });
  } catch (error) {
    console.error('Error loading ice breaker game:', error);
    res.redirect('/dashboard');
  }
});

// --- Protected Page ---
router.get('/dashboard', ensureAuth, checkProfileCompletion, async (req, res) => {
  try {
    const user = req.user;

    console.log('✅ [Dashboard] Logged in User:', {
      id: user._id,
      name: user.full_name || user.username,
      email: user.email,
    });

    // --- Call 1: New Profiles ---
    const fetchUsersListUrl = `${AUTH_SERVER_URL}/api/fetchUsersList`;
    const fetchUsersListPayload = {
      my_user_id: user._id,
      page: 1,
      limit: 10,
      sortByNewUsers: true
    };
    console.log('📡 [API] New Profiles:', fetchUsersListUrl, fetchUsersListPayload);
    const newProfilesResponse = await axios.post(fetchUsersListUrl, fetchUsersListPayload);
    const newProfiles = newProfilesResponse.data?.data || [];

    // --- Call 2: Interests Received (Pending) ---
    const interestsUrl = `${AUTH_SERVER_URL}/api/getInterestList`;
    const interestsReceivedPayload = {
      my_user_id: user._id,
      type: 'received',
      limit: 20,
      start: 1
    };
    console.log('📡 [API] Interests Received:', interestsUrl, interestsReceivedPayload);
    const interestsResponse = await axios.post(interestsUrl, interestsReceivedPayload);
    const allInterestsReceived = interestsResponse.data?.data || [];
    
    // Filter for pending only
    const interestReceived = allInterestsReceived.filter(req => req.status === 'pending');

   
    // --- Call 3: Interests Sent ---
    const interestsSentPayload = {
      my_user_id: user._id,
      type: 'sent',
      limit: 20,
      start: 1
    };
    console.log('📡 [API] Interests Sent:', interestsUrl, interestsSentPayload);
    const interestsSentResponse = await axios.post(interestsUrl, interestsSentPayload);
    const interestSent = interestsSentResponse.data?.data || [];

    // --- Call 4: Accepted Requests ---
    const acceptedRequestPayload = {
      my_user_id: user._id,
      type: 'accepted',
      limit: 20,
      start: 1
    };
    console.log('📡 [API] Accepted Requests:', interestsUrl, acceptedRequestPayload);
    const acceptedResponse = await axios.post(interestsUrl, acceptedRequestPayload);
    const allAcceptedRequests = acceptedResponse.data?.data || [];
    
    // Filter for accepted only
    const acceptedRequests = allAcceptedRequests.filter(req => req.status === 'accepted');

    // --- Call 5: Who Viewed My Profile ---
    const whoViewedMeUrl = `${AUTH_SERVER_URL}/api/getProfileVisitorSummary`;
    const whoViewedMePayload = {
      my_user_id: user._id,
      type: 'they_viewed_me',
      page: 1,
      limit: 10
    };
    console.log('📡 [API] Who Viewed Me:', whoViewedMeUrl, whoViewedMePayload);
    const whoViewedMeResponse = await axios.post(whoViewedMeUrl, whoViewedMePayload).catch(() => ({ data: { data: [] } }));
    const whoViewedMe = whoViewedMeResponse.data?.data || [];

    // --- Call 6: Profiles I Viewed ---
    const iViewedPayload = {
      my_user_id: user._id,
      type: 'i_viewed',
      page: 1,
      limit: 10
    };
    console.log('📡 [API] I Viewed:', whoViewedMeUrl, iViewedPayload);
    const iViewedResponse = await axios.post(whoViewedMeUrl, iViewedPayload).catch(() => ({ data: { data: [] } }));
    const iViewedProfiles = iViewedResponse.data?.data || [];

    // --- Call 7: Mutual Views ---
    const mutualViewsPayload = {
      my_user_id: user._id,
      type: 'mutual',
      page: 1,
      limit: 10
    };
    console.log('📡 [API] Mutual Views:', whoViewedMeUrl, mutualViewsPayload);
    const mutualViewsResponse = await axios.post(whoViewedMeUrl, mutualViewsPayload).catch(() => ({ data: { data: [] } }));
    const mutualViews = mutualViewsResponse.data?.data || [];

    // --- Call 8: Shortlisted Profiles ---
    const shortlistedUrl = `${AUTH_SERVER_URL}/api/getShortListedUsers`;
    const shortlistedPayload = {
      my_user_id: user._id
    };
    console.log('📡 [API] Shortlisted:', shortlistedUrl, shortlistedPayload);
    const shortlistedResponse = await axios.post(shortlistedUrl, shortlistedPayload).catch(() => ({ data: { data: [] } }));
    const shortlistedProfiles = shortlistedResponse.data?.data || [];

    // --- Call 9: Daily Matches (Top Matches) ---
    const dailyMatchesUrl = `${AUTH_SERVER_URL}/api/getTopDailyMatches`;
    const dailyMatchesPayload = {
      my_user_id: user._id,
      limit: 10
    };
    console.log('📡 [API] Daily Matches:', dailyMatchesUrl, dailyMatchesPayload);
    const dailyMatchesResponse = await axios.post(dailyMatchesUrl, dailyMatchesPayload).catch(() => ({ data: { data: [] } }));
    const dailyMatches = dailyMatchesResponse.data?.data || [];

    // --- Render Page ---
    res.render('pages/user-dashboard', {
      title: 'Dashboard - Banjara Match',
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
      dailyMatches
    });

  } catch (err) {
    console.error('❌ [Dashboard] Load Error:', err.message);
    res.render('pages/user-dashboard', {
      title: 'Dashboard - Banjara Match',
      user: req.user,
      newProfiles: [],
      interestReceived: [],
      interestSent: [],
      newRequests: [],
      acceptedRequests: [],
      whoViewedMe: [],
      iViewedProfiles: [],
      mutualViews: [],
      shortlistedProfiles: [],
      dailyMatches: [],
      error: 'Failed to load dashboard data'
    });
  }
});



router.get('/update-profile', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/update-profile', {
    title: 'Edit Profile - Banjara Match',
    user: req.user,
  });
});

router.get('/user-interests', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-interests', {
    title: 'Interests - Banjara Match',
    user: req.user,
  });
});

router.get('/user-chat', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-chat', {
    title: 'Chat - Banjara Match',
    user: req.user,
  });
});

router.get('/user-setting', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-setting', {
    title: 'Privacy Settings - Banjara Match',
    user: req.user,
  });
});

router.get('/user-plan', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/user-plan', {
    title: 'My Plan - Banjara Match',
    user: req.user,
  });
});

// Dedicated shortlist page — previously only a 5-item preview on the
// dashboard, whose "See All" link already pointed at /shortlisted with no
// route behind it (a live 404).
router.get('/shortlisted', ensureAuth, checkProfileCompletion, async (req, res) => {
  const user = req.user;
  try {
    const shortlistedUrl = `${AUTH_SERVER_URL}/api/getShortListedUsers`;
    const { data } = await axios.post(shortlistedUrl, { my_user_id: user._id }).catch(() => ({ data: { data: [] } }));
    res.render('pages/shortlisted', {
      title: 'My Shortlist - Banjara Match',
      user,
      shortlistedProfiles: data?.data || []
    });
  } catch (err) {
    console.error('❌ [Shortlisted] Load Error:', err.message);
    res.render('pages/shortlisted', {
      title: 'My Shortlist - Banjara Match',
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
    user: req.user,
  });
});

// Notifications — fetchUserNotification/markNotificationsRead already work
// server-side but were never surfaced anywhere in the web app before now.
router.get('/notifications', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/notifications', {
    title: 'Notifications - Banjara Match',
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
    user: req.user,
    activeType: type,
  });
});

router.get('/all-profiles', ensureAuth, checkProfileCompletion, (req, res) => {
  res.render('pages/all-profiles', {
    title: 'Browse Profiles - Banjara Match',
    user: req.user,
    breadcrumbs: [
      { name: 'Browse Profiles', url: '/all-profiles' }
    ]
  });
});

router.get('/profile/:userId', ensureAuth, checkProfileCompletion, async (req, res) => {
  try {
    const { userId } = req.params;
    const token = req.cookies?.token;

    // Fetch profile details
    const profileResponse = await axios.post(
      `${AUTH_SERVER_URL}/api/fetchProfile`,
      { user_id: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!profileResponse.data?.status) {
      return res.render('pages/profile-details', {
        title: 'Profile Not Found - Banjara Match',
        user: req.user,
        profile: null,
        relatedProfiles: [],
        connectionStatus: null,
        error: 'Profile not found'
      });
    }

    const profile = profileResponse.data.data;

    // Connection status is already included in the fetchProfile response.
    // Use it directly — no extra API calls needed.
    const connectionStatus = {
      isFriend:          !!profile.isFriend,
      isRequestSent:     !!profile.isRequestSent,
      isRequestReceived: !!profile.isRequestReceived,
      requestStatus:     profile.requestStatus  || 'none',
      relationshipType:  profile.relationshipType || null,
      isShortListed:     !!profile.isShortListed,
    };

    // Fetch related profiles (opposite gender, similar age range)
    const relatedProfilesResponse = await axios.post(
      `${AUTH_SERVER_URL}/api/fetchUsersList`,
      {
        my_user_id: req.user._id,
        page: 1,
        limit: 6,
        gender: profile.gender === 'male' ? 'female' : 'male', // Opposite gender for matrimony
        ageFrom: Math.max(18, (profile.age || 25) - 5),
        ageTo: Math.min(60, (profile.age || 25) + 5)
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const relatedProfiles = relatedProfilesResponse.data?.data || [];

    res.render('pages/profile-details', {
      title: `${profile.full_name || 'Profile'} - Banjara Match`,
      user: req.user,
      profile,
      relatedProfiles,
      connectionStatus
    });

  } catch (err) {
    console.error('❌ [Profile Details] Load Error:', err.message);
    res.render('pages/profile-details', {
      title: 'Profile - Banjara Match',
      user: req.user,
      profile: null,
      relatedProfiles: [],
      connectionStatus: null,
      error: 'Failed to load profile'
    });
  }
});

// --- Terms & Conditions Page ---
router.get('/terms-conditions', optionalUser, (req, res) => {
  res.render('pages/terms-conditions', {
    title: 'Terms & Conditions - BanjaraMatch',
    user: req.user || null
  });
});

// --- Privacy Policy Page ---
router.get('/privacy-policy', optionalUser, (req, res) => {
  res.render('pages/privacy-policy', {
    title: 'Privacy Policy - BanjaraMatch',
    user: req.user || null
  });
});

// --- Logout ---
router.get('/logout', (req, res) => {
  // Clear the authentication cookie with matching options from login
  res.clearCookie('token', { 
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'Lax',
    domain: '.banjaramatch.com'
  });
  
  // Send HTML page that signs out from Firebase and then redirects
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Logging out...</title>
      <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>
      <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>
    </head>
    <body>
      <p>Logging out...</p>
      <script>
        // Firebase Configuration
        const firebaseConfig = {
          apiKey: "AIzaSyBEQVygTdSOOUczWmUezTt0CyoGm4l5Qe8",
          authDomain: "socialmedia-dcdd8.firebaseapp.com",
          projectId: "socialmedia-dcdd8"
        };
        
        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        
        // Sign out from Firebase
        firebase.auth().signOut().then(() => {
          console.log('✅ Firebase sign out successful');
          // Clear all cookies
          document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/;domain=.banjaramatch.com");
          });
          // Clear localStorage and sessionStorage
          localStorage.clear();
          sessionStorage.clear();
          // Redirect to login
          window.location.href = '/login';
        }).catch((error) => {
          console.error('❌ Firebase sign out error:', error);
          // Still redirect even if Firebase signout fails
          window.location.href = '/login';
        });
      </script>
    </body>
    </html>
  `);
});

// --- Regional Landing Pages (SEO) ---
// IMPORTANT: This must be LAST to avoid catching other routes
router.get('/:slug', optionalUser, async (req, res, next) => {
  const { slug } = req.params;
  
  // Skip if not a regional page slug pattern
  if (!slug.startsWith('banjara-matrimony-')) {
    return next();
  }

  try {
    let page = null;
    let pageType = null;

    // Try city pages first
    try {
      const cityResponse = await axios.get(`${AUTH_SERVER_URL}/api/city-pages/${slug}`);
      if (cityResponse.data?.status) {
        page = cityResponse.data.data;
        pageType = 'city';
      }
    } catch (cityError) {
      // Not a city page, try state page
      try {
        const stateResponse = await axios.get(`${AUTH_SERVER_URL}/api/state-pages/${slug}`);
        if (stateResponse.data?.status) {
          page = stateResponse.data.data;
          pageType = 'state';
        }
      } catch (stateError) {
        // Not found in either collection
        return next();
      }
    }

    if (!page) {
      return next(); // Pass to 404 handler
    }

    // Fetch featured blogs for regional page
    try {
      const blogsResponse = await axios.get(`${AUTH_SERVER_URL}/api/blogs/featured?limit=3`);
      const featuredBlogs = blogsResponse.data?.data || [];
      
      // Use different template based on page type
      const templateName = pageType === 'state' ? 'pages/regional-page-state' : 'pages/regional-page-city';
      
      res.render(templateName, {
        title: page.metaTitle,
        page,
        user: req.user || null,
        featuredBlogs
      });
    } catch (blogError) {
      console.error('Error fetching blogs for regional page:', blogError.message);
      
      // Use different template based on page type
      const templateName = pageType === 'state' ? 'pages/regional-page-state' : 'pages/regional-page-city';
      
      res.render(templateName, {
        title: page.metaTitle,
        page,
        user: req.user || null,
        featuredBlogs: []
      });
    }
  } catch (error) {
    console.error('Error fetching regional page:', error.message);
    return next(); // Pass to 404 handler
  }
});

// --- Sitemap Regeneration API (Internal) ---
router.post('/api/regenerate-sitemap', async (req, res) => {
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
    console.error('❌ Sitemap regeneration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating sitemaps',
      error: error.message
    });
  }
});

// Proxy: cities (avoids browser CORS issues when calling API cross-origin)
router.post('/api/proxy/cities', async (req, res) => {
  try {
    const response = await axios.post(`${AUTH_SERVER_URL}/api/cities`, req.body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });
    res.json(response.data);
  } catch (err) {
    res.json({ status: false, data: [] });
  }
});

module.exports = router;
