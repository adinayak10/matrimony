/* global window */
// Sikh Classic: a navy band with a saffron stripe and a phulkari-inspired
// diamond lattice, photo on the left, an Ik Onkar line (editable or
// removable), Lora headings over DM Sans and saffron-tinted title bars.
// Amritdhari appears through the schema when religion is Sikh.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'sikh-classic',
    slug: 'sikh-classic',
    name: { en: 'Sikh Classic', hi: 'सिख क्लासिक' },
    tagline: 'Navy and saffron with a phulkari-inspired lattice and an optional Ik Onkar line.',
    description: 'A confident navy header band with a saffron stripe and a fine phulkari-style diamond lattice, photo on the left and two tidy columns. The Ik Onkar line is optional and editable; Amritdhari shows when religion is set to Sikh.',
    categories: ['community', 'traditional'],
    tags: ['sikh', 'anand karaj', 'saffron', 'navy', 'phulkari', 'header band'],
    culture: 'sikh',
    archetype: 'band',
    palettes: ['saffron-navy', 'saffron', 'royal-blue-gold', 'navy-slate', 'maroon-gold'],
    fonts: ['lora-dmsans', 'playfair-dmsans', 'playfair-poppins'],
    photoPlacements: ['band-left', 'band-right', 'none'],
    defaults: {
      palette: 'saffron-navy',
      font: 'lora-dmsans',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'band-left',
      photoShape: 'circle',
      labelLanguage: 'en',
      invocation: 'ੴ ਸਤਿ ਨਾਮੁ',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: {},
    style: { pattern: 'lattice', patternOpacity: 0.16, align: 'left', bandEdge: 'stripe', titleStyle: 'bar', caps: true, colDivider: false },
    css: function () {
      var t = '.bd-t-sikh-classic';
      return [
        t + ' .bd-band-inv{font-family:"Noto Sans Gurmukhi",Raavi,"Nirmala UI",var(--bd-font-display);font-size:1.3em;letter-spacing:.02em}',
        t + ' .bd-name{font-weight:600}',
        t + ' .bd-h{font-family:var(--bd-font-body);font-weight:700;font-size:.86em;letter-spacing:.16em;color:var(--bd-primary)}',
        t + ' .bd-h-bar{background:color-mix(in srgb,var(--bd-accent) 11%,var(--bd-paper));padding:1.5mm 2.8mm}',
        t + ' .bd-h-t .bd-hi{display:inline;margin-left:.7em;font-size:.95em;font-weight:500}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
