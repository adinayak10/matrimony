/* global window */
// Template registry. Template files call K.registry.register(def) when loaded.
// register() validates the definition strictly so a broken template fails at
// require time (and in tests), never at render time.
//
// def = {
//   id, slug, name:{en,hi}, tagline, description?, categories:[slug], tags?:[],
//   culture: 'neutral'|'hindu'|'muslim'|'sikh'|'christian'|'regional'|...,
//   archetype: 'classic'|'sidebar'|'band'|'frame'|'hero',
//   palettes:[paletteId], fonts:[fontPresetId], photoPlacements:[slot],
//   defaults:{ palette, font, scale, spacing, photoPlacement, photoShape,
//              labelLanguage, invocation, sectionOrder, hiddenSections },
//   ornaments?:{ role: ornamentKey }, style?:{...archetype options},
//   printSafe?: bool, css?(theme, design) -> string, thumbnail? }
(function (K) {
  'use strict';

  var CATEGORIES = [
    { slug: 'traditional', name: 'Traditional', description: 'Classic Indian biodata layouts with ornamental details and rich colours.' },
    { slug: 'modern', name: 'Modern', description: 'Contemporary layouts with clean typography and a fresh feel.' },
    { slug: 'minimal', name: 'Minimal', description: 'Quiet, uncluttered designs that let the details speak.' },
    { slug: 'premium', name: 'Premium', description: 'Rich palettes, refined type and elegant ornaments for a standout biodata.' },
    { slug: 'photo', name: 'Photo-focused', description: 'Layouts built around a large, well-framed photograph.' },
    { slug: 'community', name: 'Community', description: 'Designs that respect community and faith traditions, with matching invocation lines.' },
    { slug: 'regional', name: 'Regional', description: 'Bilingual English and Hindi layouts with regional colour palettes.' },
    { slug: 'print-friendly', name: 'Print-friendly', description: 'Black-and-white designs that print sharply on any office printer.' },
  ];
  var CAT_SLUGS = CATEGORIES.map(function (c) { return c.slug; });

  var defs = {};
  var order = [];

  function fail(id, msg) {
    var e = new Error('Biodata template "' + id + '": ' + msg);
    e.code = 'INVALID_TEMPLATE';
    throw e;
  }
  function isArr(a) { return Array.isArray(a) && a.length > 0; }
  function isStr(s) { return typeof s === 'string' && s.length > 0; }

  function register(def) {
    if (!def || typeof def !== 'object') throw new Error('register(def): def must be an object');
    var id = def.id;
    if (!isStr(id) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) fail(String(id), 'id must be a lowercase slug');
    if (defs[id]) fail(id, 'already registered');
    if (!isStr(def.slug) || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(def.slug)) fail(id, 'slug must be a lowercase slug');
    order.forEach(function (o) { if (defs[o].slug === def.slug) fail(id, 'slug "' + def.slug + '" already used by ' + o); });
    if (!def.name || !isStr(def.name.en) || !isStr(def.name.hi)) fail(id, 'name.en and name.hi are required');
    if (!isStr(def.tagline)) fail(id, 'tagline is required');
    if (!isArr(def.categories)) fail(id, 'categories must be a non-empty array');
    def.categories.forEach(function (c) { if (CAT_SLUGS.indexOf(c) < 0) fail(id, 'unknown category ' + c); });
    if (!isStr(def.culture)) fail(id, 'culture is required');
    var arch = K.archetypes && K.archetypes[def.archetype];
    if (!arch) fail(id, 'unknown archetype ' + def.archetype + ' (load archetypes before templates)');
    if (!isArr(def.palettes)) fail(id, 'palettes must be a non-empty array');
    def.palettes.forEach(function (p) { if (!K.palettes[p]) fail(id, 'unknown palette ' + p); });
    if (!isArr(def.fonts)) fail(id, 'fonts must be a non-empty array');
    def.fonts.forEach(function (p) { if (!K.fontPresets[p]) fail(id, 'unknown font preset ' + p); });
    if (!isArr(def.photoPlacements)) fail(id, 'photoPlacements must be a non-empty array');
    def.photoPlacements.forEach(function (p) {
      if (p !== 'none' && arch.photoSlots.indexOf(p) < 0) fail(id, 'photo placement ' + p + ' is not a ' + arch.id + ' slot');
    });
    var d = def.defaults;
    if (!d || typeof d !== 'object') fail(id, 'defaults are required');
    if (def.palettes.indexOf(d.palette) < 0) fail(id, 'defaults.palette must be one of palettes');
    if (def.fonts.indexOf(d.font) < 0) fail(id, 'defaults.font must be one of fonts');
    if (def.photoPlacements.indexOf(d.photoPlacement) < 0) fail(id, 'defaults.photoPlacement must be one of photoPlacements');
    if (typeof d.scale !== 'number' || d.scale < 0.85 || d.scale > 1.15) fail(id, 'defaults.scale must be 0.85..1.15');
    if (K.schema.SPACINGS.indexOf(d.spacing) < 0) fail(id, 'defaults.spacing invalid');
    if (K.schema.PHOTO_SHAPES.indexOf(d.photoShape) < 0) fail(id, 'defaults.photoShape invalid');
    if (K.schema.LABEL_LANGUAGES.indexOf(d.labelLanguage) < 0) fail(id, 'defaults.labelLanguage invalid');
    if (typeof d.invocation !== 'string' || d.invocation.length > K.schema.LIMITS.invocationMax) fail(id, 'defaults.invocation must be a short string');
    if (!Array.isArray(d.sectionOrder) || d.sectionOrder.length !== K.schema.SECTIONS.length ||
      K.schema.normaliseOrder(d.sectionOrder).join() !== d.sectionOrder.join()) fail(id, 'defaults.sectionOrder must be a permutation of SECTIONS');
    if (!Array.isArray(d.hiddenSections)) fail(id, 'defaults.hiddenSections must be an array');
    d.hiddenSections.forEach(function (s) { if (K.schema.SECTIONS.indexOf(s) < 0) fail(id, 'unknown hidden section ' + s); });
    if (def.ornaments) {
      Object.keys(def.ornaments).forEach(function (role) {
        var key = def.ornaments[role];
        if (key && !K.ornaments[key]) fail(id, 'unknown ornament ' + key);
      });
    }
    if (def.css !== undefined && typeof def.css !== 'function') fail(id, 'css must be a function');
    if (arch.validate) arch.validate(def, function (msg) { fail(id, msg); });

    def.tags = Array.isArray(def.tags) ? def.tags : [];
    def.ornaments = def.ornaments || {};
    def.style = def.style || {};
    def.printSafe = !!def.printSafe;
    def.description = def.description || def.tagline;
    def.thumbnail = def.thumbnail || '/images/biodata/' + id + '.webp';
    defs[id] = def;
    order.push(id);
    return def;
  }

  function get(id) {
    return typeof id === 'string' && Object.prototype.hasOwnProperty.call(defs, id) ? defs[id] : null;
  }

  function list() { return order.map(function (id) { return defs[id]; }); }

  function summary() {
    return list().map(function (d) {
      return {
        id: d.id,
        slug: d.slug,
        name: d.name.en,
        nameHi: d.name.hi,
        tagline: d.tagline,
        description: d.description,
        categories: d.categories.slice(),
        tags: d.tags.slice(),
        culture: d.culture,
        archetype: d.archetype,
        printSafe: d.printSafe,
        palettes: d.palettes.slice(),
        fonts: d.fonts.slice(),
        photoPlacements: d.photoPlacements.slice(),
        defaults: JSON.parse(JSON.stringify(d.defaults)),
        thumbnail: d.thumbnail,
      };
    });
  }

  var BASE = { scale: 1, spacing: 'normal', photoShape: 'rounded', labelLanguage: 'en', footerText: '', shareContact: false };

  // Full design: base <- template defaults <- cleaned user design.
  function resolveDesign(def, design) {
    if (typeof def === 'string') def = get(def);
    if (!def) throw Object.assign(new Error('Unknown template'), { code: 'UNKNOWN_TEMPLATE' });
    var d = def.defaults;
    var user = K.schema.cleanDesign(design, def.id).design;
    function pick(k, fallback) { return Object.prototype.hasOwnProperty.call(user, k) ? user[k] : fallback; }
    return {
      palette: pick('palette', d.palette),
      font: pick('font', d.font),
      scale: pick('scale', typeof d.scale === 'number' ? d.scale : BASE.scale),
      spacing: pick('spacing', d.spacing || BASE.spacing),
      photoPlacement: pick('photoPlacement', d.photoPlacement),
      photoShape: pick('photoShape', d.photoShape || BASE.photoShape),
      sectionOrder: pick('sectionOrder', d.sectionOrder.slice()),
      hiddenSections: pick('hiddenSections', d.hiddenSections.slice()),
      labelLanguage: pick('labelLanguage', d.labelLanguage || BASE.labelLanguage),
      footerText: pick('footerText', BASE.footerText),
      shareContact: pick('shareContact', BASE.shareContact),
    };
  }

  K.registry = {
    CATEGORIES: CATEGORIES,
    register: register,
    get: get,
    list: list,
    summary: summary,
    resolveDesign: resolveDesign,
  };
  K.DEFAULT_TEMPLATE = 'premium-traditional';
  K.TEMPLATE_IDS = [
    'premium-traditional', 'elegant-modern', 'royal-heritage', 'classic-family', 'contemporary-professional',
    'luxury-maroon-gold', 'elegant-floral', 'clean-minimal', 'photo-focused', 'hindu-classic', 'muslim-classic',
    'sikh-classic', 'christian-classic', 'regional-adaptable', 'print-bw',
  ];
  K.archetypes = K.archetypes || {};
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
