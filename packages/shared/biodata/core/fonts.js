/* global window */
// Fonts. All files are SIL OFL woff2 vendored in packages/shared/biodata/fonts
// (see fonts/LICENSES.md). Callers decide how a file becomes a URL:
//   web preview   urlFor = (f) => '/fonts/biodata/' + f
//   API PDF       urlFor = (f) => 'data:font/woff2;base64,...'
//
// K.fontFiles     { family: [{file, weight, style, unicodeRange?}] }
// K.fontPresets   { id: {name, display, body, families} }  display/body are CSS stacks
// K.fontFaceCss(families, urlFor) -> @font-face CSS (font-display: block)
// K.fontsFor({templateId|def, design, data}) -> families the document needs
(function (K) {
  'use strict';

  var DEVANAGARI = 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+20F0,U+25CC,U+A830-A839,U+A8E0-A8FF';
  var DEVA = 'Noto Sans Devanagari';

  K.fontFiles = {
    'Poppins': [
      { file: 'poppins-latin-400-normal.woff2', weight: '400', style: 'normal' },
      { file: 'poppins-latin-500-normal.woff2', weight: '500', style: 'normal' },
      { file: 'poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
    ],
    'Playfair Display': [
      { file: 'playfair-display-latin-wght-normal.woff2', weight: '400 900', style: 'normal' },
    ],
    'Cormorant Garamond': [
      { file: 'cormorant-garamond-latin-600-normal.woff2', weight: '600', style: 'normal' },
      { file: 'cormorant-garamond-latin-600-italic.woff2', weight: '600', style: 'italic' },
    ],
    'Lora': [
      { file: 'lora-latin-wght-normal.woff2', weight: '400 700', style: 'normal' },
    ],
    'DM Sans': [
      { file: 'dm-sans-latin-wght-normal.woff2', weight: '100 1000', style: 'normal' },
    ],
  };
  K.fontFiles[DEVA] = [
    { file: 'noto-sans-devanagari-devanagari-400-normal.woff2', weight: '400', style: 'normal', unicodeRange: DEVANAGARI },
    { file: 'noto-sans-devanagari-devanagari-600-normal.woff2', weight: '500 700', style: 'normal', unicodeRange: DEVANAGARI },
  ];

  // Devanagari is part of every stack; its unicode-range keeps Latin text on
  // the template font and sends only Hindi characters to Noto.
  function stack(primary, generic) {
    return "'" + primary + "', '" + DEVA + "', " + generic;
  }
  var SERIF = 'Georgia, "Times New Roman", serif';
  var SANS = 'system-ui, "Segoe UI", Arial, sans-serif';

  function preset(name, display, displayGeneric, body, bodyGeneric) {
    var fam = [display];
    if (body !== display) fam.push(body);
    return { name: name, display: stack(display, displayGeneric), body: stack(body, bodyGeneric), families: fam };
  }

  K.fontPresets = {
    'playfair-poppins': preset('Playfair Display + Poppins', 'Playfair Display', SERIF, 'Poppins', SANS),
    'cormorant-lora': preset('Cormorant Garamond + Lora', 'Cormorant Garamond', SERIF, 'Lora', SERIF),
    'cormorant-poppins': preset('Cormorant Garamond + Poppins', 'Cormorant Garamond', SERIF, 'Poppins', SANS),
    'playfair-lora': preset('Playfair Display + Lora', 'Playfair Display', SERIF, 'Lora', SERIF),
    'lora-dmsans': preset('Lora + DM Sans', 'Lora', SERIF, 'DM Sans', SANS),
    'playfair-dmsans': preset('Playfair Display + DM Sans', 'Playfair Display', SERIF, 'DM Sans', SANS),
    'poppins': preset('Poppins', 'Poppins', SANS, 'Poppins', SANS),
    'dmsans': preset('DM Sans', 'DM Sans', SANS, 'DM Sans', SANS),
  };

  K.DEVANAGARI_FAMILY = DEVA;
  K.HAS_DEVANAGARI = /[\u0900-\u097F]/;

  function cssStr(s) { return String(s).replace(/[\\'"\n\r<>]/g, ''); }

  K.fontFaceCss = function fontFaceCss(families, urlFor) {
    var out = [];
    var list = Array.isArray(families) ? families : Object.keys(K.fontFiles);
    for (var i = 0; i < list.length; i++) {
      var files = K.fontFiles[list[i]];
      if (!files) continue;
      for (var j = 0; j < files.length; j++) {
        var f = files[j];
        var url = typeof urlFor === 'function' ? urlFor(f.file) : f.file;
        if (!url) continue;
        out.push('@font-face{font-family:\'' + cssStr(list[i]) + '\';font-style:' + f.style +
          ';font-weight:' + f.weight + ';font-display:block;src:url("' + String(url).replace(/["\\\n\r]/g, '') +
          '") format("woff2");' + (f.unicodeRange ? 'unicode-range:' + f.unicodeRange + ';' : '') + '}');
      }
    }
    return out.join('\n');
  };

  function hasDevanagari(v, depth) {
    if (depth > 6 || v === null || v === undefined) return false;
    if (typeof v === 'string') return K.HAS_DEVANAGARI.test(v);
    if (Array.isArray(v)) {
      for (var i = 0; i < v.length; i++) if (hasDevanagari(v[i], depth + 1)) return true;
      return false;
    }
    if (typeof v === 'object') {
      for (var k in v) {
        if (Object.prototype.hasOwnProperty.call(v, k) && hasDevanagari(v[k], depth + 1)) return true;
      }
    }
    return false;
  }
  K.hasDevanagari = function (v) { return hasDevanagari(v, 0); };

  // input: { templateId?, def?, design?, data? }. Resolves the font preset
  // through the template defaults when design.font is missing or not offered.
  K.fontsFor = function fontsFor(input) {
    var inp = input || {};
    var def = inp.def || (inp.templateId && K.registry ? K.registry.get(inp.templateId) : null);
    var design = inp.design || {};
    var fontId = design.font;
    if (def && (!fontId || def.fonts.indexOf(fontId) < 0)) fontId = def.defaults.font;
    var p = K.fontPresets[fontId] || K.fontPresets['playfair-poppins'];
    var fams = p.families.slice();
    var lang = design.labelLanguage || (def && def.defaults.labelLanguage) || 'en';
    if (lang !== 'en' || hasDevanagari(inp.data, 0) || hasDevanagari(design.footerText, 0)) fams.push(DEVA);
    return fams;
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
