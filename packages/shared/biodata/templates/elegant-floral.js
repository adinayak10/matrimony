/* global window */
// Elegant Floral: a fine double rule with blossom-and-vine corner sprays on
// every page, rose and sage tones, Playfair Display in title case, a round
// photo and a leafy vine divider. Culture-neutral.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'elegant-floral',
    slug: 'elegant-floral',
    name: { en: 'Elegant Floral', hi: 'सुरुचिपूर्ण पुष्प' },
    tagline: 'Soft rose and sage with blossom corners and a leafy vine: graceful and light.',
    description: 'Blossom-and-vine sprays in each corner of a fine frame, rose and sage tones, a round photo and gentle Playfair Display headings.',
    categories: ['premium', 'modern'],
    tags: ['floral', 'rose', 'sage', 'frame', 'soft'],
    culture: 'neutral',
    archetype: 'frame',
    palettes: ['rose-sage', 'sage-rose', 'mauve-sage', 'blush'],
    fonts: ['playfair-lora', 'playfair-dmsans', 'cormorant-lora'],
    photoPlacements: ['top-center', 'top-right', 'none'],
    defaults: {
      palette: 'rose-sage',
      font: 'playfair-lora',
      scale: 0.95,
      spacing: 'normal',
      photoPlacement: 'top-center',
      photoShape: 'circle',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { corner: 'floral', divider: 'vine', title: 'bead' },
    style: { border: 'fine', cornerSize: 30, sideMarks: false, titleStyle: 'center', caps: false, rowLines: 'hair', eyebrow: true, nameWeight: 500 },
    css: function () {
      var t = '.bd-t-elegant-floral';
      return [
        t + ' .bd-name{font-size:2.75em;letter-spacing:.005em}',
        t + ' .bd-eyebrow{color:var(--bd-primary);opacity:.8}',
        t + ' .bd-head-orn{width:66mm}',
        t + ' .bd-h{font-weight:500;font-size:1.24em;line-height:1.15}',
        t + ' .bd-h-orn{width:12mm;color:var(--bd-accent);margin-top:.2mm}',
        t + ' .bd-medal{border-color:var(--bd-accent);border-style:dashed;border-width:.7pt}',
        t + ' .bd-l{color:color-mix(in srgb,var(--bd-primary) 55%,var(--bd-muted))}',
        t + ' .bd-title{margin-top:calc(3mm * var(--bd-sp))}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
