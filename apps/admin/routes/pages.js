'use strict';
// One GET per nav item, plus /users/:id, /blogs/new and /blogs/:id/edit — every
// one behind requireAdmin, every one rendered from views/pages/<view>.ejs with
// its page module public/js/pages/<script>.js.
//
// There is no legacy shim any more (C6): nothing in public/ except /css /js
// /img /robots.txt is reachable, and old *.html URLs are 301s in routes/legacy.js.
const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { renderPage, renderError } = require('../lib/render');
const { ITEMS, BY_KEY } = require('../config/nav');

const router = express.Router();
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Every nav key has a view and a page module of the same name.
const PAGES = new Set(ITEMS.map((i) => i.key));

function pageHandler(item) {
  return async (req, res, next) => {
    try {
      return await renderPage(res, item.key, { title: item.label, pageScript: item.key, activeKey: item.key });
    } catch (err) { return next(err); }
  };
}

for (const item of ITEMS) {
  router.get(item.href, requireAdmin, pageHandler(item));
}

// /users/:id — real detail page (C3.1). Invalid ids are a 404, not an API call.
router.get('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!OBJECT_ID.test(req.params.id)) {
      return await renderError(res, 404, { title: 'User not found', message: 'That is not a valid user id.', retryHref: '/users' });
    }
    return await renderPage(res, 'user-detail', {
      title: 'User',
      pageScript: 'user-detail',
      activeKey: 'users',
      userId: req.params.id,
    });
  } catch (err) { return next(err); }
});

// Blog form (C3.4): one view for create and edit; the module reads data-blog-id.
router.get('/blogs/new', requireAdmin, async (req, res, next) => {
  try {
    return await renderPage(res, 'blog-form', { title: 'New blog post', pageScript: 'blog-form', activeKey: 'blogs', blogId: '' });
  } catch (err) { return next(err); }
});
router.get('/blogs/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    if (!OBJECT_ID.test(req.params.id)) {
      return await renderError(res, 404, { title: 'Blog not found', message: 'That is not a valid blog id.', retryHref: '/blogs' });
    }
    return await renderPage(res, 'blog-form', { title: 'Edit blog post', pageScript: 'blog-form', activeKey: 'blogs', blogId: req.params.id });
  } catch (err) { return next(err); }
});

module.exports = router;
module.exports.PAGES = PAGES;
module.exports.BY_KEY = BY_KEY;
