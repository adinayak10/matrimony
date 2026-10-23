/* global window */
// Archetype "classic": single column on A4, centred identity header that
// flows with the content, label/value rows, optional ornamental frame.
// Templates tune it through def.style (see STYLE below) and def.ornaments:
//   ornaments.divider    under the name (default lotus; '' gives a hairline)
//   ornaments.corner     frame corners when style.corners
//   ornaments.watermark  faint motif behind the first-page header
//   ornaments.title      under centred section titles (titleStyle 'center'),
//                        or either side of them (titleStyle 'ornate')
// Photo slots: 'top-right' (framed, right of the centred header), 'top-center'
// (above the name), or 'none'.
(function (K) {
  'use strict';

  var STYLE = {
    frame: 'double',      // double | single | hairline | none
    corners: false,       // corner ornaments on every page (needs ornaments.corner)
    titleStyle: 'rule',   // rule | center | ornate | underline | band
    caps: true,           // uppercase section titles
    colon: true,          // ':' after row labels
    rowLines: 'hair',     // hair | dotted | none
    eyebrow: true,        // small "BIODATA" line above the name
    headerAlign: 'center',// center | left
    tint: false,          // soft tinted page ground inside the frame
    nameWeight: 600,      // display font weight for the name
    pairs: true,          // two-up rows for short label/value pairs (denser, 1-2 pages)
  };
  var ENUMS = {
    frame: ['double', 'single', 'hairline', 'none'],
    titleStyle: ['rule', 'center', 'ornate', 'underline', 'band'],
    rowLines: ['hair', 'dotted', 'none'],
    headerAlign: ['center', 'left'],
  };

  function style(def) {
    var s = {};
    for (var k in STYLE) s[k] = def.style && Object.prototype.hasOwnProperty.call(def.style, k) ? def.style[k] : STYLE[k];
    return s;
  }

  // Page geometry (mm) per frame style.
  function geometry(st) {
    if (st.frame === 'none') return { top: 15, side: 17, bottom: 10, frame: 0 };
    if (st.frame === 'hairline') return { top: 15, side: 18, bottom: 10, frame: 8 };
    return { top: 17, side: 20, bottom: 11.5, frame: 7 };
  }

  function sectionTitle(ctx, sec, labelHtml) {
    var st = style(ctx.def);
    if (st.titleStyle === 'center') {
      return '<h2 class="bd-h bd-h-center"><span class="bd-h-t">' + labelHtml + '</span></h2>' + ctx.ornament('title', 'bd-h-orn');
    }
    if (st.titleStyle === 'ornate') {
      // Centred between two small motifs on the same line (no extra height).
      return '<h2 class="bd-h bd-h-ornate">' + ctx.ornament('title', 'bd-h-mot') + '<span class="bd-h-t">' + labelHtml + '</span>' +
        ctx.ornament('title', 'bd-h-mot') + '</h2>';
    }
    if (st.titleStyle === 'rule') {
      return '<h2 class="bd-h bd-h-rule"><span class="bd-h-mark" aria-hidden="true"></span><span class="bd-h-t">' + labelHtml +
        '</span><span class="bd-h-line" aria-hidden="true"></span></h2>';
    }
    return '<h2 class="bd-h bd-h-' + st.titleStyle + '"><span class="bd-h-t">' + labelHtml + '</span></h2>';
  }

  function headerBlocks(ctx) {
    var st = style(ctx.def);
    var id = ctx.identity;
    var bits = [];
    bits.push(ctx.invocationHtml());
    if (ctx.hasPhoto && ctx.photoPlacement === 'top-center') bits.push(ctx.photo('bd-photo-head'));
    if (st.eyebrow) bits.push('<div class="bd-eyebrow">' + ctx.titleText('biodata') + '</div>');
    if (id.name) bits.push('<h1 class="bd-name">' + ctx.esc(id.name) + '</h1>');
    var line = [id.headline, id.place].filter(Boolean).map(ctx.esc).join('<span class="bd-sep" aria-hidden="true">·</span>');
    if (line) bits.push('<div class="bd-headline">' + line + '</div>');
    var div = ctx.ornament('divider', 'bd-head-orn');
    bits.push(div || '<div class="bd-head-hr" aria-hidden="true"></div>');
    if (ctx.hasPhoto && ctx.photoPlacement === 'top-right') {
      // Three columns keep the text optically centred on the page.
      return [ctx.block('bd-head bd-head-split', '<div class="bd-head-pad"></div><div class="bd-head-text">' + bits.join('') +
        '</div><div class="bd-photo-right">' + ctx.photo() + '</div>')];
    }
    return [ctx.block('bd-head', bits.join(''))];
  }

  function pageShell(ctx, kind) {
    var st = style(ctx.def);
    var deco = '';
    if (st.frame !== 'none') deco += '<div class="bd-frame" aria-hidden="true"></div>';
    if (st.corners && ctx.def.ornaments.corner) {
      ['tl', 'tr', 'bl', 'br'].forEach(function (c) { deco += ctx.ornament('corner', 'bd-corner bd-corner-' + c); });
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
    var sc = '.bd-arch-classic';
    var out = [];
    out.push(sc + ' .bd-page{' + (st.tint ? 'background:var(--bd-tint)' : '') + '}');
    out.push(sc + ' .bd-sheet{position:absolute;top:' + g.top + 'mm;left:' + g.side + 'mm;right:' + g.side + 'mm;bottom:' + g.bottom +
      'mm;display:flex;flex-direction:column}');
    out.push(sc + ' .bd-well{flex:1 1 auto}');
    out.push(sc + ' .bd-foot{padding-top:2.5mm}');

    // Frame
    if (st.frame === 'double') {
      out.push(sc + ' .bd-frame{position:absolute;inset:' + g.frame + 'mm;border:1.1pt solid var(--bd-primary);pointer-events:none}');
      out.push(sc + ' .bd-frame::after{content:"";position:absolute;inset:1.4mm;border:.5pt solid var(--bd-accent)}');
    } else if (st.frame === 'single') {
      out.push(sc + ' .bd-frame{position:absolute;inset:' + g.frame + 'mm;border:1pt solid var(--bd-primary)}');
    } else if (st.frame === 'hairline') {
      out.push(sc + ' .bd-frame{position:absolute;inset:' + g.frame + 'mm;border:.5pt solid var(--bd-rule)}');
    }
    var cs = 13; var ci = g.frame + 2.4; // inside the inner rule
    out.push(sc + ' .bd-corner{position:absolute;width:' + cs + 'mm;height:' + cs + 'mm;color:var(--bd-primary)}');
    out.push(sc + ' .bd-corner-tl{top:' + ci + 'mm;left:' + ci + 'mm}');
    out.push(sc + ' .bd-corner-tr{top:' + ci + 'mm;right:' + ci + 'mm;transform:scaleX(-1)}');
    out.push(sc + ' .bd-corner-bl{bottom:' + ci + 'mm;left:' + ci + 'mm;transform:scaleY(-1)}');
    out.push(sc + ' .bd-corner-br{bottom:' + ci + 'mm;right:' + ci + 'mm;transform:scale(-1,-1)}');
    out.push(sc + ' .bd-watermark{position:absolute;top:11mm;left:50%;width:74mm;margin-left:-37mm;opacity:.045;color:var(--bd-primary);pointer-events:none}');

    // Header
    var align = st.headerAlign === 'left' ? 'left' : 'center';
    out.push(sc + ' .bd-head{text-align:' + align + ';padding-bottom:calc(3.6mm * var(--bd-sp))}');
    out.push(sc + ' .bd-invocation{margin-bottom:2.2mm;text-align:' + align + '}');
    out.push(sc + ' .bd-eyebrow{font-family:var(--bd-font-body);text-transform:uppercase;letter-spacing:.42em;font-size:.74em;' +
      'font-weight:500;color:var(--bd-accent);margin:0 0 1.6mm;padding-left:.42em}');
    out.push(sc + ' .bd-eyebrow .bd-hi{text-transform:none;letter-spacing:.05em;margin-left:.8em}');
    out.push(sc + ' .bd-name{font-family:var(--bd-font-display);font-weight:' + st.nameWeight + ';font-size:2.85em;line-height:1.08;' +
      'color:var(--bd-primary);margin:0;letter-spacing:.005em;overflow-wrap:anywhere}');
    out.push(sc + ' .bd-headline{margin-top:1.8mm;color:var(--bd-muted);font-size:1em;letter-spacing:.02em}');
    out.push(sc + ' .bd-headline .bd-sep{display:inline-block;margin:0 .7em;color:var(--bd-accent)}');
    out.push(sc + ' .bd-head-orn{width:62mm;margin:3mm ' + (align === 'center' ? 'auto' : '0') + ' 0;color:var(--bd-primary)}');
    out.push(sc + ' .bd-head-hr{height:0;border-top:.75pt solid var(--bd-ink);width:' + (align === 'center' ? '28mm' : '100%') +
      ';margin:4mm ' + (align === 'center' ? 'auto' : '0') + ' 0}');

    // Photo
    out.push(sc + ' .bd-head-split{display:grid;grid-template-columns:' + (align === 'center' ? '38mm ' : '') + 'minmax(0,1fr) 38mm;column-gap:4mm;align-items:center}');
    if (align !== 'center') out.push(sc + ' .bd-head-pad{display:none}');
    out.push(sc + ' .bd-photo-right{justify-self:end;padding:1.3mm;border:.6pt solid var(--bd-accent);' +
      'border-radius:3.6mm;background:var(--bd-paper)}');
    out.push(sc + ' .bd-photo-right .bd-photo{width:33mm;height:41mm}');
    out.push(sc + ' .bd-photo-right .bd-shape-circle{height:33mm}');
    out.push(sc + ' .bd-photo-right:has(.bd-shape-circle){border-radius:50%}');
    out.push(sc + ' .bd-photo-right:has(.bd-shape-square){border-radius:0}');
    out.push(sc + ' .bd-photo-right:has(.bd-shape-arch){border-radius:999px 999px 3mm 3mm}');
    out.push(sc + ' .bd-photo-head{width:28mm;height:35mm;margin:.5mm auto 3.2mm;box-shadow:0 0 0 .6pt var(--bd-accent),0 0 0 1.6mm var(--bd-paper),0 0 0 2.1mm var(--bd-rule)}');
    out.push(sc + ' .bd-photo-head.bd-shape-circle{height:28mm}');

    // Section titles
    var caps = st.caps ? 'text-transform:uppercase;letter-spacing:.09em;' : 'letter-spacing:.01em;';
    out.push(sc + ' .bd-title{margin-top:calc(3.9mm * var(--bd-sp));margin-bottom:calc(1mm * var(--bd-sp))}');
    out.push(sc + ' .bd-well>.bd-title:first-child{margin-top:0}');
    out.push(sc + ' .bd-h{margin:0;font-family:var(--bd-font-display);font-weight:600;font-size:1.18em;line-height:1.25;color:var(--bd-primary)}');
    out.push(sc + ' .bd-h-t .bd-en{' + caps + '}');
    out.push(sc + ' .bd-h-t>:not(.bd-en):not(.bd-hi){' + caps + '}');
    if (st.caps) out.push(sc + ' .bd-h-t{' + caps + '}' + sc + ' .bd-h-t .bd-hi,' + sc + ' .bd-h-t [lang="hi"]{text-transform:none;letter-spacing:0}');
    out.push(sc + ' .bd-h-t .bd-hi{font-family:var(--bd-font-body);font-weight:500;font-size:.8em;color:var(--bd-muted);margin-left:.7em}');
    out.push(sc + ' .bd-h-rule{display:flex;align-items:center;gap:2.6mm}');
    out.push(sc + ' .bd-h-mark{flex:none;width:1.7mm;height:1.7mm;background:var(--bd-accent);transform:rotate(45deg)}');
    out.push(sc + ' .bd-h-line{flex:1;height:0;border-top:.6pt solid var(--bd-rule);min-width:8mm}');
    out.push(sc + ' .bd-h-center{text-align:center}');
    out.push(sc + ' .bd-h-orn{width:16mm;margin:1.2mm auto 0}');
    out.push(sc + ' .bd-h-ornate{display:flex;align-items:center;justify-content:center;gap:2.6mm;text-align:center}');
    out.push(sc + ' .bd-h-mot{flex:none;width:3.4mm;color:var(--bd-primary)}');
    out.push(sc + ' .bd-h-underline{padding-bottom:1.4mm;border-bottom:.75pt solid var(--bd-primary);display:flow-root}');
    out.push(sc + ' .bd-h-band{background:var(--bd-tint-2);border-left:1.2mm solid var(--bd-primary);padding:1.3mm 3mm;display:flow-root}');

    // Rows
    if (st.rowLines === 'hair') out.push(sc + ' .bd-row{border-bottom:.4pt solid color-mix(in srgb,var(--bd-rule) 60%,transparent)}');
    if (st.rowLines === 'dotted') out.push(sc + ' .bd-row{border-bottom:.6pt dotted var(--bd-rule)}');
    if (st.colon) {
      out.push(sc + ' .bd-l{position:relative;padding-right:3mm}');
      out.push(sc + ' .bd-l::after{content:":";position:absolute;right:0;top:0;color:var(--bd-muted);opacity:.7}');
    }
    out.push(sc + ' .bd-plabel{margin-top:calc(1.8mm * var(--bd-sp))}');

    // Bilingual labels: the Hindi half follows the English one on the same
    // line when it fits and otherwise drops, whole, to a tight second line.
    // Keeps 'both' within the same page budget as English.
    var bo = sc + '.bd-lang-both';
    out.push(bo + '{--bd-label-w:40mm;--bd-pair-label-w:40mm}');
    out.push(bo + ' .bd-l{font-size:.85em;line-height:1.2}');
    out.push(bo + ' .bd-l .bd-en{margin-right:.45em}');
    out.push(bo + ' .bd-l .bd-hi{display:inline-block;margin-left:0;font-size:.9em;line-height:1.15;vertical-align:baseline}');
    out.push(bo + ' .bd-row{padding:calc(.14em * var(--bd-sp)) 0}');
    out.push(bo + ' .bd-pair{column-gap:calc(6mm * var(--bd-sp))}');
    out.push(bo + ' .bd-title{margin-top:calc(3.2mm * var(--bd-sp))}');
    return out.join('\n');
  }

  function validate(def, fail) {
    var s = def.style || {};
    Object.keys(s).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(STYLE, k)) fail('unknown classic style option ' + k);
      if (ENUMS[k] && ENUMS[k].indexOf(s[k]) < 0) fail('style.' + k + ' must be one of ' + ENUMS[k].join(', '));
    });
  }

  K.archetypes = K.archetypes || {};
  K.archetypes.classic = {
    id: 'classic',
    photoSlots: ['top-right', 'top-center'],
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
