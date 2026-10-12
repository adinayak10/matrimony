const mongoose = require('mongoose');

const StateRegionalPageSchema = new mongoose.Schema({
  // State reference - REQUIRED
  state: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'State', 
    required: true,
    unique: true // One page per state
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
  
  // Hero Section - Dynamic
  heroSection: {
    title: String, // e.g., "Find Your Perfect Banjara Match in ${state}"
    subtitle: String, // e.g., "Join ${stats.totalMembers}+ verified Banjara brides & grooms across ${state}"
    backgroundImage: String,
    ctaText: { type: String, default: 'Register Free' },
    tagline: String, // Additional dynamic tagline
    highlights: [String] // Multiple dynamic highlight points
  },
  
  // Introduction Section - State-specific
  introSection: {
    heading: String, // e.g., "Welcome to Banjara Matrimony in ${state}"
    subheading: String, // e.g., "Connecting Hearts Across ${state}"
    content: String, // Long-form dynamic content
    highlightText: String,
    features: [String], // List of unique state features
    callout: String, // Special callout text
    coverage: String // Geographic coverage info
  },
  
  // State-wide Stats (aggregated)
  stats: {
    totalMembers: { type: Number, default: 0 },
    activeBrides: { type: Number, default: 0 },
    activeGrooms: { type: Number, default: 0 },
    successStories: { type: Number, default: 0 },
    verifiedProfiles: { type: Number, default: 0 },
    totalCities: { type: Number, default: 0 },
    lastUpdated: Date
  },
  
  // Stats Display Section - Dynamic state stats
  statsSection: {
    heading: String, // e.g., "Banjara Matrimony Success Across ${state}"
    subheading: String, // e.g., "Connecting families in ${stats.totalCities}+ cities in ${state}"
    showStats: { type: Boolean, default: true },
    customStatsLabels: {
      totalMembersLabel: String,
      activeBridesLabel: String,
      activeGroomsLabel: String,
      successStoriesLabel: String,
      totalCitiesLabel: String
    },
    additionalStats: [{
      label: String,
      value: String,
      icon: String
    }]
  },
  
  // About Section - State-specific heritage
  aboutSection: {
    heading: String, // e.g., "About Banjara Community in ${state}"
    subheading: String, // e.g., "${state}'s Rich Banjara Heritage"
    content: String, // Rich unique content
    points: [String], // Dynamic bullet points
    culturalNote: String, // Unique cultural information
    heritageInfo: String, // Heritage-specific content
    modernContext: String, // Modern community context
    historicalPresence: String, // Historical context
    regionalVariations: String // Regional variations within state
  },
  
  // Why Choose Section - State-focused
  whyChooseSection: {
    heading: String, // e.g., "Why ${state} Families Trust BanjaraMatch"
    subheading: String, // e.g., "Leading Matrimony Platform Across ${state}"
    points: [{
      icon: String,
      title: String, // e.g., "Verified Profiles Across ${state}"
      description: String, // e.g., "Profiles from all major cities in ${state}"
      order: Number,
      highlight: String, // Additional highlight text
      statistic: String // Supporting statistic
    }]
  },
  
  // Success Stories Section - State-wide
  successStoriesSection: {
    heading: String, // e.g., "Love Stories from Across ${state}"
    subheading: String, // e.g., "Real couples, real happiness in ${state}"
    showTestimonials: { type: Boolean, default: true },
    introText: String, // Introduction to success stories
    callToAction: String, // CTA for success stories section
    regionalHighlights: [String] // Regional success highlights
  },
  
  // How It Works Section - State-contextualized
  howItWorksSection: {
    heading: String, // e.g., "Find Your Match Across ${state} - Simple Steps"
    subheading: String, // e.g., "Join thousands of ${state} Banjara singles"
    steps: [{
      stepNumber: Number,
      icon: String,
      title: String, // e.g., "Register from Anywhere in ${state}"
      description: String, // e.g., "Join ${state}'s largest Banjara community"
      order: Number,
      additionalInfo: String, // Extra context per step
      cityExamples: [String] // Example cities
    }]
  },
  
  // Community Insights Section - State-level data
  communityInsightsSection: {
    heading: String, // e.g., "Banjara Community Insights Across ${state}"
    subheading: String, // e.g., "Understanding ${state}'s Banjara Demographics"
    showInsights: { type: Boolean, default: true },
    introduction: String, // Intro about community in state
    ageDistribution: String, // Age demographic info
    professionalLandscape: String, // Professional insights
    educationalProfile: String, // Education insights
    geographicDistribution: String, // Where community is concentrated
    migrationPatterns: String // Migration trends
  },
  
  // Cities Section (replaces localities) - Dynamic
  citiesSection: {
    heading: String, // e.g., "Major Cities in ${state} with Banjara Community"
    subheading: String, // e.g., "Connect with matches from ${stats.totalCities}+ cities"
    showCities: { type: Boolean, default: true },
    introduction: String, // Introduction to cities
    featuredCitiesText: String // Text about featured cities
  },
  
  // FAQ Section - State-specific
  faqSection: {
    heading: String, // e.g., "Frequently Asked Questions - ${state}"
    subheading: String, // e.g., "Everything about Banjara matrimony in ${state}"
    showFaq: { type: Boolean, default: true },
    faqs: [{
      question: String, // e.g., "How many cities in ${state} are covered?"
      answer: String, // e.g., "We cover ${stats.totalCities}+ cities across ${state}"
      order: Number,
      category: String, // FAQ category
      relevantCities: [String] // Relevant cities for this FAQ
    }]
  },
  
  // CTA Section - State-wide appeal
  ctaSection: {
    heading: String, // e.g., "Ready to Find Your Match in ${state}?"
    subheading: String, // e.g., "Join ${stats.totalMembers}+ members across ${state}"
    primaryButtonText: String,
    secondaryButtonText: String,
    benefits: [String], // List of benefits
    urgencyText: String, // Urgency message
    statewideCoverage: String // Coverage message
  },
  
  // Top cities with pages (for internal linking) - Enhanced
  topCities: [{
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'City'
    },
    cityPage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CityRegionalPage'
    },
    memberCount: Number,
    description: String, // e.g., "Capital city with diverse community"
    highlights: [String], // City-specific highlights
    ranking: Number // City ranking by members
  }],
  
  // Community Insights Data (state-level aggregation) - Comprehensive
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
    description: String, // e.g., "Professional diversity across ${state}"
    ageRange: String, // e.g., "Most ${state} members are 25-35"
    educationLevel: String, // e.g., "High education standards in ${state}"
    incomeRange: String, // Income demographics
    maritalStatusDist: String, // Marital status distribution
    religiousPractices: String, // Religious practices info
    languagesSpoken: [String], // Languages commonly spoken
    culturalEvents: [String], // Cultural events in state
    regionalDifferences: String // Regional variations
  },
  
  // State-Specific Information (region-wise customization) - Expanded
  stateInfo: {
    introduction: String, // e.g., "${state} - A Land of Opportunities"
    communityPresence: String, // Community presence description
    uniqueFeature: String, // Unique feature of state
    memberCount: String, // Member count description
    culturalNote: String, // Cultural note
    heritageDescription: String, // Heritage description
    primaryOccupations: String, // Primary occupations
    geographicPresence: String, // Geographic presence
    majorCities: String, // Major cities description
    regions: String, // Regions description
    culturalPreferences: String, // Cultural preferences
    gotraInfo: String, // Gotra information
    professionInfo: String, // Profession information
    educationalInstitutions: String, // Educational institutions
    verificationNote: String, // Verification note
    communityEvents: String, // Community events
    successMetric: String, // Success metrics
    successStoryRegions: String, // Success story regions
    demographicInfo: String, // Demographic info
    concentrationAreas: String, // Concentration areas
    emergingAreas: String, // Emerging areas
    professionalLandscape: String, // Professional landscape
    trendingCareers: String, // Trending careers
    educationalProfile: String, // Educational profile
    topUniversities: String, // Top universities
    culturalPractices: String, // Cultural practices
    festivalCelebrations: String, // Festival celebrations
    marriagePreferences: String, // Marriage preferences
    agePreferences: String, // Age preferences
    modernTrends: String, // Modern trends
    economicProfile: String, // Economic profile relevant to matrimony
    languageProfile: String, // Languages spoken in community
    religiousHarmony: String, // Religious harmony in community
    socialStructure: String, // Social structure relevant to matrimony
    migrationHistory: String // Migration history of community
  },
  
  // Featured members from across the state
  featuredMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Banner images
  bannerImages: [{
    url: String,
    alt: String, // e.g., "Banjara matrimony in ${state}"
    title: String, // e.g., "${state} Banjara community"
    order: Number,
    caption: String // Image caption
  }],
  
  // State-Specific Content Blocks (for uniqueness)
  customContentBlocks: [{
    blockType: String, // 'text', 'image', 'video', 'testimonial', 'stats', 'map'
    title: String, // e.g., "Why ${state} Chooses Us"
    content: String, // Dynamic content with placeholders
    order: Number,
    metadata: mongoose.Schema.Types.Mixed // Flexible additional data
  }],
  
  // State Demographics (matrimony-relevant data points)
  stateDemographics: {
    banjaraPopulation: String, // Estimated Banjara population in state
    educationalInstitutions: [String], // Top educational institutions (relevant for educated matches)
    culturalLandmarks: [String], // Cultural places where community gathers
    economicProfile: String, // Economic profile of Banjara community
    transportConnectivity: String, // Transport connectivity for meeting matches
    festivalsSpan: [String] // Cultural festivals celebrated by community
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
StateRegionalPageSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('state')) {
    const State = mongoose.model('State');
    
    const state = await State.findById(this.state);
    if (state) {
      // Auto-generate slug
      if (!this.slug) {
        this.slug = `banjara-matrimony-${state.name.toLowerCase().replace(/\s+/g, '-')}`;
      }
      
      // Auto-generate meta title
      if (!this.metaTitle) {
        this.metaTitle = `Banjara Matrimony in ${state.name} | Find Lambadi Brides & Grooms Across ${state.name}`;
      }
      
      // Auto-generate meta description
      if (!this.metaDescription) {
        this.metaDescription = `Find verified Banjara brides and grooms across ${state.name}. Join ${this.stats?.totalMembers || '5000+'}+ members. Trusted Lambadi matrimony platform with genuine profiles from all cities.`;
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
StateRegionalPageSchema.index({ state: 1 }, { unique: true });
StateRegionalPageSchema.index({ slug: 1 }, { unique: true });
StateRegionalPageSchema.index({ isActive: 1, isPublished: 1 });
StateRegionalPageSchema.index({ 'stats.totalMembers': -1 });

module.exports = mongoose.model('StateRegionalPage', StateRegionalPageSchema);
