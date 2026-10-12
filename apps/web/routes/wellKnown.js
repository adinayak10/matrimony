'use strict';
// Icons, web manifest and Android App Links (D3.30).
//
//   GET /site.webmanifest              application/manifest+json
//   GET /.well-known/assetlinks.json   from ANDROID_SHA256_FINGERPRINTS (503 JSON when unset)
//   GET /favicon.ico                   public/favicon.ico (build/icons.js) or images/fav.ico
//   GET /apple-touch-icon.png          public/apple-touch-icon.png once build/icons.js has produced it, else 404
//
// Mount in app.js BEFORE indexRoutes:  app.use(require('./routes/wellKnown'));
// nginx apex block must proxy /.well-known/assetlinks.json to the web app
// without a redirect (Android does not follow redirects) — deploy/nginx/www.conf.

const path = require('node:path');
const express = require('express');
const site = require('../config/site');
const { publicFileExists, PUBLIC_DIR } = require('../utils/assets');

const router = express.Router();
const DAY = 'public, max-age=86400';

router.get('/site.webmanifest', (req, res) => {
  const icons = [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  ].filter((i) => publicFileExists(i.src));
  if (!icons.length) icons.push({ src: '/images/logo-bf.png', sizes: '654x112', type: 'image/png' });
  res.set('Cache-Control', DAY).type('application/manifest+json').send(JSON.stringify({
    name: site.name,
    short_name: site.name,
    start_url: '/',
    display: 'browser',
    theme_color: site.themeColor,
    background_color: site.backgroundColor,
    icons,
  }));
});

router.get('/.well-known/assetlinks.json', (req, res) => {
  const raw = process.env.ANDROID_SHA256_FINGERPRINTS || '';
  const fingerprints = raw.split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  res.type('application/json');
  if (!fingerprints.length) {
    return res.status(503).set('Cache-Control', 'no-store').send(JSON.stringify({ error: 'ANDROID_SHA256_FINGERPRINTS not configured' }));
  }
  res.set('Cache-Control', DAY).send(JSON.stringify([{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: { namespace: 'android_app', package_name: site.androidPackage, sha256_cert_fingerprints: fingerprints },
  }]));
});

router.get('/favicon.ico', (req, res) => {
  const built = publicFileExists('favicon.ico');
  const file = built ? path.join(PUBLIC_DIR, 'favicon.ico') : path.join(PUBLIC_DIR, 'images', 'fav.ico');
  res.set('Cache-Control', 'public, max-age=2592000');
  res.sendFile(file, { headers: { 'Content-Type': 'image/x-icon' } }, (err) => { if (err) res.status(404).end(); });
});

// Produced by build/icons.js (needs sharp or ImageMagick). Until then a 404 is
// honest: a resized logo would be wrong at 180x180 and this is not indexable.
for (const name of ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png']) {
  router.get(`/${name}`, (req, res) => {
    if (!publicFileExists('apple-touch-icon.png')) return res.status(404).set('Cache-Control', 'public, max-age=3600').end();
    res.set('Cache-Control', 'public, max-age=2592000');
    res.sendFile(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), (err) => { if (err) res.status(404).end(); });
  });
}

module.exports = router;
