'use strict';
// Avatar URL helper, promoted from views/pages/blocked-users.ejs photoUrl()
// so every template builds the same URL. Registered as app.locals.photoUrl. (D1.18)
//
//   photoUrl()                         -> '/images/default-user.jpg'
//   photoUrl('https://…/x.jpg')         -> unchanged
//   photoUrl('uploads/abc.jpg')         -> 'https://api.banjaramatch.com/uploads/abc.jpg'
//
// Photos are stored as paths relative to the API host (User.profile), which is
// why the public API origin, not the loopback one, is used here: the browser
// loads the image. API_PUBLIC_URL is env-fixed; the default is today's host.

const DEFAULT_AVATAR = '/images/default-user.jpg';
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || 'https://api.banjaramatch.com').replace(/\/+$/, '');

function photoUrl(p) {
  if (!p || typeof p !== 'string') return DEFAULT_AVATAR;
  const s = p.trim();
  if (!s) return DEFAULT_AVATAR;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/images/')) return s; // already a site asset (e.g. a default)
  return `${API_PUBLIC_URL}/${s.replace(/^\/+/, '')}`;
}

module.exports = photoUrl;
module.exports.DEFAULT_AVATAR = DEFAULT_AVATAR;
