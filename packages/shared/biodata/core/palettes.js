/* global window */
// Colour palettes for biodata documents. Every palette defines the same eight
// variables; the renderer exposes them as --bd-<name> CSS custom properties
// (band-ink becomes --bd-band-ink). Templates list which palettes they offer.
//
// primary  headings, name, ornaments        accent  secondary ornament / highlights
// ink      body text                        muted   labels, captions
// paper    page background                  rule    dividers and hairlines
// band     filled areas (header band, rail) bandInk text on band
(function (K) {
  'use strict';

  function p(name, primary, accent, ink, muted, paper, rule, band, bandInk) {
    return {
      name: name,
      vars: { primary: primary, accent: accent, ink: ink, muted: muted, paper: paper, rule: rule, band: band, bandInk: bandInk },
    };
  }

  K.palettes = {
    'maroon-gold': p('Maroon & Gold', '#7b1e2c', '#b08433', '#2a1c1d', '#6e5c5a', '#fffdfa', '#dcc59a', '#7b1e2c', '#fbf3e2'),
    'royal-blue-gold': p('Royal Blue & Gold', '#1c3768', '#b08433', '#1b2233', '#5b6477', '#ffffff', '#d6c8a2', '#1c3768', '#f6efdc'),
    'emerald-gold': p('Emerald & Gold', '#0d5444', '#b08433', '#17251f', '#56665f', '#fdfefc', '#cfd9b8', '#0d5444', '#f3eedb'),
    'plum-gold': p('Plum & Gold', '#5e1f4a', '#b08433', '#261a22', '#685a63', '#fffdfd', '#dfc8a8', '#5e1f4a', '#f8efe0'),
    'rose-marigold': p('Rose & Marigold', '#be123c', '#d97706', '#2a1b20', '#6b5860', '#ffffff', '#f4c7d1', '#be123c', '#ffffff'),
    'saffron': p('Saffron', '#b4480e', '#7c2d12', '#2b1d14', '#6d5b4f', '#fffdfa', '#efcfa9', '#b4480e', '#fff8ef'),
    'peacock': p('Peacock', '#0b5d6b', '#b8862b', '#152328', '#56676c', '#ffffff', '#bcd8d8', '#0b5d6b', '#f2f8f7'),
    'teal-coral': p('Teal & Coral', '#0f766e', '#e0634c', '#1a2726', '#5a6b69', '#ffffff', '#c3dfdb', '#0f766e', '#ffffff'),
    'navy-slate': p('Navy & Slate', '#1e2a44', '#4f6d9a', '#1d2330', '#5f6878', '#ffffff', '#d5dbe5', '#1e2a44', '#ffffff'),
    'charcoal-gold': p('Charcoal & Gold', '#2b2b2e', '#a8843e', '#232326', '#68686e', '#ffffff', '#dcd3bf', '#2b2b2e', '#f4ecd9'),
    'sage': p('Sage', '#3d5a40', '#9a7b3c', '#1f2a20', '#5f6b5f', '#fdfefb', '#cfdcc9', '#3d5a40', '#f4f7ef'),
    'blush': p('Blush', '#9d3a5a', '#c08a5b', '#2b1f24', '#6e5d64', '#fffefe', '#efd2db', '#9d3a5a', '#fff7f9'),
    'indigo': p('Indigo', '#312e81', '#7c6ad6', '#1e1d33', '#5f5e78', '#ffffff', '#d8d6f0', '#312e81', '#ffffff'),
    'ink': p('Black & White', '#000000', '#000000', '#000000', '#3a3a3a', '#ffffff', '#000000', '#ffffff', '#000000'),
    'graphite': p('Graphite', '#1f1f1f', '#5c5c5c', '#141414', '#4d4d4d', '#ffffff', '#9a9a9a', '#ffffff', '#141414'),
    // Templates track A (sidebar / band archetypes)
    'slate-teal': p('Slate & Teal', '#17324a', '#0e8784', '#1b2530', '#5a6775', '#ffffff', '#cddbe0', '#1e3242', '#eef5f6'),
    'blush-charcoal': p('Blush & Charcoal', '#2e2a2d', '#bf7286', '#262224', '#6d6468', '#ffffff', '#ecd3da', '#f8e8ec', '#2e2a2d'),
    'dove-blue': p('Dove Blue', '#34537a', '#9a8152', '#1f2a37', '#5c6979', '#fbf9f3', '#d2dae4', '#e6ecf3', '#23374f'),
    'saffron-navy': p('Saffron & Navy', '#1c2a52', '#dc7410', '#1b2133', '#5a6174', '#ffffff', '#efd3b0', '#1c2a52', '#fff6ea'),
  };

  // Frame, hero and regional templates (track B). Regional names describe a
  // colour mood only; every palette works with every community.
  [
    ['rose-sage', 'Rose & Sage', '#a3405f', '#6f8f6a', '#2b2226', '#6d5d63', '#ffffff', '#ecd3db', '#a3405f', '#ffffff'],
    ['sage-rose', 'Sage & Rose', '#4f6f52', '#c0607a', '#1f2a21', '#5f6b60', '#ffffff', '#d5e0d0', '#4f6f52', '#ffffff'],
    ['mauve-sage', 'Mauve & Sage', '#6b4a72', '#7d9a76', '#261f29', '#695f6c', '#ffffff', '#e2d6e6', '#6b4a72', '#ffffff'],
    ['midnight-gold', 'Midnight & Gold', '#1b2438', '#b8954a', '#1c2130', '#5d6474', '#ffffff', '#ddd3bd', '#151c2c', '#f3e7cc'],
    ['wine-gold', 'Wine & Gold', '#5a1a2c', '#b8954a', '#2a1a1f', '#6c5a5f', '#ffffff', '#e3cfc0', '#3e1220', '#f6e8d2'],
    ['saffron-maroon', 'Saffron & Maroon', '#8f1d22', '#e07b00', '#2a1a14', '#6e5a4e', '#fffefb', '#f0d4a8', '#8f1d22', '#fff4e2'],
    ['deccan-maroon', 'Deccan Maroon', '#6d1a36', '#c9962b', '#2a1a20', '#6c5a60', '#fffefc', '#ead2b0', '#6d1a36', '#fff3dd'],
    ['rajasthani-pink', 'Rajasthani Pink', '#c2185b', '#e39b17', '#2b1a22', '#6e5862', '#ffffff', '#f6cddd', '#c2185b', '#fff5f9'],
    ['punjabi-saffron', 'Punjabi Saffron', '#d0590b', '#8e1b5a', '#2b1c14', '#6f5c50', '#ffffff', '#f5d3b5', '#d0590b', '#fff6ee'],
    ['kerala-green', 'Kerala Green', '#1e5f3a', '#b8912f', '#18261d', '#566a5c', '#ffffff', '#dfd5b0', '#1e5f3a', '#fbf5e2'],
    ['bengal-red', 'Bengal Red', '#b3141c', '#b08433', '#221a1a', '#6b5a5a', '#ffffff', '#f1c9c9', '#b3141c', '#ffffff'],
  ].forEach(function (r) {
    if (!K.palettes[r[0]]) K.palettes[r[0]] = p(r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9]);
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
