'use strict';
// Content-Security-Policy for the public site (D1.7). Report-only until
// CSP_ENFORCE=1: week one is spent reading logs/csp.log after exercising
// /login (Google popup), /register, /user-chat (Agora call) and /dashboard.
//
// Wiring (app.js):
//   const csp = require('./config/csp');
//   app.use(helmet({
//     contentSecurityPolicy: { useDefaults: false, directives: csp.directives, reportOnly: csp.reportOnly },
//     crossOriginEmbedderPolicy: false,
//     crossOriginOpenerPolicy: false,   // Firebase Google sign-in popup
//   }));
//
// Host list source: grep of src=https:// across views (gstatic, googletagmanager,
// cdn.socket.io, cdn.jsdelivr.net, cdnjs, download.agora.io, flaticon).
// 'unsafe-inline' stays for now: the templates carry hundreds of inline
// handlers and <script> blocks; nonces come after the D4 script bundle.

const directives = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'",
    'https://www.googletagmanager.com',
    'https://www.gstatic.com',
    'https://cdn.socket.io',
    'https://download.agora.io',
    'https://cdnjs.cloudflare.com',
    'https://cdn.jsdelivr.net',
  ],
  // Fonts are self-hosted (public/fonts, public/build/fonts): no Google Fonts hosts.
  'style-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
  'font-src': ["'self'", 'data:'],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https://api.banjaramatch.com',
    'https://cdn-icons-png.flaticon.com',
    'https://*.googleusercontent.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google.com',
    'https://*.doubleclick.net',
  ],
  'connect-src': [
    "'self'",
    'https://api.banjaramatch.com',
    'wss://api.banjaramatch.com',
    'https://*.agora.io',
    'wss://*.agora.io',
    'https://*.sd-rtn.com',
    'wss://*.sd-rtn.com',
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://www.googleapis.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
    'https://*.googletagmanager.com',
    'https://www.google.com',
    'https://*.doubleclick.net',
    'https://www.googleadservices.com',
  ],
  'frame-src': [
    'https://socialmedia-dcdd8.firebaseapp.com',
    'https://accounts.google.com',
    'https://www.googletagmanager.com',
    'https://td.doubleclick.net',
  ],
  'media-src': ["'self'", 'blob:'],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'", 'https://api.banjaramatch.com'],
  'frame-ancestors': ["'none'"],
  'upgrade-insecure-requests': [],
  'report-uri': ['/csp-report'],
};

module.exports = {
  reportOnly: process.env.CSP_ENFORCE !== '1',
  directives,
};
