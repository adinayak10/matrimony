/* global window */
// Escaping helpers. Every user-controlled string that reaches kit HTML passes
// through one of these. K.esc for text content, K.attr for attribute values
// (always double-quoted by callers), K.escMultiline for text whose newlines
// should become <br>.
(function (K) {
  'use strict';

  var MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  var RE = /[&<>"'`]/g;

  function str(s) {
    if (s === null || s === undefined) return '';
    return typeof s === 'string' ? s : String(s);
  }

  K.esc = function esc(s) {
    return str(s).replace(RE, function (c) { return MAP[c]; });
  };

  K.attr = function attr(s) {
    // Same table as esc; also neutralise newlines so attribute values stay on one line.
    return K.esc(s).replace(/\r?\n|\r/g, '&#10;');
  };

  K.escMultiline = function escMultiline(s) {
    return K.esc(str(s).replace(/\r\n?/g, '\n')).replace(/\n/g, '<br>');
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
