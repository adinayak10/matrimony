const Blog = require('../models/Blog');
const { triggerSitemapRegeneration } = require('../services/sitemapService');

// @desc    Get all published blogs (public)
// @route   GET /api/blogs
// @access  Public
exports.getPublishedBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      category,
      search,
      featured,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { status: 'published' };

    // Filters
    if (category) query.category = category;
    if (featured === 'true') query.isFeatured = true;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const blogs = await Blog.find(query)
      .select('-createdBy -updatedBy -__v')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await Blog.countDocuments(query);

    res.status(200).json({
      status: true,
      message: 'Blogs fetched successfully',
      data: blogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBlogs: total,
        hasMore: skip + blogs.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching published blogs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

// @desc    Get single published blog by slug
// @route   GET /api/blogs/:slug
// @access  Public
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug, status: 'published' })
      .select('-createdBy -updatedBy -__v')
      .lean();

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    // Increment views
    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });

    // Get related blogs (same category, exclude current)
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      category: blog.category,
      status: 'published'
    })
      .select('title slug description featuredImage category publishedAt readTime')
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    res.status(200).json({
      status: true,
      message: 'Blog fetched successfully',
      data: {
        blog,
        relatedBlogs
      }
    });
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch blog',
      error: error.message
    });
  }
};

// @desc    Get featured blogs
// @route   GET /api/blogs/featured
// @access  Public
exports.getFeaturedBlogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 3;

    const blogs = await Blog.find({
      status: 'published',
      isFeatured: true
    })
      .select('title slug description featuredImage category publishedAt readTime author')
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      status: true,
      message: 'Featured blogs fetched successfully',
      data: blogs
    });
  } catch (error) {
    console.error('Error fetching featured blogs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch featured blogs',
      error: error.message
    });
  }
};

// @desc    Get trending blogs (by views)
// @route   GET /api/blogs/trending
// @access  Public
exports.getTrendingBlogs = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const blogs = await Blog.find({ status: 'published' })
      .select('title slug featuredImage category views publishedAt')
      .sort({ views: -1, publishedAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      status: true,
      message: 'Trending blogs fetched successfully',
      data: blogs
    });
  } catch (error) {
    console.error('Error fetching trending blogs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch trending blogs',
      error: error.message
    });
  }
};

// @desc    Get blog categories with counts
// @route   GET /api/blogs/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { _id: 0, category: '$_id', count: 1 } }
    ]);

    res.status(200).json({
      status: true,
      message: 'Categories fetched successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// @desc    Like a blog
// @route   POST /api/blogs/:slug/like
// @access  Public
exports.likeBlog = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOneAndUpdate(
      { slug, status: 'published' },
      { $inc: { likes: 1 } },
      { new: true }
    ).select('likes');

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      status: true,
      message: 'Blog liked successfully',
      data: { likes: blog.likes }
    });
  } catch (error) {
    console.error('Error liking blog:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to like blog',
      error: error.message
    });
  }
};

// @desc    Get all published blogs for sitemap (no pagination)
// @route   GET /api/blogs/all-published
// @access  Public
exports.getAllPublishedBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' })
      .select('slug title category createdAt updatedAt featuredImage')
      .sort({ publishedAt: -1 })
      .lean();

    res.status(200).json({
      status: true,
      message: 'All published blogs fetched successfully',
      data: blogs
    });
  } catch (error) {
    console.error('Error fetching all published blogs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

module.exports = exports;
