'use strict';
/**
 * services/biodataKit.js — the one place the API loads the shared biodata kit
 * (`@banjaramatch/shared/biodata`, contract §1). Lazy: requiring this module
 * never loads the kit, so the boot test and unrelated routes keep working
 * even if the kit fails to load.
 *
 *   kit()        the kit object (throws if it cannot be loaded)
 *   available()  true when the kit loads
 *   pagesContent() the seed content module (contract §2b), or null
 */
let cached = null;

function kit() {
  if (!cached) {
    // eslint-disable-next-line global-require
    cached = require('@banjaramatch/shared/biodata');
  }
  return cached;
}

function available() {
  try {
    kit();
    return true;
  } catch (_) {
    return false;
  }
}

function pagesContent() {
  try {
    // eslint-disable-next-line global-require
    const pages = require('@banjaramatch/shared/biodata/content/pages');
    return Array.isArray(pages) ? pages : Array.isArray(pages && pages.default) ? pages.default : null;
  } catch (_) {
    return null;
  }
}

module.exports = { kit, available, pagesContent };
