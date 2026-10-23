/* global window */
// Clean Minimalist: graphite on white, no rail fill, a single hairline
// between rail and main column, a light large name and quiet hairline rules.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'clean-minimal',
    slug: 'clean-minimalist',
    name: { en: 'Clean Minimalist', hi: 'सरल मिनिमल' },
    tagline: 'Graphite type, generous white space and hairline rules. Nothing extra.',
    description: 'A quiet, uncluttered biodata: a light side column for photo, key facts and contact, separated by a single hairline from neatly aligned details.',
    categories: ['minimal', 'modern'],
    tags: ['minimal', 'simple', 'clean', 'two-column', 'graphite', 'white space'],
    culture: 'neutral',
    archetype: 'sidebar',
    palettes: ['graphite', 'navy-slate', 'sage', 'slate-teal', 'indigo'],
    fonts: ['dmsans', 'poppins', 'lora-dmsans'],
    photoPlacements: ['rail', 'none'],
    defaults: {
      palette: 'graphite',
      font: 'dmsans',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'rail',
      photoShape: 'square',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: {},
    style: { railFill: 'none', titleStyle: 'rule', nameStyle: 'display', nameWeight: 300, rowLines: 'none', photoFrame: 'none', eyebrow: true },
    css: function () {
      var t = '.bd-t-clean-minimal';
      return [
        t + ' .bd-name{font-size:3em;letter-spacing:-.01em;line-height:1.04}',
        t + ' .bd-eyebrow{color:var(--bd-muted);font-weight:500}',
        t + ' .bd-head-hr{width:9mm;border-top:.8pt solid var(--bd-ink)}',
        t + ' .bd-h{font-weight:500;font-size:.78em;letter-spacing:.24em;color:var(--bd-ink)}',
        t + ' .bd-h-line{border-top-color:color-mix(in srgb,var(--bd-rule) 70%,transparent)}',
        t + ' .bd-title{margin-top:calc(5.4mm * var(--bd-sp))}',
        t + ' .bd-l{font-weight:400;color:var(--bd-muted)}',
        t + ' .bd-rh{font-weight:500;letter-spacing:.24em;color:var(--bd-ink);border-bottom:0;padding-bottom:0}',
        t + ' .bd-rf-l{letter-spacing:.14em;font-weight:400}',
        t + ' .bd-rf-v{font-weight:400}',
        t + ' .bd-photo{background:#f2f2f2}',
        t + ' .bd-runhead-name{font-weight:300;color:var(--bd-ink)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
