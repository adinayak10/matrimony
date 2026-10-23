/* global window */
// Renderer: data + template + design -> paginatable HTML/CSS.
//
// K.renderBiodataParts({data, templateId, design, photoUrl, mode, fontUrl, now})
//   -> { css, body, fontFamilies, warnings }
// K.renderBiodataHtml(input) -> standalone HTML document (fonts + paginator)
// K.previewShell({fontUrl})  -> builder iframe document
//
// The body is one .bd-doc element holding the page shells (<template>), the
// hidden #bd-flow of atomic blocks and the empty #bd-pages container that
// K.paginateSource fills in the browser. See archetypes/README.md for the
// archetype contract and the ctx helpers built here.
(function (K) {
  'use strict';

  var SPACING = { compact: 0.78, normal: 1, relaxed: 1.24 };
  // One label width for single and two-up rows so value columns line up.
  var LABEL_W = { en: '36mm', hi: '31mm', both: '38mm' };
  var PAIR_LABEL_W = LABEL_W;
  var MODES = ['preview', 'pdf', 'thumbnail'];

  var DATA_URI = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
  var API_PATH = /^\/api\/biodata\/[A-Za-z0-9._~\-/]+(\?[A-Za-z0-9._~\-=&%]*)?$/;

  function photoAllowed(url) {
    if (typeof url !== 'string' || !url) return false;
    if (url.slice(0, 5) === 'data:') return DATA_URI.test(url);
    return API_PATH.test(url) && url.indexOf('..') < 0 && url.indexOf('//') < 0;
  }
  K.photoAllowed = photoAllowed;

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  function paragraphs(text) {
    return String(text || '').split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(Boolean);
  }

  // ------------------------------------------------------------------ ctx
  function makeCtx(opts) {
    var data = opts.data;
    var def = opts.def;
    var design = opts.design;
    var mode = design.labelLanguage; // label mode: en | hi | both
    var vlang = mode === 'hi' ? 'hi' : 'en'; // value language
    var hidden = {};
    data.hiddenFields.forEach(function (id) { hidden[id] = true; });
    var hiddenSec = {};
    design.hiddenSections.forEach(function (s) { hiddenSec[s] = true; });

    var ctx = {
      K: K,
      def: def,
      design: design,
      data: data,
      mode: opts.mode,
      now: opts.now,
      lang: mode,
      valueLang: vlang,
      theme: opts.theme,
      esc: K.esc,
      attr: K.attr,
      fmt: K.fmt,
      hasPhoto: !!opts.photoUrl && design.photoPlacement !== 'none',
      photoPlacement: design.photoPlacement,
      chromeHeaderHtml: '',
      pairRows: false,     // archetype prepare() may enable two-up short rows
      proseStyle: 'grid',  // 'grid' (paragraphs in the value column) | 'stacked' (label line above)
      pairMaxValue: 26,
      pairMaxLabel: 20,
    };

    ctx.label = function (group, key) { return K.label(group, key, mode); };
    ctx.t = function (group, key) { return K.t(vlang, group, key); };
    ctx.isHidden = function (id) { return !!hidden[id]; };
    ctx.isSectionHidden = function (sec) { return !!hiddenSec[sec]; };

    ctx.ornament = function (role, cls) {
      var key = has(def.ornaments, role) ? def.ornaments[role] : '';
      return key ? K.ornament(key, cls) : '';
    };

    ctx.photo = function (cls) {
      if (!ctx.hasPhoto) return '';
      return '<div class="bd-photo bd-shape-' + design.photoShape + (cls ? ' ' + cls : '') + '">' +
        '<img src="' + K.attr(opts.photoUrl) + '" alt=""></div>';
    };

    ctx.value = function (id) {
      var i = id.indexOf('.');
      var sec = data[id.slice(0, i)];
      return sec ? sec[id.slice(i + 1)] : undefined;
    };

    // Plain display text of a field (not escaped). '' when empty.
    ctx.text = function (id) {
      var fd = K.schema.field(id);
      if (!fd) return '';
      return K.fmt.fieldText(fd, ctx.value(id), vlang);
    };
    ctx.html = function (id) { return K.esc(ctx.text(id)); };

    var p = data.personal;
    var ageInfo = K.fmt.displayAge(data, opts.now);
    ctx.identity = {
      name: p.fullName,
      headline: data.profession.designation || data.profession.occupation,
      place: data.profession.workLocation || data.contact.city,
      age: ageInfo.value === null ? '' : K.fmt.formatAge(ageInfo.value, vlang),
      height: K.fmt.formatHeight(p.heightCm, 'ft', vlang),
      community: [data.religion.caste, data.religion.religion ? K.t(vlang, 'values', 'religion.' + data.religion.religion) : '']
        .filter(Boolean).join(', '),
    };

    ctx.invocationHtml = function (cls) {
      var inv = data.invocation;
      if (!inv) return '';
      return '<div class="bd-invocation' + (cls ? ' ' + cls : '') + '" dir="auto">' + K.esc(inv) + '</div>';
    };
    ctx.titleText = function (key) { return K.label('misc', key || 'biodata', mode); };

    ctx.footer = function () {
      var ft = design.footerText;
      return '<div class="bd-foot"><span class="bd-foot-text">' + (ft ? K.esc(ft) : '') +
        '</span><span class="bd-pageno"></span></div>';
    };
    ctx.runningHead = function () {
      return '<div class="bd-runhead"><span class="bd-runhead-name">' + K.esc(p.fullName) +
        '</span><span class="bd-runhead-title">' + ctx.titleText('biodata') + '</span></div>';
    };

    // ---- section rows
    function plainLen(html) { return String(html).replace(/<[^>]*>/g, '').replace(/&[#a-z0-9]+;/gi, '_').length; }
    // short: fits half a column, so pairable into two-up rows (ctx.pairRows).
    function row(id, labelHtml, valueHtml) {
      var short = valueHtml.indexOf('<br') < 0 && valueHtml.indexOf('bd-line') < 0 && valueHtml.indexOf('@') < 0 &&
        plainLen(valueHtml) <= ctx.pairMaxValue && plainLen(labelHtml.replace(/<span class="bd-hi"[^>]*>[^<]*<\/span>/, '')) <= ctx.pairMaxLabel;
      return { id: id, kind: 'row', label: labelHtml, value: valueHtml, short: short };
    }
    function stdRow(fd) {
      var v = data[fd.section][fd.key];
      if (fd.type === 'list') return null;
      var txt = K.fmt.fieldText(fd, v, vlang);
      if (!txt) return null;
      if (fd.prose) return { id: fd.id, kind: 'prose', label: ctx.label('fields', fd.id), paras: paragraphs(txt) };
      return row(fd.id, ctx.label('fields', fd.id), fd.multiline ? K.escMultiline(txt) : K.esc(txt));
    }

    var SKIP = {
      'personal.fullName': 1, 'personal.gender': 1, 'personal.ageOverride': 1,
      'income.period': 1, 'income.currency': 1, 'income.text': 1,
      'partner.ageMin': 1, 'partner.ageMax': 1, 'partner.heightMinCm': 1, 'partner.heightMaxCm': 1,
      'contact.relation': 1, 'contact.city': 1, 'contact.state': 1, 'contact.country': 1,
    };

    function special(fd, rows) {
      var id = fd.id;
      if (id === 'personal.dob') {
        var r = stdRow(fd);
        if (r && !hidden[id]) rows.push(r);
        if (!hidden['personal.age'] && ageInfo.value !== null) {
          rows.push(row('personal.age', ctx.label('fields', 'personal.age'), K.esc(K.fmt.formatAge(ageInfo.value, vlang))));
        }
        return true;
      }
      if (id === 'family.siblings') {
        if (hidden[id]) return true;
        data.family.siblings.forEach(function (s, i) {
          var rel = s.relation ? ctx.label('values', 'siblingRelation.' + s.relation) : ctx.label('fields', 'family.siblings');
          var parts = [];
          if (s.details) parts.push(K.esc(s.details));
          if (s.maritalStatus) parts.push('<span class="bd-note">' + K.esc(K.t(vlang, 'values', 'siblingStatus.' + s.maritalStatus)) + '</span>');
          if (!parts.length) return;
          rows.push(row(id + '.' + i, rel, parts.join('<span class="bd-dot"> · </span>')));
        });
        return true;
      }
      if (id === 'education.degrees') {
        if (hidden[id]) return true;
        var lines = data.education.degrees.map(function (dg) {
          var bits = [];
          if (dg.degree) bits.push('<span class="bd-strong">' + K.esc(dg.degree) + '</span>');
          var sub = [dg.institution, dg.year].filter(Boolean).map(K.esc).join(', ');
          if (sub) bits.push('<span class="bd-note">' + sub + '</span>');
          return bits.length ? '<span class="bd-line">' + bits.join('<span class="bd-dot"> · </span>') + '</span>' : '';
        }).filter(Boolean);
        if (lines.length) rows.push(row(id, ctx.label('fields', id), lines.join('')));
        return true;
      }
      if (id === 'income.amount') {
        if (hidden[id]) return true;
        var inc = K.fmt.formatIncome(data.income, vlang);
        if (inc) rows.push(row(id, ctx.label('fields', id), K.esc(inc)));
        return true;
      }
      if (id === 'partner.ageMin' || id === 'partner.heightMinCm') {
        var isAge = id === 'partner.ageMin';
        var did = isAge ? 'partner.age' : 'partner.height';
        if (hidden[did]) return true;
        var pa = data.partner;
        var txt = isAge ? K.fmt.formatRange(pa.ageMin, pa.ageMax, 'years', vlang)
          : K.fmt.formatRange(pa.heightMinCm, pa.heightMaxCm, 'height', vlang);
        if (txt) rows.push(row(did, ctx.label('fields', did), K.esc(txt)));
        return true;
      }
      if (id === 'contact.contactPerson') {
        if (hidden[id]) return true;
        var c = data.contact;
        if (!c.contactPerson) return true;
        var v = K.esc(c.contactPerson);
        if (c.relation && !hidden['contact.relation']) {
          v += ' <span class="bd-note">(' + K.esc(K.t(vlang, 'values', 'contactRelation.' + c.relation)) + ')</span>';
        }
        rows.push(row(id, ctx.label('fields', id), v));
        return true;
      }
      if (id === 'contact.bestTime') {
        // contact.location goes just before best time.
        var cc = data.contact;
        if (!hidden['contact.location']) {
          var loc = ['city', 'state', 'country'].filter(function (k) { return cc[k] && !hidden['contact.' + k]; })
            .map(function (k) { return cc[k]; }).join(', ');
          if (loc) rows.push(row('contact.location', ctx.label('fields', 'contact.location'), K.esc(loc)));
        }
        return false;
      }
      return false;
    }

    // Rows of a section: [{id, kind:'row', label, value} | {id, kind:'prose', label, paras}]
    // label/value are escaped HTML; paras are plain strings.
    ctx.rows = function (sec) {
      var rows = [];
      K.schema.FIELDS.forEach(function (fd) {
        if (fd.section !== sec) return;
        if (fd.when && !fd.when(data)) return;
        if (special(fd, rows)) return;
        if (SKIP[fd.id] || hidden[fd.id]) return;
        var r = stdRow(fd);
        if (r) rows.push(r);
      });
      (data.custom[sec] || []).forEach(function (cf) {
        if (!cf.value || !(cf.label.en || cf.label.hi)) return;
        rows.push(row('custom.' + sec + '.' + cf.id, K.labelPair(cf.label, mode), K.esc(cf.value)));
      });
      return rows;
    };

    // Rows for specific field ids (key-fact panels). Unknown/empty ids skipped.
    ctx.factRows = function (ids) {
      var out = [];
      var cache = {};
      ids.forEach(function (id) {
        var sec = id.split('.')[0];
        if (hiddenSec[sec]) return;
        if (!cache[sec]) cache[sec] = ctx.rows(sec);
        cache[sec].forEach(function (r) { if (r.id === id || r.id.indexOf(id + '.') === 0) out.push(r); });
      });
      return out;
    };

    ctx.sectionTitle = function (sec) {
      var ov = data.sectionTitles[sec] || {};
      var pair = { en: ov.en || K.t('en', 'sections', sec), hi: ov.hi || K.t('hi', 'sections', sec) };
      return K.labelPair(pair, mode);
    };

    ctx.block = function (cls, inner, attrs) {
      return '<div class="bd-block ' + cls + '"' + (attrs || '') + '>' + inner + '</div>';
    };

    ctx.rowHtml = function (r) {
      return '<div class="bd-l">' + r.label + '</div><div class="bd-v">' + r.value + '</div>';
    };

    ctx.rowBlocks = function (r) {
      if (r.kind === 'prose' && ctx.proseStyle === 'grid') {
        // Paragraphs in the value column; the label sits beside the first one.
        return r.paras.map(function (para, i) {
          return ctx.block('bd-row bd-prose' + (i ? ' bd-prose-cont' : ''), '<div class="bd-l' + (i ? ' bd-l-empty' : '') + '">' +
            (i ? '' : r.label) + '</div><div class="bd-v"><p>' + K.escMultiline(para) + '</p></div>', ' data-f="' + K.attr(r.id) + '"');
        });
      }
      if (r.kind === 'prose') {
        var out = [ctx.block('bd-plabel bd-keep', r.label, ' data-f="' + K.attr(r.id) + '"')];
        r.paras.forEach(function (para) {
          out.push(ctx.block('bd-para', '<p>' + K.escMultiline(para) + '</p>', ' data-f="' + K.attr(r.id) + '"'));
        });
        return out;
      }
      return [ctx.block('bd-row', ctx.rowHtml(r), ' data-f="' + K.attr(r.id) + '"')];
    };

    ctx.titleBlock = function (sec) {
      var label = ctx.sectionTitle(sec);
      var inner = ctx.archetype && ctx.archetype.sectionTitle
        ? ctx.archetype.sectionTitle(ctx, sec, label)
        : '<h2 class="bd-h"><span class="bd-h-t">' + label + '</span></h2>';
      return ctx.block('bd-title bd-keep', inner, ' data-sec="' + sec + '"');
    };

    // Flow blocks of one section: [] when hidden or empty (no empty headings).
    ctx.sectionBlocks = function (sec) {
      if (hiddenSec[sec] || K.schema.SECTIONS.indexOf(sec) < 0) return [];
      var rows = ctx.rows(sec);
      if (!rows.length) return [];
      var out = [ctx.titleBlock(sec)];
      // Two-up pairing: a short row pairs with the next short row, looking
      // past at most one long row (which then follow the pair).
      rows = rows.slice();
      for (var i = 0; i < rows.length; i++) {
        var a = rows[i];
        var j = -1;
        if (ctx.pairRows && a.short) {
          for (var k = i + 1; k < rows.length && k <= i + 2; k++) {
            if (rows[k].kind === 'row' && rows[k].short) { j = k; break; }
          }
        }
        if (j > 0) {
          var b = rows.splice(j, 1)[0];
          out.push(ctx.block('bd-pair', '<div class="bd-row bd-cell" data-f="' + K.attr(a.id) + '">' + ctx.rowHtml(a) +
            '</div><div class="bd-row bd-cell" data-f="' + K.attr(b.id) + '">' + ctx.rowHtml(b) + '</div>'));
          continue;
        }
        out = out.concat(ctx.rowBlocks(a));
      }
      return out;
    };

    // Visible, non-empty sections in design order.
    ctx.sections = function (skip) {
      return design.sectionOrder.filter(function (sec) {
        return !(skip && skip.indexOf(sec) >= 0) && !hiddenSec[sec] && ctx.rows(sec).length > 0;
      });
    };

    ctx.allSectionBlocks = function (skip) {
      var out = [];
      ctx.sections(skip).forEach(function (sec) { out = out.concat(ctx.sectionBlocks(sec)); });
      return out;
    };

    return ctx;
  }

  // ------------------------------------------------------------------ CSS
  function themeFor(def, design) {
    var pal = K.palettes[design.palette].vars;
    var fonts = K.fontPresets[design.font];
    return {
      vars: pal,
      fonts: fonts,
      scale: design.scale,
      spacing: design.spacing,
      sp: SPACING[design.spacing] || 1,
      labelW: LABEL_W[design.labelLanguage] || LABEL_W.en,
      pairLabelW: PAIR_LABEL_W[design.labelLanguage] || PAIR_LABEL_W.en,
      printSafe: def.printSafe,
      design: design,
    };
  }

  function baseCss(theme) {
    var v = theme.vars;
    return [
      '@page{size:A4;margin:0}',
      '.bd-doc{--bd-primary:' + v.primary + ';--bd-accent:' + v.accent + ';--bd-ink:' + v.ink + ';--bd-muted:' + v.muted +
        ';--bd-paper:' + v.paper + ';--bd-rule:' + v.rule + ';--bd-band:' + v.band + ';--bd-band-ink:' + v.bandInk +
        ';--bd-font-display:' + theme.fonts.display + ';--bd-font-body:' + theme.fonts.body +
        ';--bd-scale:' + theme.scale + ';--bd-sp:' + theme.sp + ';--bd-label-w:' + theme.labelW + ';--bd-pair-label-w:' + theme.pairLabelW + ';' +
        '--bd-tint:color-mix(in srgb,var(--bd-primary) 6%,var(--bd-paper));' +
        '--bd-tint-2:color-mix(in srgb,var(--bd-accent) 14%,var(--bd-paper));' +
        'font-family:var(--bd-font-body);color:var(--bd-ink);font-size:calc(9.4pt * var(--bd-scale));line-height:1.42;' +
        'font-kerning:normal;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;' +
        '-webkit-print-color-adjust:exact;print-color-adjust:exact;-webkit-text-size-adjust:100%;text-size-adjust:100%}',
      '.bd-doc *,.bd-doc *::before,.bd-doc *::after{box-sizing:border-box}',
      '.bd-doc #bd-flow,.bd-doc template{display:none}',
      '.bd-doc [lang="hi"]{font-family:var(--bd-font-body);letter-spacing:0 !important;text-transform:none !important}',
      '.bd-prose p{margin:0;text-wrap:pretty}.bd-prose-cont{border-top:0;padding-top:0}.bd-l-empty::after{display:none}',
      '.bd-page{position:relative;width:210mm;height:297mm;overflow:hidden;margin:0 auto;background:var(--bd-paper);' +
        'break-after:page;page-break-after:always;break-inside:avoid}',
      '.bd-page:last-child{break-after:auto;page-break-after:auto}',
      '.bd-mode-preview{background:#e4e6ec;padding:24px 0 8px;min-height:100%}',
      '.bd-mode-preview .bd-page{margin-bottom:20px;box-shadow:0 1px 2px rgba(15,23,42,.10),0 10px 30px rgba(15,23,42,.12)}',
      '.bd-mode-pdf .bd-page,.bd-mode-thumbnail .bd-page{margin:0;box-shadow:none}',
      '@media print{.bd-mode-preview{background:none;padding:0}.bd-mode-preview .bd-page{margin:0;box-shadow:none}}',
      '.bd-well{position:relative;min-height:0;overflow:hidden}',
      '.bd-block{break-inside:avoid}',
      '.bd-overflow{outline:1px dashed rgba(220,38,38,.6);outline-offset:-1px}',
      '@media print{.bd-overflow{outline:none}}',
      // Rows
      '.bd-row{display:grid;grid-template-columns:var(--bd-label-w) minmax(0,1fr);column-gap:calc(3.2mm * var(--bd-sp));' +
        'padding:calc(.2em * var(--bd-sp)) 0;align-items:baseline}',
      '.bd-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:calc(7mm * var(--bd-sp))}',
      '.bd-pair>.bd-row{--bd-label-w:var(--bd-pair-label-w)}',
      '.bd-l{color:var(--bd-muted);font-weight:500;font-size:.9em;letter-spacing:.01em;overflow-wrap:anywhere}',
      '.bd-en+.bd-hi{margin-left:.55em}',
      // Devanagari reads small next to Latin at the same size; small caps lines get a lift.
      '.bd-lang-hi .bd-l{font-size:.96em}.bd-eyebrow [lang="hi"],.bd-runhead-title [lang="hi"]{font-size:1.3em}',
      '.bd-l .bd-hi,.bd-plabel .bd-hi{margin-left:0;display:block;font-weight:400;font-size:.86em;line-height:1.25;opacity:.9;letter-spacing:0}',
      '.bd-v{color:var(--bd-ink);overflow-wrap:anywhere;word-break:normal;min-width:0}',
      '.bd-v .bd-note{color:var(--bd-muted)}',
      '.bd-v .bd-dot{color:var(--bd-rule)}',
      '.bd-v .bd-strong{font-weight:500}',
      '.bd-v .bd-line{display:block}',
      '.bd-v .bd-line+.bd-line{margin-top:.18em}',
      // Prose
      '.bd-plabel{color:var(--bd-muted);font-weight:500;font-size:.9em;margin-top:calc(.55em * var(--bd-sp));padding-bottom:.1em}',
      '.bd-para p{margin:0 0 calc(.32em * var(--bd-sp));overflow-wrap:anywhere;text-wrap:pretty}',
      // Photo
      '.bd-photo{overflow:hidden;background:var(--bd-tint);flex:none}',
      '.bd-photo img{display:block;width:100%;height:100%;object-fit:cover}',
      '.bd-shape-rounded{border-radius:2.6mm}',
      '.bd-shape-circle{border-radius:50%}',
      '.bd-shape-square{border-radius:0}',
      '.bd-shape-arch{border-radius:999px 999px 2mm 2mm}',
      // Ornaments
      '.bd-orn{display:block;line-height:0;color:var(--bd-primary)}',
      '.bd-orn svg{display:block;width:100%;height:auto;overflow:visible}',
      // Invocation, footer, running head
      '.bd-invocation{font-family:var(--bd-font-display);color:var(--bd-accent);text-align:center;font-size:1.06em;letter-spacing:.04em}',
      '.bd-foot{display:flex;justify-content:space-between;align-items:flex-end;gap:6mm;color:var(--bd-muted);font-size:.78em;letter-spacing:.02em}',
      '.bd-foot{flex:none}.bd-foot>span{min-height:1.5em;line-height:1.5em}',
      '.bd-foot-text{flex:1;text-align:center;overflow-wrap:anywhere}',
      '.bd-pageno{min-width:12mm;text-align:right;font-variant-numeric:tabular-nums}',
      '.bd-foot::before{content:"";min-width:12mm}',
      '.bd-runhead{display:flex;justify-content:space-between;align-items:baseline;gap:6mm;color:var(--bd-muted);font-size:.8em;' +
        'letter-spacing:.06em;padding-bottom:2mm;border-bottom:.5pt solid var(--bd-rule);margin-bottom:5mm}',
      '.bd-runhead-name{font-family:var(--bd-font-display);color:var(--bd-primary);font-size:1.25em;letter-spacing:.01em}',
      '.bd-runhead-title{text-transform:uppercase;letter-spacing:.18em;font-size:.86em}',
    ].join('\n');
  }

  // ------------------------------------------------------------------ render
  function unknownTemplate(id) {
    var e = new Error('Unknown biodata template: ' + String(id).slice(0, 60));
    e.code = 'UNKNOWN_TEMPLATE';
    return e;
  }

  function renderBiodataParts(input) {
    var inp = input || {};
    var templateId = inp.templateId || K.DEFAULT_TEMPLATE;
    var def = K.registry.get(templateId);
    if (!def) throw unknownTemplate(templateId);
    var arch = K.archetypes[def.archetype];
    var mode = MODES.indexOf(inp.mode) >= 0 ? inp.mode : 'preview';
    var warnings = [];

    var data = K.schema.clean(inp.data).data;
    if (mode === 'thumbnail' && !data.invocation && def.defaults.invocation) data.invocation = def.defaults.invocation;
    var design = K.registry.resolveDesign(def, inp.design);

    var photoUrl = '';
    if (inp.photoUrl) {
      if (photoAllowed(inp.photoUrl)) photoUrl = inp.photoUrl;
      else warnings.push('PHOTO_REJECTED');
    }

    var theme = themeFor(def, design);
    var ctx = makeCtx({ data: data, def: def, design: design, photoUrl: photoUrl, mode: mode, now: inp.now, theme: theme });
    ctx.archetype = arch;
    if (arch.prepare) arch.prepare(ctx);

    if (arch.chromeHeader) ctx.chromeHeaderHtml = arch.chromeHeader(ctx) || '';
    var blocks = arch.flowBlocks
      ? arch.flowBlocks(ctx)
      : (arch.headerBlocks ? arch.headerBlocks(ctx) : []).concat(ctx.allSectionBlocks());

    var wells = typeof arch.wells === 'function' ? null : arch.wells || 1;
    function shell(kind) {
      var n = wells || arch.wells(ctx, kind) || 1;
      var s = arch.pageShell(ctx, kind) || {};
      var w = '';
      for (var i = 1; i <= n; i++) w += '<div class="bd-well" data-col="' + i + '"></div>';
      return '<template id="bd-shell-' + kind + '"><section class="bd-page bd-page-' + kind + '">' +
        (s.before || '') + w + (s.after || '') + '</section></template>';
    }

    var css = baseCss(theme) + '\n' + (arch.css(theme, def, design) || '') + '\n' + (def.css ? def.css(theme, design) || '' : '');
    var fontFamilies = K.fontsFor({ def: def, design: design, data: data });
    var docLang = design.labelLanguage === 'hi' ? 'hi' : 'en';
    var cls = 'bd-doc bd-mode-' + mode + ' bd-arch-' + def.archetype + ' bd-t-' + def.id + ' bd-lang-' + design.labelLanguage +
      ' bd-sp-' + design.spacing + ' bd-photo-' + (ctx.hasPhoto ? design.photoPlacement : 'none') + (def.printSafe ? ' bd-print-safe' : '');

    var body = '<div class="' + cls + '" lang="' + docLang + '" data-template="' + K.attr(def.id) + '" data-bd-fonts="' +
      K.attr(fontFamilies.join('|')) + '">' +
      shell('first') + shell('cont') +
      '<div id="bd-flow" aria-hidden="true">' + blocks.join('') + '</div>' +
      '<div id="bd-pages"' + (mode === 'thumbnail' ? ' data-max-pages="1"' : '') + '></div>' +
      '</div>';

    return { css: css, body: body, fontFamilies: fontFamilies, warnings: warnings, lang: docLang };
  }

  // In-document runner (serialised like the paginator; ES5, self-contained).
  // opts.auto: paginate once fonts are ready (standalone documents).
  // opts.live: re-paginate when late fonts finish loading (builder preview).
  function bdBoot(win, doc, paginate, opts) {
    var token = 0;
    function fire(n) {
      win.__bdPaginated = n;
      try { win.dispatchEvent(new win.CustomEvent('bd:paginated', { detail: n })); } catch (e) { /* old browsers */ }
    }
    function run() {
      var n;
      try { n = paginate(doc); } catch (e) { n = -1; }
      return n;
    }
    function pendingFonts() {
      var fs = doc.fonts;
      if (!fs || !fs.forEach) return null;
      var root = doc.querySelector('[data-bd-fonts]');
      var fams = root ? root.getAttribute('data-bd-fonts').split('|') : null;
      var list = [];
      fs.forEach(function (face) {
        var fam = String(face.family).replace(/^["']|["']$/g, '');
        if (face.status === 'loaded' || (fams && fams.indexOf(fam) < 0)) return;
        list.push(face.load().then(null, function () { return null; }));
      });
      return list.length ? win.Promise.all(list) : null;
    }
    function imagesReady() {
      var imgs = doc.querySelectorAll('#bd-pages img');
      var list = [];
      for (var i = 0; i < imgs.length; i++) {
        if (imgs[i].decode) list.push(imgs[i].decode().then(null, function () { return null; }));
      }
      return win.Promise.all(list);
    }
    win.__bdRepaginate = function () {
      var n = run();
      fire(n);
      var p = pendingFonts();
      if (p) {
        var my = ++token;
        p.then(function () { if (my === token) fire(run()); });
      }
      return n;
    };
    if (opts && opts.live && doc.fonts && doc.fonts.addEventListener) {
      var t = null;
      doc.fonts.addEventListener('loadingdone', function () {
        if (!doc.querySelector('#bd-flow')) return;
        if (t) win.clearTimeout(t);
        t = win.setTimeout(function () { t = null; fire(run()); }, 30);
      });
    }
    if (!opts || !opts.auto) return;
    var started = false;
    function go() {
      if (started) return;
      started = true;
      var ready = doc.fonts && doc.fonts.ready ? doc.fonts.ready : win.Promise.resolve();
      ready.then(null, function () { return null; }).then(function () {
        var n = run();
        imagesReady().then(function () { fire(n); });
      });
    }
    function start() {
      var p = pendingFonts();
      if (!p) { go(); return; }
      p.then(go, go);
      win.setTimeout(go, 5000);
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
    else start();
  }
  K.bootSource = bdBoot;

  function scriptFor(opts) {
    var src = 'var bdPaginate = ' + K.paginateSource.toString() + ';\n(' + bdBoot.toString() +
      ')(window, document, bdPaginate, ' + JSON.stringify(opts) + ');';
    return src.replace(/<\/(script)/gi, '<\\/$1');
  }

  var SHELL_CSS = 'html,body{margin:0;padding:0}body{background:#e4e6ec}';

  function renderBiodataHtml(input) {
    var inp = input || {};
    var parts = renderBiodataParts(inp);
    var fontCss = typeof inp.fontUrl === 'function' ? K.fontFaceCss(parts.fontFamilies, inp.fontUrl) : '';
    var data = K.schema.clean(inp.data).data;
    var title = (data.personal.fullName ? data.personal.fullName + ' - ' : '') + 'Biodata';
    var lang = parts.lang;
    var mode = inp.mode === 'pdf' || inp.mode === 'thumbnail' ? 'html,body{background:#fff}' : '';
    return '<!DOCTYPE html><html lang="' + lang + '"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">' +
      '<title>' + K.esc(title) + '</title>' +
      '<style id="bd-fonts">' + fontCss + '</style>' +
      '<style>' + SHELL_CSS + mode + '</style>' +
      '<style id="bd-css">' + parts.css + '</style></head>' +
      '<body class="bd-body"><div id="bd-root">' + parts.body + '</div>' +
      '<script>' + scriptFor({ auto: true, live: false }) + '</script></body></html>';
  }

  function previewShell(opts) {
    var o = opts || {};
    var fontCss = typeof o.fontUrl === 'function' ? K.fontFaceCss(Object.keys(K.fontFiles), o.fontUrl) : '';
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow">' +
      '<title>Biodata preview</title>' +
      '<style id="bd-fonts">' + fontCss + '</style>' +
      '<style>' + SHELL_CSS + '</style>' +
      '<style id="bd-css"></style></head>' +
      '<body class="bd-body"><div id="bd-root"></div>' +
      '<script>' + scriptFor({ auto: false, live: true }) + '</script></body></html>';
  }

  K.renderBiodataParts = renderBiodataParts;
  K.renderBiodataHtml = renderBiodataHtml;
  K.previewShell = previewShell;
  K.makeRenderContext = makeCtx;
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
