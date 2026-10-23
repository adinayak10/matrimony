/* BiodataCropper: in-house photo cropper for the biodata builder (no dependencies).
 *
 *   BiodataCropper.validate(file)            -> '' or a user-facing error message
 *   BiodataCropper.open(file, { aspect })    -> Promise<Blob|null>  (null = cancelled)
 *
 * aspect is width / height (3/4 default, 1 for round photos). The result is a JPEG,
 * longest side <= 1600 px, quality 0.85, on a white background (PNG transparency).
 * Modal dialog: drag to pan, wheel / pinch / slider to zoom, rotate 90 degrees,
 * arrow keys pan, +/- zoom, R rotates, Enter applies, Escape cancels; focus is
 * trapped inside and restored to the opener. DOM is built with createElement only.
 * Styles: .bdc-* in css/biodata-builder.css.
 */
(function (w, d) {
  'use strict';

  var MAX_BYTES = 10 * 1024 * 1024;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  var OUT_MAX = 1600;
  var QUALITY = 0.85;
  var MAX_ZOOM = 4;

  function el(tag, attrs, kids) {
    var n = d.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') n.textContent = v;
        else if (k === 'className') n.className = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : String(v));
      });
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); });
    return n;
  }

  function validate(file) {
    if (!file) return 'Choose a photo first.';
    if (TYPES.indexOf(String(file.type).toLowerCase()) === -1) return 'Please choose a JPEG, PNG or WebP image.';
    if (file.size > MAX_BYTES) return 'This photo is larger than 10 MB. Please choose a smaller one.';
    if (file.size === 0) return 'This file is empty.';
    return '';
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('This image could not be read. Try another photo.')); };
      img.src = url;
    });
  }

  var FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function open(file, opts) {
    opts = opts || {};
    var problem = validate(file);
    if (problem) {
      var e = new Error(problem);
      e.code = 'INVALID_FILE';
      return Promise.reject(e);
    }
    var aspect = Number(opts.aspect) > 0 ? Number(opts.aspect) : 3 / 4;
    var round = !!opts.round;
    return loadImage(file).then(function (loaded) {
      return new Promise(function (resolve) { run(loaded, aspect, round, resolve); });
    });
  }

  function run(loaded, aspect, round, resolve) {
    var img = loaded.img;
    var opener = d.activeElement;
    var dpr = Math.min(w.devicePixelRatio || 1, 2);
    var st = { rot: 0, zoom: 1, px: 0, py: 0, W: 0, H: 0, fx: 0, fy: 0, fw: 0, fh: 0, dragging: false };
    var pointers = {};
    var pinch = null;
    var done = false;

    var titleId = 'bdc-title-' + Date.now();
    var canvas = el('canvas', { className: 'bdc-canvas', tabindex: '0', role: 'img',
      'aria-label': 'Photo crop area. Drag or use arrow keys to move, plus and minus to zoom, R to rotate.' });
    var zoomInput = el('input', { type: 'range', min: '1', max: String(MAX_ZOOM), step: '0.01', value: '1', className: 'bdc-zoom', id: titleId + '-zoom' });
    var zoomOut = el('button', { type: 'button', className: 'bdc-icon-btn', 'aria-label': 'Zoom out', text: '−' });
    var zoomIn = el('button', { type: 'button', className: 'bdc-icon-btn', 'aria-label': 'Zoom in', text: '+' });
    var rotateBtn = el('button', { type: 'button', className: 'bdc-btn bdc-btn--ghost', text: 'Rotate 90°' });
    var resetBtn = el('button', { type: 'button', className: 'bdc-btn bdc-btn--ghost', text: 'Reset' });
    var cancelBtn = el('button', { type: 'button', className: 'bdc-btn bdc-btn--ghost', text: 'Cancel' });
    var applyBtn = el('button', { type: 'button', className: 'bdc-btn bdc-btn--primary', text: 'Use this photo' });
    var closeBtn = el('button', { type: 'button', className: 'bdc-close', 'aria-label': 'Close', text: '×' });
    var status = el('p', { className: 'bdc-status', 'aria-live': 'polite' });

    var stage = el('div', { className: 'bdc-stage' }, [canvas]);
    var dialog = el('div', { className: 'bdc-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId }, [
      el('div', { className: 'bdc-head' }, [
        el('h2', { className: 'bdc-title', id: titleId, text: 'Crop your photo' }),
        closeBtn,
      ]),
      el('p', { className: 'bdc-sub', text: round ? 'Square crop: the template shows this photo in a circle.' : 'Portrait crop (3:4). Keep your face near the centre.' }),
      stage,
      el('div', { className: 'bdc-controls' }, [
        el('div', { className: 'bdc-zoomrow' }, [
          zoomOut,
          el('label', { className: 'bdc-sr', for: titleId + '-zoom', text: 'Zoom' }),
          zoomInput,
          zoomIn,
        ]),
        el('div', { className: 'bdc-tools' }, [rotateBtn, resetBtn]),
      ]),
      status,
      el('div', { className: 'bdc-actions' }, [cancelBtn, applyBtn]),
    ]);
    var overlay = el('div', { className: 'bdc-overlay' }, [dialog]);
    d.body.appendChild(overlay);
    d.documentElement.classList.add('bdc-lock');

    function rotated() {
      var q = st.rot % 180 !== 0;
      return { w: q ? img.naturalHeight : img.naturalWidth, h: q ? img.naturalWidth : img.naturalHeight };
    }
    function baseScale() {
      var r = rotated();
      return Math.max(st.fw / r.w, st.fh / r.h);
    }
    function scale() { return baseScale() * st.zoom; }

    function layout() {
      var box = stage.getBoundingClientRect();
      var W = Math.max(240, Math.floor(box.width));
      var H = Math.max(240, Math.min(Math.floor(w.innerHeight * 0.5), 460));
      var oldFx = st.fx + st.fw / 2;
      var oldFy = st.fy + st.fh / 2;
      var hadLayout = st.W > 0;
      var relX = st.px - oldFx;
      var relY = st.py - oldFy;
      var oldFw = st.fw;
      st.W = W; st.H = H;
      var pad = 24;
      var fw = W - pad * 2;
      var fh = fw / aspect;
      if (fh > H - pad * 2) { fh = H - pad * 2; fw = fh * aspect; }
      st.fw = fw; st.fh = fh;
      st.fx = (W - fw) / 2; st.fy = (H - fh) / 2;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      if (hadLayout && oldFw) {
        var k = fw / oldFw;
        st.px = st.fx + fw / 2 + relX * k;
        st.py = st.fy + fh / 2 + relY * k;
      } else {
        st.px = W / 2; st.py = H / 2;
      }
      clamp();
      draw();
    }

    function clamp() {
      var r = rotated();
      var s = scale();
      var dx = Math.max(0, (r.w * s - st.fw) / 2);
      var dy = Math.max(0, (r.h * s - st.fh) / 2);
      var cx = st.fx + st.fw / 2;
      var cy = st.fy + st.fh / 2;
      st.px = Math.min(cx + dx, Math.max(cx - dx, st.px));
      st.py = Math.min(cy + dy, Math.max(cy - dy, st.py));
    }

    function paintImage(ctx) {
      var s = scale();
      ctx.save();
      ctx.translate(st.px, st.py);
      ctx.rotate(st.rot * Math.PI / 180);
      ctx.drawImage(img, -img.naturalWidth * s / 2, -img.naturalHeight * s / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.restore();
    }

    function draw() {
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, st.W, st.H);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, st.W, st.H);
      ctx.imageSmoothingQuality = 'high';
      paintImage(ctx);
      // Dim everything outside the crop frame.
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, st.W, st.H);
      if (round) {
        ctx.moveTo(st.fx + st.fw, st.fy + st.fh / 2);
        ctx.arc(st.fx + st.fw / 2, st.fy + st.fh / 2, st.fw / 2, 0, Math.PI * 2, true);
      } else {
        ctx.rect(st.fx + st.fw, st.fy, -st.fw, st.fh);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
      ctx.fill('evenodd');
      ctx.restore();
      // Frame and rule-of-thirds guides.
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      if (round) {
        ctx.beginPath();
        ctx.arc(st.fx + st.fw / 2, st.fy + st.fh / 2, st.fw / 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeRect(st.fx, st.fy, st.fw, st.fh);
      if (st.dragging) {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (var i = 1; i < 3; i += 1) {
          ctx.moveTo(st.fx + st.fw * i / 3, st.fy); ctx.lineTo(st.fx + st.fw * i / 3, st.fy + st.fh);
          ctx.moveTo(st.fx, st.fy + st.fh * i / 3); ctx.lineTo(st.fx + st.fw, st.fy + st.fh * i / 3);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    var raf = 0;
    function redraw() {
      if (raf) return;
      raf = (w.requestAnimationFrame || setTimeout)(function () { raf = 0; draw(); });
    }

    function zoomTo(z, ax, ay) {
      z = Math.min(MAX_ZOOM, Math.max(1, z));
      if (ax === undefined) { ax = st.fx + st.fw / 2; ay = st.fy + st.fh / 2; }
      var k = z / st.zoom;
      st.px = ax - (ax - st.px) * k;
      st.py = ay - (ay - st.py) * k;
      st.zoom = z;
      zoomInput.value = String(z);
      clamp();
      redraw();
    }

    function pan(dx, dy) { st.px += dx; st.py += dy; clamp(); redraw(); }

    function rotate() {
      st.rot = (st.rot + 90) % 360;
      st.px = st.fx + st.fw / 2; st.py = st.fy + st.fh / 2;
      clamp();
      redraw();
      status.textContent = 'Rotated to ' + st.rot + ' degrees.';
    }

    function reset() {
      st.rot = 0; st.zoom = 1; zoomInput.value = '1';
      st.px = st.fx + st.fw / 2; st.py = st.fy + st.fh / 2;
      clamp(); redraw();
      status.textContent = 'Crop reset.';
    }

    function local(ev) {
      var r = canvas.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    }

    canvas.addEventListener('pointerdown', function (ev) {
      canvas.setPointerCapture(ev.pointerId);
      pointers[ev.pointerId] = local(ev);
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]]; var b = pointers[ids[1]];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: st.zoom };
      }
      st.dragging = true;
      redraw();
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!pointers[ev.pointerId]) return;
      var p = local(ev);
      var prev = pointers[ev.pointerId];
      pointers[ev.pointerId] = p;
      var ids = Object.keys(pointers);
      if (ids.length >= 2 && pinch) {
        var a = pointers[ids[0]]; var b = pointers[ids[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        zoomTo(pinch.zoom * dist / pinch.dist, (a.x + b.x) / 2, (a.y + b.y) / 2);
      } else if (ids.length === 1) {
        pan(p.x - prev.x, p.y - prev.y);
      }
    });
    function endPointer(ev) {
      delete pointers[ev.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
      if (!Object.keys(pointers).length) { st.dragging = false; redraw(); }
    }
    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', endPointer);
    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var p = local(ev);
      zoomTo(st.zoom * Math.exp(-ev.deltaY * 0.0015), p.x, p.y);
    }, { passive: false });
    canvas.addEventListener('keydown', function (ev) {
      var step = ev.shiftKey ? 40 : 10;
      var handled = true;
      if (ev.key === 'ArrowLeft') pan(-step, 0);
      else if (ev.key === 'ArrowRight') pan(step, 0);
      else if (ev.key === 'ArrowUp') pan(0, -step);
      else if (ev.key === 'ArrowDown') pan(0, step);
      else if (ev.key === '+' || ev.key === '=') zoomTo(st.zoom * 1.1);
      else if (ev.key === '-' || ev.key === '_') zoomTo(st.zoom / 1.1);
      else if (ev.key === 'r' || ev.key === 'R') rotate();
      else if (ev.key === 'Enter') apply();
      else handled = false;
      if (handled) ev.preventDefault();
    });

    zoomInput.addEventListener('input', function () { zoomTo(Number(zoomInput.value)); });
    zoomOut.addEventListener('click', function () { zoomTo(st.zoom / 1.15); });
    zoomIn.addEventListener('click', function () { zoomTo(st.zoom * 1.15); });
    rotateBtn.addEventListener('click', rotate);
    resetBtn.addEventListener('click', reset);
    cancelBtn.addEventListener('click', function () { finish(null); });
    closeBtn.addEventListener('click', function () { finish(null); });
    applyBtn.addEventListener('click', apply);
    overlay.addEventListener('mousedown', function (ev) { if (ev.target === overlay) finish(null); });

    function onKey(ev) {
      if (ev.key === 'Escape') { ev.preventDefault(); finish(null); return; }
      if (ev.key !== 'Tab') return;
      var items = Array.prototype.slice.call(dialog.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      var first = items[0]; var last = items[items.length - 1];
      if (ev.shiftKey && d.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && d.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
    d.addEventListener('keydown', onKey, true);
    function onResize() { layout(); }
    w.addEventListener('resize', onResize);

    function apply() {
      if (done) return;
      applyBtn.disabled = true;
      applyBtn.textContent = 'Preparing…';
      var s = scale();
      var longFrame = Math.max(st.fw, st.fh);
      var natural = longFrame / s; // source pixels across the long side of the crop
      var outLong = Math.max(1, Math.min(OUT_MAX, Math.round(natural)));
      var k = outLong / longFrame;
      var out = d.createElement('canvas');
      out.width = Math.max(1, Math.round(st.fw * k));
      out.height = Math.max(1, Math.round(st.fh * k));
      var ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(k, 0, 0, k, -st.fx * k, -st.fy * k);
      paintImage(ctx);
      out.toBlob(function (blob) {
        if (!blob) {
          applyBtn.disabled = false;
          applyBtn.textContent = 'Use this photo';
          status.textContent = 'The photo could not be processed. Try another image.';
          return;
        }
        finish(blob);
      }, 'image/jpeg', QUALITY);
    }

    function finish(result) {
      if (done) return;
      done = true;
      d.removeEventListener('keydown', onKey, true);
      w.removeEventListener('resize', onResize);
      URL.revokeObjectURL(loaded.url);
      overlay.remove();
      d.documentElement.classList.remove('bdc-lock');
      if (opener && typeof opener.focus === 'function' && d.contains(opener)) opener.focus();
      resolve(result);
    }

    layout();
    canvas.focus();
  }

  w.BiodataCropper = { open: open, validate: validate, MAX_BYTES: MAX_BYTES, TYPES: TYPES.slice() };
})(window, document);
