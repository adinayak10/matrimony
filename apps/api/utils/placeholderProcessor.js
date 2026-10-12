/**
 * Placeholder Processor Utility
 * Handles dynamic placeholder replacement for regional pages
 * Supports ${city}, ${state}, ${stats.*} and other dynamic values
 */

/**
 * Process placeholders in a string
 * @param {string} template - Template string with placeholders like ${city}, ${state}
 * @param {object} data - Data object containing values for replacement
 * @returns {string} - Processed string with replaced values
 */
const processPlaceholders = (template, data) => {
  if (!template || typeof template !== 'string') return template;
  
  return template.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined && value !== null ? value : match;
  });
};

/**
 * Get nested value from object using dot notation
 * @param {object} obj - Object to search
 * @param {string} path - Dot-notation path (e.g., 'stats.totalMembers')
 * @returns {*} - Value at path or undefined
 */
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

/**
 * Process placeholders in an object recursively
 * @param {object|array|string} obj - Object/array/string to process
 * @param {object} data - Data for placeholder replacement
 * @returns {*} - Processed object with replaced placeholders
 */
const processObjectPlaceholders = (obj, data) => {
  if (typeof obj === 'string') {
    return processPlaceholders(obj, data);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => processObjectPlaceholders(item, data));
  }
  
  if (obj && typeof obj === 'object') {
    const processed = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        processed[key] = processObjectPlaceholders(obj[key], data);
      }
    }
    return processed;
  }
  
  return obj;
};

/**
 * Prepare data context for placeholder replacement (City Page)
 * @param {object} cityPage - City page document
 * @param {object} cityDoc - City document (populated)
 * @param {object} stateDoc - State document (populated)
 * @returns {object} - Data context for replacement
 */
const prepareCityDataContext = (cityPage, cityDoc, stateDoc) => {
  return {
    city: cityDoc?.name || '',
    state: stateDoc?.name || '',
    cityName: cityDoc?.name || '',
    stateName: stateDoc?.name || '',
    stats: {
      totalMembers: cityPage?.stats?.totalMembers || 0,
      activeBrides: cityPage?.stats?.activeBrides || 0,
      activeGrooms: cityPage?.stats?.activeGrooms || 0,
      successStories: cityPage?.stats?.successStories || 0,
      verifiedProfiles: cityPage?.stats?.verifiedProfiles || 0
    },
    slug: cityPage?.slug || '',
    url: cityPage?.canonicalUrl || ''
  };
};

/**
 * Prepare data context for placeholder replacement (State Page)
 * @param {object} statePage - State page document
 * @param {object} stateDoc - State document (populated)
 * @returns {object} - Data context for replacement
 */
const prepareStateDataContext = (statePage, stateDoc) => {
  return {
    state: stateDoc?.name || '',
    stateName: stateDoc?.name || '',
    stats: {
      totalMembers: statePage?.stats?.totalMembers || 0,
      activeBrides: statePage?.stats?.activeBrides || 0,
      activeGrooms: statePage?.stats?.activeGrooms || 0,
      successStories: statePage?.stats?.successStories || 0,
      verifiedProfiles: statePage?.stats?.verifiedProfiles || 0,
      totalCities: statePage?.stats?.totalCities || 0
    },
    slug: statePage?.slug || '',
    url: statePage?.canonicalUrl || ''
  };
};

/**
 * Store data with placeholders (for database storage)
 * This function ensures data is stored as-is with placeholders intact
 * @param {*} data - Data to store
 * @returns {*} - Data as-is (no processing)
 */
const storeWithPlaceholders = (data) => {
  // Simply return data as-is for storage
  // Placeholders like ${city} will be stored in DB
  return data;
};

/**
 * Retrieve and process data from database
 * This function processes placeholders when retrieving from DB
 * @param {object} pageData - Page data from database
 * @param {object} context - Context data for replacement
 * @returns {object} - Processed page data
 */
const retrieveAndProcess = (pageData, context) => {
  return processObjectPlaceholders(pageData, context);
};

/**
 * Generate default prefill templates with placeholders for City Page
 * @param {string} cityName - City name (for non-placeholder fields)
 * @param {string} stateName - State name (for non-placeholder fields)
 * @returns {object} - Prefill data with placeholders
 */
const generateCityPrefillTemplate = (cityName, stateName) => {
  return {
    heroSection: {
      title: 'Find Your Perfect Banjara Match in ${city}',
      subtitle: 'Join ${stats.totalMembers}+ verified Banjara brides & grooms in ${city}, ${state}',
      tagline: 'Trusted by families across ${city}',
      highlights: [
        'Verified profiles from ${city}',
        '${stats.totalMembers}+ active members',
        '${stats.successStories}+ successful matches'
      ]
    },
    introSection: {
      heading: 'Welcome to Banjara Matrimony in ${city}',
      subheading: '${city}\'s Most Trusted Banjara Matchmaking Platform',
      content: 'Connect with verified Banjara profiles from ${city}, ${state}. Join our growing community of ${stats.totalMembers}+ members looking for their perfect match in ${city}.',
      highlightText: 'Over ${stats.successStories}+ successful marriages from ${city}',
      features: [
        'Largest Banjara community in ${city}',
        'Verified and authentic profiles',
        'Advanced matching algorithm',
        'Privacy and security guaranteed'
      ],
      callout: 'Join ${city}\'s most trusted platform'
    },
    statsSection: {
      heading: 'Banjara Matrimony Success in ${city}',
      subheading: 'Real numbers, real connections in ${city}',
      customStatsLabels: {
        totalMembersLabel: 'Active Members in ${city}',
        activeBridesLabel: 'Verified Brides in ${city}',
        activeGroomsLabel: 'Verified Grooms in ${city}',
        successStoriesLabel: '${city} Success Stories'
      }
    },
    aboutSection: {
      heading: 'About Banjara Community in ${city}',
      subheading: '${city}\'s Thriving Banjara Heritage',
      content: 'The Banjara community has been an integral part of ${city}\'s cultural fabric for generations. Today, ${city} is home to ${stats.totalMembers}+ Banjara singles actively seeking their life partners.',
      points: [
        'Strong community presence in ${city}',
        'Traditional values with modern outlook',
        'Growing professional community',
        'Active cultural participation'
      ],
      culturalNote: '${city} Banjara community celebrates rich traditions',
      heritageInfo: 'Centuries of heritage preserved in ${city}',
      modernContext: 'Modern ${city} Banjara community thrives in IT, Business, and Education'
    },
    whyChooseSection: {
      heading: 'Why ${city} Families Trust BanjaraMatch',
      subheading: 'Leading Matrimony Platform in ${city}',
      points: [
        {
          icon: 'verified',
          title: 'Verified Profiles in ${city}',
          description: 'Every profile from ${city} is manually verified for authenticity and safety',
          highlight: '100% verification in ${city}'
        },
        {
          icon: 'privacy',
          title: 'Privacy First for ${city} Members',
          description: 'Your privacy matters. Control who sees your profile in ${city}',
          highlight: 'Trusted by ${stats.totalMembers}+ ${city} families'
        },
        {
          icon: 'match',
          title: 'Smart Matching in ${city}',
          description: 'Advanced algorithm finds compatible matches in and around ${city}',
          highlight: '${stats.successStories}+ matches from ${city}'
        },
        {
          icon: 'support',
          title: 'Dedicated ${city} Support',
          description: 'Local support team understands ${city} community needs',
          highlight: '24/7 support for ${city} members'
        }
      ]
    },
    successStoriesSection: {
      heading: 'Love Stories from ${city}',
      subheading: 'Real couples, real happiness in ${city}',
      introText: 'Read inspiring stories of couples who found love in ${city} through BanjaraMatch',
      callToAction: 'Start your own ${city} success story'
    },
    howItWorksSection: {
      heading: 'Find Your Match in ${city} - Simple Steps',
      subheading: 'Join thousands of ${city} Banjara singles',
      steps: [
        {
          stepNumber: 1,
          icon: 'register',
          title: 'Register in ${city}',
          description: 'Create your free profile in ${city} in just 2 minutes',
          additionalInfo: 'Join ${stats.totalMembers}+ ${city} members'
        },
        {
          stepNumber: 2,
          icon: 'search',
          title: 'Browse ${city} Matches',
          description: 'View verified profiles from ${city} and nearby areas',
          additionalInfo: 'Smart filters for ${city} preferences'
        },
        {
          stepNumber: 3,
          icon: 'connect',
          title: 'Connect in ${city}',
          description: 'Express interest and start conversations with ${city} matches',
          additionalInfo: 'Safe and secure messaging'
        },
        {
          stepNumber: 4,
          icon: 'marry',
          title: 'Find Happiness',
          description: 'Join ${stats.successStories}+ couples from ${city} who found love',
          additionalInfo: 'Your ${city} success story awaits'
        }
      ]
    },
    communityInsightsSection: {
      heading: 'Banjara Community Insights in ${city}',
      subheading: 'Understanding ${city}\'s Banjara Demographics',
      introduction: 'Discover the vibrant Banjara community in ${city}',
      ageDistribution: 'Most ${city} members are between 25-35 years',
      professionalLandscape: 'Diverse professionals from IT, Business, Education in ${city}',
      educationalProfile: 'Highly educated community in ${city} with professional qualifications'
    },
    localitiesSection: {
      heading: 'Popular Banjara Localities in ${city}',
      subheading: 'Connect with matches near you in ${city}',
      introduction: 'Find matches from your neighborhood in ${city}'
    },
    nearbyCitiesSection: {
      heading: 'Expand Your Search Beyond ${city}',
      subheading: 'Explore Banjara matches in cities near ${city}',
      description: 'Connect with verified profiles from cities surrounding ${city}, ${state}'
    },
    faqSection: {
      heading: 'Frequently Asked Questions - ${city}',
      subheading: 'Everything about Banjara matrimony in ${city}',
      faqs: [
        {
          question: 'How many Banjara profiles are there in ${city}?',
          answer: 'We have ${stats.totalMembers}+ verified Banjara profiles from ${city}, including ${stats.activeBrides}+ brides and ${stats.activeGrooms}+ grooms.',
          category: 'General'
        },
        {
          question: 'Are all ${city} profiles verified?',
          answer: 'Yes, every profile from ${city} undergoes manual verification to ensure authenticity and safety of our ${city} community members.',
          category: 'Verification'
        },
        {
          question: 'How successful is matrimony in ${city}?',
          answer: 'We have facilitated ${stats.successStories}+ successful marriages in ${city}, making us the most trusted platform for Banjara matrimony in ${city}.',
          category: 'Success'
        },
        {
          question: 'Is registration free for ${city} members?',
          answer: 'Yes, registration is completely free for all ${city} members. You can create a profile, browse matches in ${city}, and connect at no cost.',
          category: 'Pricing'
        },
        {
          question: 'Which areas of ${city} do you cover?',
          answer: 'We cover all major localities and areas of ${city}, ${state}, ensuring you find matches from your preferred neighborhoods.',
          category: 'Coverage'
        }
      ]
    },
    ctaSection: {
      heading: 'Ready to Find Your Match in ${city}?',
      subheading: 'Join ${stats.totalMembers}+ ${city} members today',
      primaryButtonText: 'Register Free',
      secondaryButtonText: 'Browse ${city} Profiles',
      benefits: [
        'Free registration for ${city} members',
        'Verified profiles from ${city}',
        '${stats.successStories}+ success stories',
        'Trusted by ${city} families'
      ],
      urgencyText: 'Limited time: Get premium features free for ${city} members!'
    }
  };
};

/**
 * Generate default prefill templates with placeholders for State Page
 * @param {string} stateName - State name (for non-placeholder fields)
 * @returns {object} - Prefill data with placeholders
 */
const generateStatePrefillTemplate = (stateName) => {
  return {
    heroSection: {
      title: 'Find Your Perfect Banjara Match in ${state}',
      subtitle: 'Join ${stats.totalMembers}+ verified Banjara brides & grooms across ${state}',
      tagline: 'Connecting hearts across ${stats.totalCities}+ cities in ${state}',
      highlights: [
        'Verified profiles from ${stats.totalCities}+ cities',
        '${stats.totalMembers}+ active members in ${state}',
        '${stats.successStories}+ successful matches'
      ]
    },
    introSection: {
      heading: 'Welcome to Banjara Matrimony in ${state}',
      subheading: 'Connecting Hearts Across ${state}',
      content: 'Connect with verified Banjara profiles from all major cities in ${state}. Join our growing community of ${stats.totalMembers}+ members across ${stats.totalCities}+ cities in ${state}.',
      highlightText: 'Over ${stats.successStories}+ successful marriages across ${state}',
      features: [
        'Largest Banjara community in ${state}',
        'Coverage in ${stats.totalCities}+ cities',
        'Verified and authentic profiles',
        'Advanced matching algorithm'
      ],
      callout: 'Join ${state}\'s most trusted platform',
      coverage: 'Complete coverage across ${state}'
    },
    statsSection: {
      heading: 'Banjara Matrimony Success Across ${state}',
      subheading: 'Connecting families in ${stats.totalCities}+ cities in ${state}',
      customStatsLabels: {
        totalMembersLabel: 'Active Members in ${state}',
        activeBridesLabel: 'Verified Brides Across ${state}',
        activeGroomsLabel: 'Verified Grooms Across ${state}',
        successStoriesLabel: '${state} Success Stories',
        totalCitiesLabel: 'Cities Covered in ${state}'
      }
    },
    aboutSection: {
      heading: 'About Banjara Community in ${state}',
      subheading: '${state}\'s Rich Banjara Heritage',
      content: 'The Banjara community has a significant presence across ${state}. With ${stats.totalMembers}+ members from ${stats.totalCities}+ cities, ${state} represents one of our strongest communities.',
      points: [
        'Pan-${state} community presence',
        'Strong traditional values',
        'Professional excellence',
        'Cultural leadership'
      ],
      culturalNote: '${state} Banjara community preserves rich traditions',
      heritageInfo: 'Centuries of heritage across ${state}',
      modernContext: 'Modern ${state} Banjara community excels in IT, Business, and Education',
      historicalPresence: 'Historical significance in ${state}',
      regionalVariations: 'Diverse regional traditions across ${state}'
    },
    whyChooseSection: {
      heading: 'Why ${state} Families Trust BanjaraMatch',
      subheading: 'Leading Matrimony Platform Across ${state}',
      points: [
        {
          icon: 'verified',
          title: 'Verified Profiles Across ${state}',
          description: 'Every profile from ${stats.totalCities}+ cities in ${state} is manually verified',
          highlight: '100% verification in ${state}',
          statistic: '${stats.totalMembers}+ verified profiles'
        },
        {
          icon: 'coverage',
          title: 'Complete ${state} Coverage',
          description: 'Find matches from all major cities across ${state}',
          highlight: '${stats.totalCities}+ cities covered',
          statistic: 'Pan-${state} presence'
        },
        {
          icon: 'success',
          title: '${stats.successStories}+ Success Stories',
          description: 'Trusted platform with proven success across ${state}',
          highlight: 'Leading in ${state}',
          statistic: '${stats.successStories}+ happy couples'
        },
        {
          icon: 'support',
          title: 'Dedicated ${state} Support',
          description: 'Regional support team understands ${state} community needs',
          highlight: '24/7 support across ${state}',
          statistic: 'Local language support'
        }
      ]
    },
    successStoriesSection: {
      heading: 'Love Stories from Across ${state}',
      subheading: 'Real couples, real happiness in ${state}',
      introText: 'Read inspiring stories of couples from ${stats.totalCities}+ cities in ${state}',
      callToAction: 'Start your own ${state} success story',
      regionalHighlights: [
        'Success stories from all regions of ${state}',
        '${stats.successStories}+ happy couples',
        'Diverse matches across ${state}'
      ]
    },
    howItWorksSection: {
      heading: 'Find Your Match Across ${state} - Simple Steps',
      subheading: 'Join thousands of ${state} Banjara singles',
      steps: [
        {
          stepNumber: 1,
          icon: 'register',
          title: 'Register from Anywhere in ${state}',
          description: 'Create your free profile from any city in ${state}',
          additionalInfo: 'Join ${stats.totalMembers}+ ${state} members',
          cityExamples: ['Available in all ${state} cities']
        },
        {
          stepNumber: 2,
          icon: 'search',
          title: 'Browse ${state} Matches',
          description: 'View profiles from ${stats.totalCities}+ cities across ${state}',
          additionalInfo: 'Smart filters for ${state} preferences',
          cityExamples: ['Search by city, region, or state-wide']
        },
        {
          stepNumber: 3,
          icon: 'connect',
          title: 'Connect Across ${state}',
          description: 'Express interest to matches anywhere in ${state}',
          additionalInfo: 'Safe and secure messaging',
          cityExamples: ['Connect with matches across ${state}']
        },
        {
          stepNumber: 4,
          icon: 'marry',
          title: 'Find Happiness',
          description: 'Join ${stats.successStories}+ couples from ${state}',
          additionalInfo: 'Your ${state} success story awaits',
          cityExamples: ['Success stories from all over ${state}']
        }
      ]
    },
    communityInsightsSection: {
      heading: 'Banjara Community Insights Across ${state}',
      subheading: 'Understanding ${state}\'s Banjara Demographics',
      introduction: 'Discover the vibrant Banjara community across ${state}',
      ageDistribution: 'Most ${state} members are between 25-35 years',
      professionalLandscape: 'Diverse professionals from IT, Business, Education across ${state}',
      educationalProfile: 'Highly educated community in ${state}',
      geographicDistribution: 'Strong presence in ${stats.totalCities}+ cities',
      migrationPatterns: 'Active mobility within ${state}'
    },
    citiesSection: {
      heading: 'Major Cities in ${state} with Banjara Community',
      subheading: 'Connect with matches from ${stats.totalCities}+ cities',
      introduction: 'Explore Banjara profiles from all major cities in ${state}',
      featuredCitiesText: 'Featured cities across ${state}'
    },
    faqSection: {
      heading: 'Frequently Asked Questions - ${state}',
      subheading: 'Everything about Banjara matrimony in ${state}',
      faqs: [
        {
          question: 'How many cities in ${state} are covered?',
          answer: 'We cover ${stats.totalCities}+ major cities across ${state}, with ${stats.totalMembers}+ verified profiles.',
          category: 'Coverage'
        },
        {
          question: 'How many Banjara profiles are there in ${state}?',
          answer: 'We have ${stats.totalMembers}+ verified Banjara profiles from across ${state}, including ${stats.activeBrides}+ brides and ${stats.activeGrooms}+ grooms.',
          category: 'General'
        },
        {
          question: 'Are profiles from all ${state} cities verified?',
          answer: 'Yes, every profile from all ${stats.totalCities}+ cities in ${state} undergoes manual verification.',
          category: 'Verification'
        },
        {
          question: 'How successful is matrimony across ${state}?',
          answer: 'We have facilitated ${stats.successStories}+ successful marriages across ${state}, making us the most trusted platform.',
          category: 'Success'
        },
        {
          question: 'Can I search for matches across all ${state} cities?',
          answer: 'Yes, you can search and connect with matches from any of the ${stats.totalCities}+ cities we cover in ${state}.',
          category: 'Features'
        }
      ]
    },
    ctaSection: {
      heading: 'Ready to Find Your Match in ${state}?',
      subheading: 'Join ${stats.totalMembers}+ members across ${state}',
      primaryButtonText: 'Register Free',
      secondaryButtonText: 'Browse ${state} Profiles',
      benefits: [
        'Free registration for ${state} members',
        'Profiles from ${stats.totalCities}+ cities',
        '${stats.successStories}+ success stories',
        'Trusted by families across ${state}'
      ],
      urgencyText: 'Join ${stats.totalMembers}+ ${state} members today!',
      statewideCoverage: 'Complete coverage across ${state}'
    }
  };
};

module.exports = {
  processPlaceholders,
  processObjectPlaceholders,
  prepareCityDataContext,
  prepareStateDataContext,
  storeWithPlaceholders,
  retrieveAndProcess,
  generateCityPrefillTemplate,
  generateStatePrefillTemplate,
  getNestedValue
};
