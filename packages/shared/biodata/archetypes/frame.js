/* global window */
// Archetype "frame": a full-page ornamental border repeated on every page
// (rules + corner ornaments + optional edge marks), a centred identity header
// and a single column of label/value rows inside the frame.
// Templates tune it through def.style (see STYLE) and def.ornaments:
//   ornaments.corner     frame corners (e.g. filigree, floral, corner)
//   ornaments.mark       small motif breaking the top and bottom rules (style.sideMarks)
//   ornaments.divider    under the name ('' gives a short rule)
//   ornaments.title      under centred section titles (titleStyle 'center')
//   ornaments.watermark  faint motif behind the first-page header
// Photo slots: 'top-center' (medallion above the name), 'top-right' (beside
// the centred header), or 'none'.
(function (K) {
  'use strict';

  var STYLE = {
    border: 'double',     // double | band | fine
    cornerSize: 24,       // corner ornament size in mm (12..36)
    sideMarks: false,     // ornaments.mark centred on the top and bottom rules
    titleStyle: 'flank',  // flank (rules either side) | center (ornament below)
    caps: true,           // uppercase section titles
    colon: true,          // ':' after row labels
    rowLines: 'hair',     // hair | dotted | none
    eyebrow: true,        // small "BIODATA" line above the name
    tint: false,          // soft tinted ground inside the frame
    nameWeight: 600,      // display font weight for the name
    pairs: true,          // two-up rows for short label/value pairs
  };
  var ENUMS = {
    border: ['double', 'band', 'fine'],
    titleStyle: ['flank', 'center'],
    rowLines: ['hair', 'dotted', 'none'],
  };

  function style(def) {
    var s = {};
    for (var k in STYLE) s[k] = def.style && Object.prototype.hasOwnProperty.call(def.style, k) ? def.style[k] : STYLE[k];
    return s;
  }

  // Frame geometry (mm from the page edge). inner = innermost rule.
  function geometry(st) {
    var inner = st.border === 'band' ? 10 : st.border === 'fine' ? 9.4 : 9;
    return { inner: inner, top: inner + 9.5, side: inner + 12.5, bottom: inner + 3.5 };
  }

  function sectionTitle(ctx, sec, labelHtml) {
    var st = style(ctx.def);
    if (st.titleStyle === 'center') {
      return '<h2 class="bd-h bd-h-center"><span class="bd-h-t">' + labelHtml + '</span></h2>' + ctx.ornament('title', 'bd-h-orn');
    }
    return '<h2 class="bd-h bd-h-flank"><span class="bd-h-line" aria-hidden="true"></span><span class="bd-h-t">' + labelHtml +
      '</span><span class="bd-h-line bd-h-line-r" aria-hidden="true"></span></h2>';
  }

  function headerBlocks(ctx) {
    var st = style(ctx.def);
    var id = ctx.identity;
    var bits = [];
    bits.push(ctx.invocationHtml());
    if (ctx.hasPhoto && ctx.photoPlacement === 'top-center') bits.push('<div class="bd-medal">' + ctx.photo() + '</div>');
    if (st.eyebrow) bits.push('<div class="bd-eyebrow">' + ctx.titleText('biodata') + '</div>');
    if (id.name) bits.push('<h1 class="bd-name">' + ctx.esc(id.name) + '</h1>');
    var line = [id.headline, id.place].filter(Boolean).map(ctx.esc).join('<span class="bd-sep" aria-hidden="true">·</span>');
    if (line) bits.push('<div class="bd-headline">' + line + '</div>');
    bits.push(ctx.ornament('divider', 'bd-head-orn') || '<div class="bd-head-hr" aria-hidden="true"></div>');
    if (ctx.hasPhoto && ctx.photoPlacement === 'top-right') {
      return [ctx.block('bd-head bd-head-split', '<div class="bd-head-pad"></div><div class="bd-head-text">' + bits.join('') +
        '</div><div class="bd-photo-side">' + ctx.photo() + '</div>')];
    }
    return [ctx.block('bd-head', bits.join(''))];
  }

  function pageShell(ctx, kind) {
    var st = style(ctx.def);
    var deco = '<div class="bd-fr" aria-hidden="true"><div class="bd-fr-in"></div></div>';
    if (ctx.def.ornaments.corner) {
      ['tl', 'tr', 'bl', 'br'].forEach(function (c) { deco += ctx.ornament('corner', 'bd-fcorner bd-fcorner-' + c); });
    }
    if (st.sideMarks && ctx.def.ornaments.mark) {
      deco += ctx.ornament('mark', 'bd-fmark bd-fmark-t') + ctx.ornament('mark', 'bd-fmark bd-fmark-b');
    }
    if (kind === 'first' && ctx.def.ornaments.watermark) deco += ctx.ornament('watermark', 'bd-watermark');
    return {
      before: deco + '<div class="bd-sheet">' + (kind === 'cont' ? ctx.runningHead() : ''),
      after: ctx.footer() + '</div>',
    };
  }

  function css(theme, def) {
    var st = style(def);
    var g = geometry(st);
    var sc = '.bd-arch-frame';
    var out = [];
    out.push(sc + ' .bd-page{' + (st.tint ? 'background:var(--bd-tint)' : '') + '}');
    out.push(sc + ' .bd-sheet{position:absolute;top:' + g.top + 'mm;left:' + g.side + 'mm;right:' + g.side + 'mm;bottom:' + g.bottom +
      'mm;display:flex;flex-direction:column}');
    out.push(sc + ' .bd-well{flex:1 1 auto}');
    out.push(sc + ' .bd-foot{padding:2.5mm 6mm 0}');
    out.push(sc + ' .bd-runhead{margin:0 7mm 5mm}');

    // Border
    if (st.border === 'band') {
      // Filled band between two hairlines.
      out.push(sc + ' .bd-fr{position:absolute;inset:6.6mm;border:2.2mm solid var(--bd-primary);pointer-events:none}');
      out.push(sc + ' .bd-fr::before{content:"";position:absolute;inset:-1.6mm;border:.5pt solid var(--bd-accent)}');
      out.push(sc + ' .bd-fr-in{position:absolute;inset:.9mm;border:.6pt solid var(--bd-accent)}');
      out.push('.bd-print-safe' + sc + ' .bd-fr{border-width:1.2pt}');
    } else if (st.border === 'fine') {
      out.push(sc + ' .bd-fr{position:absolute;inset:7.8mm;border:.8pt solid var(--bd-accent);pointer-events:none}');
      out.push(sc + ' .bd-fr-in{position:absolute;inset:1.3mm;border:.4pt solid var(--bd-primary);opacity:.55}');
    } else {
      out.push(sc + ' .bd-fr{position:absolute;inset:7mm;border:1.4pt solid var(--bd-primary);pointer-events:none}');
      out.push(sc + ' .bd-fr-in{position:absolute;inset:1.5mm;border:.6pt solid var(--bd-accent)}');
    }
    var cs = st.cornerSize; var ci = g.inner + 0.9;
    out.push(sc + ' .bd-fcorner{position:absolute;width:' + cs + 'mm;height:' + cs + 'mm;color:var(--bd-primary);pointer-events:none}');
    out.push(sc + ' .bd-fcorner-tl{top:' + ci + 'mm;left:' + ci + 'mm}');
    out.push(sc + ' .bd-fcorner-tr{top:' + ci + 'mm;right:' + ci + 'mm;transform:scaleX(-1)}');
    out.push(sc + ' .bd-fcorner-bl{bottom:' + ci + 'mm;left:' + ci + 'mm;transform:scaleY(-1)}');
    out.push(sc + ' .bd-fcorner-br{bottom:' + ci + 'mm;right:' + ci + 'mm;transform:scale(-1,-1)}');
    // Edge marks sit on the outer rule with a paper ground that breaks the line.
    var markY = st.border === 'band' ? 5.2 : st.border === 'fine' ? 5.3 : 4.6;
    out.push(sc + ' .bd-fmark{position:absolute;left:50%;width:10mm;margin-left:-5mm;padding:0 2mm;background:var(--bd-paper);color:var(--bd-accent)}');
    out.push(sc + ' .bd-fmark-t{top:' + markY + 'mm}');
    out.push(sc + ' .bd-fmark-b{bottom:' + markY + 'mm}');
    out.push(sc + ' .bd-watermark{position:absolute;top:' + (g.top - 4) + 'mm;left:50%;width:78mm;margin-left:-39mm;opacity:.05;color:var(--bd-primary);pointer-events:none}');

    // Header
    out.push(sc + ' .bd-head{text-align:center;padding-bottom:calc(2.6mm * var(--bd-sp))}');
    out.push(sc + ' .bd-invocation{margin-bottom:2.4mm}');
    out.push(sc + ' .bd-eyebrow{font-family:var(--bd-font-body);text-transform:uppercase;letter-spacing:.46em;font-size:.72em;' +
      'font-weight:500;color:var(--bd-accent);margin:0 0 1.4mm;padding-left:.46em}');
    out.push(sc + ' .bd-eyebrow .bd-hi{text-transform:none;letter-spacing:.05em;margin-left:.8em}');
    out.push(sc + ' .bd-name{font-family:var(--bd-font-display);font-weight:' + st.nameWeight + ';font-size:2.9em;line-height:1.08;' +
      'color:var(--bd-primary);margin:0;overflow-wrap:anywhere}');
    out.push(sc + ' .bd-headline{margin-top:1.8mm;color:var(--bd-muted);font-size:1em;letter-spacing:.03em}');
    out.push(sc + ' .bd-headline .bd-sep{display:inline-block;margin:0 .7em;color:var(--bd-accent)}');
    out.push(sc + ' .bd-head-orn{width:64mm;margin:3mm auto 0;color:var(--bd-primary)}');
    out.push(sc + ' .bd-head-hr{height:0;border-top:.75pt solid var(--bd-accent);width:26mm;margin:4mm auto 0}');

    // Photo: medallion above the name, or framed beside the header.
    out.push(sc + ' .bd-medal{display:inline-block;padding:1.3mm;border:.6pt solid var(--bd-accent);border-radius:3.6mm;margin:0 auto 2.4mm;line-height:0}');
    out.push(sc + ' .bd-medal .bd-photo{width:26mm;height:32mm}');
    out.push(sc + ' .bd-medal .bd-shape-circle{width:29mm;height:29mm}');
    out.push(sc + ' .bd-medal:has(.bd-shape-circle){border-radius:50%}');
    out.push(sc + ' .bd-medal:has(.bd-shape-square){border-radius:0}');
    out.push(sc + ' .bd-medal:has(.bd-shape-arch){border-radius:999px 999px 3mm 3mm}');
    out.push(sc + ' .bd-head-split{display:grid;grid-template-columns:36mm minmax(0,1fr) 36mm;column-gap:3mm;align-items:center}');
    out.push(sc + ' .bd-photo-side{justify-self:end;padding:1.2mm;border:.6pt solid var(--bd-accent);border-radius:3.4mm;line-height:0}');
    out.push(sc + ' .bd-photo-side .bd-photo{width:32mm;height:40mm}');
    out.push(sc + ' .bd-photo-side .bd-shape-circle{height:32mm}');
    out.push(sc + ' .bd-photo-side:has(.bd-shape-circle){border-radius:50%}');
    out.push(sc + ' .bd-photo-side:has(.bd-shape-square){border-radius:0}');
    out.push(sc + ' .bd-photo-side:has(.bd-shape-arch){border-radius:999px 999px 3mm 3mm}');

    // Section titles
    var caps = st.caps ? 'text-transform:uppercase;letter-spacing:.12em;' : 'letter-spacing:.01em;';
    out.push(sc + ' .bd-title{margin-top:calc(3.5mm * var(--bd-sp));margin-bottom:calc(.9mm * var(--bd-sp))}');
    out.push(sc + ' .bd-row{padding:calc(.15em * var(--bd-sp)) 0}');
    out.push(sc + ' .bd-well>.bd-title:first-child{margin-top:0}');
    out.push(sc + ' .bd-h{margin:0;font-family:var(--bd-font-display);font-weight:600;font-size:1.16em;line-height:1.25;color:var(--bd-primary);text-align:center}');
    out.push(sc + ' .bd-h-t .bd-en,' + sc + ' .bd-h-t>:not(.bd-en):not(.bd-hi){' + caps + '}');
    if (st.caps) out.push(sc + ' .bd-h-t{' + caps + '}' + sc + ' .bd-h-t .bd-hi,' + sc + ' .bd-h-t [lang="hi"]{text-transform:none;letter-spacing:0}');
    out.push(sc + ' .bd-h-t .bd-hi{font-family:var(--bd-font-body);font-weight:500;font-size:.8em;color:var(--bd-muted);margin-left:.7em}');
    out.push(sc + ' .bd-h-flank{display:flex;align-items:center;justify-content:center;gap:3.2mm}');
    out.push(sc + ' .bd-h-flank .bd-h-t{flex:none;max-width:78%}');
    out.push(sc + ' .bd-h-line{flex:1;height:0;position:relative;border-top:.6pt solid var(--bd-rule);min-width:6mm}');
    out.push(sc + ' .bd-h-line::after{content:"";position:absolute;right:-.2mm;top:-1.05mm;width:1.5mm;height:1.5mm;background:var(--bd-accent);transform:rotate(45deg)}');
    out.push(sc + ' .bd-h-line-r::after{right:auto;left:-.2mm}');
    out.push(sc + ' .bd-h-orn{width:14mm;margin:.5mm auto 0}');

    // Rows
    if (st.rowLines === 'hair') out.push(sc + ' .bd-row{border-bottom:.4pt solid color-mix(in srgb,var(--bd-rule) 60%,transparent)}');
    if (st.rowLines === 'dotted') out.push(sc + ' .bd-row{border-bottom:.6pt dotted var(--bd-rule)}');
    if (st.colon) {
      out.push(sc + ' .bd-l{position:relative;padding-right:3mm}');
      out.push(sc + ' .bd-l::after{content:":";position:absolute;right:0;top:0;color:var(--bd-muted);opacity:.7}');
    }
    out.push(sc + ' .bd-plabel{margin-top:calc(1.8mm * var(--bd-sp))}');

    // Bilingual labels: Hindi beside the English when it fits, else on a tight second line.
    var bo = sc + '.bd-lang-both';
    out.push(bo + '{--bd-label-w:39mm;--bd-pair-label-w:39mm}');
    out.push(bo + ' .bd-l{font-size:.85em;line-height:1.2}');
    out.push(bo + ' .bd-l .bd-en{margin-right:.45em}');
    out.push(bo + ' .bd-l .bd-hi{display:inline-block;margin-left:0;font-size:.9em;line-height:1.15;vertical-align:baseline}');
    out.push(bo + ' .bd-row{padding:calc(.13em * var(--bd-sp)) 0}');
    out.push(bo + ' .bd-pair{column-gap:calc(6mm * var(--bd-sp))}');
    out.push(bo + ' .bd-title{margin-top:calc(3.1mm * var(--bd-sp))}');
    return out.join('\n');
  }

  function validate(def, fail) {
    var s = def.style || {};
    Object.keys(s).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(STYLE, k)) fail('unknown frame style option ' + k);
      if (ENUMS[k] && ENUMS[k].indexOf(s[k]) < 0) fail('style.' + k + ' must be one of ' + ENUMS[k].join(', '));
    });
    if (s.cornerSize !== undefined && (typeof s.cornerSize !== 'number' || s.cornerSize < 12 || s.cornerSize > 36)) {
      fail('style.cornerSize must be a number of mm between 12 and 36');
    }
  }

  K.archetypes = K.archetypes || {};
  K.archetypes.frame = {
    id: 'frame',
    photoSlots: ['top-center', 'top-right'],
    wells: 1,
    css: css,
    pageShell: pageShell,
    headerBlocks: headerBlocks,
    prepare: function (ctx) { ctx.pairRows = !!style(ctx.def).pairs; },
    sectionTitle: sectionTitle,
    validate: validate,
    STYLE: STYLE,
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
