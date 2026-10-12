const Blog = require('../../models/Blog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { triggerSitemapRegeneration } = require('../../services/sitemapService');

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

    // Filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const blogs = await Blog.find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('createdBy', 'username email')
      .populate('updatedBy', 'username email');

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
    
    // Try to find by ID first, then by slug
    let blog = await Blog.findById(id).populate('createdBy updatedBy', 'username email');
    
    if (!blog) {
      blog = await Blog.findOne({ slug: id }).populate('createdBy updatedBy', 'username email');
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
    if (!title || !description || !content) {
      return res.status(400).json({
        status: false,
        message: 'Title, description, and content are required'
      });
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({
        status: false,
        message: 'A blog with similar title already exists'
      });
    }

    const blogData = {
      title,
      slug,
      description,
      content,
      category: category || 'General',
      tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim())) : [],
      status: status || 'draft',
      isFeatured: isFeatured === 'true' || isFeatured === true,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || description,
      metaKeywords: metaKeywords ? (Array.isArray(metaKeywords) ? metaKeywords : metaKeywords.split(',').map(k => k.trim())) : [],
      createdBy: req.admin?._id,
      updatedBy: req.admin?._id
    };

    // Handle featured image
    if (req.file) {
      blogData.featuredImage = 'images/blog/' + req.file.filename;
    }

    // Handle author data
    if (author) {
      try {
        const authorData = typeof author === 'string' ? JSON.parse(author) : author;
        blogData.author = authorData;
      } catch (e) {
        blogData.author = {
          name: author.name || 'BanjaraMatch Team',
          image: author.image || 'images/user/default.jpg',
          role: author.role || 'Author'
        };
      }
    }

    const blog = await Blog.create(blogData);

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

    console.log('Updating blog with ID:', req.params.id); 
    const { id } = req.params;
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

    // Update fields
    if (title) {
      blog.title = title;
      // Regenerate slug if title changes
      blog.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    if (description) blog.description = description;
    if (content) blog.content = content;
    if (category) blog.category = category;
    if (tags) blog.tags = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim());
    if (status) blog.status = status;
    if (isFeatured !== undefined) blog.isFeatured = isFeatured === 'true' || isFeatured === true;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;
    if (metaKeywords) blog.metaKeywords = Array.isArray(metaKeywords) ? metaKeywords : metaKeywords.split(',').map(k => k.trim());


console.log('Updating blog with ID:', id);

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

    // Handle author update
    if (author) {
      try {
        const authorData = typeof author === 'string' ? JSON.parse(author) : author;
        blog.author = authorData;
      } catch (e) {
        blog.author = {
          name: author.name || blog.author.name,
          image: author.image || blog.author.image,
          role: author.role || blog.author.role
        };
      }
    }

    blog.updatedBy = req.admin?._id;

    await blog.save();
console.log('Updating blog with ID:', blog._id);

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

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    blog.isFeatured = !blog.isFeatured;
    blog.updatedBy = req.admin?._id;
    await blog.save();

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
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: 'Invalid status. Must be draft, published, or archived'
      });
    }

    const blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        status: false,
        message: 'Blog not found'
      });
    }

    blog.status = status;
    blog.updatedBy = req.admin?._id;
    
    // Set publishedAt when publishing
    if (status === 'published' && !blog.publishedAt) {
      blog.publishedAt = new Date();
    }

    await blog.save();

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
