const StateRegionalPage = require('../models/StateRegionalPage');
const CityRegionalPage = require('../models/CityRegionalPage');
const State = require('../models/State');
const City = require('../models/City');
const User = require('../models/User');
const Profession = require('../models/Profession');
const Gotra = require('../models/Gotra');
const { triggerSitemapRegeneration } = require('../services/sitemapService');
const regionalStats = require('../services/regionalStats');
const { sanitizeDeep, contentWords } = require('../services/sanitize');
const { record: audit } = require('../services/auditLog');
// Fields the admin edits as HTML/text: sanitised on every write (D, Track A)
const CMS_FIELDS = ['metaTitle', 'metaDescription', 'metaKeywords', 'heroSection', 'introSection', 'aboutSection', 'statsSection',
  'whyChooseSection', 'successStoriesSection', 'howItWorksSection', 'localitiesSection', 'citiesSection', 'faqSection', 'ctaSection',
  'topCities', 'communityInsights', 'culturalSection', 'featuredMembers', 'bannerImages', 'customContentBlocks', 'stateInfo',
  'introContent', 'aboutContent', 'faqs', 'heritageSection'];
function sanitizeCmsBody(body) {
  const out = { ...body };
  for (const f of CMS_FIELDS) if (out[f] !== undefined) out[f] = sanitizeDeep(out[f]);
  // server-owned fields are never taken from the body
  delete out.stats; delete out.views; delete out.createdBy; delete out.updatedBy; delete out._id;
  return out;
}
const { 
  generateStatePrefillTemplate, 
  processObjectPlaceholders, 
  prepareStateDataContext,
  storeWithPlaceholders
} = require('../utils/placeholderProcessor');

// ============ ADMIN FUNCTIONS ============

// @desc    Get prefilled data for a state page
// @route   GET /api/state-pages/admin/prefill/:stateId
// @access  Admin
exports.getPrefillDataForState = async (req, res) => {
  try {
    const { stateId } = req.params;

    const state = await State.findById(stateId);
    if (!state) {
      return res.status(404).json({ status: false, message: 'State not found' });
    }

    const stateName = state.name;
    const stats = await calculateStateStats(stateId, stateName);

    // Get top professions state-wide
    const topProfessions = await User.aggregate([
      { $match: { 'location.state': stateId, is_block: { $ne: 1 }, profession: { $exists: true } } },
      { $group: { _id: '$profession', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get popular gotras state-wide
    const popularGotras = await User.aggregate([
      { $match: { 'location.state': stateId, is_block: { $ne: 1 }, gotra: { $exists: true } } },
      { $group: { _id: '$gotra', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get popular castes state-wide
    const popularCastes = await User.aggregate([
      { $match: { 'location.state': stateId, is_block: { $ne: 1 }, caste: { $exists: true } } },
      { $group: { _id: '$caste', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Get top qualifications state-wide
    const topQualifications = await User.aggregate([
      { $match: { 'location.state': stateId, is_block: { $ne: 1 }, qualification: { $exists: true } } },
      { $group: { _id: '$qualification', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get cities with users
    const citiesWithUsers = await City.find({
      state: stateId
    }).select('_id name').limit(25);

    // Generate prefill template with placeholders (using ${state}, ${stats.*}, etc.)
    const templateData = generateStatePrefillTemplate(stateName);

    // Get state-specific information
    const stateInfo = getStateSpecificInfo(stateName);

    // Merge with actual data
    const prefillData = {
      state: stateId,
      stats,
      ...templateData, // This contains all the placeholder templates
      communityInsights: {
        ...templateData.communityInsights,
        topProfessions: topProfessions.map(p => p._id).filter(id => id),
        popularGotras: popularGotras.map(g => g._id).filter(id => id),
        popularCastes: popularCastes.map(c => c._id).filter(id => id),
        topQualifications: topQualifications.map(q => q._id).filter(id => id)
      },
      stateInfo: {
        ...stateInfo,
        ...templateData.stateInfo
      },
      metaTitle: `Banjara Matrimony in \${state} | Find Lambadi Brides & Grooms Across \${state}`,
      metaDescription: `Find verified Banjara brides and grooms across \${state}. Join \${stats.totalMembers}+ members from \${stats.totalCities}+ cities. Trusted Lambadi matrimony platform.`,
      metaKeywords: [`Banjara matrimony \${state}`, `Lambadi matrimony \${state}`, `\${state} matrimony`, `Banjara matches \${state}`]
    };

    res.status(200).json({ 
      status: true, 
      message: 'Prefill data generated successfully with dynamic placeholders. Use ${state}, ${stats.totalMembers}, ${stats.totalCities} etc. in your content - they will be replaced automatically!', 
      data: prefillData 
    });
  } catch (error) {
    console.error('Error generating state prefill data:', error);
    res.status(500).json({ status: false, message: 'Failed to generate prefill data', error: error.message });
  }
};

// @desc    Create state page
// @route   POST /api/state-pages/admin
// @access  Admin
exports.createStatePage = async (req, res) => {
  try {
    const { stateId, ...pageData } = req.body;

    console.log('📝 Creating state page for stateId:', stateId);
    console.log('📦 Received pageData keys:', Object.keys(pageData));
    console.log('🏛️ StateInfo received:', pageData.stateInfo ? Object.keys(pageData.stateInfo) : 'None');

    if (!stateId) {
      return res.status(400).json({ status: false, message: 'State ID is required' });
    }

    // Check if already exists
    const existing = await StateRegionalPage.findOne({ state: stateId });
    if (existing) {
      return res.status(400).json({ status: false, message: 'State page already exists' });
    }

    const state = await State.findById(stateId);
    if (!state) {
      return res.status(404).json({ status: false, message: 'State not found' });
    }

    const stats = await calculateStateStats(stateId, state.name);

    // Ensure all nested objects are properly included (CMS HTML sanitised on write)
    const statePage = new StateRegionalPage({
      ...sanitizeCmsBody(pageData),
      state: stateId,
      stats,
      createdBy: req.userId
    });

    console.log('💾 Saving state page with stateInfo:', statePage.stateInfo ? 'Present' : 'Missing');

    await statePage.save();

    console.log('✅ State page saved successfully with ID:', statePage._id);

    if (statePage.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.create', { type: 'statePage', id: statePage._id }, { after: { slug: statePage.slug, isPublished: statePage.isPublished } });

    res.status(201).json({ 
      status: true, 
      message: 'State page created successfully', 
      data: statePage 
    });
  } catch (error) {
    console.error('Error creating state page:', error);
    res.status(500).json({ status: false, message: 'Failed to create state page', error: error.message });
  }
};

// @desc    Get all state pages (admin)
// @route   GET /api/state-pages/admin/all
// @access  Admin
exports.getAllStatePagesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, isPublished, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};
    if (search) {
      const states = await State.find({ name: { $regex: search, $options: 'i' } }).select('_id');
      query.state = { $in: states.map(s => s._id) };
    }
    if (isPublished !== undefined) query.isPublished = isPublished === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const pages = await StateRegionalPage.find(query)
      .populate('state')
      .sort(sort)
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const total = await StateRegionalPage.countDocuments(query);

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
    console.error('Error fetching state pages:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch state pages', error: error.message });
  }
};

// @desc    Get state page by ID (admin)
// @route   GET /api/state-pages/admin/:id
// @access  Admin
exports.getStatePageByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📖 Fetching state page for admin edit, ID:', id);

    const page = await StateRegionalPage.findById(id)
      .populate('state', 'name')
      .populate('topCities.city', 'name')
      .populate('topCities.cityPage')
      .populate('communityInsights.topProfessions', 'name')
      .populate('communityInsights.popularGotras', 'name')
      .populate('communityInsights.popularCastes', 'name')
      .populate('communityInsights.topQualifications', 'name')
      .lean();

    if (!page) {
      return res.status(404).json({ status: false, message: 'State page not found' });
    }

    console.log('📖 Found state page:', page.slug);
    console.log('📖 StateInfo in database:', page.stateInfo ? Object.keys(page.stateInfo) : 'None');
    console.log('📖 StateInfo sample values:', page.stateInfo ? {
      introduction: page.stateInfo.introduction?.substring(0, 50) + '...',
      communityPresence: page.stateInfo.communityPresence?.substring(0, 50) + '...',
      uniqueFeature: page.stateInfo.uniqueFeature?.substring(0, 50) + '...'
    } : 'None');

    // Return the actual saved data (not prefill, not processed)
    // Admin panel should show exactly what's in the database including stateInfo fields
    res.status(200).json({ 
      status: true, 
      message: 'State page data retrieved for editing',
      data: page 
    });
  } catch (error) {
    console.error('Error fetching state page:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch state page', error: error.message });
  }
};

// @desc    Update state page
// @route   PUT /api/state-pages/admin/:id
// @access  Admin
exports.updateStatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...sanitizeCmsBody(req.body || {}), updatedBy: req.userId };
    delete updateData.slug; // slugs are public URLs: read-only after creation (URL contract)
    delete updateData.state;

    console.log('📝 Updating state page ID:', id);
    console.log('📦 Update data keys:', Object.keys(updateData));
    console.log('🏛️ StateInfo in update:', updateData.stateInfo ? Object.keys(updateData.stateInfo) : 'None');

    // First get existing page to see what's there
    const existingPage = await StateRegionalPage.findById(id);
    if (!existingPage) {
      return res.status(404).json({ status: false, message: 'State page not found' });
    }

    console.log('📄 Existing stateInfo before update:', existingPage.stateInfo ? Object.keys(existingPage.stateInfo) : 'None');

    // Use findByIdAndUpdate with proper options
    const page = await StateRegionalPage.findByIdAndUpdate(
      id, 
      updateData, 
      { 
        new: true, 
        runValidators: true,
        overwrite: false,  // Don't overwrite, merge fields
        strict: false      // Allow fields not in schema (for flexibility)
      }
    ).populate('state');

    console.log('✅ State page updated. StateInfo after update:', page.stateInfo ? Object.keys(page.stateInfo) : 'None');

    if (page.isPublished || existingPage.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.update', { type: 'statePage', id }, { before: { isPublished: existingPage.isPublished }, after: { isPublished: page.isPublished, keys: Object.keys(req.body || {}) } });

    res.status(200).json({ 
      status: true, 
      message: 'State page updated successfully', 
      data: page 
    });
  } catch (error) {
    console.error('Error updating state page:', error);
    res.status(500).json({ status: false, message: 'Failed to update state page', error: error.message });
  }
};

// @desc    Delete state page
// @route   DELETE /api/state-pages/admin/:id
// @access  Admin
exports.deleteStatePage = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await StateRegionalPage.findByIdAndDelete(id);

    if (!page) {
      return res.status(404).json({ status: false, message: 'State page not found' });
    }

    if (page.isPublished) {
      triggerSitemapRegeneration();
    }
    audit(req, 'regionalPage.delete', { type: 'statePage', id }, { before: { slug: page.slug, isPublished: page.isPublished } });

    res.status(200).json({ status: true, message: 'State page deleted successfully' });
  } catch (error) {
    console.error('Error deleting state page:', error);
    res.status(500).json({ status: false, message: 'Failed to delete state page', error: error.message });
  }
};

// @desc    Refresh state page stats
// @route   POST /api/state-pages/admin/:id/refresh-stats
// @access  Admin
exports.refreshStatePageStats = async (req, res) => {
  try {
    const { id } = req.params;
    const page = await StateRegionalPage.findById(id).populate('state');

    if (!page) {
      return res.status(404).json({ status: false, message: 'State page not found' });
    }

    const stats = await calculateStateStats(page.state._id);
    page.stats = stats;
    page.lastStatsUpdate = new Date();
    await page.save();
    audit(req, 'regionalPage.refreshStats', { type: 'statePage', id });

    res.status(200).json({ status: true, message: 'Stats refreshed successfully', data: page.stats });
  } catch (error) {
    console.error('Error refreshing stats:', error);
    res.status(500).json({ status: false, message: 'Failed to refresh stats', error: error.message });
  }
};

// @desc    Get states hierarchy (states with city counts)
// @route   GET /api/state-pages/admin/hierarchy
// @access  Admin
exports.getStatesHierarchy = async (req, res) => {
  try {
    const statePages = await StateRegionalPage.find({ isActive: true })
      .populate('state', 'name')
      .select('_id state slug metaTitle isPublished stats')
      .sort({ 'state.name': 1 })
      .lean();

    const hierarchyData = await Promise.all(
      statePages.map(async (statePage) => {
        const cityPagesCount = await CityRegionalPage.countDocuments({
          state: statePage.state._id,
          isActive: true
        });

        const publishedCityPages = await CityRegionalPage.countDocuments({
          state: statePage.state._id,
          isActive: true,
          isPublished: true
        });

        return {
          ...statePage,
          cityPagesCount,
          publishedCityPages
        };
      })
    );

    res.status(200).json({ status: true, data: hierarchyData });
  } catch (error) {
    console.error('Error fetching states hierarchy:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch states hierarchy', error: error.message });
  }
};

// ============ PUBLIC FUNCTIONS ============

// @desc    Get state page by slug
// @route   GET /api/state-pages/:slug
// @access  Public
exports.getStatePageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const page = await StateRegionalPage.findOne({ slug, isActive: true, isPublished: true })
      .populate('state', 'name')
      .populate('topCities.city', 'name')
      .populate('topCities.cityPage')
      .populate('communityInsights.topProfessions', 'name')
      .populate('communityInsights.popularGotras', 'name')
      .populate('communityInsights.popularCastes', 'name')
      .populate('communityInsights.topQualifications', 'name')
      .lean();

    if (!page) {
      return res.status(404).json({ status: false, message: 'Page not found' });
    }

    // Get city pages in this state
    const relatedCityPages = await CityRegionalPage.find({
      state: page.state._id,
      isActive: true,
      isPublished: true
    })
      .populate('city', 'name')
      .select('slug city stats')
      .sort({ 'stats.totalMembers': -1 })
      .limit(25)
      .lean();

    // D22: real counts computed on the GET (1 h cache), never the stored zeros
    page.stats = { ...(page.stats || {}), ...(await regionalStats.getStateStats(page.state._id)) };
    delete page.stats.successStories;

    // Prepare context for placeholder replacement
    const context = prepareStateDataContext(page, page.state);
    
    // Process placeholders in page content
    const processedPage = processObjectPlaceholders(page, context);

    processedPage.relatedCityPages = relatedCityPages;
    processedPage.breadcrumbs = [
      { name: 'Home', url: '/' },
      { name: `${context.state} Matrimony`, url: `/${slug}`, active: true }
    ];
    processedPage.contentWords = contentWords(page);
    // D47: real distributions only above the thresholds (else [])
    const [gotraDistribution, professionDistribution] = await Promise.all([
      regionalStats.getStateGotraDistribution(page.state._id),
      regionalStats.getStateProfessionDistribution(page.state._id),
    ]);
    processedPage.gotraDistribution = gotraDistribution;
    processedPage.professionDistribution = professionDistribution;

    // D28: view bump never touches updatedAt (lastmod = content date), fire-and-forget
    StateRegionalPage.updateOne({ _id: page._id }, { $inc: { views: 1 } }, { timestamps: false }).catch(() => {});

    res.status(200).json({ status: true, data: processedPage });
  } catch (error) {
    console.error('Error fetching state page:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch state page', error: error.message });
  }
};

// @desc    Get all published state pages
// @route   GET /api/state-pages
// @access  Public
exports.getAllStatePages = async (req, res) => {
  try {
    const pages = await StateRegionalPage.find({ isActive: true, isPublished: true })
      .select(`slug state stats isPublished updatedAt ${CMS_FIELDS.join(' ')}`)
      .populate('state', 'name')
      .sort({ 'stats.totalMembers': -1 })
      .lean();

    // contentWords for the sitemap/noindex rule (D47); the CMS bodies are not returned
    const data = pages.map((p) => {
      const words = contentWords(p);
      const row = { _id: p._id, slug: p.slug, state: p.state, stats: p.stats, isPublished: p.isPublished, updatedAt: p.updatedAt, contentWords: words };
      if (row.stats) delete row.stats.successStories;
      return row;
    });

    res.status(200).json({ status: true, data });
  } catch (error) {
    console.error('Error fetching state pages:', error);
    res.status(500).json({ status: false, message: 'Failed to fetch state pages', error: error.message });
  }
};

// ============ HELPER FUNCTIONS ============

async function calculateStateStats(stateId) {
  // D22: real fields (location.state, is_block, is_verified, gender), no estimates
  return regionalStats.getStateStats(stateId, { fresh: true });
}

// Get state-specific information
function getStateSpecificInfo(stateName) {
  const stateData = {
    'Maharashtra': {
      introduction: 'The Banjara community in Maharashtra has a rich historical presence, particularly in the Marathwada and Vidarbha regions.',
      communityPresence: 'With significant settlements in Mumbai, Pune, Nagpur, Aurangabad, and Nashik, the Banjara community has integrated well into Maharashtra\'s urban and semi-urban landscape.',
      uniqueFeature: 'region-specific filters for Marathwada, Vidarbha, Western Maharashtra, and Konkan areas',
      culturalNote: 'Banjara families in Maharashtra maintain distinctive Lambadi traditions while adapting to Marathi cultural influences.',
      heritageDescription: 'The Banjara (Lambadi) community has been an integral part of Maharashtra for centuries, with historical records tracing presence back to the medieval period. Known for vibrant traditional attire, unique dance forms, and strong community bonds.',
      primaryOccupations: 'transport business, construction, trade, agriculture, and increasingly in IT and service sectors',
      geographicPresence: 'The community is spread across all divisions of Maharashtra, with notable concentration in Marathwada (Aurangabad, Latur, Parbhani), Vidarbha (Nagpur, Amravati, Akola), and major metros like Mumbai and Pune.',
      majorCities: 'Mumbai, Pune, Nagpur, Aurangabad, Nashik, Solapur',
      regions: 'Marathwada, Vidarbha, Western Maharashtra, and Konkan',
      culturalPreferences: 'Families often prefer matches from similar geographic regions and gotra backgrounds. Traditional customs like dowry practices are evolving, with educated families focusing more on compatibility and values.',
      gotraInfo: 'Common gotras in Maharashtra include Rathod, Chauhan, Pawar, Jadhav, and others, with specific gotra preferences varying by region',
      professionInfo: 'Members range from traditional business owners in textile and transport to modern professionals in IT, healthcare, and corporate sectors',
      educationalInstitutions: 'University of Pune, Mumbai University, Nagpur University, and various professional colleges',
      communityEvents: 'Regular community gatherings during Diwali, Teej, and other festivals provide offline networking opportunities',
      successStoryRegions: 'Mumbai-Pune corridor, Marathwada region, and Vidarbha',
      demographicInfo: 'An estimated 800,000+ Banjara community members reside across Maharashtra, representing a significant demographic with diverse socio-economic backgrounds.',
      concentrationAreas: 'Marathwada region (particularly Aurangabad district), Nagpur division, and Mumbai Metropolitan Region',
      emergingAreas: 'Pune, Nashik, and tier-2 cities like Ahmednagar and Jalgaon',
      professionalLandscape: 'Maharashtra\'s Banjara community shows remarkable professional diversity. While many families maintain traditional businesses in transport, construction, and trade, younger generations are increasingly entering IT, healthcare, engineering, and government services.',
      trendingCareers: 'software development, digital marketing, nursing, teaching, banking, and civil services',
      educationalProfile: 'Educational attainment has risen significantly in recent decades, with over 60% of youth completing graduation and 25% pursuing post-graduate degrees.',
      topUniversities: 'Mumbai University, Pune University, VNIT Nagpur, and various medical and engineering colleges',
      culturalPractices: 'The Banjara community in Maharashtra maintains unique traditions including Lambadi folk dances (Rai dance), traditional embroidery work, and distinct marriage customs.',
      festivalCelebrations: 'Major celebrations include Teej festival (Kajari Teej), Diwali with community gatherings, and Holi with traditional songs.',
      marriagePreferences: 'Families typically prefer endogamous marriages within the Banjara community, with gotra compatibility being a key consideration. Inter-city and inter-state matches within the community are common and accepted.',
      agePreferences: 'The preferred marriage age for women is 21-26 years and for men is 25-30 years, though these are becoming more flexible.',
      modernTrends: 'increasing acceptance of love marriages within the community, working brides, and nuclear family setups',
      economicProfile: 'The economic spectrum ranges from middle-class families engaged in small businesses to upper-middle-class professionals and established business owners in urban centers. Average family income varies from ₹5 lakhs to ₹25 lakhs annually.'
    },
    'Karnataka': {
      introduction: 'Karnataka hosts a vibrant Banjara community, especially in the northern districts and Bengaluru metropolitan area.',
      communityPresence: 'Significant Banjara populations exist in Bengaluru, Mysuru, Belagavi, Kalaburagi, and Ballari districts.',
      uniqueFeature: 'bilingual support for Kannada and Lambadi languages, with filters for North Karnataka and South Karnataka preferences',
      culturalNote: 'The community in Karnataka has unique cultural adaptations, blending Lambadi traditions with Karnataka\'s rich cultural heritage.',
      heritageDescription: 'Karnataka\'s Banjara community, locally called Lambani or Lambadi, has deep historical roots especially in North Karnataka districts. The community is renowned for intricate embroidery work, colorful traditional dress, and vibrant folk culture.',
      primaryOccupations: 'agriculture, animal husbandry, construction labor, small-scale business, and tech industry in Bengaluru',
      geographicPresence: 'Major presence in Kalaburagi (Gulbarga), Vijayapura (Bijapur), Belagavi, Ballari (Bellary), Raichur, and Bengaluru urban areas.',
      majorCities: 'Bengaluru, Mysuru, Kalaburagi, Belagavi, Ballari, Hubballi',
      regions: 'North Karnataka (Hyderabad-Karnataka), Central Karnataka, and Bengaluru region',
      culturalPreferences: 'North Karnataka families often prefer matches from the same region due to dialect similarities. Traditional tanda (settlement) affiliations still influence match preferences.',
      gotraInfo: 'Prominent gotras include Rathod, Bhukya, Banoth, Vadthiya, with North Karnataka having distinct gotra lineages',
      professionInfo: 'Diverse range from agricultural workers and construction entrepreneurs to IT professionals in Bengaluru\'s tech corridor',
      educationalInstitutions: 'Bengaluru University, Mysore University, Karnataka State Open University, IITs, and engineering colleges',
      communityEvents: 'Annual Lambani Jatre, community sammelans, and cultural programs during major festivals',
      successStoryRegions: 'Bengaluru tech community, Kalaburagi-Bijapur belt, and Mysuru',
      demographicInfo: 'Approximately 600,000 Banjara/Lambani community members live across Karnataka, with 40% in North Karnataka districts.',
      concentrationAreas: 'Kalaburagi, Vijayapura, and Ballari districts form the heartland, with significant urban migration to Bengaluru',
      emergingAreas: 'Bengaluru suburbs, Mysuru, and growing settlements in Hassan and Tumakuru districts',
      professionalLandscape: 'Karnataka shows a stark urban-rural divide. Rural areas maintain traditional livelihoods while urban centers, especially Bengaluru, have a booming professional class working in IT, BPO, healthcare, and hospitality sectors.',
      trendingCareers: 'IT and software testing, BPO operations, hotel management, nursing, and e-commerce',
      educationalProfile: 'Educational outcomes vary significantly between North Karnataka (lower literacy) and Bengaluru region (high literacy). Urban youth increasingly pursue professional degrees.',
      topUniversities: 'Bengaluru\'s numerous engineering colleges, Mysore University, Karnataka State Law University, and medical colleges',
      culturalPractices: 'Distinctive Lambani embroidery (renowned globally), Gorbandh dance, and unique wedding rituals that last 3-5 days with elaborate ceremonies.',
      festivalCelebrations: 'Ugadi (Kannada New Year), Deepavali, and special Tanda-level festivals celebrating harvest and community bonds.',
      marriagePreferences: 'Strong preference for matches from the same Tanda background initially, but increasingly open to inter-district and inter-state matches within the community.',
      agePreferences: 'Marriage age is slightly lower than national average: women 20-25, men 23-28, especially in rural areas.',
      modernTrends: 'growing acceptance of inter-gotra marriages, delayed marriages for higher education, and matches based on career compatibility',
      economicProfile: 'Economic diversity is significant - from daily wage laborers to successful IT professionals earning ₹20+ LPA. Traditional landholding families in North Karnataka form the middle class.'
    },
    'Telangana': {
      introduction: 'Telangana has one of the largest and most organized Banjara communities in India, with strong cultural institutions and community networks.',
      communityPresence: 'The community is well-established in Hyderabad, Karimnagar, Warangal, Nizamabad, Adilabad, and Khammam districts.',
      uniqueFeature: 'exclusive Telangana gotra networks, Hyderabad metro area preferences, and connections with community welfare associations',
      culturalNote: 'Telangana\'s Banjara community is politically active and well-organized, maintaining strong cultural identity while being highly urbanized.',
      heritageDescription: 'The Banjara community in Telangana, historically known as Lambada or Sugali, has been present since the Nizam era. The community played a significant role in the state\'s formation and maintains active political representation.',
      primaryOccupations: 'construction contracting, transport business, rice milling, poultry farming, and service sector jobs in Hyderabad',
      geographicPresence: 'Extensive presence across all districts, with major Tandas (settlements) in erstwhile Medak, Karimnagar, Warangal, and Adilabad districts. Urban migration to Hyderabad is significant.',
      majorCities: 'Hyderabad/Secunderabad, Warangal, Karimnagar, Nizamabad, Khammam, Adilabad',
      regions: 'Greater Hyderabad, Telangana, Northern Telangana, and Southern Telangana',
      culturalPreferences: 'Strong Tanda-based identity with preferences for matches from similar socio-economic backgrounds. Telangana families often prefer Telugu-speaking matches.',
      gotraInfo: 'Major gotras include Bhukya, Banoth, Vadthiya, Rathod, Lavudya, Kumbam, with specific gotra concentrations in different districts',
      professionInfo: 'From traditional contractors and transporters to modern professionals in Hyderabad\'s IT, pharma, and service industries',
      educationalInstitutions: 'Osmania University, JNTU Hyderabad, Kakatiya University, and numerous engineering and degree colleges',
      communityEvents: 'Large-scale Lambada community sammelans, Teej Utsav, and political rallies fostering community networking',
      successStoryRegions: 'Hyderabad Hi-Tech City, Warangal-Karimnagar belt, and Northern Telangana',
      demographicInfo: 'Over 1.2 million Banjara community members reside in Telangana, making it one of the largest concentrations in India. The community has Schedule Tribe status, providing certain reservations.',
      concentrationAreas: 'Karimnagar, Warangal, Adilabad, and Nizamabad districts, plus significant urban populations in Hyderabad',
      emergingAreas: 'Hyderabad suburbs (Kompally, Alwal, Quthbullapur), Warangal urban areas, and newly developed regions',
      professionalLandscape: 'Telangana\'s community shows remarkable economic mobility. Traditional businesses like transport, construction, and rice mills remain strong, while youth increasingly enter IT, pharma, banking, and government services.',
      trendingCareers: 'software development, pharmaceutical industry, banking sector, teaching, nursing, and civil services (thanks to ST reservations)',
      educationalProfile: 'Rising educational attainment with 55%+ graduation rates among urban youth. Government residential schools have played a key role in educational upliftment.',
      topUniversities: 'Osmania University, JNTU, Kakatiya University, and various government residential degree colleges',
      culturalPractices: 'The Telangana Lambada community maintains vibrant traditions including Bathukamma celebrations (unique to Telangana), traditional Gorbandh dance, and elaborate wedding customs spanning a week.',
      festivalCelebrations: 'Bathukamma, Bonalu, Sammakka Saralamma Jatara (huge tribal festival), Teej, and Diwali with community feasts.',
      marriagePreferences: 'While Tanda affiliations remain important, there\'s increasing openness to inter-district matches. Economic status and education are becoming more important than geographic origin.',
      agePreferences: 'Urban areas: women 22-27, men 25-30. Rural areas: slightly younger, women 20-25, men 23-28.',
      modernTrends: 'significant rise in inter-gotra marriages, professional women seeking career-oriented matches, and acceptance of nuclear family living',
      economicProfile: 'Wide economic spectrum from Below Poverty Line families in rural areas to affluent business owners and professionals in Hyderabad earning ₹30-40 LPA. The community has benefited from ST welfare schemes.'
    },
    'Andhra Pradesh': {
      introduction: 'Andhra Pradesh has a well-established Banjara community with strong presence in Rayalaseema and coastal regions.',
      communityPresence: 'Significant populations in Anantapur, Kurnool, Kadapa, Chittoor, Prakasam, and Krishna districts.',
      uniqueFeature: 'separate filters for Rayalaseema, Coastal Andhra, and North Andhra regions with Telugu language support',
      culturalNote: 'AP\'s Banjara community balances traditional Lambadi culture with Telugu linguistic and cultural integration.',
      heritageDescription: 'The Banjara (Sugali/Lambada) community in Andhra Pradesh has historical presence dating back several centuries, particularly in the Rayalaseema region. Known for semi-nomadic trading heritage and gradual settlement into agriculture.',
      primaryOccupations: 'agriculture, livestock rearing, small-scale mining, construction business, and service sector in urban areas',
      geographicPresence: 'Predominantly in Rayalaseema districts (Anantapur, Kurnool, Kadapa), with growing presence in Coastal Andhra cities like Vijayawada and Guntur.',
      majorCities: 'Anantapur, Kurnool, Kadapa, Tirupati, Vijayawada, Guntur',
      regions: 'Rayalaseema, Coastal Andhra, and North Andhra',
      culturalPreferences: 'Strong regional preferences with Rayalaseema families preferring local matches. Coastal Andhra community is more cosmopolitan.',
      gotraInfo: 'Common gotras include Rathod, Bhukya, Vadthiya, Banoth, Naik, with regional variations in gotra prevalence',
      professionInfo: 'Mix of agricultural families, construction contractors, transporters, and emerging professional class in IT and healthcare',
      educationalInstitutions: 'Sri Venkateswara University (Tirupati), Dravidian University (Kuppam), and numerous regional engineering colleges',
      communityEvents: 'District-level community gatherings, Teej celebrations, and annual sammelans in Kurnool and Anantapur',
      successStoryRegions: 'Anantapur-Kurnool belt, Tirupati, and Coastal Andhra cities',
      demographicInfo: 'Approximately 500,000 Banjara community members in Andhra Pradesh, concentrated in Rayalaseema. The community has Scheduled Tribe status.',
      concentrationAreas: 'Anantapur district (largest), Kurnool, Kadapa, and scattered Tandas in Prakasam and Nellore',
      emergingAreas: 'Vijayawada, Guntur, Tirupati, and newly irrigated areas in Rayalaseema',
      professionalLandscape: 'Predominantly agrarian in Rayalaseema with traditional occupations. Urban migration has created a professional class in Vijayawada, Guntur, and Tirupati working in varied sectors.',
      trendingCareers: 'agricultural entrepreneurship, construction management, teaching (via ST reservations), nursing, and small business ownership',
      educationalProfile: 'Educational levels improving but lower than Telangana. Government welfare schemes and residential schools have increased literacy and graduation rates to around 50% among youth.',
      topUniversities: 'Tirupati University, Dravidian University, local engineering colleges, and government residential schools',
      culturalPractices: 'Unique blend of Lambadi and Telugu customs. Traditional Gorband dance, elaborate wedding ceremonies, and strong joint family systems. The community maintains Tanda councils for dispute resolution.',
      festivalCelebrations: 'Ugadi, Teej, Diwali, and local Jataras (temple festivals). Participation in mainstream Telugu festivals is common.',
      marriagePreferences: 'Strong preference for matches within Rayalaseema region initially. Gotra matching is strict. Families emphasize agricultural land ownership and family reputation.',
      agePreferences: 'Traditional age preferences: women 19-24, men 22-27, though urban areas show increasing age of marriage.',
      modernTrends: 'slowly increasing acceptance of inter-district matches, professional brides, and education-based compatibility over pure economic considerations',
      economicProfile: 'Primarily middle-class with agricultural land ownership. Income ranges from ₹3-15 lakhs annually for farming families. Urban professionals and contractors earn ₹5-25 lakhs. Limited extreme wealth but stable middle-class majority.'
    }
  };

  // Return state-specific data or default
  return stateData[stateName] || {
    introduction: 'The Banjara community in this state maintains its rich cultural heritage while embracing modern lifestyles and education.',
    communityPresence: 'Our community members are spread across urban and rural areas, maintaining strong cultural ties.',
    uniqueFeature: 'comprehensive search filters including gotra, profession, education, and location preferences',
    culturalNote: 'We maintain traditional Banjara values while adapting to contemporary matrimonial preferences.',
    heritageDescription: 'The Banjara community has a rich nomadic heritage, known for vibrant culture, strong family values, and entrepreneurial spirit.',
    primaryOccupations: 'business, agriculture, government services, and professional careers',
    geographicPresence: 'The community is present in major cities and towns across the state.',
    majorCities: 'major urban centers and district headquarters',
    regions: 'all districts',
    culturalPreferences: 'Traditional customs are valued alongside modern compatibility factors.',
    gotraInfo: 'Various gotras with specific preferences based on family traditions',
    professionInfo: 'Members from diverse professional backgrounds including business, services, and traditional occupations',
    educationalInstitutions: 'state and national universities',
    communityEvents: 'Regular community gatherings and cultural celebrations',
    successStoryRegions: 'across various cities and towns',
    demographicInfo: 'A vibrant Banjara community presence exists across the state.',
    concentrationAreas: 'major cities and traditional settlement areas',
    emergingAreas: 'urban centers and developing regions',
    professionalLandscape: 'The community shows diverse professional engagement from traditional businesses to modern careers.',
    trendingCareers: 'IT, healthcare, education, business, and government services',
    educationalProfile: 'Increasing emphasis on higher education with growing graduation rates.',
    topUniversities: 'various state and central universities',
    culturalPractices: 'Traditional Banjara customs including folk dances, festivals, and marriage rituals are maintained.',
    festivalCelebrations: 'Major festivals are celebrated with traditional fervor and community participation.',
    marriagePreferences: 'Families prefer matches within the community with compatible backgrounds.',
    agePreferences: 'Marriage age varies by family preference and educational aspirations.',
    modernTrends: 'growing acceptance of educated working brides and career-focused matches',
    economicProfile: 'Diverse economic backgrounds ranging from middle-class to affluent families.'
  };
}
