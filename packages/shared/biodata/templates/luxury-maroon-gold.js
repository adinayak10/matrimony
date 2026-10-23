/* global window */
// Luxury Maroon & Gold: a deep maroon header band with a gold jaali trellis,
// a gold double rule, a round photo with a gold ring, Cormorant Garamond
// display type and two balanced columns of details.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'luxury-maroon-gold',
    slug: 'luxury-maroon-gold',
    name: { en: 'Luxury Maroon & Gold', hi: 'लक्ज़री मैरून और गोल्ड' },
    tagline: 'A rich maroon band with a gold jaali pattern, round portrait and two elegant columns.',
    description: 'A statement header band in deep maroon with a fine gold trellis, a gold-ringed round photo and Cormorant Garamond type over two neatly balanced columns.',
    categories: ['premium', 'traditional'],
    tags: ['maroon', 'gold', 'luxury', 'jaali', 'header band', 'two-column'],
    culture: 'neutral',
    archetype: 'band',
    palettes: ['maroon-gold', 'plum-gold', 'royal-blue-gold', 'emerald-gold', 'charcoal-gold'],
    fonts: ['cormorant-poppins', 'cormorant-lora', 'playfair-poppins'],
    photoPlacements: ['band-right', 'band-left', 'none'],
    defaults: {
      palette: 'maroon-gold',
      font: 'cormorant-poppins',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'band-right',
      photoShape: 'circle',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { mark: 'quatrefoil', divider: 'lotus' },
    style: { pattern: 'jaali', patternOpacity: 0.26, align: 'left', bandEdge: 'rule', titleStyle: 'mark', caps: true, colDivider: true, footRule: true },
    css: function () {
      var t = '.bd-t-luxury-maroon-gold';
      return [
        t + ' .bd-name{font-size:3.35em;letter-spacing:.01em}',
        t + ' .bd-name-l{font-size:2.7em}' + t + ' .bd-name-xl{font-size:2.15em}',
        t + ' .bd-h{font-size:1.24em;letter-spacing:.1em}',
        t + ' .bd-h-t .bd-hi{font-size:.66em}',
        t + ' .bd-band-orn{width:40mm}',
        t + ' .bd-slim-name{font-size:1.55em}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
