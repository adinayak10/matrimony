/* global window */
// Christian Classic: an ivory, document-like page with a dove-blue rail on
// the right, a centred serif header with an optional blessing line, Cormorant
// Garamond over Lora. The invocation is a neutral, editable line; denomination
// and church fields appear through the schema when religion is Christian.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'christian-classic',
    slug: 'christian-classic',
    name: { en: 'Christian Classic', hi: 'क्रिश्चियन क्लासिक' },
    tagline: 'Dove blue on ivory with a gentle blessing line and graceful serif type.',
    description: 'A calm, document-style biodata with a dove-blue side panel, centred serif header and an optional blessing line you can change or remove. Denomination and church details show when religion is set to Christian.',
    categories: ['community', 'traditional'],
    tags: ['christian', 'dove blue', 'ivory', 'serif', 'two-column', 'blessing'],
    culture: 'christian',
    archetype: 'sidebar',
    palettes: ['dove-blue', 'navy-slate', 'royal-blue-gold', 'sage', 'charcoal-gold'],
    fonts: ['cormorant-lora', 'lora-dmsans', 'playfair-lora'],
    photoPlacements: ['rail', 'none'],
    defaults: {
      palette: 'dove-blue',
      font: 'cormorant-lora',
      scale: 0.95,
      spacing: 'normal',
      photoPlacement: 'rail',
      photoShape: 'rounded',
      labelLanguage: 'en',
      invocation: 'With God’s blessings',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { divider: 'diamond', rail: 'diamond' },
    style: {
      railSide: 'right', railFill: 'band', titleStyle: 'underline', nameStyle: 'display', nameWeight: 600, rowLines: 'dotted',
      photoFrame: 'ring', eyebrow: true, headerAlign: 'center',
    },
    css: function () {
      var t = '.bd-t-christian-classic';
      return [
        t + ' .bd-invocation{font-style:italic;font-size:1.2em;color:var(--bd-accent);letter-spacing:.02em}',
        t + ' .bd-name{font-size:3.1em;letter-spacing:.01em}',
        t + ' .bd-h{font-family:var(--bd-font-display);font-size:1.12em;letter-spacing:.1em;font-weight:600}',
        t + ' .bd-h-underline{border-bottom:.5pt solid var(--bd-primary)}',
        t + ' .bd-h .bd-hi{font-family:var(--bd-font-body);font-size:.72em}',
        t + ' .bd-rh{font-family:var(--bd-font-display);font-size:.98em;letter-spacing:.12em}',
        t + ' .bd-rail-orn{width:22mm;margin-left:-11mm}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
