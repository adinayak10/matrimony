'use strict';
// City pages that have their own layout. The content still comes from the CMS
// (GET /api/city-pages/:slug) and the meta/robots rules are unchanged; only the
// template differs. Every slug not listed here renders pages/regional-page-city.
module.exports = {
  'banjara-matrimony-ahmedabad': 'pages/regional-city-ahmedabad',
};
