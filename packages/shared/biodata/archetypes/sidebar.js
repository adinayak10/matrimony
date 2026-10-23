/* global window */
// Archetype "sidebar": a ~64 mm rail (photo, key facts, contact) beside a
// main column that holds the identity header and every other section.
//
// Page 1: rail (chrome, never paginated) + main column (one well).
// Pages 2..n: a slim strip in the rail colour (or a hairline when the rail
// has no fill), a running head and a full-width main column in which short
// rows pair two-up (on page 1 the same pairs stack, so the narrow column
// keeps one row per line).
//
// The rail never overflows: facts and contact rows are admitted only while
// a conservative line budget (scale, spacing, label language and photo
// aware) allows, and only when the value is short. Everything else stays in
// the main column, so nothing is ever lost or duplicated.
//
// def.style options (validated), see STYLE below. Ornament roles:
//   ornaments.rail     small motif at the foot of the rail (page 1)
//   ornaments.divider  under the name in the main header ('' gives a short bar)
//   ornaments.title    beside section titles (titleStyle 'serif')
// Photo slot: 'rail' (top of the rail), or 'none'.
(function (K) {
  'use strict';

  var STYLE = {
    railSide: 'left',     // left | right
    railFill: 'band',     // band (palette band + band ink) | tint (soft primary tint) | none (hairline edge)
    titleStyle: 'rule',   // rule (caps + hairline) | underline | bar (accent bar on the left) | serif (display font, no caps)
    nameStyle: 'display', // display (display font) | caps (body font, uppercase, tracked)
    nameWeight: 600,
    rowLines: 'hair',     // hair | dotted | none
    photoFrame: 'none',   // none | ring | offset
    eyebrow: true,        // small "BIODATA" line above the name
    headerAlign: 'left',  // left | center (main column header)
    pageTint: false,      // soft tint on the main column ground
    tightValue: 13,       // max characters of a value that may stay two-up on page 1 (lower it for wide fonts)
    railFacts: ['personal.age', 'personal.heightCm', 'personal.maritalStatus', 'religion.religion', 'religion.caste', 'personal.motherTongue',
      'education.highest', 'profession.occupation', 'profession.workLocation', 'income.amount'],
    railContact: ['contact.contactPerson', 'contact.phone', 'contact.whatsapp', 'contact.altPhone', 'contact.email',
      'contact.address', 'contact.location', 'contact.bestTime'],
  };
  var ENUMS = {
    railSide: ['left', 'right'],
    railFill: ['band', 'tint', 'none'],
    titleStyle: ['rule', 'underline', 'bar', 'serif'],
    nameStyle: ['display', 'caps'],
    rowLines: ['hair', 'dotted', 'none'],
    photoFrame: ['none', 'ring', 'offset'],
    headerAlign: ['left', 'center'],
  };

  // Geometry (mm).
  var G = {
    rail: 64,        // rail width
    railPadX: 8,     // rail inner side padding
    railTop: 14,
    railBottom: 13,
    gutter: 10,      // rail edge to main column
    edge: 15,        // main column to the outer page edge
    top: 15,
    bottom: 10,
    strip: 8,        // continuation strip width
    contInner: 16,   // strip edge to the main column on continuation pages
    photoW: 46,
    photoH: 57,
  };
  var MM_PER_EM = 9.4 * 25.4 / 72; // base font size in mm at scale 1

  function style(def) {
    var s = {};
    for (var k in STYLE) s[k] = def.style && Object.prototype.hasOwnProperty.call(def.style, k) ? def.style[k] : STYLE[k];
    return s;
  }

  function plainLen(html) {
    return String(html).replace(/<[^>]*>/g, '').replace(/&[#a-z0-9]+;/gi, '_').length;
  }

  function photoHeight(ctx) {
    var shape = ctx.design.photoShape;
    return shape === 'circle' ? G.photoW : G.photoH;
  }

  // Decide which fact and contact rows live in the rail. Conservative: a
  // value must need at most 3 rail lines and the whole rail must fit the
  // page at the current scale and spacing, whatever the font.
  function planRail(ctx) {
    var st = style(ctx.def);
    var scale = ctx.design.scale || 1;
    var sp = ctx.theme.sp || 1;
    var em = MM_PER_EM * scale;
    var innerW = G.rail - 2 * G.railPadX;
    var valueCpl = Math.max(10, Math.floor(innerW / (0.56 * em)));       // value chars per line (.98em, generous average width)
    var labelEm = ctx.lang === 'hi' ? 0.88 : 0.74;
    var labelCpl = Math.max(10, Math.floor(innerW / (0.66 * labelEm * em))); // tracked caps labels
    var lineH = 1.34 * em;
    var labelLineH = labelEm * 1.32 * em;
    var itemGap = 2.5 * sp;
    var headH = 0.76 * 1.3 * em + 2 + 4.2 * sp + 2.6 * sp; // heading text + rule + gaps around it
    var avail = 297 - G.railTop - G.railBottom - 2; // 2 mm reserve
    if (ctx.hasPhoto && ctx.photoPlacement === 'rail') avail -= photoHeight(ctx) + 8 * sp;
    if (ctx.def.ornaments && ctx.def.ornaments.rail) avail -= 7;

    function cost(r) {
      if (r.kind !== 'row' || r.value.indexOf('<br') >= 0 || r.value.indexOf('bd-line') >= 0) return -1;
      var len = plainLen(r.value);
      var lines = Math.ceil((len * 1.12) / valueCpl);
      if (lines > 3) return -1;
      var labelLen = plainLen(r.label) + (ctx.lang === 'both' ? 2 : 0);
      var llines = Math.min(2, Math.ceil((labelLen * 1.1) / labelCpl));
      if (ctx.lang === 'both' && llines < 2 && labelLen > labelCpl * 0.7) llines = 2;
      return llines * labelLineH + lines * lineH + itemGap;
    }

    var used = 0;
    var ids = {};
    function take(rows) {
      var out = [];
      var head = headH;
      rows.forEach(function (r) {
        var c = cost(r);
        if (c < 0) return;
        if (used + c + (out.length ? 0 : head) > avail) return;
        used += c + (out.length ? 0 : head);
        out.push(r);
        ids[r.id] = true;
      });
      return out;
    }
    var facts = take(ctx.factRows(st.railFacts));
    var contact = take(ctx.factRows(st.railContact));
    return { facts: facts, contact: contact, ids: ids };
  }

  function railItems(ctx, rows) {
    return rows.map(function (r) {
      return '<div class="bd-rf" data-f="' + ctx.attr(r.id) + '"><div class="bd-rf-l">' + r.label + '</div><div class="bd-rf-v">' + r.value + '</div></div>';
    }).join('');
  }

  var GLANCE = { en: 'At a glance', hi: 'एक नज़र में' };

  function chromeHeader(ctx) {
    var plan = ctx.sbRail;
    var out = '';
    if (ctx.hasPhoto && ctx.photoPlacement === 'rail') out += '<div class="bd-rail-photo">' + ctx.photo('bd-photo-rail') + '</div>';
    if (plan.facts.length) {
      out += '<div class="bd-rail-sec"><h2 class="bd-rh"><span>' + K.labelPair(GLANCE, ctx.lang) + '</span></h2>' + railItems(ctx, plan.facts) + '</div>';
    }
    if (plan.contact.length) {
      out += '<div class="bd-rail-sec"><h2 class="bd-rh"><span>' + ctx.sectionTitle('contact') + '</span></h2>' + railItems(ctx, plan.contact) + '</div>';
    }
    var orn = ctx.ornament('rail', 'bd-rail-orn');
    return '<div class="bd-rail-in bd-fit">' + out + '</div>' + orn;
  }

  function headerBlocks(ctx) {
    var st = style(ctx.def);
    var id = ctx.identity;
    var bits = [];
    bits.push(ctx.invocationHtml());
    if (st.eyebrow) bits.push('<div class="bd-eyebrow">' + ctx.titleText('biodata') + '</div>');
    if (id.name) bits.push('<h1 class="bd-name">' + ctx.esc(id.name) + '</h1>');
    var line = [id.headline, id.place].filter(Boolean).map(ctx.esc).join('<span class="bd-sep" aria-hidden="true">·</span>');
    if (line) bits.push('<div class="bd-headline">' + line + '</div>');
    var div = ctx.ornament('divider', 'bd-head-orn');
    bits.push(div || '<div class="bd-head-hr" aria-hidden="true"></div>');
    return [ctx.block('bd-head', bits.join(''))];
  }

  function sectionTitle(ctx, sec, labelHtml) {
    var st = style(ctx.def);
    if (st.titleStyle === 'rule') {
      return '<h2 class="bd-h bd-h-rule"><span class="bd-h-t">' + labelHtml + '</span><span class="bd-h-line" aria-hidden="true"></span></h2>';
    }
    if (st.titleStyle === 'serif') {
      return '<h2 class="bd-h bd-h-serif">' + ctx.ornament('title', 'bd-h-orn') + '<span class="bd-h-t">' + labelHtml + '</span></h2>';
    }
    return '<h2 class="bd-h bd-h-' + st.titleStyle + '"><span class="bd-h-t">' + labelHtml + '</span></h2>';
  }

  // Same pairing as ctx.sectionBlocks (a short row pairs with the next short
  // row, looking past at most one long row), plus a 'bd-pair-tight' class when
  // both halves are very short, so page 1 can keep those two-up.
  var TIGHT_LABEL = 16;
  function enLabelLen(html) {
    return plainLen(String(html).replace(/<span class="bd-hi"[^>]*>[^<]*<\/span>/, ''));
  }
  function tight(r, max) { return plainLen(r.value) <= max && enLabelLen(r.label) <= TIGHT_LABEL; }

  function sectionBlocks(ctx, sec) {
    var rows = ctx.rows(sec).slice();
    if (!rows.length) return [];
    var tv = style(ctx.def).tightValue;
    var out = [ctx.titleBlock(sec)];
    for (var i = 0; i < rows.length; i++) {
      var a = rows[i];
      var j = -1;
      if (a.kind === 'row' && a.short) {
        for (var k = i + 1; k < rows.length && k <= i + 2; k++) {
          if (rows[k].kind === 'row' && rows[k].short) { j = k; break; }
        }
      }
      if (j > 0) {
        var b = rows.splice(j, 1)[0];
        out.push(ctx.block('bd-pair' + (tight(a, tv) && tight(b, tv) ? ' bd-pair-tight' : ''),
          '<div class="bd-row bd-cell" data-f="' + ctx.attr(a.id) + '">' + ctx.rowHtml(a) + '</div>' +
          '<div class="bd-row bd-cell" data-f="' + ctx.attr(b.id) + '">' + ctx.rowHtml(b) + '</div>'));
        continue;
      }
      out = out.concat(ctx.rowBlocks(a));
    }
    return out;
  }

  function pageShell(ctx, kind) {
    if (kind === 'first') {
      return {
        before: '<aside class="bd-rail">' + ctx.chromeHeaderHtml + '</aside><div class="bd-sheet">',
        after: ctx.footer() + '</div>',
      };
    }
    return {
      before: '<div class="bd-strip" aria-hidden="true"></div><div class="bd-sheet">' + ctx.runningHead(),
      after: ctx.footer() + '</div>',
    };
  }

  function css(theme, def) {
    var st = style(def);
    var sc = '.bd-arch-sidebar';
    var L = st.railSide === 'left';
    var near = L ? 'left' : 'right';
    var far = L ? 'right' : 'left';
    var out = [];
    var mainNear = G.rail + G.gutter;
    var contNear = G.strip + G.contInner;

    // Rail
    var railBg = st.railFill === 'band' ? 'var(--bd-band)' : st.railFill === 'tint' ? 'color-mix(in srgb,var(--bd-primary) 7%,var(--bd-paper))' : 'transparent';
    var railInk = st.railFill === 'band' ? 'var(--bd-band-ink)' : 'var(--bd-ink)';
    var railMuted = st.railFill === 'band' ? 'color-mix(in srgb,var(--bd-band-ink) 66%,var(--bd-band))' : 'var(--bd-muted)';
    var railHead = st.railFill === 'band' ? 'var(--bd-band-ink)' : 'var(--bd-primary)';
    var railRule = st.railFill === 'band' ? 'color-mix(in srgb,var(--bd-band-ink) 30%,var(--bd-band))' : 'var(--bd-rule)';
    out.push(sc + '{--sb-rail-bg:' + railBg + ';--sb-rail-ink:' + railInk + ';--sb-rail-muted:' + railMuted +
      ';--sb-rail-head:' + railHead + ';--sb-rail-rule:' + railRule + '}');
    out.push(sc + ' .bd-rail{position:absolute;top:0;bottom:0;' + near + ':0;width:' + G.rail + 'mm;background:var(--sb-rail-bg);color:var(--sb-rail-ink)}');
    if (st.railFill === 'none') {
      out.push(sc + ' .bd-rail::after,' + sc + ' .bd-strip::after{content:"";position:absolute;top:' + G.railTop + 'mm;bottom:' + G.railBottom +
        'mm;' + far + ':0;border-' + far + ':.6pt solid var(--bd-rule)}');
    }
    out.push(sc + ' .bd-rail-in{position:absolute;top:' + G.railTop + 'mm;bottom:' + G.railBottom + 'mm;left:' + G.railPadX + 'mm;right:' +
      G.railPadX + 'mm;overflow:hidden;display:flex;flex-direction:column}');
    out.push(sc + ' .bd-rail-photo{flex:none;align-self:center;margin-bottom:calc(8mm * var(--bd-sp));position:relative}');
    out.push(sc + ' .bd-photo-rail{width:' + G.photoW + 'mm;height:' + G.photoH + 'mm}');
    out.push(sc + ' .bd-photo-rail.bd-shape-circle{height:' + G.photoW + 'mm}');
    if (st.photoFrame === 'ring') {
      out.push(sc + ' .bd-photo-rail{box-shadow:0 0 0 1.1mm var(--sb-rail-bg),0 0 0 1.5mm var(--bd-accent)}');
    } else if (st.photoFrame === 'offset') {
      out.push(sc + ' .bd-rail-photo::before{content:"";position:absolute;inset:0;transform:translate(2.2mm,2.2mm);border:.7pt solid var(--bd-accent);border-radius:inherit}');
      out.push(sc + ' .bd-rail-photo:has(.bd-shape-circle)::before{border-radius:50%}');
      out.push(sc + ' .bd-rail-photo:has(.bd-shape-rounded)::before{border-radius:2.6mm}');
      out.push(sc + ' .bd-rail-photo:has(.bd-shape-arch)::before{border-radius:999px 999px 2mm 2mm}');
      out.push(sc + ' .bd-photo-rail{position:relative}');
    }
    out.push(sc + ' .bd-rail-sec{flex:none}');
    out.push(sc + ' .bd-rail-sec+.bd-rail-sec{margin-top:calc(4.2mm * var(--bd-sp))}');
    out.push(sc + ' .bd-rh{margin:0 0 calc(2.6mm * var(--bd-sp));padding-bottom:2mm;border-bottom:.6pt solid var(--sb-rail-rule);font-family:var(--bd-font-body);' +
      'font-weight:600;font-size:.76em;line-height:1.3;letter-spacing:.16em;text-transform:uppercase;color:var(--sb-rail-head)}');
    out.push(sc + ' .bd-rh .bd-hi{margin-left:.6em;font-weight:500}');
    out.push(sc + ' .bd-rf{margin-bottom:calc(2.5mm * var(--bd-sp));break-inside:avoid}');
    out.push(sc + ' .bd-rf-l{font-size:.74em;line-height:1.32;letter-spacing:.1em;text-transform:uppercase;color:var(--sb-rail-muted);font-weight:500}');
    out.push(sc + ' .bd-rf-l .bd-hi{margin-left:.55em;letter-spacing:0;text-transform:none;font-weight:400;font-size:1.08em}');
    // Devanagari needs more size than tracked Latin caps to read at the same weight.
    out.push(sc + '.bd-lang-hi .bd-rf-l{font-size:.88em;letter-spacing:0}');
    out.push(sc + ' .bd-rh [lang="hi"]{font-size:1.18em}' + sc + '.bd-lang-hi .bd-h:not(.bd-h-serif){font-size:1.02em}');
    out.push(sc + ' .bd-rf-v{font-size:.98em;line-height:1.34;font-weight:500;overflow-wrap:anywhere;color:var(--sb-rail-ink)}');
    out.push(sc + ' .bd-rf-v .bd-note{color:var(--sb-rail-muted);font-weight:400}');
    out.push(sc + ' .bd-rf[data-f="contact.email"] .bd-rf-v{word-break:break-all}');
    out.push(sc + ' .bd-rail-orn{position:absolute;bottom:' + (G.railBottom - 4) + 'mm;left:50%;width:18mm;margin-left:-9mm;color:' +
      (st.railFill === 'band' ? 'var(--sb-rail-muted)' : 'var(--bd-accent)') + ';opacity:.8}');

    // Continuation strip
    out.push(sc + ' .bd-strip{position:absolute;top:0;bottom:0;' + near + ':0;width:' + G.strip + 'mm;background:var(--sb-rail-bg)}');

    // Main column
    out.push(sc + ' .bd-sheet{position:absolute;top:' + G.top + 'mm;bottom:' + G.bottom + 'mm;' + near + ':' + mainNear + 'mm;' + far + ':' + G.edge +
      'mm;display:flex;flex-direction:column}');
    out.push(sc + ' .bd-page-cont .bd-sheet{' + near + ':' + contNear + 'mm;' + far + ':' + (G.edge + 2) + 'mm}');
    if (st.pageTint) out.push(sc + ' .bd-page{background:var(--bd-tint)}');
    out.push(sc + ' .bd-well{flex:1 1 auto}');
    out.push(sc + ' .bd-foot{padding-top:2.5mm}');
    out.push(sc + ' .bd-runhead{margin-bottom:3.6mm}');

    // Header
    var align = st.headerAlign === 'center' ? 'center' : 'left';
    out.push(sc + ' .bd-head{text-align:' + align + ';padding:1mm 0 calc(4.6mm * var(--bd-sp))}');
    out.push(sc + ' .bd-invocation{text-align:' + align + ';margin-bottom:2.4mm}');
    out.push(sc + ' .bd-eyebrow{font-family:var(--bd-font-body);text-transform:uppercase;letter-spacing:.38em;font-size:.72em;font-weight:600;' +
      'color:var(--bd-accent);margin:0 0 2mm}');
    out.push(sc + ' .bd-eyebrow .bd-hi{text-transform:none;letter-spacing:.04em;margin-left:.8em}');
    if (st.nameStyle === 'caps') {
      out.push(sc + ' .bd-name{font-family:var(--bd-font-body);font-weight:' + st.nameWeight + ';font-size:2.35em;line-height:1.12;letter-spacing:.06em;' +
        'text-transform:uppercase;color:var(--bd-primary);margin:0;overflow-wrap:anywhere}');
    } else {
      out.push(sc + ' .bd-name{font-family:var(--bd-font-display);font-weight:' + st.nameWeight + ';font-size:2.7em;line-height:1.08;' +
        'color:var(--bd-primary);margin:0;overflow-wrap:anywhere}');
    }
    out.push(sc + ' .bd-headline{margin-top:2mm;color:var(--bd-muted);font-size:1.02em;letter-spacing:.01em}');
    out.push(sc + ' .bd-headline .bd-sep{display:inline-block;margin:0 .6em;color:var(--bd-accent)}');
    out.push(sc + ' .bd-head-hr{width:16mm;height:0;border-top:1.6pt solid var(--bd-accent);margin:4.2mm ' + (align === 'center' ? 'auto' : '0') + ' 0}');
    out.push(sc + ' .bd-head-orn{width:44mm;margin:3.6mm ' + (align === 'center' ? 'auto' : '0') + ' 0;color:var(--bd-accent)}');

    // Section titles
    out.push(sc + ' .bd-title{margin-top:calc(4.6mm * var(--bd-sp));margin-bottom:calc(1.4mm * var(--bd-sp))}');
    out.push(sc + ' .bd-well>.bd-title:first-child{margin-top:0}');
    out.push(sc + ' .bd-h{margin:0;font-family:var(--bd-font-body);font-weight:600;font-size:.86em;line-height:1.3;letter-spacing:.16em;' +
      'text-transform:uppercase;color:var(--bd-primary)}');
    out.push(sc + ' .bd-h .bd-hi{margin-left:.7em;letter-spacing:0;font-weight:500;color:var(--bd-muted)}');
    out.push(sc + ' .bd-h-rule{display:flex;align-items:center;gap:3mm}');
    out.push(sc + ' .bd-h-line{flex:1;height:0;border-top:.6pt solid var(--bd-rule);min-width:6mm}');
    out.push(sc + ' .bd-h-underline{padding-bottom:1.6mm;border-bottom:.8pt solid var(--bd-primary)}');
    out.push(sc + ' .bd-h-bar{border-left:1.2mm solid var(--bd-accent);padding:.5mm 0 .5mm 2.6mm}');
    out.push(sc + ' .bd-h-serif{font-family:var(--bd-font-display);font-size:1.32em;font-weight:600;letter-spacing:.01em;text-transform:none;' +
      'display:flex;align-items:center;gap:2.4mm}');
    out.push(sc + ' .bd-h-serif .bd-h-orn{flex:none;width:3.2mm;color:var(--bd-accent)}');
    out.push(sc + ' .bd-h-serif .bd-hi{font-family:var(--bd-font-body);font-size:.66em}');

    // Rows. One label width for single and paired rows so value columns line
    // up. Pairs sit two-up on continuation pages; on page 1 (narrow column)
    // only "tight" pairs (both values very short) stay two-up, others stack.
    out.push(sc + ' .bd-well{--bd-label-w:30mm;--bd-pair-label-w:30mm}');
    out.push(sc + '.bd-lang-hi .bd-well{--bd-label-w:27mm;--bd-pair-label-w:27mm}');
    out.push(sc + '.bd-lang-both .bd-well{--bd-label-w:32mm;--bd-pair-label-w:32mm}');
    out.push(sc + ' .bd-pair{column-gap:calc(6mm * var(--bd-sp))}');
    out.push(sc + ' .bd-page-first .bd-pair:not(.bd-pair-tight){display:block}');
    out.push(sc + ' .bd-pair>.bd-row{--bd-label-w:var(--bd-pair-label-w)}');
    if (st.rowLines === 'hair') out.push(sc + ' .bd-row{border-bottom:.4pt solid color-mix(in srgb,var(--bd-rule) 55%,transparent)}');
    if (st.rowLines === 'dotted') out.push(sc + ' .bd-row{border-bottom:.6pt dotted var(--bd-rule)}');
    out.push(sc + ' .bd-row{padding:calc(.26em * var(--bd-sp)) 0}');
    // Bilingual labels: Hindi line tucked under the English one, smaller.
    // inline-block: a short pair ("Age आयु") shares one line, a long one wraps
    // the Hindi label as a unit onto a second, smaller line.
    out.push(sc + '.bd-lang-both .bd-l .bd-en{margin-right:.5em}');
    out.push(sc + '.bd-lang-both .bd-l .bd-hi{display:inline-block;font-size:.8em;line-height:1.08}');
    out.push(sc + '.bd-lang-both .bd-row{padding:calc(.1em * var(--bd-sp)) 0 calc(.14em * var(--bd-sp))}');
    out.push(sc + '.bd-lang-both .bd-title{margin-top:calc(3.3mm * var(--bd-sp))}');
    return out.join('\n');
  }

  function validate(def, fail) {
    var s = def.style || {};
    Object.keys(s).forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(STYLE, k)) fail('unknown sidebar style option ' + k);
      if (ENUMS[k] && ENUMS[k].indexOf(s[k]) < 0) fail('style.' + k + ' must be one of ' + ENUMS[k].join(', '));
      if ((k === 'railFacts' || k === 'railContact') && (!Array.isArray(s[k]) || s[k].some(function (id) {
        return typeof id !== 'string' || (!K.schema.field(id) && K.schema.DERIVED_IDS.indexOf(id) < 0);
      }))) fail('style.' + k + ' must list field ids');
      if (k === 'tightValue' && (typeof s[k] !== 'number' || s[k] < 0 || s[k] > 30)) fail('style.tightValue must be a number 0..30');
    });
  }

  K.archetypes = K.archetypes || {};
  K.archetypes.sidebar = {
    id: 'sidebar',
    photoSlots: ['rail'],
    wells: 1,
    css: css,
    pageShell: pageShell,
    headerBlocks: headerBlocks,
    chromeHeader: chromeHeader,
    flowBlocks: function (ctx) {
      var out = headerBlocks(ctx);
      ctx.sections().forEach(function (sec) { out = out.concat(sectionBlocks(ctx, sec)); });
      return out;
    },
    prepare: function (ctx) {
      ctx.pairRows = true;
      ctx.pairMaxValue = 24;
      ctx.sbRail = planRail(ctx);
      var inRail = ctx.sbRail.ids;
      var rows = ctx.rows;
      ctx.rows = function (sec) {
        return rows(sec).filter(function (r) { return !inRail[r.id]; });
      };
    },
    sectionTitle: sectionTitle,
    validate: validate,
    STYLE: STYLE,
    GEOMETRY: G,
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
