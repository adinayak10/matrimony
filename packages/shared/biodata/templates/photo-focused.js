/* global window */
// Premium Photo-Focused: page 1 opens with a full-bleed charcoal hero, the
// portrait fading into it, the name over the gradient and a gold key-facts
// strip. Without a photo it becomes a typographic hero with a monogram.
// Playfair Display over Poppins. Culture-neutral.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'photo-focused',
    slug: 'premium-photo-focused',
    name: { en: 'Premium Photo-Focused', hi: 'प्रीमियम फ़ोटो-केंद्रित' },
    tagline: 'A magazine-style cover: your photo full width, name over a soft gradient and a strip of key facts.',
    description: 'Opens with a large photograph that fades into charcoal, the name set over it and age, height, education, work and city in a gold strip. Without a photo it becomes an elegant monogram cover.',
    categories: ['photo', 'premium', 'modern'],
    tags: ['photo', 'charcoal', 'gold', 'magazine', 'modern'],
    culture: 'neutral',
    archetype: 'hero',
    palettes: ['charcoal-gold', 'midnight-gold', 'wine-gold', 'emerald-gold', 'navy-slate'],
    fonts: ['playfair-poppins', 'playfair-dmsans', 'cormorant-poppins'],
    photoPlacements: ['hero', 'none'],
    defaults: {
      palette: 'charcoal-gold',
      font: 'playfair-poppins',
      scale: 0.95,
      spacing: 'normal',
      photoPlacement: 'hero',
      photoShape: 'square',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { mark: 'star' },
    style: { heroHeight: 100, plainHeight: 80, photoWidth: 100, facts: true, caps: false, colon: false, rowLines: 'hair', pairs: true },
    css: function () {
      var t = '.bd-t-photo-focused';
      return [
        t + ' .bd-l{color:var(--bd-muted);font-weight:400}',
        t + ' .bd-runhead-name{font-weight:600}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
