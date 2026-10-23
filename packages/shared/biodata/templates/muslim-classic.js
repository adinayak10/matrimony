/* global window */
// Muslim Classic: an emerald band with a gold girih-style geometric tile and
// a row of small arches on its lower edge, a centred name and an optional
// Bismillah line (dir="auto", editable or removable). The sect field appears
// through the schema when religion is Muslim.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'muslim-classic',
    slug: 'muslim-classic',
    name: { en: 'Muslim Classic', hi: 'मुस्लिम क्लासिक' },
    tagline: 'Emerald and gold with a geometric girih pattern and an optional Bismillah line.',
    description: 'A graceful emerald header band with gold geometric patterning and arches, a centred name and two clear columns. The Bismillah line is optional and editable; sect shows when religion is set to Muslim.',
    categories: ['community', 'premium'],
    tags: ['muslim', 'nikah', 'emerald', 'gold', 'geometric', 'header band'],
    culture: 'muslim',
    archetype: 'band',
    palettes: ['emerald-gold', 'peacock', 'royal-blue-gold', 'maroon-gold', 'charcoal-gold'],
    fonts: ['playfair-lora', 'cormorant-lora', 'playfair-poppins'],
    photoPlacements: ['band-right', 'band-left', 'none'],
    defaults: {
      palette: 'emerald-gold',
      font: 'playfair-lora',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'band-right',
      photoShape: 'circle',
      labelLanguage: 'en',
      invocation: 'بسم الله الرحمن الرحيم',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: { mark: 'star8' },
    style: { pattern: 'girih', patternOpacity: 0.24, align: 'center', bandEdge: 'arches', titleStyle: 'center', caps: true, colDivider: true },
    css: function () {
      var t = '.bd-t-muslim-classic';
      return [
        t + ' .bd-band-inv{font-family:"Noto Naskh Arabic","Amiri","Traditional Arabic","Segoe UI",Arial,var(--bd-font-display);font-size:1.5em;' +
          'letter-spacing:0;line-height:1.5;margin-bottom:1.6mm}',
        t + ' .bd-name{font-weight:500;letter-spacing:.01em}',
        t + ' .bd-h{font-size:1.06em;letter-spacing:.14em}',
        t + ' .bd-cols::before{border-left-style:dotted;border-left-width:.8pt}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
