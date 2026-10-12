const CityRegionalPage = require('../models/CityRegionalPage');
const City = require('../models/City');
const State = require('../models/State');
const User = require('../models/User');
const Profession = require('../models/Profession');
const Gotra = require('../models/Gotra');
const Caste = require('../models/Caste');
const Qualification = require('../models/Qualification');
const { triggerSitemapRegeneration } = require('../services/sitemapService');
const regionalStats = require('../services/regionalStats');
const { sanitizeDeep, contentWords } = require('../services/sanitize');
const { record: audit } = require('../services/auditLog');
// Fields the admin edits as HTML/text: sanitised on every write (D, Track A)
const CMS_FIELDS = ['metaTitle', 'metaDescription', 'metaKeywords', 'heroSection', 'introSection', 'aboutSection', 'statsSection',
  'whyChooseSection', 'successStoriesSection', 'howItWorksSection', 'localitiesSection', 'faqSection', 'ctaSection',
  'popularLocalities', 'communityInsights', 'culturalSection', 'featuredMembers', 'bannerImages', 'customContentBlocks', 'cityDemographics',
  'introContent', 'aboutContent', 'faqs', 'heritageSection'];
function sanitizeCmsBody(body) {
  const out = { ...body };
  for (const f of CMS_FIELDS) if (out[f] !== undefined) out[f] = sanitizeDeep(out[f]);
  delete out.stats; delete out.views; delete out.createdBy; delete out.updatedBy; delete out._id;
  return out;
}
const { 
  generateCityPrefillTemplate, 
  processObjectPlaceholders, 
  prepareCityDataContext,
  storeWithPlaceholders
} = require('../utils/placeholderProcessor');

// ============ ADMIN FUNCTIONS ============

// Shared prefill-building logic — used by both the single-city prefill
// endpoint and bulkCreateCityPages, so bulk-created pages get the same
// real-data-driven templated content (never fabricated) as one created by
// hand through the single-page flow.
async function buildCityPrefillData(cityId) {
  const city = await City.findById(cityId).populate('state');
  if (!city) {
    return null;
  }

  const state = city.state;
  const cityName = city.name;
  const stateName = state.name;

  // Calculate real stats
  const stats = await calculateCityStats(cityId, cityName);

  // Get top professions
  const topProfessions = await User.aggregate([
    { $match: { 'location.city': cityId, is_block: { $ne: 1 }, profession: { $exists: true } } },
    { $group: { _id: '$profession', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);

  // Get popular gotras
  const popularGotras = await User.aggregate([
    { $match: { 'location.city': cityId, is_block: { $ne: 1 }, gotra: { $exists: true } } },
    { $group: { _id: '$gotra', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);

  // Get popular castes
  const popularCastes = await User.aggregate([
    { $match: { 'location.city': cityId, is_block: { $ne: 1 }, caste: { $exists: true } } },
    { $group: { _id: '$caste', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  // Get top qualifications
  const topQualifications = await User.aggregate([
    { $match: { 'location.city': cityId, is_block: { $ne: 1 }, qualification: { $exists: true } } },
    { $group: { _id: '$qualification', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 }
  ]);

  // Get nearby cities
  const nearbyCities = await City.find({
    state: state._id,
    _id: { $ne: cityId }
  }).limit(15).select('_id name');

  // Generate prefill template with placeholders (using ${city}, ${state}, etc.)
  const templateData = generateCityPrefillTemplate(cityName, stateName);

  // Merge with actual data
  return {
    city: cityId,
    state: state._id,
    stats,
    ...templateData, // This contains all the placeholder templates
    nearbyCities: nearbyCities.map(c => c._id),
    communityInsights: {
      ...templateData.communityInsights,
      topProfessions: topProfessions.map(p => p._id).filter(id => id),
      popularGotras: popularGotras.map(g => g._id).filter(id => id),
      popularCastes: popularCastes.map(c => c._id).filter(id => id),
      topQualifications: topQualifications.map(q => q._id).filter(id => id)
    },
    metaTitle: `Banjara Matrimony in \${city}, \${state} | Find Lambadi Brides & Grooms`,
    metaDescription: `Find verified Banjara brides and grooms in \${city}, \${state}. Join \${stats.totalMembers}+ members. Trusted Lambadi matrimony platform with genuine profiles.`,
    metaKeywords: [`Banjara matrimony \${city}`, `Lambadi matrimony \${city}`, `\${city} matrimony`, `Banjara matches \${city}`]
  };
}

// @desc    Get prefilled data for a city page
// @route   GET /api/city-pages/admin/prefill/:cityId
// @access  Admin
exports.getPrefillDataForCity = async (req, res) => {
  try {
    const { cityId } = req.params;

    const prefillData = await buildCityPrefillData(cityId);
    if (!prefillData) {
      return res.status(404).json({ status: false, message: 'City not found' });
    }

    res.status(200).json({
      status: true,
      message: 'Prefill data generated successfully with dynamic placeholders. Use ${city}, ${state}, ${stats.totalMembers} etc. in your content - they will be replaced automatically!',
      data: prefillData
    });
  } catch (error) {
    console.error('Error generating city prefill data:', error);
    res.status(500).json({ status: false, message: 'Failed to generate prefill data', error: error.message });
  }
};

// @desc    Create city page
// @route   POST /api/city-pages/admin
// @access  Admin
exports.createCityPage = async (req, res) => {
  try {
    const { cityId, stateId, ...pageData } = req.body;

    console.log('📝 Creating city page for cityId:', cityId);
    console.log('📦 Received pageData keys:', Object.keys(pageData));
    console.log('🏙️ CityDemographics received:', pageData.cityDemographics ? Object.keys(pageData.cityDemographics) : 'None');

    if (!cityId) {
      return res.status(400).json({ status: false, message: 'City ID is required' });
    }

    // Check if already exists
    const existing = await CityRegionalPage.findOne({ city: cityId });
    if (existing) {
      return res.status(400).json({ status: false, message: 'City page already exists' });
    }

    const city = await City.findById(cityId).populate('state');
    if (!city) {
      return res.status(404).json({ status: false, message: 'City not found' });
    }

    const stats = await calculateCityStats(cityId, city.name);

    // Ensure all nested objects are properly included (CMS HTML sanitised on write)
    const cityPage = new CityRegionalPage({
      ...sanitizeCmsBody(pageData),
      city: cityId,
      state: city.state._id,
      stats,
      createdBy: req.userId
    });

    console.log('💾 Saving city page with demographics:', cityPage.cityDemographics ? 'Present' : 'Missing');

    await cityPage.save();

    console.log('✅ City page saved successfully with ID:', cityPage._id);

    if (cityPage.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.create', { type: 'cityPage', id: cityPage._id }, { after: { slug: cityPage.slug, isPublished: cityPage.isPublished } });

    res.status(201).json({ 
      status: true, 
      message: 'City page created successfully', 
      data: cityPage 
    });
  } catch (error) {
    console.error('Error creating city page:', error);
    res.status(500).json({ status: false, message: 'Failed to create city page', error: error.message });
  }
};

// @desc    Bulk-create city pages for a list of cities, reusing the same
//          real-data prefill (calculateCityStats + generateCityPrefillTemplate)
//          as the single-page create flow — never fabricated placeholder data.
//          Admin selects which cities via the UI; this doesn't auto-generate
//          pages for every city on its own.
// @route   POST /api/city-pages/admin/bulk-create
// @access  Admin
exports.bulkCreateCityPages = async (req, res) => {
  try {
    const { cityIds } = req.body;

    if (!Array.isArray(cityIds) || cityIds.length === 0) {
      return res.status(400).json({ status: false, message: 'cityIds must be a non-empty array' });
    }

    const created = [];
    const skipped = [];
    const errors = [];

    for (const cityId of cityIds) {
      try {
        const existing = await CityRegionalPage.findOne({ city: cityId });
        if (existing) {
          skipped.push({ cityId, reason: 'City page already exists' });
          continue;
        }

        const prefillData = await buildCityPrefillData(cityId);
        if (!prefillData) {
          errors.push({ cityId, reason: 'City not found' });
          continue;
        }

        const { city, state, ...pageData } = prefillData;
        const cityPage = new CityRegionalPage({
          city,
          state,
          ...sanitizeCmsBody(pageData),
          createdBy: req.userId
        });
        await cityPage.save();
        audit(req, 'regionalPage.create', { type: 'cityPage', id: cityPage._id }, { after: { slug: cityPage.slug, isPublished: cityPage.isPublished, bulk: true } });

        if (cityPage.isPublished) {
          triggerSitemapRegeneration();
        }

        created.push({ cityId, pageId: cityPage._id });
      } catch (err) {
        console.error(`Error bulk-creating city page for ${cityId}:`, err);
        errors.push({ cityId, reason: err.message });
      }
    }

    res.status(200).json({
      status: true,
      message: `Created ${created.length}, skipped ${skipped.length}, errors ${errors.length}`,
      data: { created, skipped, errors }
    });
  } catch (error) {
    console.error('Error in bulk city page creation:', error);
    res.status(500).json({ status: false, message: 'Failed to bulk-create city pages', error: error.message });
  }
};

// @desc    Get all city pages (admin)
// @route   GET /api/city-pages/admin/all
// @access  Admin
exports.getAllCityPagesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, state, isPublished, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (search) {
      // escaped + capped: a raw '(' used to throw a 500 from the admin search box
      const cities = await City.find({ name: { $regex: require('../utils/escapeRegex')(search, 60), $options: 'i' } }).select('_id');
      query.city = { $in: cities.map(c => c._id) };
    }
    if (state) query.state = state;
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const pages = await CityRegionalPage.find(query)
      .populate('city state')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await CityRegionalPage.countDocuments(query);

    res.status(200).json({
      status: true,
      data: pages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        total,
        hasMore: skip + pages.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching city pages:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch city pages', error: error.message });
  }
};

// @desc    Get city page by ID (admin)
// @route   GET /api/city-pages/admin/:id
// @access  Admin
exports.getCityPageByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const page = await CityRegionalPage.findById(id)
      .populate('city', 'name district')
      .populate('state', 'name')
      .populate('nearbyCities', 'name district')
      .populate('communityInsights.topProfessions', 'name')
      .populate('communityInsights.popularGotras', 'name')
      .populate('communityInsights.popularCastes', 'name')
      .populate('communityInsights.topQualifications', 'name')
      .populate('statePage')
      .lean();

    if (!page) {
      return res.status(404).json({ status: false, message: 'City page not found' });
    }

    // Return the actual saved data (not prefill, not processed)
    // Admin panel should show exactly what's in the database
    res.status(200).json({ 
      status: true, 
      message: 'City page data retrieved for editing',
      data: page 
    });
  } catch (error) {
    console.error('Error fetching city page:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch city page', error: error.message });
  }
};

// @desc    Update city page
// @route   PUT /api/city-pages/admin/:id
// @access  Admin
exports.updateCityPage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...sanitizeCmsBody(req.body || {}), updatedBy: req.userId };
    delete updateData.slug; // slugs are public URLs: read-only after creation (URL contract)
    delete updateData.city;
    delete updateData.state;

    console.log('📝 Updating city page ID:', id);
    console.log('📦 Update data keys:', Object.keys(updateData));
    console.log('🏙️ CityDemographics in update:', updateData.cityDemographics ? Object.keys(updateData.cityDemographics) : 'None');

    // First get existing page
    const existingPage = await CityRegionalPage.findById(id);
    if (!existingPage) {
      return res.status(404).json({ status: false, message: 'City page not found' });
    }

    console.log('📄 Existing cityDemographics before update:', existingPage.cityDemographics ? Object.keys(existingPage.cityDemographics) : 'None');

    // Use findByIdAndUpdate with proper options
    const page = await CityRegionalPage.findByIdAndUpdate(
      id, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        overwrite: false,  // Don't overwrite, merge fields
        strict: false      // Allow fields not in schema (for flexibility)
      }
    ).populate('city state');

    console.log('✅ City page updated. CityDemographics after update:', page.cityDemographics ? Object.keys(page.cityDemographics) : 'None');

    if (page.isPublished || existingPage.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.update', { type: 'cityPage', id }, { before: { isPublished: existingPage.isPublished }, after: { isPublished: page.isPublished, keys: Object.keys(req.body || {}) } });

    res.status(200).json({ 
      status: true, 
      message: 'City page updated successfully', 
      data: page 
    });
  } catch (error) {
    console.error('Error updating city page:', error);
    res.status(500).json({ status: false, message: 'Failed to update city page', error: error.message });
  }
};

// @desc    Delete city page
// @route   DELETE /api/city-pages/admin/:id
// @access  Admin
exports.deleteCityPage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await CityRegionalPage.findByIdAndDelete(id);

    if (!page) {
      return res.status(404).json({ status: false, message: 'City page not found' });
    }

    if (page.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.delete', { type: 'cityPage', id }, { before: { slug: page.slug, isPublished: page.isPublished } });

    res.status(200).json({ status: true, message: 'City page deleted successfully' });
  } catch (error) {
    console.error('Error deleting city page:', error);
    res.status(500).json({ status: false, message: 'Failed to delete city page', error: error.message });
  }
};

// @desc    Refresh city page stats
// @route   POST /api/city-pages/admin/:id/refresh-stats
// @access  Admin
exports.refreshCityPageStats = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await CityRegionalPage.findById(id).populate('city');

    if (!page) {
      return res.status(404).json({ status: false, message: 'City page not found' });
    }

    const stats = await calculateCityStats(page.city._id);
    page.stats = stats;
    page.lastStatsUpdate = new Date();
    await page.save();
    audit(req, 'regionalPage.refreshStats', { type: 'cityPage', id });

    res.status(200).json({ status: true, message: 'Stats refreshed successfully', data: page.stats });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ status: false, message: 'Failed to refresh stats', error: error.message });
  }
};

// ============ PUBLIC FUNCTIONS ============

// @desc    Get city page by slug
// @route   GET /api/city-pages/:slug
// @access  Public
exports.getCityPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await CityRegionalPage.findOne({ slug, isActive: true, isPublished: true })
      .populate('city', 'name district latitude longitude')
      .populate('state', 'name')
      .populate('nearbyCities', 'name district')
      .populate('communityInsights.topProfessions', 'name')
      .populate('communityInsights.popularGotras', 'name')
      .populate('communityInsights.popularCastes', 'name')
      .populate('communityInsights.topQualifications', 'name')
      .populate('statePage')
      .lean();

    if (!page) {
      return res.status(404).json({ status: false, message: 'Page not found' });
    }

    // Get sibling city pages in same state
    const sameStateCities = await CityRegionalPage.find({
      state: page.state._id,
      _id: { $ne: page._id },
      isActive: true,
      isPublished: true
    })
      .populate('city', 'name')
      .select('slug city stats')
      .sort({ 'stats.totalMembers': -1 })
      .limit(20)
      .lean();

    // D22: real counts computed on the GET (1 h cache), never the stored zeros
    page.stats = { ...(page.stats || {}), ...(await regionalStats.getCityStats(page.city._id)) };
    delete page.stats.successStories;

    // Prepare context for placeholder replacement
    const context = prepareCityDataContext(page, page.city, page.state);
    
    // Process placeholders in page content
    const processedPage = processObjectPlaceholders(page, context);

    processedPage.contentWords = contentWords(page);
    const [gotraDistribution, professionDistribution] = await Promise.all([
      regionalStats.getCityGotraDistribution(page.city._id),
      regionalStats.getCityProfessionDistribution(page.city._id),
    ]);
    processedPage.gotraDistribution = gotraDistribution;
    processedPage.professionDistribution = professionDistribution;

    processedPage.sameStateCities = sameStateCities;
    processedPage.breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: `${context.state} Matrimony`, url: `/banjara-matrimony-${context.state.toLowerCase().replace(/\s+/g, '-')}` },
      { name: `${context.city} Matrimony`, url: `/${slug}`, active: true }
    ];

    // D28: view bump never touches updatedAt (lastmod = content date), fire-and-forget
    CityRegionalPage.updateOne({ _id: page._id }, { $inc: { views: 1 } }, { timestamps: false }).catch(() => {});

    res.status(200).json({ status: true, data: processedPage });
  } catch (error) {
    console.error('Error fetching city page:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch city page', error: error.message });
  }
};

// @desc    Get all published city pages
// @route   GET /api/city-pages
// @access  Public
exports.getAllCityPages = async (req, res) => {
  try {
    const pages = await CityRegionalPage.find({ isActive: true, isPublished: true })
      .select(`slug city state stats isPublished updatedAt ${CMS_FIELDS.join(' ')}`)
      .populate('city state', 'name')
      .sort({ 'stats.totalMembers': -1 })
      .lean();

    // contentWords for the sitemap/noindex rule (D47); the CMS bodies are not returned
    const data = pages.map((p) => {
      const row = { _id: p._id, slug: p.slug, city: p.city, state: p.state, stats: p.stats, isPublished: p.isPublished, updatedAt: p.updatedAt, contentWords: contentWords(p) };
      if (row.stats) delete row.stats.successStories;
      return row;
    });

    res.status(200).json({ status: true, data });
  } catch (error) {
    console.error('Error fetching city pages:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch city pages', error: error.message });
  }
};

// @desc    Get city pages by state
// @route   GET /api/city-pages/state/:stateId
// @access  Public
exports.getCityPagesByState = async (req, res) => {
  try {
    const { stateId } = req.params;

    if (!require('mongoose').isValidObjectId(stateId)) {
      return res.status(200).json({ status: true, data: [] });
    }
    const pages = await CityRegionalPage.find({ state: stateId, isActive: true, isPublished: true })
      .populate('city', 'name district')
      .select('slug city stats updatedAt')
      .sort({ 'stats.totalMembers': -1 })
      .lean();

    res.status(200).json({ status: true, data: pages });
  } catch (error) {
    console.error('Error fetching city pages:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch city pages', error: error.message });
  }
};

// ============ HELPER FUNCTIONS ============

async function calculateCityStats(cityId) {
  // D22: real fields (location.city, is_block, is_verified, gender), no estimates
  return regionalStats.getCityStats(cityId, { fresh: true });
}

module.exports = exports;
