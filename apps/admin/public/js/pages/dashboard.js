// Dashboard (C3.1): stat tiles, signups chart, engagement numbers, gender and
// activity bars, recent signups table.
//   GET /api/admin/dashboard/stats          → data.overview/gender/activity
//   GET /api/admin/dashboard/user-growth?days=30 → data [{ _id:'YYYY-MM-DD', count }]
//   GET /api/admin/dashboard/engagement     → data { activeMessagers, activeRequesters, averageMessagesPerUser, totalActiveMessagers }
//   GET /api/admin/dashboard/recent-users?limit=10
// Charts are inline SVG built here (no vendor script): one series, one hue,
// grid recessive, direct label on the peak only, hover tooltip, table view.
import { api, errorMessage } from '../core/api.js';
import { html, raw, setHtml, el, delegate } from '../core/dom.js';
import { fmtDate, fmtNumber, timeAgo } from '../core/format.js';
import { imageUrl, bindImageFallbacks } from '../core/imageUrl.js';
import { createTable } from '../core/table.js';
import { toast } from '../core/toast.js';

const DAYS = 30;

function setStat(key, value) {
  const node = document.querySelector(`[data-stat="${key}"]`);
  if (node) node.textContent = fmtNumber(value, '0');
}

function statusBadges(u) {
  return html`${u.is_block ? html`<span class="badge badge--danger">Blocked</span>` : html`<span class="badge badge--success">Active</span>`}
    ${u.is_verified ? html`<span class="badge badge--info">Verified</span>` : html`<span class="badge badge--neutral">Unverified</span>`}`;
}

async function loadStats() {
  try {
    const { data } = await api('/admin/dashboard/stats');
    const o = data.overview || {};
    setStat('totalUsers', o.totalUsers);
    setStat('activeUsers', o.activeUsers);
    setStat('verifiedUsers', o.verifiedUsers);
    setStat('blockedUsers', o.blockedUsers);
    setStat('recentUsers', o.recentUsers);
    if (o.activeUsersLabel) {
      const label = document.querySelector('[data-stat-label="activeUsers"]');
      if (label) label.textContent = o.activeUsersLabel;
    }
    renderBars(el('[data-bars="gender"]'), [
      { label: 'Male', value: data.gender?.male, cls: '' },
      { label: 'Female', value: data.gender?.female, cls: 'bar-row__fill--2' },
      { label: 'Not specified', value: data.gender?.other, cls: 'bar-row__fill--3' },
    ]);
    renderBars(el('[data-bars="activity"]'), [
      { label: 'Messages', value: data.activity?.totalMessages },
      { label: 'Interests sent', value: data.activity?.totalFriendRequests },
      { label: 'Chat rooms', value: data.activity?.totalChatRooms },
    ]);
  } catch (err) {
    toast.error(errorMessage(err, 'Could not load dashboard numbers.'));
  }
}

function renderBars(mount, rows) {
  if (!mount) return;
  const max = Math.max(1, ...rows.map((r) => Number(r.value) || 0));
  setHtml(mount, html`${rows.map((r) => {
    const v = Number(r.value) || 0;
    const pct = Math.round((v / max) * 100);
    return html`<div class="bar-row">
      <span class="bar-row__label">${r.label}</span>
      <div class="bar-row__track" role="img" aria-label="${r.label}: ${fmtNumber(v, '0')}"><div class="bar-row__fill ${r.cls || ''}" style="width:${pct}%"></div></div>
      <span class="bar-row__value">${fmtNumber(v, '0')}</span>
    </div>`;
  })}`);
}

// ---- Signups chart -------------------------------------------------------
function lastNDays(n) {
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

function renderGrowthChart(fig, series) {
  const plot = fig.querySelector('[data-chart-plot]');
  const empty = fig.querySelector('[data-chart-empty]');
  const tableBody = fig.parentElement.querySelector('[data-chart-table] tbody');
  const total = series.reduce((s, p) => s + p.count, 0);
  if (!total) { empty.hidden = false; setHtml(plot, ''); return; }
  empty.hidden = true;

  const W = 640; const H = 220; const padL = 36; const padR = 8; const padT = 16; const padB = 28;
  const innerW = W - padL - padR; const innerH = H - padT - padB;
  const max = Math.max(1, ...series.map((p) => p.count));
  const niceMax = max <= 5 ? 5 : Math.ceil(max / 5) * 5;
  const n = series.length;
  const slot = innerW / n;
  const barW = Math.max(3, slot - 2); // 2px surface gap between bars
  const y = (v) => padT + innerH - (v / niceMax) * innerH;
  const peak = series.reduce((best, p, i) => (p.count > series[best].count ? i : best), 0);
  const gridVals = [niceMax, niceMax / 2];

  const bars = series.map((p, i) => {
    const x = padL + i * slot + (slot - barW) / 2;
    const h = innerH - (y(p.count) - padT);
    const r = Math.min(4, barW / 2, h);
    // rounded top, square base anchored on the baseline
    const path = h <= 0 ? '' : `M${x},${padT + innerH} v${-(h - r)} a${r},${r} 0 0 1 ${r},${-r} h${barW - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - r} z`;
    return html`<g class="bar-group" data-i="${i}">
      ${path ? html`<path class="bar" d="${path}"><title>${fmtDate(p.day)}: ${p.count} signup${p.count === 1 ? '' : 's'}</title></path>` : ''}
      <rect class="bar--hit" x="${padL + i * slot}" y="${padT}" width="${slot}" height="${innerH}" data-i="${i}"></rect>
    </g>`;
  });

  const labelsX = series.map((p, i) => ((i % 7 === n % 7) ? html`<text class="axis-label" x="${padL + i * slot + slot / 2}" y="${H - 8}" text-anchor="middle">${p.day.slice(5).replace('-', '/')}</text>` : ''));

  setHtml(plot, html`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Signups per day for the last ${DAYS} days; ${total} in total">
    ${gridVals.map((v) => html`<line class="grid-line" x1="${padL}" x2="${W - padR}" y1="${y(v)}" y2="${y(v)}"></line><text class="axis-label" x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`)}
    <line class="baseline" x1="${padL}" x2="${W - padR}" y1="${padT + innerH}" y2="${padT + innerH}"></line>
    ${bars}
    <text class="value-label" x="${padL + peak * slot + slot / 2}" y="${y(series[peak].count) - 5}" text-anchor="middle">${series[peak].count}</text>
    ${labelsX}
  </svg><div class="chart__tip" data-tip hidden></div>`);

  const tip = plot.querySelector('[data-tip]');
  const svg = plot.querySelector('svg');
  const showTip = (i, ev) => {
    const p = series[i];
    if (!p) return;
    tip.textContent = `${fmtDate(p.day)} · ${p.count} signup${p.count === 1 ? '' : 's'}`;
    tip.hidden = false;
    const rect = plot.getBoundingClientRect();
    tip.style.left = `${ev.clientX - rect.left}px`;
    tip.style.top = `${ev.clientY - rect.top - 8}px`;
  };
  delegate(svg, 'mousemove', '[data-i]', (ev, elm) => showTip(Number(elm.dataset.i), ev));
  svg.addEventListener('mouseleave', () => { tip.hidden = true; });

  if (tableBody) {
    setHtml(tableBody, html`${series.filter((p) => p.count > 0).map((p) => html`<tr><td>${fmtDate(p.day)}</td><td class="num">${p.count}</td></tr>`)}`);
  }
}

async function loadGrowth() {
  const fig = el('[data-chart="growth"]');
  if (!fig) return;
  try {
    const { data } = await api('/admin/dashboard/user-growth', { query: { days: DAYS } });
    const byDay = new Map((data || []).map((r) => [String(r._id), Number(r.count) || 0]));
    const series = lastNDays(DAYS).map((day) => ({ day, count: byDay.get(day) || 0 }));
    renderGrowthChart(fig, series);
  } catch (err) {
    const empty = fig.querySelector('[data-chart-empty]');
    empty.textContent = errorMessage(err, 'Failed to load signup data.');
    empty.hidden = false;
  }
}

// ---- Engagement: four numbers with different units → tiles, not one axis ----
async function loadEngagement() {
  const fig = el('[data-chart="engagement"]');
  if (!fig) return;
  const plot = fig.querySelector('[data-chart-plot]');
  const empty = fig.querySelector('[data-chart-empty]');
  try {
    const { data } = await api('/admin/dashboard/engagement');
    const e = data || {};
    const any = (e.activeMessagers || 0) + (e.activeRequesters || 0) + (e.totalActiveMessagers || 0);
    if (!any) { empty.hidden = false; setHtml(plot, ''); return; }
    empty.hidden = true;
    const tiles = [
      { label: 'Sent a message (7d)', value: fmtNumber(e.activeMessagers, '0') },
      { label: 'Sent an interest (7d)', value: fmtNumber(e.activeRequesters, '0') },
      { label: 'Members who ever messaged', value: fmtNumber(e.totalActiveMessagers, '0') },
      { label: 'Avg messages per sender', value: fmtNumber(Math.round((Number(e.averageMessagesPerUser) || 0) * 10) / 10, '0') },
    ];
    setHtml(plot, html`<div class="stats-grid" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0">
      ${tiles.map((t) => html`<div class="stat" style="padding:12px 14px"><div><div class="stat__value" style="font-size:22px">${t.value}</div><div class="stat__label">${t.label}</div></div></div>`)}
    </div>`);
  } catch (err) {
    empty.textContent = errorMessage(err, 'Failed to load engagement data.');
    empty.hidden = false;
  }
}

// ---- Recent signups ------------------------------------------------------
function initRecentUsers() {
  const mount = el('#recent-users');
  if (!mount) return;
  createTable({
    mount,
    caption: 'Most recent signups',
    emptyTitle: 'No members yet',
    skeletonRows: 5,
    parsePagination: () => ({ page: 1, pages: 1, total: null, limit: 10 }),
    columns: [
      { key: 'profile', label: '', width: '56px', render: (u) => html`<img class="avatar" src="${imageUrl(u.profile)}" alt="" data-fallback width="40" height="40" loading="lazy">` },
      { key: 'full_name', label: 'Name', render: (u) => html`<a href="/users/${u._id}">${u.full_name || 'Not specified'}</a>` },
      { key: 'email', label: 'Email', render: (u) => html`<span class="truncate">${u.email || '—'}</span>` },
      { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
      { key: 'gender', label: 'Gender', render: (u) => u.gender || '—' },
      { key: 'status', label: 'Status', render: statusBadges },
      { key: 'createdAt', label: 'Joined', render: (u) => html`<span title="${fmtDate(u.createdAt)}">${timeAgo(u.createdAt)}</span>` },
    ],
    fetchPage: async () => {
      const resp = await api('/admin/dashboard/recent-users', { query: { limit: 10 } });
      queueMicrotask(() => bindImageFallbacks(mount));
      return { rows: resp.data || [] };
    },
  }).reload();
}

loadStats();
loadGrowth();
loadEngagement();
initRecentUsers();
