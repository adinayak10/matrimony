'use strict';
// Site-wide constants, registered as app.locals.site so every template reads
// the same name, origin, default image and contact. (D0.5)
//
// Owner-confirmed facts only. Nothing here states a phone number, a postal
// address, a legal entity or a grievance officer until the owner supplies it —
// the legal-contact partial renders "to be appointed" wording in the meantime,
// and organizationJsonLd carries no telephone/address (D2 honest-content rule).

const name = 'BanjaraMatch';
const url = 'https://www.banjaramatch.com';
const defaultImage = '/images/banjara-matrimony-cover.jpg';
const logo = '/images/logo-bf.png';

// One support email. info@ is what the live footer and contact page show
// today; the owner must confirm it (vs support@ in the old JSON-LD).
const supportEmail = process.env.SUPPORT_EMAIL || 'info@banjaramatch.com';

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
  // Legal facts: null until the owner provides them (D2.23).
  legalEntity: process.env.SITE_LEGAL_ENTITY || null,
  address: process.env.SITE_ADDRESS || null,
  grievanceOfficer: null,
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
