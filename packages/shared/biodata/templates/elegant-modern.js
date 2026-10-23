/* global window */
// Elegant Modern Minimal: a soft blush rail, an arch-framed photo with an
// offset outline, Playfair Display headings over Poppins in charcoal.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'elegant-modern',
    slug: 'elegant-modern-minimal',
    name: { en: 'Elegant Modern Minimal', hi: 'सुरुचिपूर्ण आधुनिक' },
    tagline: 'Blush and charcoal with an arched photo frame and graceful serif headings.',
    description: 'A soft blush side panel, an arch-shaped photo with a fine offset outline and Playfair Display headings: modern, understated and elegant.',
    categories: ['modern', 'minimal', 'premium'],
    tags: ['elegant', 'blush', 'charcoal', 'serif', 'two-column', 'arch photo'],
    culture: 'neutral',
    archetype: 'sidebar',
    palettes: ['blush-charcoal', 'blush', 'sage', 'plum-gold', 'dove-blue'],
    fonts: ['playfair-poppins', 'playfair-dmsans', 'cormorant-poppins'],
    photoPlacements: ['rail', 'none'],
    defaults: {
      palette: 'blush-charcoal',
      font: 'playfair-poppins',
      scale: 0.95,
      spacing: 'normal',
      photoPlacement: 'rail',
      photoShape: 'arch',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { rail: 'bead', title: 'star' },
    style: { railFill: 'band', titleStyle: 'serif', nameStyle: 'display', nameWeight: 500, rowLines: 'none', photoFrame: 'offset', eyebrow: true, tightValue: 11 },
    css: function () {
      var t = '.bd-t-elegant-modern';
      return [
        t + ' .bd-name{font-size:2.95em;letter-spacing:-.005em}',
        t + ' .bd-eyebrow{letter-spacing:.46em}',
        t + ' .bd-h-serif{font-weight:500;color:var(--bd-primary)}',
        t + ' .bd-h-serif .bd-h-orn{width:2.6mm}',
        t + ' .bd-title{padding-bottom:1.2mm;border-bottom:.5pt solid var(--bd-rule)}',
        t + ' .bd-row{padding:calc(.24em * var(--bd-sp)) 0}',
        t + ' .bd-h-serif{font-size:1.22em}',
        t + ' .bd-l{font-weight:400}',
        t + ' .bd-rh{font-family:var(--bd-font-display);font-weight:500;font-size:1.05em;letter-spacing:.02em;text-transform:none;color:var(--bd-primary);' +
          'border-bottom-color:var(--bd-accent)}',
        t + ' .bd-rh .bd-hi{font-family:var(--bd-font-body);font-size:.75em}',
        t + ' .bd-rf-l{color:var(--bd-accent);font-weight:600;letter-spacing:.12em}',
        t + ' .bd-runhead-name{font-weight:500}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
