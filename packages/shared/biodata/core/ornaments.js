/* global window */
// Inline SVG ornaments. Small, geometric, culture-neutral. Every ornament draws
// with currentColor (set color on the wrapper) and may use var(--bd-accent)
// for a second tone. All are decorative: aria-hidden, focusable=false.
//
// K.ornaments[key] = { viewBox, w, h, body }   (w/h: intrinsic aspect)
// K.ornament(key, cls) -> '<span class="bd-orn bd-orn-<key> cls"><svg ...></svg></span>' or ''
(function (K) {
  'use strict';

  var A = 'var(--bd-accent)';

  K.ornaments = {
    // Lotus between two tapering rules with bead ends.
    lotus: {
      viewBox: '0 0 240 28', w: 240, h: 28,
      body:
        '<path d="M6 16 H92" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.75"/>' +
        '<path d="M148 16 H234" stroke="currentColor" stroke-width="0.9" stroke-linecap="round" opacity="0.75"/>' +
        '<circle cx="4" cy="16" r="1.6" fill="currentColor"/><circle cx="236" cy="16" r="1.6" fill="currentColor"/>' +
        '<circle cx="97" cy="16" r="1.3" fill="' + A + '"/><circle cx="143" cy="16" r="1.3" fill="' + A + '"/>' +
        '<path d="M120 2.5 C126 8 127 14 120 21 C113 14 114 8 120 2.5 Z" fill="currentColor"/>' +
        '<path d="M120 21 C115 18 109 12.5 108.5 7.5 C113.5 9 117.5 13 120 21 Z" fill="currentColor" opacity="0.8"/>' +
        '<path d="M120 21 C125 18 131 12.5 131.5 7.5 C126.5 9 122.5 13 120 21 Z" fill="currentColor" opacity="0.8"/>' +
        '<path d="M120 21 C113 20.5 105.5 17 102.5 13.5 C108.5 13 114.5 16 120 21 Z" fill="' + A + '" opacity="0.9"/>' +
        '<path d="M120 21 C127 20.5 134.5 17 137.5 13.5 C131.5 13 125.5 16 120 21 Z" fill="' + A + '" opacity="0.9"/>' +
        '<path d="M106 23.5 H134" stroke="' + A + '" stroke-width="0.9" stroke-linecap="round"/>',
    },
    // Diamond flanked by small diamonds and fine rules.
    diamond: {
      viewBox: '0 0 240 16', w: 240, h: 16,
      body:
        '<path d="M8 8 H100" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>' +
        '<path d="M140 8 H232" stroke="currentColor" stroke-width="0.8" opacity="0.7"/>' +
        '<path d="M120 1.5 L126.5 8 L120 14.5 L113.5 8 Z" fill="none" stroke="currentColor" stroke-width="1"/>' +
        '<path d="M120 4.8 L123.2 8 L120 11.2 L116.8 8 Z" fill="' + A + '"/>' +
        '<path d="M106 8 L108.5 5.5 L111 8 L108.5 10.5 Z" fill="currentColor"/>' +
        '<path d="M129 8 L131.5 5.5 L134 8 L131.5 10.5 Z" fill="currentColor"/>' +
        '<circle cx="5" cy="8" r="1.3" fill="currentColor"/><circle cx="235" cy="8" r="1.3" fill="currentColor"/>',
    },
    // Short centred mark for section titles: rule, bead, rule.
    bead: {
      viewBox: '0 0 60 10', w: 60, h: 10,
      body:
        '<path d="M2 5 H22" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>' +
        '<path d="M38 5 H58" stroke="currentColor" stroke-width="0.9" stroke-linecap="round"/>' +
        '<path d="M30 1 L34 5 L30 9 L26 5 Z" fill="' + A + '"/>',
    },
    // Corner flourish for frames (top-left; rotate/flip with CSS for others).
    corner: {
      // Inward flourish for the inside corner of a frame (top-left; mirror
      // with CSS transforms for the other corners). Origin = frame corner.
      viewBox: '0 0 60 60', w: 60, h: 60,
      body:
        '<path d="M9 3 L15 9 L9 15 L3 9 Z" fill="' + A + '"/>' +
        '<path d="M17.5 9 C26 9 29 4.5 36 5.5 C42 6.5 44 11.5 51 10" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
        '<path d="M9 17.5 C9 26 4.5 29 5.5 36 C6.5 42 11.5 44 10 51" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
        '<circle cx="54.5" cy="9.6" r="1.5" fill="currentColor"/><circle cx="9.6" cy="54.5" r="1.5" fill="currentColor"/>' +
        '<path d="M15.5 26 C15.5 20 20 15.5 26 15.5" fill="none" stroke="' + A + '" stroke-width="0.8"/>' +
        '<circle cx="20.5" cy="20.5" r="1.4" fill="currentColor"/>',
    },
    // Light mandala rosette (watermarks, header medallions).
    mandala: {
      viewBox: '0 0 100 100', w: 100, h: 100,
      body: (function () {
        var s = '<circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" stroke-width="0.7"/>' +
          '<circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" stroke-width="0.4" stroke-dasharray="1.2 2.2"/>' +
          '<circle cx="50" cy="50" r="13" fill="none" stroke="currentColor" stroke-width="0.7"/>' +
          '<circle cx="50" cy="50" r="5" fill="' + A + '"/>';
        for (var i = 0; i < 12; i++) {
          var a = i * 30;
          s += '<path transform="rotate(' + a + ' 50 50)" d="M50 37 C55 30 55 20 50 9 C45 20 45 30 50 37 Z" fill="none" stroke="currentColor" stroke-width="0.7"/>';
          s += '<path transform="rotate(' + (a + 15) + ' 50 50)" d="M50 37 C53 32 53 27 50 22 C47 27 47 32 50 37 Z" fill="' + A + '" opacity="0.55"/>';
        }
        return s;
      })(),
    },
    // Small four-petal star used as a list bullet or separator.
    star: {
      viewBox: '0 0 12 12', w: 12, h: 12,
      body: '<path d="M6 0.5 C6.6 4 8 5.4 11.5 6 C8 6.6 6.6 8 6 11.5 C5.4 8 4 6.6 0.5 6 C4 5.4 5.4 4 6 0.5 Z" fill="currentColor"/>',
    },
    // Eight-point geometric star (two overlapping squares), girih style.
    star8: {
      viewBox: '0 0 12 12', w: 12, h: 12,
      body: (function () {
        var pts = [];
        for (var i = 0; i < 16; i++) {
          var r = i % 2 ? 4.1 : 5.9;
          var a = (i * 22.5 - 90) * Math.PI / 180;
          pts.push((6 + r * Math.cos(a)).toFixed(2) + ' ' + (6 + r * Math.sin(a)).toFixed(2));
        }
        return '<path d="M' + pts.join(' L') + ' Z" fill="currentColor"/><circle cx="6" cy="6" r="1.5" fill="var(--bd-paper)"/>';
      })(),
    },
    // Quatrefoil (four round petals), jaali style.
    quatrefoil: {
      viewBox: '0 0 12 12', w: 12, h: 12,
      body: '<circle cx="6" cy="3.1" r="2.5" fill="currentColor"/><circle cx="8.9" cy="6" r="2.5" fill="currentColor"/>' +
        '<circle cx="6" cy="8.9" r="2.5" fill="currentColor"/><circle cx="3.1" cy="6" r="2.5" fill="currentColor"/>' +
        '<circle cx="6" cy="6" r="1.2" fill="var(--bd-paper)"/>',
    },
  };

  // ---- Frame, hero and regional templates (track B) ----------------------
  // filigree  royal scrollwork frame corner      floral   blossom-and-vine frame corner
  // scroll    symmetric scroll divider           vine     leafy vine with a blossom
  // paisley   paired paisley (buta) divider      marigold garland divider
  // bloom     single marigold bloom (title motif)
  // Corners are drawn for the top-left inside corner (origin = frame corner);
  // mirror them with CSS transforms like `corner`.
  (function () {
    var P = 'var(--bd-paper)';
    function n(v) { return Math.round(v * 100) / 100; }
    // Leaf with its base at (x,y), pointing at ang degrees, length len.
    function leaf(x, y, ang, len, fill, op) {
      var w = len * 0.3;
      return '<path transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(ang) + ')" d="M0 0 C' + n(len * 0.3) + ' ' + n(-w) + ' ' +
        n(len * 0.75) + ' ' + n(-w * 0.8) + ' ' + n(len) + ' 0 C' + n(len * 0.75) + ' ' + n(w * 0.8) + ' ' + n(len * 0.3) + ' ' + n(w) +
        ' 0 0 Z" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
    }
    // Top-edge half mirrored across the diagonal gives the left edge.
    function cornerOf(half, centre) {
      return half + '<g transform="matrix(0 1 1 0 0 0)">' + half + '</g>' + centre;
    }
    function mirrorX(half, width) {
      return half + '<g transform="matrix(-1 0 0 1 ' + width + ' 0)">' + half + '</g>';
    }
    function blossom(cx, cy, s) {
      var g = '<g transform="translate(' + cx + ' ' + cy + ') scale(' + s + ')">';
      for (var i = 0; i < 5; i++) {
        var rot = 'rotate(' + (i * 72 - 90) + ')';
        g += '<path transform="' + rot + '" d="M1.2 0 C2 -5.2 9.6 -6.4 10.4 -1.4 C10.8 1.2 9.4 1.4 10.4 3 C8.4 6.4 2 5 1.2 0 Z" fill="currentColor" stroke="' + P +
          '" stroke-width="0.7" stroke-linejoin="round"/>' +
          '<path transform="' + rot + '" d="M3.4 0 L7.4 0" stroke="' + P + '" stroke-width="0.45" opacity="0.5" stroke-linecap="round"/>';
      }
      return g + '<circle r="2.7" fill="' + A + '"/><circle r="1" fill="' + P + '" opacity="0.6"/></g>';
    }
    function bud(x, y, ang, s) {
      return '<g transform="translate(' + x + ' ' + y + ') rotate(' + ang + ') scale(' + s + ')">' +
        '<path d="M0 0 C2.5 -3.5 6 -3.5 8 0 C6 3.5 2.5 3.5 0 0 Z" fill="currentColor" opacity="0.9"/>' +
        '<path d="M-1 0 C1 -2.6 3 -2.4 4 -1.4 M-1 0 C1 2.6 3 2.4 4 1.4" fill="none" stroke="' + A + '" stroke-width="0.9" stroke-linecap="round"/></g>';
    }
    // Upright buta (mango motif) with an inner outline and dots; tip leans out.
    function paisleyAt(tx, ty, flip) {
      return '<g transform="translate(' + tx + ' ' + ty + ')' + (flip ? ' scale(-1 1)' : '') + ' rotate(-30)">' +
        '<path d="M3.5 -12.5 C2.2 -9.2 7.6 -6.4 7.4 0.6 C7.2 6.4 3.2 9 -0.4 9 C-4.6 9 -7.6 6 -7.6 1.8 C-7.6 -3.6 -3.6 -6.4 0.2 -8.2 C2 -9.1 3.2 -10.4 3.5 -12.5 Z" fill="currentColor"/>' +
        '<path d="M1.2 -5.2 C4.2 -3.4 5 0.2 4.4 2.6 C3.8 5.2 1.6 6.4 -0.4 6.4 C-3 6.4 -5 4.6 -5 1.8 C-5 -1.6 -2.4 -3.8 1.2 -5.2 Z" fill="none" stroke="' + P + '" stroke-width="0.75"/>' +
        '<circle cx="-0.2" cy="1.8" r="1.7" fill="' + A + '"/>' +
        '<circle cx="-2.4" cy="-1.6" r="0.55" fill="' + P + '"/><circle cx="2.6" cy="-1.4" r="0.55" fill="' + P + '"/>' +
        '<circle cx="-2.8" cy="4.4" r="0.55" fill="' + P + '"/><circle cx="2.4" cy="4.6" r="0.55" fill="' + P + '"/></g>';
    }
    function flower(cx, cy, rad, petals, col, centre) {
      var s = '';
      for (var i = 0; i < petals; i++) {
        var a = (i / petals) * Math.PI * 2;
        s += '<circle cx="' + n(cx + Math.cos(a) * rad * 0.62) + '" cy="' + n(cy + Math.sin(a) * rad * 0.62) + '" r="' + n(rad * 0.42) + '" fill="' + col + '"/>';
      }
      return s + '<circle cx="' + cx + '" cy="' + cy + '" r="' + n(rad * 0.4) + '" fill="' + centre + '"/>';
    }

    var filigreeHalf =
      '<path d="M17 5.5 C27 5.5 31 13.5 40 12.6 C47.5 11.8 49 4.6 43.6 3.6 C39.8 2.9 38.4 7.6 41.6 8.6" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round"/>' +
      '<path d="M41 13 C52 16.5 60 8.6 70 9.2 C76 9.6 78 13 76 15 C74.4 16.6 72 15.4 72.6 13.6" fill="none" stroke="currentColor" stroke-width="0.85" stroke-linecap="round"/>' +
      '<path d="M77.5 10.6 C84 9.6 90 9.8 98 10.4" fill="none" stroke="currentColor" stroke-width="0.6" stroke-linecap="round" opacity="0.8"/>' +
      '<circle cx="100.5" cy="10.5" r="1.3" fill="currentColor"/>' +
      leaf(29.5, 11.5, 62, 8.5, A) + leaf(55, 12.6, -128, 7, A, 0.9) + leaf(63.5, 10.2, 58, 5.5, 'currentColor', 0.75) +
      '<circle cx="35.5" cy="17.5" r="1" fill="' + A + '"/>';
    var filigreeCentre =
      '<path d="M3 3 L10.5 3 L3 10.5 Z" fill="currentColor"/>' +
      '<path d="M9.5 9.5 L14.5 4.5 L19.5 9.5 L14.5 14.5 Z" fill="none" stroke="' + A + '" stroke-width="0.9"/>' +
      '<path d="M4.5 14.5 L9.5 9.5" stroke="' + A + '" stroke-width="0.9"/>' +
      '<path d="M15.5 15.5 C21 16.5 26.5 21.5 29 29 C21.5 26.5 16.5 21 15.5 15.5 Z" fill="currentColor"/>' +
      '<path d="M18.5 18.5 L26 26" stroke="' + P + '" stroke-width="0.6" opacity="0.8"/>' +
      '<circle cx="32" cy="32" r="1.5" fill="' + A + '"/>';

    var floralHalf =
      '<path d="M27 15 C40 9 52 12 64 8.6 C72 6.4 79 6.6 88 6" fill="none" stroke="' + A + '" stroke-width="0.9" stroke-linecap="round"/>' +
      leaf(33, 12.4, -40, 10, A) + leaf(40, 11.2, 35, 9, A, 0.85) + leaf(52, 11.4, -30, 8.5, A, 0.9) + leaf(60, 9.6, 40, 7.5, A, 0.8) +
      leaf(71, 7.2, -35, 6.5, A, 0.85) + leaf(78, 6.9, 30, 5.5, A, 0.75) + bud(88, 6, -6, 1) +
      '<circle cx="46" cy="16.5" r="1.2" fill="currentColor" opacity="0.7"/><circle cx="49.5" cy="18.6" r="0.9" fill="currentColor" opacity="0.55"/>' +
      '<circle cx="66" cy="12.4" r="1" fill="currentColor" opacity="0.6"/>';
    var floralCentre = leaf(20, 20, 45, 22, A, 0.95) + leaf(20, 20, 20, 15, A, 0.7) + leaf(20, 20, 70, 15, A, 0.7) +
      blossom(17, 17, 1.25) + bud(29, 30, 45, 0.9);

    var scrollHalf =
      '<path d="M104 12 C96 12 94 5 88 5.6 C83 6.1 82.5 12.4 87 12.6 C90 12.8 90.5 9 88 8.6" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>' +
      '<path d="M86 13.2 C76 17.5 66 10.5 56 12 L14 12" fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round"/>' +
      '<circle cx="10.5" cy="12" r="1.5" fill="currentColor"/>' + leaf(70, 13.2, 160, 6.5, A) + leaf(77, 14.8, -150, 5.5, A, 0.85);

    var vineHalf =
      '<path d="M108 14 C96 10 88 17.5 76 14.5 C64 11.5 56 16 44 14 C34 12.4 26 14.5 16 14" fill="none" stroke="' + A + '" stroke-width="0.8" stroke-linecap="round"/>' +
      leaf(98, 11.6, -160, 8, A) + leaf(86, 16, 160, 7.5, A, 0.85) + leaf(72, 13.4, -165, 7, A, 0.9) + leaf(58, 13.6, 165, 6.5, A, 0.8) +
      leaf(44, 14, -165, 5.5, A, 0.8) + leaf(32, 13.3, 168, 5, A, 0.7) +
      '<circle cx="14" cy="14" r="1.3" fill="currentColor" opacity="0.8"/><circle cx="64" cy="18.6" r="1" fill="currentColor" opacity="0.6"/>';

    var garlandHalf = '<path d="M106 10 C86 15.5 66 15.5 46 11.5 C34 9.2 22 9.6 10 10" fill="none" stroke="currentColor" stroke-width="0.7" opacity="0.7"/>' +
      '<circle cx="8" cy="10" r="1.3" fill="currentColor"/>';
    [[96, 12.6], [82, 14.3], [68, 14.4], [54, 13], [40, 10.6], [26, 9.9]].forEach(function (pt, i) {
      garlandHalf += i % 2 === 0 ? flower(pt[0], pt[1], 3.6, 8, A, 'currentColor')
        : '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="1.6" fill="currentColor"/>' + leaf(pt[0], pt[1] + 1, 90, 4, 'currentColor', 0.6);
    });

    var add = {
      filigree: { viewBox: '0 0 104 104', w: 104, h: 104, body: cornerOf(filigreeHalf, filigreeCentre) },
      floral: { viewBox: '0 0 100 100', w: 100, h: 100, body: cornerOf(floralHalf, floralCentre) },
      scroll: {
        viewBox: '0 0 240 24', w: 240, h: 24,
        body: mirrorX(scrollHalf, 240) + '<path d="M120 3 L129 12 L120 21 L111 12 Z" fill="none" stroke="currentColor" stroke-width="1"/>' +
          '<path d="M120 7 L125 12 L120 17 L115 12 Z" fill="' + A + '"/>' +
          '<circle cx="107.5" cy="12" r="1.2" fill="' + A + '"/><circle cx="132.5" cy="12" r="1.2" fill="' + A + '"/>',
      },
      vine: { viewBox: '0 0 240 28', w: 240, h: 28, body: mirrorX(vineHalf, 240) + blossom(120, 14, 0.95) },
      paisley: {
        viewBox: '0 0 240 28', w: 240, h: 28,
        body: '<path d="M8 14 H92" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.75"/>' +
          '<path d="M148 14 H232" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" opacity="0.75"/>' +
          '<circle cx="5" cy="14" r="1.4" fill="currentColor"/><circle cx="235" cy="14" r="1.4" fill="currentColor"/>' +
          paisleyAt(106, 15, true) + paisleyAt(134, 15, false) +
          '<path d="M120 9.5 L124.5 14 L120 18.5 L115.5 14 Z" fill="' + A + '"/>' +
          '<circle cx="94.5" cy="14" r="1.1" fill="' + A + '"/><circle cx="145.5" cy="14" r="1.1" fill="' + A + '"/>',
      },
      marigold: {
        viewBox: '0 0 240 20', w: 240, h: 20,
        body: mirrorX(garlandHalf, 240) + flower(120, 10, 8, 12, A, 'currentColor') + '<circle cx="120" cy="10" r="1.4" fill="' + A + '"/>',
      },
      // Single marigold bloom (title motif, bullets).
      bloom: { viewBox: '0 0 12 12', w: 12, h: 12, body: flower(6, 6, 5.6, 10, A, 'currentColor') },
    };
    Object.keys(add).forEach(function (k) { if (!K.ornaments[k]) K.ornaments[k] = add[k]; });
  })();

  K.ornament = function ornament(key, cls) {
    var o = K.ornaments[key];
    if (!o) return '';
    return '<span class="bd-orn bd-orn-' + key + (cls ? ' ' + cls : '') + '" aria-hidden="true">' +
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + o.viewBox + '" width="' + o.w + '" height="' + o.h +
      '" focusable="false">' + o.body + '</svg></span>';
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
