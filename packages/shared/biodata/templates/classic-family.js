/* global window */
// Classic Family-Oriented: a calm navy document with a left-aligned header,
// tinted section bands and dotted rows, Lora headings over DM Sans. Family
// details come first by default. Culture-neutral.
(function (K) {
  'use strict';

  var ORDER = ['family', 'personal', 'education', 'profession', 'income', 'religion', 'lifestyle', 'partner', 'contact', 'additional'];

  K.registry.register({
    id: 'classic-family',
    slug: 'classic-family-oriented',
    name: { en: 'Classic Family-Oriented', hi: 'पारिवारिक क्लासिक' },
    tagline: 'Family details first, in calm navy with tinted section bands: clear, warm and dependable.',
    description: 'Opens with your family background, then your own details: a left-aligned header, soft navy section bands and dotted rows set in Lora and DM Sans.',
    categories: ['traditional', 'minimal'],
    tags: ['navy', 'family', 'simple', 'classic', 'clean'],
    culture: 'neutral',
    archetype: 'classic',
    palettes: ['navy-slate', 'royal-blue-gold', 'peacock', 'sage', 'indigo'],
    fonts: ['lora-dmsans', 'playfair-lora', 'cormorant-lora'],
    photoPlacements: ['top-right', 'top-center', 'none'],
    defaults: {
      palette: 'navy-slate',
      font: 'lora-dmsans',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'top-right',
      photoShape: 'rounded',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: ORDER.slice(),
      hiddenSections: [],
    },
    ornaments: {},
    style: { frame: 'single', corners: false, titleStyle: 'band', caps: false, colon: true, rowLines: 'dotted', eyebrow: true, headerAlign: 'left', nameWeight: 600 },
    css: function () {
      var t = '.bd-t-classic-family';
      return [
        t + ' .bd-frame{border-width:.6pt;border-color:var(--bd-rule)}',
        t + ' .bd-frame::before{content:"";position:absolute;left:-.3mm;right:-.3mm;top:-.3mm;height:2.2mm;background:var(--bd-primary)}',
        t + ' .bd-name{font-size:2.7em;letter-spacing:-.005em}',
        t + ' .bd-eyebrow{letter-spacing:.3em;padding-left:0;color:var(--bd-accent)}',
        t + ' .bd-head-hr{border-top:1.2pt solid var(--bd-primary);width:22mm}',
        t + ' .bd-h{font-size:1.14em}',
        t + ' .bd-h-band{background:color-mix(in srgb,var(--bd-accent) 11%,var(--bd-paper));border-left-width:1mm;padding:.9mm 3mm;border-radius:0 1.2mm 1.2mm 0}',
        t + ' .bd-title{margin-top:calc(3.5mm * var(--bd-sp));margin-bottom:calc(1.1mm * var(--bd-sp))}',
        t + ' .bd-photo-right{border-color:var(--bd-rule)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
