/* global window */
// Archetype "band": a full-width coloured header band on page 1 (invocation,
// name, one tagline line, round photo) over a two-well grid; the paginator
// fills the left column, then the right one. Continuation pages carry a slim
// 14 mm band with the name over one full-width column where short rows pair
// two-up (style.contColumns 1, the default: the last page never ends with a
// full left column beside an empty right one), or over two columns again
// (contColumns 2).
//
// def.style options (validated), see STYLE below. Ornament roles:
//   ornaments.mark     small marker before section titles (titleStyle 'mark' or 'center')
//   ornaments.divider  under the tagline inside the band
// Photo slots: 'band-right', 'band-left', or 'none'.
// Pattern tiles are drawn here (SVG data URIs coloured from the palette, so
// they work in print without external files).
(function (K) {
  'use strict';

  var STYLE = {
    pattern: 'none',      // none | jaali | girih | lattice
    patternOpacity: 0.2,  // 0..0.6
    align: 'left',        // left | center (band text)
    bandEdge: 'none',     // none | rule (accent double rule) | stripe (accent stripe) | arches (row of small arches)
    titleStyle: 'mark',   // mark (marker + hairline) | bar (filled tint bar) | center (centred, marker above rule)
    caps: true,           // uppercase section titles
    colDivider: true,     // hairline between the two columns
    nameWeight: 600,
    rowLines: 'hair',     // hair | dotted | none
    footRule: false,      // accent hairline above the footer
    contColumns: 1,       // 1 | 2 columns on continuation pages
  };
  var ENUMS = {
    pattern: ['none', 'jaali', 'girih', 'lattice'],
    align: ['left', 'center'],
    bandEdge: ['none', 'rule', 'stripe', 'arches'],
    titleStyle: ['mark', 'bar', 'center'],
    rowLines: ['hair', 'dotted', 'none'],
    contColumns: [1, 2],
  };

  var G = { side: 14, colGap: 10, bandPadTop: 11, bandPadBottom: 11, slim: 14, colsTop: 8.5, contColsTop: 8, bottom: 8, photo: 40 };

  function style(def) {
    var s = {};
    for (var k in STYLE) s[k] = def.style && Object.prototype.hasOwnProperty.call(def.style, k) ? def.style[k] : STYLE[k];
    return s;
  }

  // ---- pattern tiles (24 units square unless noted)
  function svgUri(w, h, body) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' + body + '</svg>';
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29') + '")';
  }
  function safeColor(c) { return /^#[0-9a-f]{3,8}$/i.test(String(c)) ? c : '#ffffff'; }

  var PATTERNS = {
    // Mughal jaali: overlapping circles form a quatrefoil trellis, a small
    // four-petal flower in each cell.
    jaali: function (c) {
      var s = 'fill="none" stroke="' + c + '" stroke-width="0.55"';
      return {
        size: '13mm 13mm',
        uri: svgUri(24, 24,
          '<circle cx="0" cy="0" r="12" ' + s + '/><circle cx="24" cy="0" r="12" ' + s + '/>' +
          '<circle cx="0" cy="24" r="12" ' + s + '/><circle cx="24" cy="24" r="12" ' + s + '/>' +
          '<path d="M12 8.6 C13.2 10.4 13.2 11 12 12 C10.8 11 10.8 10.4 12 8.6 Z M12 15.4 C10.8 13.6 10.8 13 12 12 C13.2 13 13.2 13.6 12 15.4 Z ' +
          'M8.6 12 C10.4 10.8 11 10.8 12 12 C11 13.2 10.4 13.2 8.6 12 Z M15.4 12 C13.6 13.2 13 13.2 12 12 C13 10.8 13.6 10.8 15.4 12 Z" fill="' + c + '"/>'),
      };
    },
    // Girih-style: an eight-point star in each cell, its points joined to the
    // cell corners and edges so neighbouring cells form a continuous lattice.
    girih: function (c) {
      var s = 'fill="none" stroke="' + c + '" stroke-width="0.5"';
      var a = 4.6; var r = 6.5; var m = 15;
      return {
        size: '15mm 15mm',
        uri: svgUri(30, 30,
          '<rect x="' + (m - a) + '" y="' + (m - a) + '" width="' + 2 * a + '" height="' + 2 * a + '" ' + s + '/>' +
          '<path d="M' + m + ' ' + (m - r) + ' L' + (m + r) + ' ' + m + ' L' + m + ' ' + (m + r) + ' L' + (m - r) + ' ' + m + ' Z" ' + s + '/>' +
          '<path d="M' + (m - a) + ' ' + (m - a) + ' L0 0 M' + (m + a) + ' ' + (m - a) + ' L30 0 M' + (m - a) + ' ' + (m + a) + ' L0 30 M' + (m + a) + ' ' + (m + a) + ' L30 30 ' +
          'M' + m + ' ' + (m - r) + ' L' + m + ' 0 M' + m + ' ' + (m + r) + ' L' + m + ' 30 M' + (m - r) + ' ' + m + ' L0 ' + m + ' M' + (m + r) + ' ' + m + ' L30 ' + m + '" ' + s + '/>' +
          '<circle cx="' + m + '" cy="' + m + '" r="1.3" fill="' + c + '"/>'),
      };
    },
    // Phulkari-inspired diamond lattice with a filled centre stitch.
    lattice: function (c) {
      return {
        size: '8mm 8mm',
        uri: svgUri(16, 16,
          '<path d="M8 0.8 L15.2 8 L8 15.2 L0.8 8 Z" fill="none" stroke="' + c + '" stroke-width="0.55"/>' +
          '<path d="M8 5.6 L10.4 8 L8 10.4 L5.6 8 Z" fill="' + c + '"/>' +
          '<circle cx="0" cy="0" r="0.8" fill="' + c + '"/><circle cx="16" cy="0" r="0.8" fill="' + c + '"/>' +
          '<circle cx="0" cy="16" r="0.8" fill="' + c + '"/><circle cx="16" cy="16" r="0.8" fill="' + c + '"/>'),
      };
    },
  };

  function archesUri(c) {
    // One small pointed arch per 8 mm, outlined, for the lower band edge.
    return svgUri(16, 8, '<path d="M0.6 8 V5.2 C0.6 2.6 4.6 1.8 8 0.6 C11.4 1.8 15.4 2.6 15.4 5.2 V8" fill="none" stroke="' + c + '" stroke-width="0.7"/>' +
      '<circle cx="8" cy="4.6" r="0.9" fill="' + c + '"/>');
  }

  function nameClass(name) {
    var n = String(name || '').length;
    return n > 40 ? ' bd-name-xl' : n > 24 ? ' bd-name-l' : '';
  }

  function chromeHeader(ctx) {
    var st = style(ctx.def);
    var id = ctx.identity;
    var bits = [];
    bits.push(ctx.invocationHtml('bd-band-inv'));
    bits.push('<div class="bd-eyebrow">' + ctx.titleText('biodata') + '</div>');
    if (id.name) bits.push('<h1 class="bd-name' + nameClass(id.name) + '">' + ctx.esc(id.name) + '</h1>');
    var line = [id.headline, id.place].filter(Boolean).map(ctx.esc).join('<span class="bd-sep" aria-hidden="true">·</span>');
    if (line) bits.push('<div class="bd-tagline">' + line + '</div>');
    var div = ctx.ornament('divider', 'bd-band-orn');
    if (div) bits.push(div);
    var photo = ctx.hasPhoto ? '<div class="bd-band-photo">' + ctx.photo('bd-photo-band') + '</div>' : '';
    var side = ctx.photoPlacement === 'band-left' ? 'left' : 'right';
    var cls = 'bd-band-grid bd-band-' + st.align + (photo ? ' bd-band-has-photo bd-band-photo-' + side : '');
    var pad = photo && st.align === 'center' ? '<div class="bd-band-pad"></div>' : '';
    var text = '<div class="bd-band-text">' + bits.join('') + '</div>';
    return '<div class="' + cls + '">' + (side === 'left' ? photo + text + pad : pad + text + photo) + '</div>';
  }

  function sectionTitle(ctx, sec, labelHtml) {
    var st = style(ctx.def);
    var mark = ctx.ornament('mark', 'bd-h-m');
    if (st.titleStyle === 'center') {
      var m = mark || '<span class="bd-h-dot" aria-hidden="true"></span>';
      return '<h2 class="bd-h bd-h-center"><span class="bd-h-line" aria-hidden="true"></span>' + m + '<span class="bd-h-t">' + labelHtml +
        '</span>' + m + '<span class="bd-h-line" aria-hidden="true"></span></h2>';
    }
    if (st.titleStyle === 'bar') {
      return '<h2 class="bd-h bd-h-bar"><span class="bd-h-t">' + labelHtml + '</span></h2>';
    }
    return '<h2 class="bd-h bd-h-mark">' + (mark || '<span class="bd-h-dot" aria-hidden="true"></span>') +
      '<span class="bd-h-t">' + labelHtml + '</span><span class="bd-h-line" aria-hidden="true"></span></h2>';
  }

  function pageShell(ctx, kind) {
    var band;
    if (kind === 'first') {
      band = '<header class="bd-band bd-band-full"><div class="bd-band-in">' + ctx.chromeHeaderHtml + '</div></header>';
    } else {
      band = '<header class="bd-band bd-band-slim"><div class="bd-band-in"><span class="bd-slim-name">' + ctx.esc(ctx.identity.name) +
        '</span><span class="bd-slim-title">' + ctx.titleText('biodata') + '</span></div></header>';
    }
    return {
      before: '<div class="bd-sheet">' + band + '<div class="bd-cols">',
      after: '</div>' + ctx.footer() + '</div>',
    };
  }

  function css(theme, def) {
    var st = style(def);
    var sc = '.bd-arch-band';
    var v = theme.vars;
    var out = [];
    var op = Math.max(0, Math.min(0.6, Number(st.patternOpacity) || 0));

    out.push(sc + ' .bd-sheet{position:absolute;inset:0;display:flex;flex-direction:column}');
    // Band
    out.push(sc + ' .bd-band{position:relative;flex:none;background:var(--bd-band);color:var(--bd-band-ink);overflow:hidden}');
    if (st.pattern !== 'none' && !def.printSafe) {
      var pat = PATTERNS[st.pattern](safeColor(v.accent));
      out.push(sc + ' .bd-band::before{content:"";position:absolute;inset:0;background-image:' + pat.uri + ';background-size:' + pat.size +
        ';background-position:center top;opacity:' + op + ';pointer-events:none}');
      // Soften the pattern behind the text so the name stays crisp.
      var fade = st.align === 'center' ? 'radial-gradient(ellipse 52% 70% at 50% 50%,var(--bd-band) 30%,transparent 100%)'
        : 'linear-gradient(90deg,var(--bd-band) 0%,var(--bd-band) 38%,transparent 85%)';
      out.push(sc + ' .bd-band-full::after{content:"";position:absolute;inset:0;background:' + fade + ';opacity:.82;pointer-events:none}');
    }
    out.push(sc + ' .bd-band-in{position:relative;z-index:1}');
    out.push(sc + ' .bd-band-full .bd-band-in{padding:' + G.bandPadTop + 'mm ' + (G.side + 2) + 'mm ' + G.bandPadBottom + 'mm}');
    if (st.bandEdge === 'rule') {
      // Gold line on the band's lower edge, a paper gap, then a second hairline.
      out.push(sc + ' .bd-band{box-shadow:inset 0 -.6mm 0 var(--bd-accent),0 1mm 0 var(--bd-paper),0 1.35mm 0 var(--bd-accent)}');
    } else if (st.bandEdge === 'stripe') {
      out.push(sc + ' .bd-band{box-shadow:inset 0 -1.8mm 0 var(--bd-accent)}');
    } else if (st.bandEdge === 'arches') {
      out.push(sc + ' .bd-band-full{padding-bottom:5mm}');
      out.push(sc + ' .bd-band-full .bd-band-in::after{content:"";position:absolute;left:0;right:0;bottom:-5mm;height:4mm;background:' + archesUri(safeColor(v.accent)) +
        ' repeat-x center bottom/8mm 4mm;opacity:.85}');
      out.push(sc + ' .bd-band-slim{box-shadow:inset 0 -.6mm 0 var(--bd-accent)}');
    }

    // Band layout
    out.push(sc + ' .bd-band-grid{display:grid;grid-template-columns:minmax(0,1fr);align-items:center;column-gap:9mm}');
    out.push(sc + ' .bd-band-has-photo.bd-band-photo-right{grid-template-columns:minmax(0,1fr) ' + G.photo + 'mm}');
    out.push(sc + ' .bd-band-has-photo.bd-band-photo-left{grid-template-columns:' + G.photo + 'mm minmax(0,1fr)}');
    out.push(sc + ' .bd-band-center.bd-band-has-photo.bd-band-photo-right{grid-template-columns:' + G.photo + 'mm minmax(0,1fr) ' + G.photo + 'mm}');
    out.push(sc + ' .bd-band-center.bd-band-has-photo.bd-band-photo-left{grid-template-columns:' + G.photo + 'mm minmax(0,1fr) ' + G.photo + 'mm}');
    out.push(sc + ' .bd-band-text{text-align:' + st.align + ';min-width:0}');
    out.push(sc + ' .bd-band-inv{color:var(--bd-accent);text-align:' + st.align + ';margin-bottom:2.6mm;font-size:1.12em}');
    out.push(sc + ' .bd-eyebrow{font-family:var(--bd-font-body);text-transform:uppercase;letter-spacing:.42em;font-size:.72em;font-weight:500;' +
      'color:var(--bd-accent);margin:0 0 2mm;' + (st.align === 'center' ? 'padding-left:.42em' : '') + '}');
    out.push(sc + ' .bd-eyebrow .bd-hi{text-transform:none;letter-spacing:.04em;margin-left:.8em}');
    out.push(sc + ' .bd-name{font-family:var(--bd-font-display);font-weight:' + st.nameWeight + ';font-size:3em;line-height:1.05;margin:0;color:var(--bd-band-ink);' +
      'overflow-wrap:anywhere;letter-spacing:.005em}');
    out.push(sc + ' .bd-name-l{font-size:2.5em}' + sc + ' .bd-name-xl{font-size:2.05em}');
    out.push(sc + ' .bd-tagline{margin-top:2.6mm;font-size:1.04em;letter-spacing:.03em;color:color-mix(in srgb,var(--bd-band-ink) 82%,var(--bd-band))}');
    out.push(sc + ' .bd-tagline .bd-sep{display:inline-block;margin:0 .7em;color:var(--bd-accent)}');
    out.push(sc + ' .bd-band-orn{width:46mm;margin:3.4mm ' + (st.align === 'center' ? 'auto' : '0') + ' 0;color:var(--bd-accent)}');
    out.push(sc + ' .bd-band-photo{justify-self:center}');
    out.push(sc + ' .bd-photo-band{width:' + G.photo + 'mm;height:' + (G.photo * 1.2) + 'mm;box-shadow:0 0 0 1.2mm var(--bd-band),0 0 0 1.7mm var(--bd-accent)}');
    out.push(sc + ' .bd-photo-band.bd-shape-circle{height:' + G.photo + 'mm}');

    // Slim band (continuation pages)
    out.push(sc + ' .bd-band-slim{height:' + G.slim + 'mm}');
    out.push(sc + ' .bd-band-slim .bd-band-in{height:100%;display:flex;align-items:center;justify-content:space-between;gap:8mm;padding:0 ' + (G.side + 2) + 'mm}');
    out.push(sc + ' .bd-slim-name{font-family:var(--bd-font-display);font-weight:' + st.nameWeight + ';font-size:1.35em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}');
    out.push(sc + ' .bd-slim-title{flex:none;font-size:.74em;letter-spacing:.3em;text-transform:uppercase;color:var(--bd-accent)}');

    // Columns
    out.push(sc + ' .bd-cols{position:relative;flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);' +
      'grid-template-rows:minmax(0,1fr);column-gap:' + G.colGap + 'mm;margin:' + G.colsTop + 'mm ' + G.side + 'mm 0}');
    out.push(sc + ' .bd-page-cont .bd-cols{margin-top:' + G.contColsTop + 'mm' + (st.contColumns === 1 ? ';grid-template-columns:minmax(0,1fr)' : '') + '}');
    if (st.colDivider) {
      out.push(sc + (st.contColumns === 1 ? ' .bd-page-first' : '') + ' .bd-cols::before{content:"";position:absolute;top:1mm;bottom:1mm;left:50%;border-left:.5pt solid var(--bd-rule)}');
    }
    out.push(sc + ' .bd-well{height:100%}');
    out.push(sc + ' .bd-foot{margin:0 ' + G.side + 'mm ' + G.bottom + 'mm;padding-top:2.6mm' + (st.footRule ? ';border-top:.5pt solid var(--bd-rule)' : '') + '}');

    // Section titles
    var caps = st.caps ? 'text-transform:uppercase;letter-spacing:.12em;' : 'letter-spacing:.01em;';
    out.push(sc + ' .bd-title{margin-top:calc(4.4mm * var(--bd-sp));margin-bottom:calc(1.3mm * var(--bd-sp))}');
    out.push(sc + ' .bd-well>.bd-title:first-child{margin-top:0}');
    out.push(sc + ' .bd-h{margin:0;font-family:var(--bd-font-display);font-weight:600;font-size:1.08em;line-height:1.25;color:var(--bd-primary)}');
    out.push(sc + ' .bd-h-t{' + caps + '}');
    out.push(sc + ' .bd-h-t .bd-hi{margin-left:.6em;font-family:var(--bd-font-body);font-weight:500;font-size:.78em;color:var(--bd-muted);' +
      'text-transform:none;letter-spacing:0}');
    out.push(sc + ' .bd-h-mark{display:flex;align-items:center;gap:2.2mm}');
    out.push(sc + ' .bd-h-mark .bd-h-m{flex:none;width:3.4mm;color:var(--bd-accent)}');
    out.push(sc + ' .bd-h-dot{flex:none;width:1.6mm;height:1.6mm;border-radius:50%;background:var(--bd-accent)}');
    out.push(sc + ' .bd-h-line{flex:1;height:0;border-top:.6pt solid var(--bd-rule);min-width:6mm}');
    out.push(sc + ' .bd-h-bar{background:var(--bd-tint-2);border-left:1.2mm solid var(--bd-accent);padding:1.2mm 2.6mm;font-size:1em}');
    out.push(sc + ' .bd-h-center{display:flex;align-items:center;gap:2mm;text-align:center}');
    out.push(sc + ' .bd-h-center .bd-h-m{flex:none;width:2.8mm;color:var(--bd-accent)}');
    out.push(sc + ' .bd-h-center .bd-h-t{min-width:0}');
    out.push(sc + ' .bd-h-center .bd-h-line{min-width:3mm}');

    // Rows in narrow columns
    out.push(sc + '{--bd-label-w:27mm;--bd-pair-label-w:27mm}' + sc + '.bd-lang-hi{--bd-label-w:25mm;--bd-pair-label-w:25mm}' +
      sc + '.bd-lang-both{--bd-label-w:29mm;--bd-pair-label-w:29mm}');
    // Continuation pages are one full-width column: short rows pair two-up
    // there, and stack in page 1's narrow columns.
    out.push(sc + (st.contColumns === 1 ? ' .bd-page-first' : '') + ' .bd-pair{display:block}');
    if (st.contColumns === 1) {
      out.push(sc + ' .bd-page-cont .bd-well{--bd-label-w:31mm;--bd-pair-label-w:31mm}' + sc + '.bd-lang-both .bd-page-cont .bd-well{--bd-label-w:33mm;--bd-pair-label-w:33mm}');
    }
    out.push(sc + ' .bd-pair{column-gap:calc(8mm * var(--bd-sp))}');
    out.push(sc + ' .bd-row{column-gap:calc(2.6mm * var(--bd-sp));padding:calc(.24em * var(--bd-sp)) 0}');
    if (st.rowLines === 'hair') out.push(sc + ' .bd-row{border-bottom:.4pt solid color-mix(in srgb,var(--bd-rule) 55%,transparent)}');
    if (st.rowLines === 'dotted') out.push(sc + ' .bd-row{border-bottom:.6pt dotted var(--bd-rule)}');
    // inline-block: short bilingual labels share a line, long ones wrap the
    // Hindi part as a unit onto a second, smaller line.
    out.push(sc + '.bd-lang-both .bd-l .bd-en{margin-right:.5em}');
    out.push(sc + '.bd-lang-both .bd-l .bd-hi{display:inline-block;font-size:.8em;line-height:1.08}');
    out.push(sc + '.bd-lang-both .bd-row{padding:calc(.1em * var(--bd-sp)) 0 calc(.14em * var(--bd-sp))}');
    out.push(sc + '.bd-lang-both .bd-title{margin-top:calc(3.6mm * var(--bd-sp))}');
    out.push(sc + ' .bd-plabel{margin-top:calc(2mm * var(--bd-sp))}');
    out.push(sc + ' .bd-plabel .bd-hi{display:inline;margin-left:.6em}');
    return out.join('\n');
  }

  function validate(def, fail) {
    var s = def.style || {};
    Object.keys(s).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(STYLE, k)) fail('unknown band style option ' + k);
      if (ENUMS[k] && ENUMS[k].indexOf(s[k]) < 0) fail('style.' + k + ' must be one of ' + ENUMS[k].join(', '));
    });
    if (s.patternOpacity !== undefined && (typeof s.patternOpacity !== 'number' || s.patternOpacity < 0 || s.patternOpacity > 0.6)) {
      fail('style.patternOpacity must be a number 0..0.6');
    }
  }

  K.archetypes = K.archetypes || {};
  K.archetypes.band = {
    id: 'band',
    photoSlots: ['band-right', 'band-left'],
    wells: function (ctx, kind) { return kind === 'first' ? 2 : style(ctx.def).contColumns; },
    css: css,
    pageShell: pageShell,
    chromeHeader: chromeHeader,
    flowBlocks: function (ctx) { return ctx.allSectionBlocks(); },
    prepare: function (ctx) { ctx.pairRows = style(ctx.def).contColumns === 1; ctx.proseStyle = 'stacked'; },
    sectionTitle: sectionTitle,
    validate: validate,
    STYLE: STYLE,
    PATTERNS: Object.keys(PATTERNS),
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
