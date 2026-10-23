/* global window */
// Hindu Classic: saffron and maroon on a single frame with corner flourishes,
// a marigold garland under the name, centred titles between marigold blooms and Playfair
// Display. The template only prefills the invocation line and palette; both
// stay editable. Religion-specific fields (gotra, raasi, nakshatra, manglik)
// come from the schema when religion is Hindu, not from this template.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'hindu-classic',
    slug: 'hindu-classic',
    name: { en: 'Hindu Classic', hi: 'हिंदू क्लासिक' },
    tagline: 'Saffron and maroon with a marigold garland and an invocation line you can change or remove.',
    description: 'A festive traditional layout: an optional invocation (prefilled with ॥ श्री गणेशाय नमः ॥), a marigold garland divider, corner flourishes and centred headings. Gotra, raasi and nakshatra appear when the religion is Hindu.',
    categories: ['community', 'traditional'],
    tags: ['hindu', 'saffron', 'maroon', 'marigold', 'invocation'],
    culture: 'hindu',
    archetype: 'classic',
    palettes: ['saffron-maroon', 'saffron', 'maroon-gold', 'rose-marigold', 'peacock'],
    fonts: ['playfair-poppins', 'playfair-lora', 'cormorant-poppins'],
    photoPlacements: ['top-right', 'top-center', 'none'],
    defaults: {
      palette: 'saffron-maroon',
      font: 'playfair-poppins',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'top-right',
      photoShape: 'rounded',
      labelLanguage: 'en',
      invocation: '॥ श्री गणेशाय नमः ॥',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { divider: 'marigold', corner: 'corner', title: 'bloom' },
    style: { frame: 'single', corners: true, titleStyle: 'ornate', caps: true, colon: true, rowLines: 'hair', eyebrow: true },
    css: function () {
      var t = '.bd-t-hindu-classic';
      return [
        t + ' .bd-frame{border:1.2pt solid var(--bd-accent)}',
        t + ' .bd-frame::after{content:"";position:absolute;inset:1.2mm;border:.5pt solid var(--bd-primary);opacity:.6}',
        t + ' .bd-corner{color:var(--bd-primary)}',
        t + ' .bd-invocation{color:var(--bd-primary);font-size:1.18em;font-weight:600;margin-bottom:1.6mm}',
        t + ' .bd-name{font-size:2.9em}',
        t + ' .bd-head-orn{width:70mm;margin-top:2.2mm}',
        t + ' .bd-h{font-size:1.1em;letter-spacing:.12em}',
        t + ' .bd-title{margin-top:calc(3.6mm * var(--bd-sp));margin-bottom:calc(1mm * var(--bd-sp))}',
        t + ' .bd-photo-right{border-color:var(--bd-accent)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
