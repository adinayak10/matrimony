/* global window */
// Royal Heritage: a banded double frame in deep colour and gold with filigree
// scrollwork corners on every page, Cormorant Garamond display type, an
// arched photo medallion and a scroll divider. Culture-neutral.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'royal-heritage',
    slug: 'royal-heritage',
    name: { en: 'Royal Heritage', hi: 'शाही विरासत' },
    tagline: 'A banded gold frame with filigree corners on every page: stately, formal and timeless.',
    description: 'Rich maroon, navy or emerald with gold: a banded double frame and scrollwork corners repeat on every page, with an arched photo above a Cormorant Garamond name.',
    categories: ['premium', 'traditional'],
    tags: ['royal', 'gold', 'frame', 'filigree', 'formal'],
    culture: 'neutral',
    archetype: 'frame',
    palettes: ['maroon-gold', 'royal-blue-gold', 'emerald-gold', 'plum-gold', 'wine-gold'],
    fonts: ['cormorant-lora', 'cormorant-poppins', 'playfair-lora'],
    photoPlacements: ['top-center', 'top-right', 'none'],
    defaults: {
      palette: 'maroon-gold',
      font: 'cormorant-lora',
      scale: 0.95,
      spacing: 'normal',
      photoPlacement: 'top-center',
      photoShape: 'arch',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { corner: 'filigree', mark: 'star', divider: 'scroll', watermark: 'mandala' },
    style: { border: 'band', cornerSize: 25, sideMarks: true, titleStyle: 'flank', caps: true, rowLines: 'hair', eyebrow: true, nameWeight: 600 },
    css: function () {
      var t = '.bd-t-royal-heritage';
      return [
        t + ' .bd-fcorner{color:var(--bd-accent)}',
        t + ' .bd-name{font-size:3.35em;letter-spacing:.01em;line-height:1}',
        t + ' .bd-eyebrow{letter-spacing:.5em}',
        t + ' .bd-headline{font-style:normal}',
        t + ' .bd-head-orn{width:70mm}',
        t + ' .bd-h{font-size:1.32em;letter-spacing:.14em}',
        t + ' .bd-h-t .bd-hi{font-size:.68em}',
        t + ' .bd-medal{border-color:var(--bd-accent);box-shadow:0 0 0 .9mm var(--bd-paper),0 0 0 1.25mm var(--bd-primary)}',
        t + ' .bd-runhead-name{font-size:1.45em}',
        t + ' .bd-invocation{font-size:1.15em}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
