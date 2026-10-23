/* global window */
// Premium Traditional Indian: maroon and gold on a double-ruled frame with
// lotus and corner ornaments, Playfair Display headings over Poppins.
// Culture-neutral: the invocation line is empty by default.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'premium-traditional',
    slug: 'premium-traditional-indian',
    name: { en: 'Premium Traditional Indian', hi: 'प्रीमियम पारंपरिक' },
    tagline: 'Maroon and gold with a double frame and lotus details: the layout families recognise at a glance.',
    description: 'A timeless Indian biodata: centred name, lotus divider, gold-ruled frame with corner ornaments and neatly aligned details. Works for every community.',
    categories: ['traditional', 'premium'],
    tags: ['maroon', 'gold', 'ornamental', 'classic', 'family'],
    culture: 'neutral',
    archetype: 'classic',
    palettes: ['maroon-gold', 'royal-blue-gold', 'emerald-gold', 'plum-gold', 'peacock'],
    fonts: ['playfair-poppins', 'cormorant-lora', 'playfair-lora', 'cormorant-poppins'],
    photoPlacements: ['top-right', 'top-center', 'none'],
    defaults: {
      palette: 'maroon-gold',
      font: 'playfair-poppins',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'top-right',
      photoShape: 'rounded',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { divider: 'lotus', corner: 'corner', watermark: 'mandala', title: 'bead' },
    style: { frame: 'double', corners: true, titleStyle: 'rule', caps: true, colon: true, rowLines: 'hair', eyebrow: true },
    css: function () {
      var t = '.bd-t-premium-traditional';
      return [
        t + ' .bd-name{font-size:3em}',
        t + ' .bd-corner{color:var(--bd-accent)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
