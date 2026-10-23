/* global window */
// Printer-friendly B&W: pure black on white, no fills or backgrounds,
// hairline rules and Poppins throughout. Sharp on any office printer.
(function (K) {
  'use strict';

  K.registry.register({
    id: 'print-bw',
    slug: 'printer-friendly-black-white',
    name: { en: 'Printer-friendly B&W', hi: 'प्रिंट-अनुकूल श्वेत-श्याम' },
    tagline: 'Crisp black on white with hairline rules. Prints and photocopies perfectly.',
    description: 'No colour fills, no backgrounds: clean type and thin rules that stay sharp on any printer or photocopier.',
    categories: ['print-friendly', 'minimal'],
    tags: ['black and white', 'printer', 'simple', 'photocopy'],
    culture: 'neutral',
    archetype: 'classic',
    palettes: ['ink', 'graphite'],
    fonts: ['poppins', 'dmsans'],
    photoPlacements: ['top-right', 'top-center', 'none'],
    defaults: {
      palette: 'ink',
      font: 'poppins',
      scale: 1,
      spacing: 'normal',
      photoPlacement: 'top-right',
      photoShape: 'square',
      labelLanguage: 'en',
      invocation: '',
      sectionOrder: K.schema.SECTIONS.slice(),
      hiddenSections: [],
    },
    ornaments: {},
    style: { frame: 'none', corners: false, titleStyle: 'underline', caps: true, colon: true, rowLines: 'none', eyebrow: true, nameWeight: 600 },
    printSafe: true,
    css: function () {
      var t = '.bd-t-print-bw';
      return [
        t + ' .bd-page{background:#fff}',
        t + ' .bd-photo{background:none}',
        t + ' .bd-photo-right{border:.5pt solid #000;border-radius:0;padding:1mm}',
        t + ' .bd-photo-head{box-shadow:none;border:.5pt solid #000}',
        t + ' .bd-name{font-size:2.5em;letter-spacing:-.005em;color:var(--bd-ink)}',
        t + ' .bd-eyebrow{color:var(--bd-ink);letter-spacing:.5em}',
        t + ' .bd-h{font-weight:600;font-size:1em;letter-spacing:.14em;color:var(--bd-ink)}',
        t + ' .bd-h-underline{border-bottom:.5pt solid var(--bd-ink);padding-bottom:1.2mm}',
        t + ' .bd-title{margin-top:calc(4.2mm * var(--bd-sp));margin-bottom:calc(1.2mm * var(--bd-sp))}',
        t + ' .bd-l{color:var(--bd-muted);font-weight:400}',
        t + ' .bd-runhead-name{color:var(--bd-ink)}',
        t + ' .bd-runhead{border-bottom-color:var(--bd-ink)}',
      ].join('\n');
    },
  });
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
