'use strict';
// THE single list of browser-bundled kit files, in load order (paths relative
// to packages/shared/biodata). index.js (Node) requires them in this order and
// apps/web/build/build.js concatenates them into js/biodata-kit.js.
//
// Rules: core first, then archetypes (templates validate against them), then
// templates (each registers itself when loaded). To add a template, append
// one line in the templates block. A test checks every kit file is listed once.
module.exports = [
  'core/escape.js',
  'core/labels.js',
  'core/format.js',
  'core/palettes.js',
  'core/fonts.js',
  'core/ornaments.js',
  'core/schema.js',
  'core/registry.js',
  'core/sample.js',
  'core/paginate.js',
  'core/render.js',

  'archetypes/classic.js',
  'archetypes/sidebar.js',
  'archetypes/band.js',
  'archetypes/frame.js',
  'archetypes/hero.js',

  'templates/premium-traditional.js',
  'templates/print-bw.js',
  'templates/contemporary-professional.js',
  'templates/clean-minimal.js',
  'templates/elegant-modern.js',
  'templates/christian-classic.js',
  'templates/luxury-maroon-gold.js',
  'templates/muslim-classic.js',
  'templates/sikh-classic.js',
  'templates/royal-heritage.js',
  'templates/elegant-floral.js',
  'templates/photo-focused.js',
  'templates/classic-family.js',
  'templates/hindu-classic.js',
  'templates/regional-adaptable.js',
];
