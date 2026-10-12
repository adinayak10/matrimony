const mongoose = require('mongoose');

const CityRegionalPageSchema = new mongoose.Schema({
  // City reference - REQUIRED
  city: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'City', 
    required: true,
    unique: true // One page per city
  },
  
  // State reference for hierarchy
  state: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'State', 
    required: true
  },
  
  // SEO Fields
  slug: { 
    type: String, 
    unique: true,
    index: true
  },
  metaTitle: String,
  metaDescription: String,
  metaKeywords: [String],
  canonicalUrl: String,
  
  // Hero Section - Dynamic titles
  heroSection: {
    title: String, // e.g., "Find Your Perfect Banjara Match in ${city}"
    subtitle: String, // e.g., "Join ${stats.totalMembers}+ verified Banjara brides & grooms in ${city}, ${state}"
    backgroundImage: String,
    ctaText: { type: String, default: 'Register Free' },
    tagline: String, // Additional dynamic tagline
    highlights: [String] // Multiple dynamic highlight points
  },
  
  // Introduction Section - Unique per city
  introSection: {
    heading: String, // e.g., "Welcome to Banjara Matrimony in ${city}"
    subheading: String, // e.g., "Connecting Hearts in ${city} Since 2020"
    content: String, // Long-form dynamic content
    highlightText: String,
    features: [String], // List of unique features
    callout: String // Special callout text
  },
  
  // City Stats (auto-calculated)
  stats: {
    totalMembers: { type: Number, default: 0 },
    activeBrides: { type: Number, default: 0 },
    activeGrooms: { type: Number, default: 0 },
    successStories: { type: Number, default: 0 },
    verifiedProfiles: { type: Number, default: 0 },
    lastUpdated: Date
  },
  
  // Stats Display Section - Dynamic headings
  statsSection: {
    heading: String, // e.g., "Banjara Matrimony Success in ${city}"
    subheading: String, // e.g., "Real numbers, real connections in ${city}"
    showStats: { type: Boolean, default: true },
    customStatsLabels: {
      totalMembersLabel: String,
      activeBridesLabel: String,
      activeGroomsLabel: String,
      successStoriesLabel: String
    }
  },
  
  // About Section - City-specific unique content
  aboutSection: {
    heading: String, // e.g., "About Banjara Community in ${city}"
    subheading: String, // e.g., "${city}'s Thriving Banjara Heritage"
    content: String, // Rich unique content
    points: [String], // Dynamic bullet points
    culturalNote: String, // Unique cultural information
    heritageInfo: String, // Heritage-specific content
    modernContext: String // Modern community context
  },
  
  // Why Choose Section - Dynamic per city
  whyChooseSection: {
    heading: String, // e.g., "Why ${city} Families Trust BanjaraMatch"
    subheading: String, // e.g., "Leading Matrimony Platform in ${city}"
    points: [{
      icon: String,
      title: String, // e.g., "Verified Profiles in ${city}"
      description: String, // e.g., "Every profile in ${city} is verified"
      order: Number,
      highlight: String // Additional highlight text
    }]
  },
  
  // Success Stories Section - City-specific
  successStoriesSection: {
    heading: String, // e.g., "Love Stories from ${city}"
    subheading: String, // e.g., "Real couples, real happiness in ${city}"
    showTestimonials: { type: Boolean, default: true },
    introText: String, // Introduction to success stories
    callToAction: String // CTA for success stories section
  },
  
  // How It Works Section - City-contextualized
  howItWorksSection: {
    heading: String, // e.g., "Find Your Match in ${city} - Simple Steps"
    subheading: String, // e.g., "Join thousands of ${city} Banjara singles"
    steps: [{
      stepNumber: Number,
      icon: String,
      title: String, // e.g., "Register in ${city}"
      description: String, // e.g., "Join ${city}'s growing Banjara community"
      order: Number,
      additionalInfo: String // Extra context per step
    }]
  },
  
  // Community Insights Section - Dynamic data
  communityInsightsSection: {
    heading: String, // e.g., "Banjara Community Insights in ${city}"
    subheading: String, // e.g., "Understanding ${city}'s Banjara Demographics"
    showInsights: { type: Boolean, default: true },
    introduction: String, // Intro about community in city
    ageDistribution: String, // Age demographic info
    professionalLandscape: String, // Professional insights
    educationalProfile: String // Education insights
  },
  
  // Localities Section - Unique to each city
  localitiesSection: {
    heading: String, // e.g., "Popular Banjara Localities in ${city}"
    subheading: String, // e.g., "Connect with matches near you in ${city}"
    showLocalities: { type: Boolean, default: true },
    introduction: String // Introduction to localities
  },
  
  // Nearby Cities Section - Dynamic connections
  nearbyCitiesSection: {
    heading: String, // e.g., "Expand Your Search Beyond ${city}"
    subheading: String, // e.g., "Explore Banjara matches in cities near ${city}"
    showNearbyCities: { type: Boolean, default: true },
    description: String // Description of nearby cities
  },
  
  // FAQ Section - Dynamic FAQs
  faqSection: {
    heading: String, // e.g., "Frequently Asked Questions - ${city}"
    subheading: String, // e.g., "Everything about Banjara matrimony in ${city}"
    showFaq: { type: Boolean, default: true },
    faqs: [{
      question: String, // e.g., "How many Banjara profiles are in ${city}?"
      answer: String, // e.g., "We have ${stats.totalMembers}+ verified profiles in ${city}"
      order: Number,
      category: String // FAQ category
    }]
  },
  
  // CTA Section - Dynamic call-to-action
  ctaSection: {
    heading: String, // e.g., "Ready to Find Your Match in ${city}?"
    subheading: String, // e.g., "Join ${stats.totalMembers}+ ${city} members today"
    primaryButtonText: String,
    secondaryButtonText: String,
    benefits: [String], // List of benefits
    urgencyText: String // Urgency message
  },
  
  // Popular Localities in the city - Enhanced
  popularLocalities: [{
    name: String,
    activeMembers: Number,
    description: String, // e.g., "Premium area in ${city}"
    features: [String], // Unique features of locality
    connectivity: String // Transportation/connectivity info
  }],
  
  // Nearby cities for internal linking
  nearbyCities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City'
  }],
  
  // Community Insights Data - Comprehensive
  communityInsights: {
    topProfessions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profession'
    }],
    popularGotras: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gotra'
    }],
    popularCastes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Caste'
    }],
    topQualifications: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Qualification'
    }],
    description: String, // e.g., "Professional diversity in ${city}"
    ageRange: String, // e.g., "Most ${city} members are 25-35"
    educationLevel: String, // e.g., "High education standards in ${city}"
    incomeRange: String, // Income demographics
    maritalStatusDist: String, // Marital status distribution
    religiousPractices: String, // Religious practices info
    languagesSpoken: [String], // Languages commonly spoken
    culturalEvents: [String] // Cultural events in city
  },
  
  // Featured members
  featuredMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Banner images
  bannerImages: [{
    url: String,
    alt: String, // e.g., "Banjara matrimony in ${city}"
    title: String, // e.g., "${city} Banjara community"
    order: Number,
    caption: String // Image caption
  }],
  
  // City-Specific Content Blocks (for uniqueness)
  customContentBlocks: [{
    blockType: String, // 'text', 'image', 'video', 'testimonial', 'stats'
    title: String, // e.g., "Why ${city} Chooses Us"
    content: String, // Dynamic content with placeholders
    order: Number,
    metadata: mongoose.Schema.Types.Mixed // Flexible additional data
  }],
  
  // City Demographics (matrimony-relevant data points)
  cityDemographics: {
    banjaraPopulation: String, // Estimated Banjara population in city
    educationalInstitutions: [String], // Top educational institutions (relevant for educated matches)
    culturalLandmarks: [String], // Cultural places where community gathers
    economicProfile: String, // Economic profile of Banjara community
    transportConnectivity: String, // Transport connectivity for meeting matches
    festivalsSpan: [String] // Cultural festivals celebrated by community
  },
  
  // SEO: Link to parent state page
  statePage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StateRegionalPage'
  },
  
  // Status
  isActive: { type: Boolean, default: true },
  isPublished: { type: Boolean, default: false },
  
  // Tracking
  views: { type: Number, default: 0 },
  registrationsFromPage: { type: Number, default: 0 },
  lastStatsUpdate: Date,
  
  // Audit
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Auto-generate slug and SEO fields
CityRegionalPageSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('city')) {
    const City = mongoose.model('City');
    const State = mongoose.model('State');
    
    const city = await City.findById(this.city).populate('state');
    if (city) {
      const stateName = city.state?.name || (await State.findById(this.state))?.name;
      
      // Auto-generate slug
      if (!this.slug) {
        this.slug = `banjara-matrimony-${city.name.toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      // Auto-generate meta title
      if (!this.metaTitle) {
        this.metaTitle = `Banjara Matrimony in ${city.name}, ${stateName} | Find Lambadi Brides & Grooms`;
      }
      
      // Auto-generate meta description
      if (!this.metaDescription) {
        this.metaDescription = `Find verified Banjara brides and grooms in ${city.name}, ${stateName}. Join ${this.stats?.totalMembers || '1000+'}+ members. Trusted Lambadi matrimony platform.`;
      }
      
      // Set canonical URL
      if (!this.canonicalUrl) {
        this.canonicalUrl = `https://www.banjaramatch.com/${this.slug}`;
      }
    }
  }
  next();
});

// Indexes for performance
CityRegionalPageSchema.index({ city: 1 }, { unique: true });
CityRegionalPageSchema.index({ state: 1 });
CityRegionalPageSchema.index({ slug: 1 }, { unique: true });
CityRegionalPageSchema.index({ isActive: 1, isPublished: 1 });
CityRegionalPageSchema.index({ 'stats.totalMembers': -1 });

module.exports = mongoose.model('CityRegionalPage', CityRegionalPageSchema);
