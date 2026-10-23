/* global window */
// Archetype "hero": page 1 opens with a full-bleed block (about 104 mm) in the
// band colour. With a photo, the portrait fills its right side and fades into
// the band; the name sits over the gradient on the left and a key-facts strip
// runs along the bottom. Without a photo it becomes a shorter typographic hero
// with a monogram of the initials. Continuation pages are plain: a slim band
// edge and a running name line. The details flow in one column below.
// Templates tune it through def.style (see STYLE); ornaments are optional:
//   ornaments.mark   small motif before the eyebrow line
// Photo slots: 'hero' (the large photo block) or 'none'. The hero photo is a
// full-bleed crop, so photoShape does not apply to it.
(function (K) {
  'use strict';

  var STYLE = {
    heroHeight: 100,      // mm with a photo (96..112)
    plainHeight: 80,      // mm without a photo (70..100)
    photoWidth: 100,      // mm of the hero taken by the photo (90..130)
    facts: true,          // key-facts strip along the bottom of the hero
    caps: false,          // uppercase section titles
    colon: false,         // ':' after row labels
    rowLines: 'hair',     // hair | dotted | none
    pairs: true,          // two-up rows for short label/value pairs
  };
  var ENUMS = { rowLines: ['hair', 'dotted', 'none'] };
  var RANGES = { heroHeight: [96, 112], plainHeight: [70, 100], photoWidth: [90, 130] };
  var FACTS = ['personal.age', 'personal.heightCm', 'education.highest', 'profession.occupation', 'profession.workLocation'];

  function style(def) {
    var s = {};
    for (var k in STYLE) s[k] = def.style && Object.prototype.hasOwnProperty.call(def.style, k) ? def.style[k] : STYLE[k];
    return s;
  }

  // Initials for the monogram: first letter of the first and last words
  // (Latin letters or Devanagari vowels/consonants; marks are skipped).
  function isLetter(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 0x0904 && c <= 0x0939) || (c >= 0x0958 && c <= 0x0961);
  }
  function firstLetter(word) {
    for (var i = 0; i < word.length; i++) if (isLetter(word.charAt(i))) return word.charAt(i);
    return '';
  }
  function initials(name) {
    var words = String(name || '').trim().split(/\s+/).filter(function (w) { return firstLetter(w) !== ''; });
    if (!words.length) return '';
    var first = firstLetter(words[0]);
    var last = words.length > 1 ? firstLetter(words[words.length - 1]) : '';
    return (first + last).toUpperCase();
  }

  function factCells(ctx) {
    var rows = ctx.factRows(FACTS);
    var hasPlace = rows.some(function (r) { return r.id === 'profession.workLocation'; });
    if (!hasPlace) rows = rows.concat(ctx.factRows(['contact.location']));
    return rows.slice(0, 5).map(function (r) {
      // Short labels: the section name stands in for "Highest Qualification".
      var label = r.id === 'education.highest' ? ctx.label('sections', 'education') : r.label;
      return '<div class="bd-fact"><div class="bd-fact-l">' + label + '</div><div class="bd-fact-v">' + r.value + '</div></div>';
    }).join('');
  }

  function chromeHeader(ctx) {
    var st = style(ctx.def);
    var id = ctx.identity;
    var name = String(id.name || '');
    var nameCls = name.length > 34 ? ' bd-name-xl' : name.length > 20 ? ' bd-name-l' : '';
    var text = '';
    var mark = ctx.ornament('mark', 'bd-hero-mark');
    text += '<div class="bd-eyebrow">' + mark + '<span>' + ctx.titleText('biodata') + '</span></div>';
    if (name) text += '<h1 class="bd-name' + nameCls + '">' + ctx.esc(name) + '</h1>';
    var line = [id.headline, id.place].filter(Boolean).map(ctx.esc).join('<span class="bd-sep" aria-hidden="true">·</span>');
    if (line) text += '<div class="bd-headline">' + line + '</div>';

    var facts = st.facts ? factCells(ctx) : '';
    var html = '<header class="bd-hero ' + (ctx.hasPhoto ? 'bd-hero-photo' : 'bd-hero-plain') + (facts ? ' bd-has-facts' : '') + '">';
    if (ctx.hasPhoto) {
      html += '<div class="bd-hero-img">' + ctx.photo() + '</div><div class="bd-hero-fade" aria-hidden="true"></div>';
    } else {
      var ini = initials(name);
      if (ini) html += '<div class="bd-monogram" aria-hidden="true"><span>' + ctx.esc(ini) + '</span></div>';
    }
    html += ctx.invocationHtml('bd-hero-inv');
    html += '<div class="bd-hero-text">' + text + '</div>';
    if (facts) html += '<div class="bd-facts">' + facts + '</div>';
    return html + '</header>';
  }

  function pageShell(ctx, kind) {
    if (kind === 'first') {
      return { before: ctx.chromeHeaderHtml + '<div class="bd-sheet">', after: ctx.footer() + '</div>' };
    }
    return {
      before: '<div class="bd-edge" aria-hidden="true"></div><div class="bd-sheet">' + ctx.runningHead(),
      after: ctx.footer() + '</div>',
    };
  }

  function sectionTitle(ctx, sec, labelHtml) {
    return '<h2 class="bd-h"><span class="bd-h-t">' + labelHtml + '</span></h2>';
  }

  function css(theme, def) {
    var st = style(def);
    var sc = '.bd-arch-hero';
    var side = 16;
    var out = [];
    // Sheets: first page starts below the hero (height set per photo state).
    out.push(sc + ' .bd-sheet{position:absolute;left:' + side + 'mm;right:' + side + 'mm;bottom:8mm;display:flex;flex-direction:column}');
    out.push(sc + ' .bd-page-first .bd-sheet{top:' + (st.heroHeight + 6) + 'mm}');
    out.push(sc + '.bd-photo-none .bd-page-first .bd-sheet{top:' + (st.plainHeight + 6) + 'mm}');
    out.push(sc + ' .bd-page-cont .bd-sheet{top:13mm}');
    out.push(sc + ' .bd-well{flex:1 1 auto}');
    out.push(sc + ' .bd-foot{padding-top:2.5mm}');
    out.push(sc + ' .bd-edge{position:absolute;top:0;left:0;right:0;height:3.2mm;background:var(--bd-band)}');
    out.push(sc + ' .bd-edge::after{content:"";position:absolute;left:0;right:0;bottom:-1.1mm;height:.5mm;background:var(--bd-accent)}');

    // Hero block
    out.push(sc + ' .bd-hero{position:absolute;top:0;left:0;right:0;height:' + st.heroHeight + 'mm;background:var(--bd-band);color:var(--bd-band-ink);overflow:hidden}');
    out.push(sc + ' .bd-hero-plain{height:' + st.plainHeight + 'mm}');
    out.push(sc + ' .bd-hero::after{content:"";position:absolute;left:0;right:0;bottom:0;height:.8mm;background:var(--bd-accent)}');
    out.push(sc + ' .bd-hero-img{position:absolute;top:0;right:0;bottom:0;width:' + st.photoWidth + 'mm}');
    out.push(sc + ' .bd-hero-img .bd-photo{width:100%;height:100%;border-radius:0;background:var(--bd-band)}');
    out.push(sc + ' .bd-hero-img img{object-position:50% 22%}');
    var fadeStart = 210 - st.photoWidth;
    out.push(sc + ' .bd-hero-fade{position:absolute;inset:0;background:' +
      'linear-gradient(90deg,var(--bd-band) 0,var(--bd-band) ' + fadeStart + 'mm,color-mix(in srgb,var(--bd-band) 72%,transparent) ' + (fadeStart + 12) + 'mm,' +
      'color-mix(in srgb,var(--bd-band) 18%,transparent) ' + (fadeStart + 40) + 'mm,transparent ' + (fadeStart + 62) + 'mm),' +
      'linear-gradient(0deg,color-mix(in srgb,var(--bd-band) 94%,transparent) 0,color-mix(in srgb,var(--bd-band) 55%,transparent) 26mm,transparent 50mm)}');
    out.push(sc + ' .bd-hero-inv{position:absolute;top:9mm;left:' + side + 'mm;right:' + side + 'mm;text-align:left;color:var(--bd-accent);font-size:1.02em}');
    out.push(sc + ' .bd-hero-text{position:absolute;left:' + side + 'mm;top:17mm;bottom:9mm;width:' + (fadeStart + 14 - side) + 'mm;' +
      'display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}');
    out.push(sc + ' .bd-has-facts .bd-hero-text{bottom:25mm}');
    out.push(sc + ' .bd-hero-plain .bd-hero-text{width:120mm}');
    out.push(sc + ' .bd-eyebrow{display:flex;align-items:center;gap:2mm;font-family:var(--bd-font-body);text-transform:uppercase;letter-spacing:.42em;' +
      'font-size:.72em;font-weight:500;color:var(--bd-accent);margin-bottom:2mm}');
    out.push(sc + ' .bd-eyebrow .bd-hi{text-transform:none;letter-spacing:.05em;margin-left:.8em}');
    out.push(sc + ' .bd-eyebrow [lang="hi"]{font-size:1.3em}');
    out.push(sc + ' .bd-hero-mark{width:3mm;flex:none;color:var(--bd-accent)}');
    out.push(sc + ' .bd-name{font-family:var(--bd-font-display);font-weight:600;font-size:3.5em;line-height:1.02;margin:0;color:var(--bd-band-ink);' +
      'letter-spacing:-.005em;overflow-wrap:anywhere;text-wrap:balance}');
    out.push(sc + ' .bd-name-l{font-size:2.9em}');
    out.push(sc + ' .bd-name-xl{font-size:2.3em}');
    out.push(sc + ' .bd-headline{margin-top:2.6mm;font-size:1.05em;letter-spacing:.03em;color:color-mix(in srgb,var(--bd-band-ink) 82%,var(--bd-band))}');
    out.push(sc + ' .bd-headline .bd-sep{display:inline-block;margin:0 .7em;color:var(--bd-accent)}');

    // Monogram (no photo)
    out.push(sc + ' .bd-monogram{position:absolute;right:20mm;top:13mm;width:46mm;height:46mm;border-radius:50%;border:.8pt solid var(--bd-accent);' +
      'display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.6mm var(--bd-band),inset 0 0 0 1.9mm color-mix(in srgb,var(--bd-accent) 55%,transparent)}');
    out.push(sc + ' .bd-monogram span{font-family:var(--bd-font-display);font-size:4.6em;line-height:1;color:var(--bd-accent);letter-spacing:.04em}');

    // Key-facts strip
    out.push(sc + ' .bd-facts{position:absolute;left:' + side + 'mm;right:' + side + 'mm;bottom:5mm;height:15mm;display:flex;' +
      'border-top:.5pt solid color-mix(in srgb,var(--bd-accent) 70%,transparent);padding-top:2.6mm}');
    out.push(sc + ' .bd-fact{flex:1 1 0;min-width:0;padding:0 3mm;border-left:.5pt solid color-mix(in srgb,var(--bd-band-ink) 22%,transparent)}');
    out.push(sc + ' .bd-fact:first-child{padding-left:0;border-left:0}');
    out.push(sc + ' .bd-fact-l{font-size:.66em;text-transform:uppercase;letter-spacing:.16em;color:var(--bd-accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}');
    out.push(sc + ' .bd-fact-l .bd-hi{margin-left:.5em}');
    out.push(sc + ' .bd-fact-l [lang="hi"]{font-size:1.3em}');
    out.push(sc + ' .bd-fact-v{margin-top:.8mm;font-size:.95em;font-weight:500;line-height:1.25;color:var(--bd-band-ink);overflow:hidden;' +
      'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}');

    // Section titles: display face over a hairline with a short accent bar.
    var caps = st.caps ? 'text-transform:uppercase;letter-spacing:.1em;' : '';
    out.push(sc + ' .bd-title{margin-top:calc(3.5mm * var(--bd-sp));margin-bottom:calc(1.1mm * var(--bd-sp))}');
    out.push(sc + ' .bd-well>.bd-title:first-child{margin-top:0}');
    out.push(sc + ' .bd-h{position:relative;margin:0;padding-bottom:1.3mm;border-bottom:.5pt solid var(--bd-rule);font-family:var(--bd-font-display);' +
      'font-weight:600;font-size:1.26em;line-height:1.2;color:var(--bd-primary)}');
    out.push(sc + ' .bd-h::after{content:"";position:absolute;left:0;bottom:-.5mm;width:12mm;height:.9mm;background:var(--bd-accent)}');
    if (caps) out.push(sc + ' .bd-h-t .bd-en,' + sc + ' .bd-h-t>:not(.bd-en):not(.bd-hi){' + caps + '}');
    out.push(sc + ' .bd-h-t .bd-hi{font-family:var(--bd-font-body);font-weight:500;font-size:.74em;color:var(--bd-muted);margin-left:.7em}');

    // Rows
    out.push(sc + ' .bd-row{padding:calc(.15em * var(--bd-sp)) 0}');
    if (st.rowLines === 'hair') out.push(sc + ' .bd-row{border-bottom:.4pt solid color-mix(in srgb,var(--bd-rule) 55%,transparent)}');
    if (st.rowLines === 'dotted') out.push(sc + ' .bd-row{border-bottom:.6pt dotted var(--bd-rule)}');
    if (st.colon) {
      out.push(sc + ' .bd-l{position:relative;padding-right:3mm}');
      out.push(sc + ' .bd-l::after{content:":";position:absolute;right:0;top:0;color:var(--bd-muted);opacity:.7}');
    }
    out.push(sc + ' .bd-plabel{margin-top:calc(1.8mm * var(--bd-sp))}');

    // Bilingual labels: Hindi beside the English when it fits, else on a tight second line.
    var bo = sc + '.bd-lang-both';
    out.push(bo + '{--bd-label-w:40mm;--bd-pair-label-w:40mm}');
    out.push(bo + ' .bd-l{font-size:.85em;line-height:1.2}');
    out.push(bo + ' .bd-l .bd-en{margin-right:.45em}');
    out.push(bo + ' .bd-l .bd-hi{display:inline-block;margin-left:0;font-size:.9em;line-height:1.15;vertical-align:baseline}');
    out.push(bo + ' .bd-row{padding:calc(.13em * var(--bd-sp)) 0}');
    out.push(bo + ' .bd-pair{column-gap:calc(6mm * var(--bd-sp))}');
    out.push(bo + ' .bd-title{margin-top:calc(3.3mm * var(--bd-sp))}');
    return out.join('\n');
  }

  function validate(def, fail) {
    var s = def.style || {};
    Object.keys(s).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(STYLE, k)) fail('unknown hero style option ' + k);
      if (ENUMS[k] && ENUMS[k].indexOf(s[k]) < 0) fail('style.' + k + ' must be one of ' + ENUMS[k].join(', '));
      if (RANGES[k] && (typeof s[k] !== 'number' || s[k] < RANGES[k][0] || s[k] > RANGES[k][1])) {
        fail('style.' + k + ' must be a number between ' + RANGES[k][0] + ' and ' + RANGES[k][1]);
      }
    });
  }

  K.archetypes = K.archetypes || {};
  K.archetypes.hero = {
    id: 'hero',
    photoSlots: ['hero'],
    wells: 1,
    css: css,
    pageShell: pageShell,
    chromeHeader: chromeHeader,
    flowBlocks: function (ctx) { return ctx.allSectionBlocks(); },
    prepare: function (ctx) { ctx.pairRows = !!style(ctx.def).pairs; },
    sectionTitle: sectionTitle,
    validate: validate,
    STYLE: STYLE,
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
