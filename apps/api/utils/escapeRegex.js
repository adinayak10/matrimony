'use strict';
/**
 * escapeRegex(input, max = 40)
 *
 * Makes user-supplied text safe to embed in `new RegExp()` / `$regex`:
 * - coerces to string, trims, caps the length (default 40 chars, A7.2)
 * - escapes every regex metacharacter
 *
 * Returns '' for empty/non-string input so callers can `if (!q) skip`.
 */
function escapeRegex(input, max = 40) {
  if (input === null || input === undefined) return '';
  let s = String(input).trim();
  if (!s) return '';
  if (max > 0 && s.length > max) s = s.slice(0, max);
  return s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/**
 * Convenience: a case-insensitive "contains" RegExp or null when empty.
 */
function containsRegex(input, max = 40) {
  const s = escapeRegex(input, max);
  return s ? new RegExp(s, 'i') : null;
}

module.exports = escapeRegex;
module.exports.escapeRegex = escapeRegex;
module.exports.containsRegex = containsRegex;
