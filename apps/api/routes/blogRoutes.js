const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// ============ PUBLIC ROUTES ============

// @route   GET /api/blogs/all-published
// @desc    Get all published blogs for sitemap (no pagination)
// @access  Public
router.get('/all-published', blogController.getAllPublishedBlogs);

// @route   GET /api/blogs
// @desc    Get all published blogs with pagination and filters
// @access  Public
router.get('/', blogController.getPublishedBlogs);

// @route   GET /api/blogs/featured
// @desc    Get featured blogs
// @access  Public
router.get('/featured', blogController.getFeaturedBlogs);

// @route   GET /api/blogs/trending
// @desc    Get trending blogs by views
// @access  Public
router.get('/trending', blogController.getTrendingBlogs);

// @route   GET /api/blogs/categories
// @desc    Get all categories with post counts
// @access  Public
router.get('/categories', blogController.getCategories);

// @route   GET /api/blogs/:slug
// @desc    Get single blog by slug
// @access  Public
router.get('/:slug', blogController.getBlogBySlug);

// @route   POST /api/blogs/:slug/like
// @desc    Like a blog post
// @access  Public
router.post('/:slug/like', require('../middleware/rateLimits').blogLikeLimiter, blogController.likeBlog);

module.exports = router;
