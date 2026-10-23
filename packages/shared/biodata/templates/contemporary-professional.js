/* global window */
// Contemporary Professional: a deep slate rail with the photo, key facts and
// contact, a crisp DM Sans main column with teal tracked section titles.
// Reads like a modern CV; culture-neutral.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'contemporary-professional',
    slug: 'contemporary-professional',
    name: { en: 'Contemporary Professional', hi: 'समकालीन प्रोफेशनल' },
    tagline: 'A slate side rail for photo, key facts and contact beside a crisp, modern main column.',
    description: 'A modern two-column biodata: the side rail puts photo, age, height, education and contact at a glance, while family, career and preferences read cleanly in the main column.',
    categories: ['modern', 'premium'],
    tags: ['modern', 'professional', 'two-column', 'sidebar', 'slate', 'teal'],
    culture: 'neutral',
    archetype: 'sidebar',
    palettes: ['slate-teal', 'navy-slate', 'teal-coral', 'indigo', 'charcoal-gold', 'peacock'],
    fonts: ['dmsans', 'poppins', 'lora-dmsans', 'playfair-dmsans'],
    photoPlacements: ['rail', 'none'],
    defaults: {
      palette: 'slate-teal',
      font: 'dmsans',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'rail',
      photoShape: 'rounded',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: {},
    style: { railFill: 'band', titleStyle: 'rule', nameStyle: 'caps', nameWeight: 700, rowLines: 'hair', photoFrame: 'none', eyebrow: true },
    css: function () {
      var t = '.bd-t-contemporary-professional';
      return [
        t + ' .bd-h{color:var(--bd-accent)}',
        t + ' .bd-name{letter-spacing:.05em}',
        t + ' .bd-headline{font-weight:500;color:var(--bd-ink)}',
        t + ' .bd-rh{color:color-mix(in srgb,var(--bd-accent) 55%,var(--bd-band-ink))}',
        t + ' .bd-head-hr{width:100%;border-top:.6pt solid var(--bd-rule);margin-top:5mm}',
        t + ' .bd-l{font-weight:400}',
        t + ' .bd-runhead-name{font-family:var(--bd-font-body);font-weight:700;text-transform:uppercase;letter-spacing:.06em;font-size:1.05em}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
