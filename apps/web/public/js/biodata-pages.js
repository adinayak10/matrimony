/* Biodata Maker pages (landing, gallery, my biodatas, share view): progressive enhancement.
   Every page works without this file; it adds
     - gallery category filter on the landing page (chips stay real links)
     - Page / Phone preview toggle on the template gallery
     - a placeholder when a thumbnail image fails to load
     - my biodatas: duplicate, delete, PDF download, share link dialog (fetch to /api/biodata/*)
     - share view: iframe height from the sandboxed document, Print, PDF download
   No innerHTML: all text goes in through textContent / value. */
(function () {
  'use strict';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ---------- toast ----------
  var toastTimer = null;
  function toast(msg, isError) {
    var el = $('#bdpToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-error', Boolean(isError));
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, isError ? 6000 : 3200);
  }

  // ---------- JSON API (same-origin proxy adds the session) ----------
  function api(method, url, body) {
    var opts = { method: method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || j.status === false) {
          var e = new Error(j.message || 'Something went wrong. Please try again.');
          e.code = j.code || null;
          e.status = r.status;
          throw e;
        }
        return j.data !== undefined ? j.data : j;
      });
    });
  }

  function handleError(err) {
    if (err && err.status === 401) {
      toast('Your session has ended. Please log in again.', true);
      setTimeout(function () { location.href = '/login'; }, 1500);
      return;
    }
    toast((err && err.message) || 'Something went wrong. Please try again.', true);
  }

  // ---------- thumbnails ----------
  function markMissing(img) {
    var fig = img.closest('.bdp-thumb');
    if (fig) fig.classList.add('is-missing');
  }
  $$('img[data-bdp-thumb]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) markMissing(img);
    else img.addEventListener('error', function () { markMissing(img); });
  });

  // ---------- landing: category filter ----------
  var filters = $('[data-bdp-filters]');
  var grid = $('[data-bdp-grid]');
  if (filters && grid) {
    var count = $('[data-bdp-count]');
    filters.addEventListener('click', function (e) {
      var chip = e.target.closest('a[data-filter]');
      if (!chip || e.ctrlKey || e.metaKey || e.shiftKey || e.button > 0) return;
      e.preventDefault();
      var slug = chip.getAttribute('data-filter');
      $$('a[data-filter]', filters).forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      var shown = 0;
      $$(':scope > li', grid).forEach(function (li) {
        var cats = (li.getAttribute('data-cats') || '').split(' ');
        var show = slug === 'all' || cats.indexOf(slug) !== -1;
        li.hidden = !show;
        if (show) shown += 1;
      });
      if (count) {
        var label = chip.firstChild ? String(chip.firstChild.textContent).trim() : '';
        count.textContent = slug === 'all' ? 'Showing all ' + shown + ' templates' : 'Showing ' + shown + ' ' + label + ' template' + (shown === 1 ? '' : 's');
      }
    });
  }

  // ---------- gallery: Page / Phone toggle ----------
  var viewBtns = $$('[data-bdp-view]');
  if (viewBtns.length && grid) {
    var setView = function (v) {
      grid.classList.toggle('is-phone', v === 'phone');
      viewBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-bdp-view') === v ? 'true' : 'false'); });
      try { localStorage.setItem('bm:biodata:galleryView', v); } catch (e) { /* storage blocked */ }
    };
    viewBtns.forEach(function (b) { b.addEventListener('click', function () { setView(b.getAttribute('data-bdp-view')); }); });
    try { if (localStorage.getItem('bm:biodata:galleryView') === 'phone') setView('phone'); } catch (e) { /* storage blocked */ }
  }

  // ---------- PDF download via fetch (so a 503 becomes a message, not a JSON page) ----------
  function fileName(res, fallback) {
    var cd = res.headers.get('Content-Disposition') || '';
    var m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
    try { return m ? decodeURIComponent(m[1]) : fallback; } catch (e) { return fallback; }
  }
  function downloadPdf(link, printHint) {
    if (link.getAttribute('aria-busy') === 'true') return;
    link.setAttribute('aria-busy', 'true');
    toast('Preparing your PDF…');
    fetch(link.href, { credentials: 'same-origin' }).then(function (r) {
      var type = r.headers.get('Content-Type') || '';
      if (r.ok && type.indexOf('application/pdf') === 0) {
        return r.blob().then(function (blob) {
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = fileName(r, 'biodata.pdf');
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
          toast('PDF downloaded.');
        });
      }
      return r.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(j.message || '');
        e.code = j.code || null;
        e.status = r.status;
        throw e;
      });
    }).catch(function (err) {
      if (err && err.status === 401) return handleError(err);
      if (err && err.code === 'PDF_BUSY') return toast('The PDF service is busy. Please try again in a few seconds.', true);
      if (err && (err.status === 503 || err.code === 'PDF_UNAVAILABLE')) return toast('PDF download is not available right now. ' + printHint, true);
      toast((err && err.message) || 'The PDF could not be made. ' + printHint, true);
    }).then(function () { link.removeAttribute('aria-busy'); });
  }

  // ---------- dialogs ----------
  var lastFocus = null;
  function openModal(modal) {
    lastFocus = document.activeElement;
    modal.hidden = false;
    var first = $('button:not([hidden]), select, input', modal);
    if (first) first.focus();
  }
  function closeModal(modal) {
    modal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function trapKeys(modal, onEscape) {
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); onEscape(); return; }
      if (e.key !== 'Tab') return;
      var items = $$('button, select, input, a[href]', modal).filter(function (el) { return el.offsetParent !== null && !el.disabled; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  var confirmModal = $('#bdpConfirm');
  var confirmCb = null;
  function confirmDialog(title, text, yesLabel, cb) {
    if (!confirmModal) { if (window.confirm(text)) cb(); return; }
    $('#bdpConfirmTitle').textContent = title;
    $('#bdpConfirmText').textContent = text;
    $('[data-confirm="yes"]', confirmModal).textContent = yesLabel;
    confirmCb = cb;
    openModal(confirmModal);
  }
  if (confirmModal) {
    trapKeys(confirmModal, function () { confirmCb = null; closeModal(confirmModal); });
    confirmModal.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-confirm]');
      if (!btn && e.target !== confirmModal) return;
      var cb = btn && btn.getAttribute('data-confirm') === 'yes' ? confirmCb : null;
      confirmCb = null;
      closeModal(confirmModal);
      if (cb) cb();
    });
  }

  // ---------- my biodatas ----------
  var my = $('[data-bdp-my]');
  if (my) {
    var shareModal = $('#bdpShare');
    var shareDoc = null; // the .bdp-doc whose link is open in the dialog

    var fmtDate = function (v) {
      var d = v ? new Date(v) : null;
      return d && !isNaN(d) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    };
    var shareOf = function (data) {
      var d = data || {};
      var s = d.share && typeof d.share === 'object' ? d.share : d;
      var url = s.url || d.shareUrl || (s.token ? location.origin + '/biodata-maker/s/' + s.token : '');
      return url ? { url: url, expiresAt: s.expiresAt || d.shareExpiresAt || null, views: Number(s.views) || 0 } : null;
    };
    var setShareLabel = function (doc, share) {
      var holder = $('[data-share-label]', doc);
      doc.setAttribute('data-share', share ? '1' : '0');
      if (!holder) return;
      while (holder.firstChild) holder.removeChild(holder.firstChild);
      if (!share) return;
      var badge = document.createElement('span');
      badge.className = 'bdp-badge is-share';
      var icon = document.createElement('i');
      icon.className = 'fa fa-link';
      icon.setAttribute('aria-hidden', 'true');
      badge.appendChild(icon);
      badge.appendChild(document.createTextNode(' Shared' + (fmtDate(share.expiresAt) ? ' until ' + fmtDate(share.expiresAt) : '')));
      holder.appendChild(badge);
    };
    var shareState = function (state, share) {
      $$('[data-share-state]', shareModal).forEach(function (el) { el.hidden = el.getAttribute('data-share-state') !== state; });
      if (state === 'on' && share) {
        $('#bdpShareUrl').value = share.url;
        var info = [];
        if (fmtDate(share.expiresAt)) info.push('Valid until ' + fmtDate(share.expiresAt));
        info.push(share.views === 1 ? 'Opened once' : 'Opened ' + share.views + ' times');
        $('#bdpShareInfo').textContent = info.join(' · ');
      }
      var focus = $('[data-share-state="' + state + '"] button, [data-share-state="' + state + '"] select', shareModal);
      if (focus) focus.focus();
    };
    var docUrl = function (doc) { return '/api/biodata/documents/' + encodeURIComponent(doc.getAttribute('data-id')); };

    var openShare = function (doc) {
      shareDoc = doc;
      openModal(shareModal);
      shareState('loading');
      api('GET', docUrl(doc)).then(function (d) {
        var s = shareOf(d && d.share ? { share: d.share } : null);
        shareState(s ? 'on' : 'off', s);
      }).catch(function (err) { closeModal(shareModal); handleError(err); });
    };

    var actions = {
      duplicate: function (doc, btn) {
        btn.disabled = true;
        api('POST', docUrl(doc) + '/duplicate', {}).then(function () {
          toast('Copy created.');
          setTimeout(function () { location.reload(); }, 700);
        }).catch(function (err) { btn.disabled = false; handleError(err); });
      },
      delete: function (doc, btn) {
        confirmDialog('Delete this biodata?', '“' + doc.getAttribute('data-title') + '” and its saved versions will be removed. A share link to it stops working. This cannot be undone.', 'Delete', function () {
          btn.disabled = true;
          api('DELETE', docUrl(doc)).then(function () {
            doc.remove();
            toast('Biodata deleted.');
            if (!$('.bdp-doc', my)) setTimeout(function () { location.reload(); }, 700);
          }).catch(function (err) { btn.disabled = false; handleError(err); });
        });
      },
      share: function (doc) { openShare(doc); },
    };

    my.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      var doc = el.closest('.bdp-doc');
      if (!doc) return;
      var name = el.getAttribute('data-action');
      if (name === 'pdf') {
        e.preventDefault();
        downloadPdf(el, 'Open it in the builder and use Print, then choose “Save as PDF”: it gives the same document.');
        return;
      }
      if (actions[name]) actions[name](doc, el);
    });

    if (shareModal) {
      trapKeys(shareModal, function () { closeModal(shareModal); });
      shareModal.addEventListener('click', function (e) {
        if (e.target === shareModal) { closeModal(shareModal); return; }
        var btn = e.target.closest('[data-share]');
        if (!btn || !shareDoc) return;
        var what = btn.getAttribute('data-share');
        var url = docUrl(shareDoc) + '/share';
        var doc = shareDoc;
        if (what === 'close') { closeModal(shareModal); return; }
        if (what === 'copy') {
          var input = $('#bdpShareUrl');
          var done = function () { toast('Link copied.'); };
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(input.value).then(done, function () { input.select(); });
          else { input.select(); try { document.execCommand('copy'); done(); } catch (err) { /* user copies by hand */ } }
          return;
        }
        var run = function (method, path, body, msg) {
          btn.disabled = true;
          api(method, path, body).then(function (d) {
            btn.disabled = false;
            var s = body && body.enabled === false ? null : shareOf(d);
            setShareLabel(doc, s);
            shareState(s ? 'on' : 'off', s);
            toast(msg);
          }).catch(function (err) { btn.disabled = false; handleError(err); });
        };
        if (what === 'create') run('POST', url, { enabled: true, days: Number($('#bdpShareDays').value) || 30 }, 'Link created.');
        if (what === 'off') run('POST', url, { enabled: false }, 'Link turned off.');
        if (what === 'rotate') {
          closeModal(shareModal);
          confirmDialog('Make a new link?', 'The current link stops working straight away. Anyone who should still see the biodata will need the new link.', 'Make new link', function () {
            openModal(shareModal);
            run('POST', url + '/rotate', {}, 'New link created.');
          });
        }
      });
    }
  }

  // ---------- share view ----------
  var frame = $('#bdpShareFrame');
  var shareView = $('[data-bdp-share-view]');
  if (frame) {
    window.addEventListener('message', function (e) {
      if (e.source !== frame.contentWindow || !e.data || e.data.bmBiodata !== 'size') return;
      var h = Number(e.data.height);
      if (h > 100 && h < 200000) frame.style.height = Math.ceil(h) + 'px';
    });
  }
  if (shareView) {
    shareView.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (!el) return;
      if (el.getAttribute('data-action') === 'print' && frame && frame.contentWindow) {
        frame.contentWindow.postMessage({ bmBiodata: 'print' }, '*');
      }
      if (el.getAttribute('data-action') === 'pdf') {
        e.preventDefault();
        downloadPdf(el, 'Use Print and choose “Save as PDF”: it gives the same document.');
      }
    });
  }
})();
