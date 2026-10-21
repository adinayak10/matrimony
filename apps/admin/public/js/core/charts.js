// Chart helpers shared by the dashboard and analytics pages. Inline SVG built
// with html`` (every value escaped), no vendor script, no style="" attribute:
// widths go through data-style-width, the tooltip is positioned via CSSOM.
//
//   lastNDays(n)                         → ['YYYY-MM-DD', …] oldest first, local time
//   renderBars(mount, rows, { emptyText }) horizontal bars [{ label, value, cls }]
//   barChart(fig, series, opts)          one-series daily bar chart  series [{ day, count }]
//   lineChart(fig, series, opts)         one-series daily line chart series [{ day, count }]
//
// fig is a <figure> holding [data-chart-plot] and [data-chart-empty]; the
// optional "Show as table" <table data-chart-table> sits next to it (same
// parent). Design: one series, one hue, recessive grid, the peak is the only
// direct label, hover tooltip, a table view, an empty state when every value is 0.
import { html, setHtml, delegate } from './dom.js';
import { fmtDate, fmtNumber } from './format.js';

export function lastNDays(n) {
  const out = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i -= 1) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const pad = (v) => String(v).padStart(2, '0');
    out.push(`${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`);
  }
  return out;
}

/**
 * Horizontal bars, scaled to the largest value. With `emptyText`, a list whose
 * values are all zero (or an empty list) renders that message instead.
 */
export function renderBars(mount, rows, { emptyText = '' } = {}) {
  if (!mount) return;
  const list = Array.isArray(rows) ? rows : [];
  if (emptyText && !list.some((r) => Number(r.value) > 0)) {
    setHtml(mount, html`<p class="empty empty--inline">${emptyText}</p>`);
    return;
  }
  const max = Math.max(1, ...list.map((r) => Number(r.value) || 0));
  setHtml(mount, html`${list.map((r) => {
    const v = Number(r.value) || 0;
    const pct = Math.round((v / max) * 100);
    return html`<div class="bar-row">
      <span class="bar-row__label" title="${r.label}">${r.label}</span>
      <div class="bar-row__track" role="img" aria-label="${r.label}: ${fmtNumber(v, '0')}"><div class="bar-row__fill ${r.cls || ''}" data-style-width="${pct}%"></div></div>
      <span class="bar-row__value">${r.display != null ? r.display : fmtNumber(v, '0')}</span>
    </div>`;
  })}`);
}

const plural = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

function parts(fig) {
  return {
    plot: fig.querySelector('[data-chart-plot]'),
    empty: fig.querySelector('[data-chart-empty]'),
    tableBody: fig.parentElement ? fig.parentElement.querySelector('[data-chart-table] tbody') : null,
  };
}

function geometry(series) {
  const W = 640; const H = 220; const padL = 36; const padR = 8; const padT = 16; const padB = 28;
  const innerW = W - padL - padR; const innerH = H - padT - padB;
  const max = Math.max(1, ...series.map((p) => p.count));
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const y = (v) => padT + innerH - (v / niceMax) * innerH;
  const peak = series.reduce((best, p, i) => (p.count > series[best].count ? i : best), 0);
  return { W, H, padL, padR, padT, padB, innerW, innerH, niceMax, y, peak, gridVals: [niceMax, niceMax / 2] };
}

function bindTip(plot, series, noun, xFor = null) {
  const tip = plot.querySelector('[data-tip]');
  const svg = plot.querySelector('svg');
  const cross = svg.querySelector('[data-cross]');
  const show = (i, ev) => {
    const p = series[i];
    if (!p) return;
    tip.textContent = `${fmtDate(p.day)} · ${plural(p.count, noun)}`;
    tip.hidden = false;
    const rect = plot.getBoundingClientRect();
    tip.style.left = `${ev.clientX - rect.left}px`;
    tip.style.top = `${ev.clientY - rect.top - 8}px`;
    if (cross && xFor) {
      const x = xFor(i);
      cross.setAttribute('x1', x);
      cross.setAttribute('x2', x);
      cross.removeAttribute('visibility');
    }
  };
  delegate(svg, 'mousemove', '[data-i]', (ev, elm) => show(Number(elm.dataset.i), ev));
  svg.addEventListener('mouseleave', () => {
    tip.hidden = true;
    if (cross) cross.setAttribute('visibility', 'hidden');
  });
}

function fillTable(tableBody, series) {
  if (!tableBody) return;
  setHtml(tableBody, html`${series.filter((p) => p.count > 0).map((p) => html`<tr><td>${fmtDate(p.day)}</td><td class="num">${p.count}</td></tr>`)}`);
}

/** Daily bar chart (the dashboard's signups chart). */
export function barChart(fig, series, { noun = 'signup', ariaLabel = '' } = {}) {
  const { plot, empty, tableBody } = parts(fig);
  const total = series.reduce((s, p) => s + p.count, 0);
  if (!total) { empty.hidden = false; setHtml(plot, ''); if (tableBody) setHtml(tableBody, ''); return; }
  empty.hidden = true;

  const g = geometry(series);
  const n = series.length;
  const slot = g.innerW / n;
  const barW = Math.max(3, slot - 2); // 2px surface gap between bars

  const bars = series.map((p, i) => {
    const x = g.padL + i * slot + (slot - barW) / 2;
    const h = g.innerH - (g.y(p.count) - g.padT);
    const r = Math.min(4, barW / 2, h);
    // rounded top, square base anchored on the baseline
    const path = h <= 0 ? '' : `M${x},${g.padT + g.innerH} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
    return html`<g class="bar-group" data-i="${i}">
      ${path ? html`<path class="bar" d="${path}"><title>${fmtDate(p.day)}: ${plural(p.count, noun)}</title></path>` : ''}
      <rect class="bar--hit" x="${g.padL + i * slot}" y="${g.padT}" width="${slot}" height="${g.innerH}" data-i="${i}"></rect>
    </g>`;
  });

  const labelsX = series.map((p, i) => ((i % 7 === n % 7) ? html`<text class="axis-label" x="${g.padL + i * slot + slot / 2}" y="${g.H - 8}" text-anchor="middle">${p.day.slice(5).replace('-', '/')}</text>` : ''));

  setHtml(plot, html`<svg viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="none" role="img" aria-label="${ariaLabel || `${noun}s per day for the last ${n} days; ${total} in total`}">
    ${g.gridVals.map((v) => html`<line class="grid-line" x1="${g.padL}" x2="${g.W - g.padR}" y1="${g.y(v)}" y2="${g.y(v)}"></line><text class="axis-label" x="${g.padL - 6}" y="${g.y(v) + 4}" text-anchor="end">${v}</text>`)}
    <line class="baseline" x1="${g.padL}" x2="${g.W - g.padR}" y1="${g.padT + g.innerH}" y2="${g.padT + g.innerH}"></line>
    ${bars}
    <text class="value-label" x="${g.padL + g.peak * slot + slot / 2}" y="${g.y(series[g.peak].count) - 5}" text-anchor="middle">${series[g.peak].count}</text>
    ${labelsX}
  </svg><div class="chart__tip" data-tip hidden></div>`);

  bindTip(plot, series, noun);
  fillTable(tableBody, series);
}

/** Daily line chart with a crosshair: one series at a time. */
export function lineChart(fig, series, { noun = 'event', ariaLabel = '' } = {}) {
  const { plot, empty, tableBody } = parts(fig);
  const total = series.reduce((s, p) => s + p.count, 0);
  if (!total) { empty.hidden = false; setHtml(plot, ''); if (tableBody) setHtml(tableBody, ''); return; }
  empty.hidden = true;

  const g = geometry(series);
  const n = series.length;
  const step = n > 1 ? g.innerW / (n - 1) : 0;
  const xFor = (i) => g.padL + (n > 1 ? i * step : g.innerW / 2);
  const pts = series.map((p, i) => `${xFor(i).toFixed(1)},${g.y(p.count).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${xFor(n - 1).toFixed(1)},${g.padT + g.innerH} L${xFor(0).toFixed(1)},${g.padT + g.innerH} z`;
  const every = Math.max(1, Math.ceil(n / 6));
  const labelsX = series.map((p, i) => ((n - 1 - i) % every === 0 ? html`<text class="axis-label" x="${xFor(i)}" y="${g.H - 8}" text-anchor="middle">${p.day.slice(5).replace('-', '/')}</text>` : ''));
  const hitW = n > 1 ? step : g.innerW;

  setHtml(plot, html`<svg viewBox="0 0 ${g.W} ${g.H}" preserveAspectRatio="none" role="img" aria-label="${ariaLabel || `${noun}s per day for the last ${n} days; ${total} in total`}">
    ${g.gridVals.map((v) => html`<line class="grid-line" x1="${g.padL}" x2="${g.W - g.padR}" y1="${g.y(v)}" y2="${g.y(v)}"></line><text class="axis-label" x="${g.padL - 6}" y="${g.y(v) + 4}" text-anchor="end">${v}</text>`)}
    <line class="baseline" x1="${g.padL}" x2="${g.W - g.padR}" y1="${g.padT + g.innerH}" y2="${g.padT + g.innerH}"></line>
    <path class="area" d="${area}"></path>
    <path class="line" d="${line}"></path>
    <line class="crosshair" data-cross x1="0" x2="0" y1="${g.padT}" y2="${g.padT + g.innerH}" visibility="hidden"></line>
    <circle class="marker" cx="${xFor(g.peak)}" cy="${g.y(series[g.peak].count)}" r="4"></circle>
    <text class="value-label" x="${xFor(g.peak)}" y="${g.y(series[g.peak].count) - 8}" text-anchor="middle">${series[g.peak].count}</text>
    ${series.map((p, i) => html`<rect class="bar--hit" x="${Math.max(g.padL - hitW / 2, xFor(i) - hitW / 2)}" y="${g.padT}" width="${hitW}" height="${g.innerH}" data-i="${i}"><title>${fmtDate(p.day)}: ${plural(p.count, noun)}</title></rect>`)}
    ${labelsX}
  </svg><div class="chart__tip" data-tip hidden></div>`);

  bindTip(plot, series, noun, xFor);
  fillTable(tableBody, series);
}
