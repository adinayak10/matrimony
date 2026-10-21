'use strict';
// Per-page <head> data for the meta contract (D3.24): titles and descriptions
// copied verbatim from the templates they replace (except the ones D3.24 lists
// as wrong: account-deletion), keywords, and the page-level JSON-LD blocks
// that are not already emitted elsewhere (head.ejs emits the Organization once,
// partials/breadcrumb.ejs the BreadcrumbList). Nested publisher/author
// Organizations reference the site Organization by @id so each page carries
// exactly one.
//
//   const { pageMeta } = require('../config/pageMeta');
//   res.render('pages/faq', { meta: pageMeta('faq', { canonical: '/faq' }), ... })
//
// head.ejs merges the result over res.locals.metaDefaults (canonical = the
// request path, robots index/follow, og defaults), so a page only states what
// differs. Titles without "BanjaraMatch" get " | BanjaraMatch" appended there.

const PAGES = {
  home: {
    title: "Banjara Matrimony - Free Matrimonial Site | Find Banjara Brides & Grooms",
    brandSuffix: false,
    description: "Banjara Matrimony made free on BanjaraMatch.com. Find Banjara brides & grooms across India. Register free today!",
    keywords: [
      "banjara matrimony",
      "banjara matrimonial",
      "banjara marriage",
      "banjara bride",
      "banjara groom",
      "lambani matrimony",
      "lambadi matrimony",
      "gormati matrimony",
      "sugali matrimony",
      "gor banjara matrimony",
      "banjara shaadi",
      "banjara rishta",
      "free banjara matrimony",
      "banjara match",
      "banjara wedding",
      "banjara matrimony site",
      "banjara matrimony login",
      "banjara matrimony app"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Banjara Matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Banjara Matrimony refers to the matrimonial matchmaking service exclusively for the Banjara community (also known as Lambani, Lambadi, Gormati, or Sugali). BanjaraMatch.com is India's free dedicated Banjara matrimony platform."
            }
          },
          {
            "@type": "Question",
            name: "Is BanjaraMatch a free Banjara matrimony site?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, BanjaraMatch.com is 100% free for all Banjara community members. Registration, profile browsing, sending interests, and chatting are all completely free — no hidden charges."
            }
          },
          {
            "@type": "Question",
            name: "How to find Banjara brides and grooms on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "To find Banjara brides and grooms, register free on BanjaraMatch.com, complete your profile, and browse verified Banjara matrimony profiles. Use filters like age, location, sub-community (Lambani, Gormati, Sugali), and education to find your best match."
            }
          },
          {
            "@type": "Question",
            name: "What is Lambani or Lambadi Matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Lambani (also called Lambadi) matrimony is matrimonial matchmaking for the Lambani sub-group of the Banjara community, primarily found in Karnataka, Andhra Pradesh, and Telangana. BanjaraMatch has the largest collection of Lambani matrimony profiles in India."
            }
          },
          {
            "@type": "Question",
            name: "What is Gor Banjara Matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gor Banjara Matrimony is the matrimonial service for the Gor Banjara sub-community. BanjaraMatch.com supports all Banjara sub-communities including Gor Banjara, Lambani, Gormati, Sugali, and Vanjari matrimony."
            }
          },
          {
            "@type": "Question",
            name: "How do I register for Banjara Matrimony on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Registration is free and takes only 2 minutes. Visit www.banjaramatch.com/register, fill in your basic details, add your photo and preferences, and start browsing verified Banjara matrimony profiles immediately."
            }
          },
          {
            "@type": "Question",
            name: "Is there a Banjara Matrimony app available?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes! The BanjaraMatch Banjara Matrimony app is available for Android. Download it from banjaramatch.com/banjara-matrimony-app. It features AI-powered matching, instant notifications, and chat."
            }
          }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "Service",
        serviceType: "Matrimonial Service",
        provider: {
          "@id": "https://www.banjaramatch.com/#organization"
        },
        areaServed: {
          "@type": "Country",
          name: "India"
        },
        audience: {
          "@type": "Audience",
          audienceType: "Banjara Community",
          geographicArea: {
            "@type": "Country",
            name: "India"
          }
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR",
          description: "Completely free matrimonial service for Banjara community"
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Matrimony Services",
          itemListElement: [
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Profile Registration",
                description: "Create your free matrimony profile"
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Profile Browsing",
                description: "Browse verified Banjara profiles"
              }
            },
            {
              "@type": "Offer",
              itemOffered: {
                "@type": "Service",
                name: "Match Recommendations",
                description: "Get personalized match suggestions"
              }
            }
          ]
        }
      }
    ],
    // Hero image preload, split by viewport in partials/head.ejs (CSS background up to 1250px, slider above).
    hints: [{ hero: "/images/ban-bg.jpg" }]
  },
  about: {
    title: "About BanjaraMatch - Free Banjara Matrimony Platform | Our Mission",
    description: "BanjaraMatch is India's dedicated free Banjara matrimony platform, connecting Banjara, Lambani, Gormati, and Sugali community members for marriage.",
    keywords: [
      "banjara matrimony",
      "banjara marriage",
      "banjara brides",
      "banjara grooms",
      "banjara matrimonial site",
      "trusted matrimony",
      "banjara shaadi",
      "banjara rishta"
    ],
    pageCategory: "about"
  },
  contact: {
    title: "Contact BanjaraMatch - Help & Support",
    description: "Contact BanjaraMatch support team for assistance with your matrimony profile. Get help with registration, profile verification, and partner search queries.",
    keywords: [
      "banjaramatch contact",
      "matrimony support",
      "banjara matrimony help",
      "customer service"
    ],
    pageCategory: "contact",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Contact BanjaraMatch",
        description: "Get in touch with BanjaraMatch support team",
        url: "https://www.banjaramatch.com/contact"
      }
    ]
  },
  faq: {
    title: "FAQ - Frequently Asked Questions | BanjaraMatch",
    description: "Answers to common questions about BanjaraMatch — gotra matching rules, profile verification, AI matching, safety, and how the platform works.",
    keywords: [
      "banjaramatch faq",
      "banjara matrimony questions",
      "gotra matching rules",
      "banjara matrimony verification",
      "is banjaramatch free",
      "banjara matrimony safety"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Is BanjaraMatch really free?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Registration, browsing profiles, sending interests, chatting, and video calls are all completely free, with no hidden charges or premium paywall — unlike most matrimony platforms that charge for contact details or messaging."
            }
          },
          {
            "@type": "Question",
            name: "Who can register on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BanjaraMatch is built for the Banjara community and its regional identities — Lambadi, Lambani, Gormati, Gor Banjara, Sugali, and Vanjara — across India and abroad. Registration is open to adults 18 and above seeking a marriage partner."
            }
          },
          {
            "@type": "Question",
            name: "What is a Banjara gotra, and why does it matter?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A gotra is a patrilineal clan identifier, inherited from your father. In Banjara tradition, marriage within your own gotra is considered forbidden (gotra exogamy), so confirming gotra compatibility is one of the first steps in any match. See our full Banjara Gotra List for details."
            }
          },
          {
            "@type": "Question",
            name: "Can two people from the same gotra marry?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. Same-gotra marriage is not permitted under traditional Banjara custom, since people sharing a gotra are considered to share ancestry. This rule is enforced strongly across most Banjara sub-communities and tanda panchayats."
            }
          },
          {
            "@type": "Question",
            name: "Can I search for matches by gotra and sub-community?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Every profile on BanjaraMatch includes gotra and sub-community details (Lambadi, Gormati, Lambani, Gor Banjara, Sugali), and you can filter your search by these fields alongside location, age, education, and profession."
            }
          },
          {
            "@type": "Question",
            name: "How are profiles verified on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Members can submit a government ID and a selfie from the Verify profile page in their account. An administrator reviews the request and, once it is approved, the profile shows a verified badge. Report tools are also available if you encounter suspicious behavior."
            }
          },
          {
            "@type": "Question",
            name: "How does AI matching work on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BanjaraMatch uses AI-assisted compatibility scoring that factors in gotra and sub-community compatibility, location, age preferences, education, profession, and stated preferences, to surface more relevant matches instead of an unfiltered list of every profile."
            }
          },
          {
            "@type": "Question",
            name: "Is my data and privacy safe on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. Data is encrypted, you control who can view your contact details, and profiles are not indexed or exposed publicly outside the platform. See our Privacy Policy and Child Safety Policy for full details."
            }
          },
          {
            "@type": "Question",
            name: "Does BanjaraMatch cover my state or city?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BanjaraMatch covers Banjara communities across Telangana, Andhra Pradesh, Maharashtra, Karnataka, Rajasthan, Gujarat, Madhya Pradesh, Delhi NCR, and other states with a Banjara population. Check our Site Map for the full list of regional pages."
            }
          },
          {
            "@type": "Question",
            name: "What's the difference between Banjara, Lambadi, Lambani, Gormati, and Sugali?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "These are regional names for the same broader nomadic community. Lambadi/Lambada/Sugali is common in Telangana and Andhra Pradesh, Lambani in Karnataka, Gormati mainly in Maharashtra, Vanjara in Gujarat, and Banjara is used widely across Rajasthan and North India. BanjaraMatch serves all of these together."
            }
          },
          {
            "@type": "Question",
            name: "Can I use BanjaraMatch on mobile?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. BanjaraMatch has a free mobile app for Android with the same AI matching, chat, and video call features as the website."
            }
          },
          {
            "@type": "Question",
            name: "How do I report a fake or suspicious profile?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can report any profile directly from its page. Our team manually reviews reports and takes action, including removal, for profiles that violate our safety or authenticity standards."
            }
          },
          {
            "@type": "Question",
            name: "Can I delete my account and data?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. You can request full account and data deletion at any time. See our Account & Data Deletion page for the process."
            }
          }
        ]
      }
    ]
  },
  features: {
    title: "BanjaraMatch Features – India's First Free AI-Powered Banjara Matrimony Platform",
    description: "Discover why BanjaraMatch is India's first free Banjara matrimony platform — AI matching, verified profiles, real-time chat, nearby matches, and more.",
    keywords: [
      "banjara matrimony features",
      "free banjara matrimony",
      "ai matrimony",
      "banjara match ai",
      "free matrimony website",
      "banjara matrimony app features",
      "lambani matrimony",
      "smart matching banjara"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "BanjaraMatch – Banjara Matrimony Platform",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Web, Android",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR"
        },
        description: "India's first completely free Banjara matrimony platform and app. Smart AI matching, verified profiles, real-time chat, nearby GPS matching, Ice Breaker game, Match Radar, and more – all free.",
        featureList: "Smart Match Scoring, Manual Profile Verification, Real-Time Chat, Advanced Search Filters, Daily AI Matches, Privacy Controls, Nearby GPS Matches, Ice Breaker Game, AI Match Radar, Push Notifications, Mobile App",
        author: {
          "@id": "https://www.banjaramatch.com/#organization"
        }
      }
    ]
  },
  betaTester: {
    title: "Join BanjaraMatch Beta Testing - Get Advanced Features First",
    description: "Be among the first to access AI-powered matching, advanced filters, and profile verification. Join our beta program for lifetime early access.",
    keywords: [
      "BanjaraMatch beta tester",
      "AI matrimony app",
      "advanced matching",
      "beta testing program",
      "early access features"
    ],
    pageCategory: "beta-tester"
  },
  childSafety: {
    title: "Child Safety Policy & Standards | BanjaraMatch - CSAE/CSAM Prevention",
    description: "BanjaraMatch Child Safety Policy and Standards. Learn about our comprehensive measures against Child Sexual Abuse and Exploitation (CSAE) and Child Sexual Abuse Material (CSAM). We prioritize child protection and safety.",
    keywords: [
      "child safety policy",
      "CSAE prevention",
      "CSAM prevention",
      "child protection",
      "safety standards",
      "reporting child abuse"
    ]
  },
  communityFeedback: {
    title: "Community Feedback & Feature Suggestions | BanjaraMatch - Your Voice Matters",
    description: "Share your ideas to improve BanjaraMatch. Help shape the future of Banjara matchmaking with your feedback, feature requests, and concerns.",
    keywords: [
      "banjara matrimony feedback",
      "banjara match suggestions",
      "matrimony feature requests",
      "banjara community input",
      "improve matrimony platform",
      "banjara matchmaking ideas",
      "community feedback matrimony",
      "suggest matrimony features",
      "banjara matrimonial improvements",
      "user suggestions banjara match",
      "transparent matrimony platform",
      "community driven matrimony",
      "banjara marriage portal feedback",
      "help improve banjara match",
      "matrimony platform concerns",
      "banjara community voice",
      "feature drop suggestions",
      "matrimony transparency",
      "banjara tech matrimony",
      "future of banjara matchmaking",
      "feedback",
      "suggestions",
      "community input",
      "feature request",
      "banjara feedback",
      "matrimony ideas",
      "user voice",
      "transparency",
      "community first",
      "improvement ideas"
    ],
    pageCategory: "community-feedback",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        name: "Community Feedback & Feature Suggestions",
        description: "Share your ideas and suggestions to improve BanjaraMatch matrimony platform for the Banjara community",
        url: "https://www.banjaramatch.com/community-feedback",
        mainEntity: {
          "@id": "https://www.banjaramatch.com/#organization"
        }
      }
    ]
  },
  sitemap: {
    title: "Site Map | BanjaraMatch – Free Banjara Matrimony",
    description: "Complete sitemap of BanjaraMatch.com - Browse all pages including profiles, blogs, regional matrimony services, and resources."
  },
  login: {
    title: "Banjara Matrimony | Find Your Perfect Life Partner - Banjaramatch.com",
    description: "BanjaraMatch.com is the most trusted Banjara matrimony site to find your perfect life partner. Join now to explore verified Banjara profiles for marriage.",
    keywords: [
      "Banjara Matrimony",
      "BanjaraMatch",
      "Banjara Marriage",
      "Banjara Brides",
      "Banjara Grooms",
      "Banjara Matrimonial",
      "Find Banjara Partner",
      "Trusted Banjara Marriage Website"
    ],
    pageCategory: "login",
    robots: "noindex, follow",
    scripts: [
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
    ]
  },
  register: {
    title: "Register Free on BanjaraMatch | #1 Banjara Matrimony Website",
    description: "Join the most trusted Banjara matrimony platform – BanjaraMatch.com. Create your free profile today and find your ideal Banjara bride or groom. 100% verified matches. Safe & secure.",
    keywords: [
      "Banjara Matrimony",
      "BanjaraMatch",
      "Banjara marriage",
      "Banjara brides",
      "Banjara grooms",
      "matrimony site for Banjara",
      "register for marriage",
      "free Banjara matrimonial"
    ],
    pageCategory: "register",
    scripts: [
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
    ]
  },
  forgotPassword: {
    title: "Forgot Password - Banjara Matrimony | BanjaraMatch.com",
    description: "Reset your BanjaraMatch password. Enter your email to receive password reset instructions.",
    keywords: [
      "Banjara Matrimony",
      "BanjaraMatch",
      "Forgot Password",
      "Reset Password"
    ],
    pageCategory: "forgot-password",
    robots: "noindex, follow",
    scripts: [
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
    ]
  },
  resetPassword: {
    title: "Reset Password - Banjara Matrimony | BanjaraMatch.com",
    description: "Set a new password for your BanjaraMatch account.",
    keywords: [
      "Banjara Matrimony",
      "BanjaraMatch",
      "Reset Password"
    ],
    pageCategory: "reset-password",
    robots: "noindex, follow",
    noAnalytics: true
  },
  thankYou: {
    title: "Thank You - Registration Successful | BanjaraMatch",
    description: "Thank you for registering with BanjaraMatch. Your journey to find your perfect match starts now!",
    pageCategory: "conversion",
    robots: "noindex, nofollow"
  },
  terms: {
    title: "Terms & Conditions - BanjaraMatch | Free Banjara Matrimony",
    description: "Terms and Conditions for BanjaraMatch - India's First Free Banjara Matrimony Platform"
  },
  privacy: {
    title: "Privacy Policy - BanjaraMatch | Free Banjara Matrimony",
    description: "Privacy Policy for BanjaraMatch - Learn how we protect your data"
  },
  app: {
    title: "Banjara Matrimony App - Find Lambadi Brides & Grooms | Free Download",
    brandSuffix: false,
    description: "Download free Banjara matrimony app to find verified Lambadi & Lambani brides and grooms. Advanced matchmaking, video calls & instant chat. Available for Android.",
    keywords: [
      "banjara matrimony",
      "banjara matrimony app",
      "lambadi matrimony",
      "lambani matrimony",
      "banjara bride",
      "banjara groom",
      "lambadi bride",
      "lambani groom",
      "banjara marriage",
      "banjara shaadi",
      "free banjara matrimony",
      "banjara match",
      "lambadi marriage app",
      "lambani shaadi app",
      "banjara community matrimony",
      "sugali matrimony",
      "gormati matrimony",
      "banjara rishta",
      "banjara wedding",
      "banjara matrimonial site",
      "lambadi matrimonial",
      "banjara groom search",
      "banjara bride search",
      "banjara matchmaking",
      "lambani matchmaking"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "BanjaraMatch - Banjara Matrimony App",
        applicationCategory: "LifestyleApplication",
        operatingSystem: "Android",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "INR"
        },
        description: "Free Banjara matrimony app to find verified Lambadi and Lambani brides and grooms for marriage, with advanced matchmaking, video calls and instant chat.",
        author: {
          "@id": "https://www.banjaramatch.com/#organization"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is AI-powered matchmaking in BanjaraMatch app?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BanjaraMatch uses artificial intelligence and machine learning algorithms to analyze your preferences, behavior, and profile details to suggest the most compatible Banjara matches. The AI learns from your interactions to provide increasingly accurate recommendations."
            }
          },
          {
            "@type": "Question",
            name: "Is the BanjaraMatch AI app free to download and use?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, the BanjaraMatch app is completely free to download and use. All features including AI matchmaking, profile browsing, chat, and video calls are available at no cost for the Banjara community."
            }
          },
          {
            "@type": "Question",
            name: "Which phones support the BanjaraMatch AI matrimony app?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The BanjaraMatch app works on Android devices running Android 5.0 or higher. It's optimized for all screen sizes from budget phones to flagship devices."
            }
          },
          {
            "@type": "Question",
            name: "How does the AI match profiles in the Banjara matrimony app?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Our AI analyzes multiple factors including age preferences, education, profession, location, family background, horoscope compatibility, subcaste preferences, and behavioral patterns to calculate compatibility scores and suggest matches with the highest potential for successful marriage."
            }
          },
          {
            "@type": "Question",
            name: "Can I video call matches in the BanjaraMatch app?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, the app includes secure in-app video calling feature allowing you to have face-to-face conversations with your matches without sharing personal phone numbers. This helps verify profiles and build connections safely."
            }
          }
        ]
      }
    ]
  },
  lambadi: {
    title: "Lambadi Matrimony | Find Lambadi Brides & Grooms — BanjaraMatch",
    description: "India's first free Lambadi matrimony platform. Find verified Lambadi brides & grooms from Telangana, Andhra Pradesh, Karnataka & across India.",
    keywords: [
      "Lambadi matrimony",
      "Lambadi brides",
      "Lambadi grooms",
      "Lambada matrimony",
      "Sugali matrimony",
      "Banjara Lambadi marriage",
      "Lambadi shaadi",
      "free Lambadi matrimony",
      "Lambadi community marriage",
      "Lambadi rishta"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Lambadi matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Lambadi matrimony refers to the matchmaking and marriage process within the Lambadi community, also known as Lambada, Sugali, or Banjara in different states. BanjaraMatch is India's first dedicated free matrimony platform exclusively for the Lambadi/Banjara community, connecting verified Lambadi brides and grooms across Telangana, Andhra Pradesh, Karnataka, Maharashtra, and all of India."
            }
          },
          {
            "@type": "Question",
            name: "Is BanjaraMatch free for Lambadi matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. BanjaraMatch is 100% free — no registration fee, no messaging charges, and no subscription required. You can browse Lambadi profiles, send interests, and connect with matches completely free."
            }
          },
          {
            "@type": "Question",
            name: "What is the difference between Lambadi, Lambada, Banjara, and Sugali?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Lambadi, Lambada, Sugali, Banjara, and Gormati are different regional names for the same community — a nomadic tribal group spread across South and Central India. In Telangana and Andhra Pradesh, they are commonly called Lambadi or Lambada. In Karnataka, the term Lambani is common. In Maharashtra, Gormati is widely used. In Rajasthan and North India, Banjara is the dominant term. BanjaraMatch serves all these communities under one platform."
            }
          },
          {
            "@type": "Question",
            name: "Which states have the most Lambadi profiles on BanjaraMatch?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "BanjaraMatch has active Lambadi/Banjara profiles across Telangana, Andhra Pradesh, Karnataka, Maharashtra, Rajasthan, Madhya Pradesh, Gujarat, Delhi, and other states. Telangana and Andhra Pradesh have the largest concentration of Lambadi/Lambada community profiles."
            }
          },
          {
            "@type": "Question",
            name: "How does Lambadi gotra work in marriage matching?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "In Lambadi/Banjara tradition, marriage within the same gotra (clan) is strictly prohibited. BanjaraMatch includes gotra information in profile filters so users can find compatible matches from different gotras. The BanjaraMatch platform also has a blog post explaining Banjara gotra rules and compatibility in detail."
            }
          }
        ]
      }
    ]
  },
  gormati: {
    title: "Gormati Matrimony | Find Gormati Brides & Grooms — BanjaraMatch",
    description: "India's first free Gormati matrimony platform. Find verified Gormati brides and grooms from Maharashtra, Karnataka, and across India — 100% free.",
    keywords: [
      "Gormati matrimony",
      "Gormati brides",
      "Gormati grooms",
      "Gormati marriage",
      "Banjara Gormati matrimony",
      "Gormati shaadi",
      "free Gormati matrimony",
      "Lambani matrimony",
      "Gormati rishta",
      "Gormati Banjara marriage Maharashtra"
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is Gormati matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gormati matrimony refers to the matchmaking and marriage process within the Gormati community — the name used for the Banjara/Lambani community primarily in Maharashtra and Karnataka. Gormati people are part of the larger Banjara tribal community spread across India. BanjaraMatch is India's first dedicated free matrimony platform for the Gormati/Banjara/Lambani community."
            }
          },
          {
            "@type": "Question",
            name: "Is BanjaraMatch free for Gormati matrimony?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes, completely free. BanjaraMatch has no registration fee, no messaging charges, and no subscription plans. Gormati brides and grooms can register, browse profiles, and connect with matches 100% free."
            }
          },
          {
            "@type": "Question",
            name: "What is the difference between Gormati, Banjara, and Lambani?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Gormati, Banjara, and Lambani are regional names for the same nomadic tribal community across India. Gormati is the name used mainly in Maharashtra and parts of Karnataka. Lambani is used in most of Karnataka. Banjara is used in Rajasthan, UP, and North India. Lambadi/Lambada/Sugali are used in Telangana and Andhra Pradesh. BanjaraMatch serves all these communities together."
            }
          }
        ]
      }
    ]
  },
  history: {
    title: "Banjara Community History — Origin, Culture & Heritage of Banjara People | BanjaraMatch",
    description: "Complete history of the Banjara community — origins, Rajput ancestry, trade routes, the Tanda system, culture, and state-wise spread across India.",
    keywords: [
      "Banjara community history",
      "Banjara origin",
      "Banjara caste history",
      "Lambadi history",
      "Gormati history",
      "Banjara people India",
      "Banjara tribe origin",
      "Banjara Rajput",
      "Gor Banjara history",
      "Banjara nomadic traders",
      "Banjara culture",
      "Banjara language",
      "Gor Boli",
      "Banjara heritage",
      "who are Banjara",
      "Banjara community India",
      "Lambani history Karnataka",
      "Banjara gotra history"
    ],
    ogType: "article",
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Banjara Community History — Origin, Culture and Heritage of the Banjara People",
        description: "A comprehensive history of the Banjara community covering origins, Rajput ancestry theory, nomadic trade routes, the Tanda social system, culture, language (Gor Boli), state-wise spread, and famous personalities.",
        url: "https://www.banjaramatch.com/banjara-community-history",
        inLanguage: "en-IN",
        author: {
          "@id": "https://www.banjaramatch.com/#organization"
        },
        publisher: {
          "@id": "https://www.banjaramatch.com/#organization"
        },
        datePublished: "2026-06-17",
        dateModified: "2026-06-17",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": "https://www.banjaramatch.com/banjara-community-history"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Who are the Banjara people?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Banjara are a nomadic community of India with an estimated population of over 3 crore (30 million). They are known by different names across India — Lambadi in Telangana and Andhra Pradesh, Lambani in Karnataka, Gormati in Maharashtra, and Sugali in some parts of AP. Historically, they were the largest trading and transport community in pre-colonial India, carrying salt, grain, and goods across the subcontinent using large caravans of bullocks."
            }
          },
          {
            "@type": "Question",
            name: "What is the origin of the Banjara community?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The origin of the Banjara community is widely debated. The most widely accepted theory is that they descended from Rajput clans who became nomadic traders after the fall of Rajput kingdoms in Rajasthan between the 12th and 16th centuries. Their surnames (gotras) like Rathod, Chavan, Pawar, and Jadhav match major Rajput clan names. Some scholars also suggest connections to ancient Romani people who migrated from India to Europe around the 11th century."
            }
          },
          {
            "@type": "Question",
            name: "What language do Banjara people speak?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Banjara community speaks Gor Boli (also called Lambadi, Banjari, or Gorboli), a distinct language with roots in old Rajasthani and Sanskrit. It has significant vocabulary overlap with Romani (the language of the European Roma people), which is cited as evidence of a shared ancient origin. Gor Boli is spoken across all states where Banjara communities live, though regional influences from Marathi, Telugu, Kannada, and Hindi have created distinct dialects."
            }
          },
          {
            "@type": "Question",
            name: "What is a Tanda in Banjara culture?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "A Tanda is the traditional settlement or village unit of the Banjara community. Historically, a Tanda was a mobile caravan of Banjara families travelling together for trade. After the Banjara became settled (primarily in the 19th and 20th centuries), the Tanda became a permanent settlement — usually a cluster of Banjara families living together on the outskirts of a larger town or village. The Tanda chief (Nayak or Tanda Patel) is the traditional leader and arbitrator of disputes."
            }
          },
          {
            "@type": "Question",
            name: "What is the Banjara community's population in India?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "The Banjara community has an estimated population of over 3 crore (30 million) people in India. They are classified as Scheduled Tribe (ST) in several states including Andhra Pradesh, Telangana, Karnataka, and Maharashtra. Telangana and Andhra Pradesh have the largest Banjara/Lambadi populations, followed by Maharashtra (Gormati), Karnataka (Lambani), Rajasthan, Madhya Pradesh, Gujarat, and Delhi."
            }
          }
        ]
      }
    ]
  },
  gotraList: {
    description: "Complete Banjara gotra list grouped by clan across Telangana, Maharashtra, Karnataka, Rajasthan & more, with marriage rules for Lambadi, Gormati, Lambani.",
    keywords: [
      "Banjara gotra list",
      "Lambadi gotra list",
      "Gormati gotra",
      "Banjara clan list",
      "Banjara gotra marriage rules",
      "Banjara gotras Telangana",
      "Banjara gotra Maharashtra",
      "Banjara gotra Karnataka",
      "Gor Banjara gotra",
      "Banjara clan names",
      "all Banjara gotras",
      "gotra exogamy Banjara",
      "Lambani gotra list",
      "Sugali gotra"
    ],
    ogType: "article",
    jsonLdTemplate: true
  },
  accountDeletion: {
    title: "Account & Data Deletion Request | BanjaraMatch",
    description: "How to request deletion of your BanjaraMatch account and personal data, what gets removed, and how long the request takes.",
    canonical: "/account-deletion"
  },
  notFound: {
    title: "404 - Page Not Found | BanjaraMatch",
    description: "The page you are looking for could not be found. Return to BanjaraMatch homepage to find your perfect Banjara match.",
    robots: "noindex, nofollow"
  },
  adminEmailRegister: {
    title: "Admin Register - Banjara Match",
    description: "",
    robots: "noindex, follow",
    pageCategory: "register",
    scripts: [
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
    ]
  },
  onboarding: {
    title: "Complete Your Profile - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  iceBreaker: {
    title: "Ice Breaker Game - Banjara Match",
    description: "",
    robots: "noindex, nofollow",
    scripts: [
      "https://cdn.socket.io/4.5.4/socket.io.min.js"
    ]
  },
  dashboard: {
    title: "Dashboard - Banjara Match",
    description: "",
    robots: "noindex, nofollow",
    pageCategory: "dashboard",
    scripts: [
      "js/Chart.js"
    ],
    // Loaded before the site stylesheet, which overrides them (the page used to re-link /css/style.css after them).
    stylesBefore: [
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css",
      "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick-theme.css"
    ]
  },
  updateProfile: {
    title: "Edit Profile - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  userInterests: {
    title: "Interests - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  userChat: {
    title: "Chat - Banjara Match",
    description: "",
    robots: "noindex, nofollow",
    scripts: [
      "https://cdn.socket.io/4.5.4/socket.io.min.js",
      "https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js"
    ]
  },
  userSetting: {
    title: "Privacy Settings - Banjara Match",
    description: "",
    robots: "noindex, nofollow",
    scripts: [
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js",
      "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"
    ]
  },
  shortlisted: {
    title: "My Shortlist - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  blockedUsers: {
    title: "Blocked Users - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  notifications: {
    title: "Notifications - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  profileVisitors: {
    title: "Profile Visitors - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  allProfiles: {
    title: "Browse Profiles - BanjaraMatch | Find Your Perfect Match",
    description: "",
    robots: "noindex, nofollow",
    pageCategory: "profiles"
  },
  profile: {
    title: "Profile - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  successStories: {
    title: "Banjara Matrimony Success Stories",
    description: "Real couples who met on BanjaraMatch share their stories. Read Banjara, Lambadi and Gormati matrimony success stories, or share your own.",
    keywords: [
      "banjara matrimony success stories",
      "banjara marriage stories",
      "lambadi matrimony success",
      "banjaramatch couples"
    ],
    pageCategory: "success_stories"
  },
  shareSuccessStory: {
    title: "Share Your Success Story - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  verifyProfile: {
    title: "Verify Your Profile - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  dailyMatches: {
    title: "Daily Matches - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  },
  savedSearches: {
    title: "Saved Searches - Banjara Match",
    description: "",
    robots: "noindex, nofollow"
  }
};

function pageMeta(key, overrides) {
  const base = PAGES[key];
  if (!base) throw new Error('pageMeta: unknown page "' + key + '"');
  const out = Object.assign({}, base, overrides || {});
  if (base.jsonLd && overrides && overrides.jsonLd) out.jsonLd = [...base.jsonLd, ...overrides.jsonLd];
  return out;
}

module.exports = { PAGES, pageMeta };
