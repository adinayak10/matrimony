const Blog = require('../../models/Blog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { triggerSitemapRegeneration } = require('../../services/sitemapService');
const { sanitizeRich, sanitizeText } = require('../../services/sanitize');
const { record: audit } = require('../../services/auditLog');
const escapeRegex = require('../../utils/escapeRegex');
const mongoose = require('mongoose');

// models/Blog.js declares createdBy/updatedBy with ref 'Admin', a model that does
// not exist (admins are Users with role 'admin'). A bare .populate('createdBy')
// therefore throws MissingSchemaError as soon as one post has createdBy set,
// which createBlog now always does. Populate with the model named explicitly.
const BY = (path) => ({ path, select: 'full_name email', model: 'User' });

const SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'publishedAt', 'views', 'likes', 'title', 'status']);
const BLOG_CATEGORIES = Blog.schema.path('category').enumValues || [];
const clampInt = (v, def, min, max) => Math.min(max, Math.max(min, parseInt(v, 10) || def));

/** Author sub-document from the form (JSON string or object); plain text only. */
function parseAuthor(author, fallback) {
  if (!author) return undefined;
  let a = author;
  if (typeof a === 'string') {
    try { a = JSON.parse(a); } catch (_) { a = { name: a }; }
  }
  if (!a || typeof a !== 'object') return undefined;
  return {
    name: sanitizeText(a.name, 80) || (fallback && fallback.name) || 'BanjaraMatch Team',
    image: sanitizeText(a.image, 300) || (fallback && fallback.image) || 'images/user/default.jpg',
    role: sanitizeText(a.role, 80) || (fallback && fallback.role) || 'Author',
  };
}
const toList = (v) => (v ? (Array.isArray(v) ? v : String(v).split(',')).map((t) => sanitizeText(t, 50)).filter(Boolean).slice(0, 30) : []);

// Where blog images are written; DB keeps the URL form 'images/blog/<file>'.
// Default is monorepo-relative: apps/api/controllers/admin -> apps/web/public/images/blog
const BLOG_IMAGE_DIR = process.env.BLOG_IMAGE_DIR || path.join(__dirname, '../../../web/public/images/blog');

// Configure multer for blog image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = BLOG_IMAGE_DIR;
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// @desc    Get all blogs (with filters)
// @route   GET /api/admin/blogs
// @access  Admin
exports.getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters (A7.2: escaped regex, capped length; whitelisted sort)
    if (['draft', 'published', 'archived'].includes(status)) query.status = status;
    if (category && BLOG_CATEGORIES.includes(category)) query.category = category;
    const q = escapeRegex(search, 60);
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    const pageNum = clampInt(page, 1, 1, 100000);
    const limitNum = clampInt(limit, 10, 1, 100);
    const skip = (pageNum - 1) * limitNum;
    const sortField = SORT_FIELDS.has(String(sortBy)) ? String(sortBy) : 'createdAt';
    const sort = { [sortField]: sortOrder === 'asc' ? 1 : -1, _id: -1 };

    const [blogs, total] = await Promise.all([
      Blog.find(query)
        .select('-content')
        .sort(sort)
        .limit(limitNum)
        .skip(skip)
        .populate(BY('createdBy'))
        .populate(BY('updatedBy'))
        .lean(),
      Blog.countDocuments(query),
    ]);

    res.status(200).json({
      status: true,
      message: 'Blogs fetched successfully',
      data: blogs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalBlogs: total,
        hasMore: skip + blogs.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch blogs',
      error: error.message
    });
  }
};

// @desc    Get single blog by ID or slug
// @route   GET /api/admin/blogs/:id
// @access  Admin
exports.getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug (slug is read-only after creation, C4.4)
    let blog = mongoose.isValidObjectId(id) ? await Blog.findById(id).populate(BY('createdBy')).populate(BY('updatedBy')) : null;
    
    if (!blog) {
      blog = await Blog.findOne({ slug: String(id).toLowerCase().slice(0, 200) }).populate(BY('createdBy')).populate(BY('updatedBy'));
    }

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    res.status(200).json({
      status: true,
      message: 'Blog fetched successfully',
      data: blog
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

// @desc    Create new blog
// @route   POST /api/admin/blogs
// @access  Admin
exports.createBlog = async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      category,
      tags,
      status,
      isFeatured,
      author,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    // Validate required fields
    if (typeof title !== 'string' || typeof description !== 'string' || typeof content !== 'string' || !title.trim() || !description.trim() || !content.trim()) {
      return res.status(400).json({
        status: false,
        message: 'Title, description, and content are required'
      });
    }
    if (category && !BLOG_CATEGORIES.includes(category)) {
      return res.status(400).json({ status: false, message: 'Invalid category' });
    }
    const authorData = parseAuthor(author);
    if (!authorData || !authorData.name || authorData.name === 'BanjaraMatch Team') {
      return res.status(400).json({ status: false, message: 'A real author name is required' });
    }

    // Generate slug from title — set ONCE here; updateBlog never changes it (C4.4)
    const slug = sanitizeText(title, 200)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug) {
      return res.status(400).json({ status: false, message: 'Title must contain letters or numbers' });
    }

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        status: false,
        message: 'A blog with similar title already exists'
      });
    }

    // Every text field is sanitised on write (D: sanitize-html on blog content)
    const blogData = {
      title: sanitizeText(title, 200),
      slug,
      description: sanitizeText(description, 500),
      content: sanitizeRich(content),
      category: category || 'General',
      tags: toList(tags),
      status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      metaTitle: sanitizeText(metaTitle, 200) || sanitizeText(title, 200),
      metaDescription: sanitizeText(metaDescription, 500) || sanitizeText(description, 500),
      metaKeywords: toList(metaKeywords),
      author: authorData,
      createdBy: req.userId,
      updatedBy: req.userId
    };
    if (blogData.status === 'published') blogData.publishedAt = new Date();

    // Handle featured image
    if (req.file) {
      blogData.featuredImage = 'images/blog/' + req.file.filename;
    }

    const blog = await Blog.create(blogData);
    audit(req, 'blog.create', { type: 'blog', id: blog._id }, { after: { title: blog.title, slug: blog.slug, status: blog.status } });

    // Trigger sitemap regeneration if blog is published
    if (blog.status === 'published') {
      triggerSitemapRegeneration().catch(err => 
        console.error('Sitemap regeneration failed:', err)
      );
    }

    res.status(201).json({
      status: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to create blog',
      error: error.message
    });
  }
};

// @desc    Update blog
// @route   PUT /api/admin/blogs/:id
// @access  Admin
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Blog not found' });
    const {
      title,
      description,
      content,
      category,
      tags,
      status,
      isFeatured,
      author,
      metaTitle,
      metaDescription,
      metaKeywords
    } = req.body;

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    const before = { title: blog.title, status: blog.status, category: blog.category };

    // Update fields — the slug is FROZEN (C4.4): /blogs/<cat>/<slug> is a public URL
    if (typeof title === 'string' && title.trim()) blog.title = sanitizeText(title, 200);
    if (typeof description === 'string' && description.trim()) blog.description = sanitizeText(description, 500);
    if (typeof content === 'string' && content.trim()) blog.content = sanitizeRich(content);
    if (category) {
      if (!BLOG_CATEGORIES.includes(category)) return res.status(400).json({ status: false, message: 'Invalid category' });
      blog.category = category;
    }
    if (tags !== undefined) blog.tags = toList(tags);
    if (status) {
      if (!['draft', 'published', 'archived'].includes(status)) return res.status(400).json({ status: false, message: 'Invalid status' });
      blog.status = status;
      if (status === 'published' && !blog.publishedAt) blog.publishedAt = new Date();
    }
    if (isFeatured !== undefined) blog.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (typeof metaTitle === 'string' && metaTitle.trim()) blog.metaTitle = sanitizeText(metaTitle, 200);
    if (typeof metaDescription === 'string' && metaDescription.trim()) blog.metaDescription = sanitizeText(metaDescription, 500);
    if (metaKeywords !== undefined) blog.metaKeywords = toList(metaKeywords);

    // Handle featured image update
    if (req.file) {
      // Delete old image if it exists and is not default
      if (blog.featuredImage && blog.featuredImage !== 'images/blog/default.jpg') {
        const oldImagePath = path.join(BLOG_IMAGE_DIR, path.basename(blog.featuredImage));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      blog.featuredImage = 'images/blog/' + req.file.filename;
    }

    // Handle author update (plain text only)
    const authorData = parseAuthor(author, blog.author);
    if (authorData) blog.author = authorData;

    blog.updatedBy = req.userId; // C4.4: req.admin was never set

    await blog.save();
    audit(req, 'blog.update', { type: 'blog', id }, { before, after: { title: blog.title, status: blog.status, category: blog.category } });

    // Trigger sitemap regeneration if blog is published
    if (blog.status === 'published') {
      triggerSitemapRegeneration().catch(err => 
        console.error('Sitemap regeneration failed:', err)
      );
    }

    res.status(200).json({
      status: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update blog',
      error: error.message
    });
  }
};

// @desc    Delete blog
// @route   DELETE /api/admin/blogs/:id
// @access  Admin
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Blog not found' });

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    // Delete featured image if it exists and is not default
    if (blog.featuredImage && blog.featuredImage !== 'images/blog/default.jpg') {
      const imagePath = path.join(BLOG_IMAGE_DIR, path.basename(blog.featuredImage));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(id);
    audit(req, 'blog.delete', { type: 'blog', id }, { before: { title: blog.title, slug: blog.slug, status: blog.status } });

    // Trigger sitemap regeneration
    triggerSitemapRegeneration().catch(err => 
      console.error('Sitemap regeneration failed:', err)
    );

    res.status(200).json({
      status: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to delete blog',
      error: error.message
    });
  }
};

// @desc    Toggle blog featured status
// @route   PATCH /api/admin/blogs/:id/featured
// @access  Admin
exports.toggleFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Blog not found' });

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    blog.isFeatured = !blog.isFeatured;
    blog.updatedBy = req.userId;
    await blog.save();
    audit(req, 'blog.featured', { type: 'blog', id }, { after: { isFeatured: blog.isFeatured } });

    res.status(200).json({
      status: true,
      message: `Blog ${blog.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: blog
    });
  } catch (error) {
    console.error('Error toggling featured:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to toggle featured status',
      error: error.message
    });
  }
};

// @desc    Publish/Unpublish blog
// @route   PATCH /api/admin/blogs/:id/status
// @access  Admin
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid status. Must be draft, published, or archived'
      });
    }
    if (!mongoose.isValidObjectId(id)) return res.status(404).json({ status: false, message: 'Blog not found' });

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    const before = { status: blog.status };
    blog.status = status;
    blog.updatedBy = req.userId;
    
    // Set publishedAt when publishing
    if (status === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }

    await blog.save();
    audit(req, 'blog.status', { type: 'blog', id }, { before, after: { status } });

    // Trigger sitemap regeneration
    triggerSitemapRegeneration().catch(err => 
      console.error('Sitemap regeneration failed:', err)
    );

    res.status(200).json({
      status: true,
      message: `Blog ${status} successfully`,
      data: blog
    });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// @desc    Get blog statistics
// @route   GET /api/admin/blogs/stats
// @access  Admin
exports.getBlogStats = async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const archivedBlogs = await Blog.countDocuments({ status: 'archived' });
    const featuredBlogs = await Blog.countDocuments({ isFeatured: true });

    const totalViews = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$views' } } }
    ]);

    const totalLikes = await Blog.aggregate([
      { $group: { _id: null, total: { $sum: '$likes' } } }
    ]);

    const categoryCounts = await Blog.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: true,
      message: 'Blog statistics fetched successfully',
      data: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        archivedBlogs,
        featuredBlogs,
        totalViews: totalViews[0]?.total || 0,
        totalLikes: totalLikes[0]?.total || 0,
        categoryCounts
      }
    });
  } catch (error) {
    console.error('Error fetching blog stats:', error);
    res.status(500).json({
      status: false,
      message: 'Failed to fetch blog statistics',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  ...exports
};
