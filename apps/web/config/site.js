'use strict';
// Site-wide constants, registered as app.locals.site so every template reads
// the same name, origin, default image and contact. (D0.5)
//
// Owner-confirmed facts only. Nothing here states a phone number, a postal
// address, a legal entity or a grievance officer until the owner supplies it
// through the environment (SITE_LEGAL_ENTITY, SITE_ADDRESS, SITE_PHONE,
// SITE_GRIEVANCE_OFFICER) — the legal-contact partial renders "to be
// appointed" wording in the meantime, and organizationJsonLd carries no
// telephone/address (D2 honest-content rule).

const name = 'BanjaraMatch';
const url = 'https://www.banjaramatch.com';
const defaultImage = '/images/banjara-matrimony-cover.jpg';
const logo = '/images/logo-bf.png';

// One support email: every address the site prints comes from here.
// info@ is what the live header and footer show today; the owner must confirm
// it (the old pages also printed support@, help@, privacy@, grievance@, dpo@).
const supportEmail = (process.env.SUPPORT_EMAIL || '').trim() || 'info@banjaramatch.com';

const env = (name) => (process.env[name] || '').trim() || null;

// SITE_GRIEVANCE_OFFICER="Full Name" or "Full Name <email@example.com>".
function parseOfficer(raw) {
  if (!raw) return null;
  const m = /^(.*?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(raw);
  const officer = m ? { name: m[1].trim(), email: m[2] } : { name: raw, email: null };
  return officer.name ? officer : null;
}

// Analytics switch shared by partials/head.ejs and partials/analytics.ejs.
// On in production (or ENABLE_ANALYTICS=true) with a real GA4 id;
// ENABLE_ANALYTICS=false always wins (boot checks, staging).
const ga4Id = env('GA4_MEASUREMENT_ID');
const analyticsFlag = (process.env.ENABLE_ANALYTICS || '').trim().toLowerCase();
const analytics = {
  ga4Id,
  adsId: 'AW-357336842',
  enabled: Boolean(ga4Id) && ga4Id !== 'G-XXXXXXXXXX' && analyticsFlag !== 'false'
    && (process.env.NODE_ENV === 'production' || analyticsFlag === 'true'),
  requireConsent: /^(1|true|yes)$/i.test(process.env.REQUIRE_COOKIE_CONSENT || ''),
};

// Social profiles the owner has confirmed exist. Empty until confirmed: the
// old markup listed facebook/instagram/linkedin URLs that may not exist.
const sameAs = (process.env.SITE_SAME_AS || '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => /^https:\/\//.test(s));

const site = {
  name,
  url,
  defaultImage,
  logo,
  themeColor: '#f6af04',
  backgroundColor: '#fbf8ed',
  locale: 'en_IN',
  lang: 'en-IN',
  supportEmail,
  // Twitter handle only when real; head.ejs emits twitter:site only if set.
  twitter: process.env.SITE_TWITTER || null,
  // Legal facts: null until the owner provides them (D2.23). Rendered only by
  // partials/legal-contact.ejs, and only when set.
  legalEntity: env('SITE_LEGAL_ENTITY'),
  address: env('SITE_ADDRESS'),
  phone: env('SITE_PHONE'),
  grievanceOfficer: parseOfficer(env('SITE_GRIEVANCE_OFFICER')),
  analytics,
  // Android package for assetlinks + the Play listing link.
  androidPackage: 'com.banjaramatch',
  organizationJsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${url}/#organization`,
    name,
    alternateName: 'Banjara Matrimony - BanjaraMatch.com',
    url,
    logo: `${url}${logo}`,
    description: "Free dedicated Banjara matrimony platform for the Banjara (Lambadi, Lambani, Gormati, Sugali) community in India.",
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: supportEmail,
      areaServed: 'IN',
      availableLanguage: ['English', 'Hindi'],
    },
    ...(sameAs.length ? { sameAs } : {}),
  },
};

module.exports = site;
