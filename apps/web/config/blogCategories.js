'use strict';
// Public blog category slugs: the Blog.category enum (apps/api/models/Blog.js)
// lowercased. /blogs/:category is a public URL, so an unknown value must 404
// instead of being reflected into the page (D1.8). Keep in sync with the enum.

const ENUM = ['Wedding', 'Relationship', 'Culture', 'Tradition', 'Tips', 'Events', 'Decoration', 'Stories', 'Community', 'General'];

const blogCategories = ENUM.map((c) => c.toLowerCase());

// 'culture' -> 'Culture' (the DB value); null for anything not in the enum.
function toEnumValue(slug) {
  if (typeof slug !== 'string') return null;
  const i = blogCategories.indexOf(slug.toLowerCase());
  return i === -1 ? null : ENUM[i];
}

module.exports = blogCategories;
module.exports.ENUM = ENUM;
module.exports.toEnumValue = toEnumValue;
module.exports.isCategory = (slug) => toEnumValue(slug) !== null;
