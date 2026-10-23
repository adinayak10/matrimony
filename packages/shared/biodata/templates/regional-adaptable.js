/* global window */
// Regional-Adaptable: bilingual English + Hindi labels by default, a woven
// saree-border stripe along the top and bottom of every page, a paisley
// divider and regional colour palettes (Deccan maroon, Rajasthani pink,
// Punjabi saffron, Kerala green, Bengal red). Palette names describe colour
// only: every palette and label language works for every family.
(function (K) {
  'use strict';

  // Woven border: a primary band with a row of zari dots, edged by a paper
  // gap and fine accent lines (top of the page; a slimmer band at the foot).
  var EDGE = 'linear-gradient(var(--bd-accent),var(--bd-accent))';
  var GAP = 'linear-gradient(var(--bd-paper),var(--bd-paper))';
  var DOTS = 'radial-gradient(circle,var(--bd-accent) 0 .42mm,transparent .5mm) 0 1mm/2.8mm 3.6mm repeat-x';

  K.registry.register({
    id: 'regional-adaptable',
    slug: 'regional-bilingual',
    name: { en: 'Regional-Adaptable', hi: 'क्षेत्रीय द्विभाषी' },
    tagline: 'English and Hindi labels side by side, a woven border stripe and regional colours.',
    description: 'Bilingual by default (switch to English or Hindi any time), with a saree-border stripe on every page, a paisley divider and palettes inspired by regional textiles.',
    categories: ['regional', 'traditional'],
    tags: ['bilingual', 'hindi', 'regional', 'paisley', 'border'],
    culture: 'regional',
    archetype: 'classic',
    palettes: ['deccan-maroon', 'rajasthani-pink', 'punjabi-saffron', 'kerala-green', 'bengal-red'],
    fonts: ['cormorant-poppins', 'playfair-poppins', 'lora-dmsans'],
    photoPlacements: ['top-right', 'top-center', 'none'],
    defaults: {
      palette: 'deccan-maroon',
      font: 'cormorant-poppins',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'top-right',
      photoShape: 'arch',
      labelLanguage: 'both',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { divider: 'paisley' },
    style: { frame: 'none', corners: false, titleStyle: 'underline', caps: true, colon: true, rowLines: 'hair', eyebrow: true },
    css: function () {
      var t = '.bd-t-regional-adaptable';
      return [
        t + ' .bd-page::before,' + t + ' .bd-page::after{content:"";position:absolute;left:0;right:0;pointer-events:none}',
        t + ' .bd-page::before{top:0;height:6.6mm;background:' + EDGE + ' 0 100%/100% .5mm no-repeat,' +
          GAP + ' 0 calc(100% - .5mm)/100% .8mm no-repeat,' + EDGE + ' 0 calc(100% - 1.3mm)/100% .35mm no-repeat,' +
          DOTS + ',var(--bd-primary)}',
        t + ' .bd-page::after{bottom:0;height:4.2mm;background:' + EDGE + ' 0 0/100% .5mm no-repeat,' +
          GAP + ' 0 .5mm/100% .8mm no-repeat,' + EDGE + ' 0 1.3mm/100% .35mm no-repeat,var(--bd-primary)}',
        t + ' .bd-sheet{top:15.5mm}',
        t + ' .bd-name{font-size:3.15em}',
        t + ' .bd-head-orn{width:66mm}',
        t + ' .bd-h{font-size:1.24em;letter-spacing:.1em}',
        t + ' .bd-h-underline{border-bottom:.6pt solid var(--bd-accent);padding-bottom:1mm}',
        t + ' .bd-h-t .bd-hi{color:var(--bd-primary);opacity:.8}',
        t + ' .bd-photo-right{border-color:var(--bd-accent)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
