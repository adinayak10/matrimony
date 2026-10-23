'use strict';
// The single navigation definition. The sidebar partial renders it; routes/pages.js
// registers one GET per item; test/routes.test.js walks it to assert the auth
// gate. `match` decides which item is highlighted for the current path
// (`/users/:id` highlights Users, `/blogs/*` highlights Blogs).
//
// `icon` is an id inside public/img/icons.svg (<use href="/img/icons.svg#id">).
// `pending: true` would mark an item whose page ships in a later deploy (the
// sidebar shows a "soon" tag); no item is pending since C6.

const item = (key, label, icon, extra = {}) => ({
  key,
  label,
  icon,
  href: `/${key}`,
  match: new RegExp(`^/${key}(?:/|$)`),
  ...extra,
});

const NAV = [
  {
    group: 'Overview',
    items: [
      item('dashboard', 'Dashboard', 'dashboard'),
      item('analytics', 'Analytics', 'bar-chart'),
    ],
  },
  {
    group: 'Members',
    items: [
      item('users', 'Users', 'users'),
      item('reports', 'Reports', 'flag'),
      item('photo-moderation', 'Photo moderation', 'image'),
      item('verifications', 'Verifications', 'shield-check'),
    ],
  },
  {
    group: 'Inbox',
    items: [
      item('contact-enquiries', 'Contact enquiries', 'mail'),
      item('community-feedback', 'Community feedback', 'message'),
      item('beta-testers', 'Beta testers', 'flask'),
    ],
  },
  {
    group: 'Content',
    items: [
      item('blogs', 'Blogs', 'file-text'),
      item('banners', 'Banners', 'layout'),
      item('regional-pages', 'Regional pages', 'map'),
      item('success-stories', 'Success stories', 'heart'),
      item('announcements', 'Announcements', 'megaphone'),
      item('faqs', 'FAQs', 'help-circle'),
      item('biodata-templates', 'Biodata templates', 'layout'),
      item('biodata-pages', 'Biodata pages', 'file-text'),
      item('master-data', 'Master data', 'database'),
    ],
  },
  {
    group: 'System',
    items: [
      item('settings', 'Settings', 'settings'),
      item('apk-manager', 'APK manager', 'smartphone'),
      item('broadcast-email', 'Broadcast email', 'send'),
      item('push-notifications', 'Push notifications', 'bell-ring'),
      item('audit-log', 'Audit log', 'history'),
    ],
  },
];

const ITEMS = NAV.flatMap((g) => g.items);
const BY_KEY = Object.fromEntries(ITEMS.map((i) => [i.key, i]));

function activeKeyFor(pathname) {
  const hit = ITEMS.find((i) => i.match.test(pathname));
  return hit ? hit.key : null;
}

module.exports = { NAV, ITEMS, BY_KEY, activeKeyFor };
