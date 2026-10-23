/* global window */
// In-document A4 paginator. K.paginateSource is serialised with toString()
// into every rendered document, so it must stay:
//   - ES5 only, fully self-contained (no references to K or outer scope),
//   - free of the character sequence "</" (it lives inside a <script>),
//   - correct after uglify-js with mangle:false / compress:false.
//
// Document contract (emitted by core/render.js):
//   <template id="bd-shell-first"> one <section class="bd-page"> with .bd-well elements
//   <template id="bd-shell-cont">  same, for pages 2..n
//   <div id="bd-flow">             atomic .bd-block elements in reading order
//   <div id="bd-pages" data-max-pages="n?"> output container
//
// Blocks are cloned into wells (left-first by data-col, page by page). A block
// that does not fit moves to the next well, taking any trailing .bd-keep
// blocks (section titles, prose labels) with it. A block taller than an empty
// well is kept there with .bd-overflow (clipped, never loops). Empty trailing
// pages are removed. .bd-pageno elements get "n / total" when total > 1.
// Returns the page count.
(function (K) {
  'use strict';

  K.paginateSource = function bdPaginate(doc) {
    var win = doc.defaultView || window;
    var flow = doc.getElementById('bd-flow');
    var out = doc.getElementById('bd-pages');
    var tFirst = doc.getElementById('bd-shell-first');
    var tCont = doc.getElementById('bd-shell-cont') || tFirst;
    if (!flow || !out || !tFirst) return 0;

    var maxPages = parseInt(out.getAttribute('data-max-pages'), 10) || 0;
    while (out.firstChild) out.removeChild(out.firstChild);

    var blocks = [];
    var c;
    for (c = flow.firstElementChild; c; c = c.nextElementSibling) blocks.push(c);

    var pages = [];
    var wells = [];
    var wi = -1;

    function hasClass(el, name) { return !!el && !!el.classList && el.classList.contains(name); }

    function addPage() {
      var tpl = pages.length === 0 ? tFirst : tCont;
      var frag = tpl.content ? tpl.content.cloneNode(true) : null;
      var page = frag ? frag.firstElementChild : null;
      if (!page) {
        var tmp = doc.createElement('div');
        tmp.innerHTML = tpl.innerHTML;
        page = tmp.firstElementChild;
      }
      if (!page) return false;
      out.appendChild(page);
      pages.push(page);
      var found = page.querySelectorAll('.bd-well');
      var list = [];
      for (var i = 0; i < found.length; i++) list.push(found[i]);
      list.sort(function (a, b) {
        return (parseInt(a.getAttribute('data-col'), 10) || 0) - (parseInt(b.getAttribute('data-col'), 10) || 0);
      });
      for (var j = 0; j < list.length; j++) wells.push(list[j]);
      return list.length > 0;
    }

    function nextWell() {
      wi++;
      while (wi >= wells.length) {
        if (maxPages && pages.length >= maxPages) return null;
        if (pages.length >= 200 || !addPage()) return null;
      }
      return wells[wi];
    }

    function overflows(well) {
      var last = well.lastElementChild;
      if (!last) return false;
      var wr = well.getBoundingClientRect();
      var cs = win.getComputedStyle(well);
      var limit = wr.bottom - (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.borderBottomWidth) || 0);
      var lr = last.getBoundingClientRect();
      if (lr.bottom > limit + 0.5) return true;
      // Floats (e.g. a photo) can extend below the last in-flow block.
      for (var el = well.firstElementChild; el; el = el.nextElementSibling) {
        if (el.getBoundingClientRect().bottom > limit + 0.5) return true;
      }
      return false;
    }

    var well = nextWell();
    for (var b = 0; well && b < blocks.length; b++) {
      var el = blocks[b].cloneNode(true);
      well.appendChild(el);
      if (!overflows(well)) continue;
      well.removeChild(el);

      if (!well.firstElementChild) {
        // Taller than an empty well: keep it, clipped, and move on.
        el.className += ' bd-overflow';
        well.appendChild(el);
        well = nextWell();
        continue;
      }

      // Carry trailing keep-with-next blocks, unless they are all the well holds.
      var carry = [];
      var tail = well.lastElementChild;
      while (tail && hasClass(tail, 'bd-keep')) { carry.unshift(tail); tail = tail.previousElementSibling; }
      if (!tail) carry = [];
      for (var k = 0; k < carry.length; k++) well.removeChild(carry[k]);

      well = nextWell();
      if (!well) break;
      for (var m = 0; m < carry.length; m++) well.appendChild(carry[m]);
      well.appendChild(el);
      if (overflows(well)) {
        el.className += ' bd-overflow';
        well = nextWell();
      }
    }

    // Drop empty trailing pages (never the first).
    while (pages.length > 1) {
      var lastPage = pages[pages.length - 1];
      var ws = lastPage.querySelectorAll('.bd-well');
      var empty = true;
      for (var e = 0; e < ws.length; e++) if (ws[e].firstElementChild) { empty = false; break; }
      if (!empty) break;
      out.removeChild(lastPage);
      pages.pop();
    }

    var total = pages.length;
    for (var p = 0; p < total; p++) {
      pages[p].setAttribute('data-page', String(p + 1));
      var nums = pages[p].querySelectorAll('.bd-pageno');
      for (var n = 0; n < nums.length; n++) nums[n].textContent = total > 1 ? (p + 1) + ' / ' + total : '';
    }
    out.setAttribute('data-pages', String(total));
    return total;
  };
})(typeof module === 'object' && module.exports ? require('../_ns') : (window.BiodataKit = window.BiodataKit || {}));
