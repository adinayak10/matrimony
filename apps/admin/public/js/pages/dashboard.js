// Dashboard (C3.1): stat tiles, signups chart, engagement numbers, gender and
// activity bars, recent signups table.
//   GET /api/admin/dashboard/stats          → data.overview/gender/activity
//   GET /api/admin/dashboard/user-growth?days=30 → data [{ _id:'YYYY-MM-DD', count }]
//   GET /api/admin/dashboard/engagement     → data { activeMessagers, activeRequesters, averageMessagesPerUser, totalActiveMessagers }
//   GET /api/admin/dashboard/recent-users?limit=10
//   GET /api/admin/biodata/stats            → data.documents.total (or data.documentsTotal): the Biodatas tile
// Charts come from core/charts.js (inline SVG, no vendor script): one series,
// one hue, grid recessive, direct label on the peak only, hover tooltip, table view.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el } from '../core/dom.js';
import { fmtDate, fmtNumber, timeAgo } from '../core/format.js';
import { lastNDays, renderBars, barChart } from '../core/charts.js';
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

// The biodata tile is optional: an older API without the endpoint leaves the dash.
async function loadBiodataTile() {
  try {
    const { data } = await api('/admin/biodata/stats');
    const d = data || {};
    const total = d.documents && typeof d.documents === 'object' ? d.documents.total : (d.documentsTotal ?? d.documents);
    if (total !== undefined && total !== null) setStat('biodataDocuments', total);
  } catch (err) { /* not critical */ }
}

async function loadGrowth() {
  const fig = el('[data-chart="growth"]');
  if (!fig) return;
  try {
    const { data } = await api('/admin/dashboard/user-growth', { query: { days: DAYS } });
    const byDay = new Map((data || []).map((r) => [String(r._id), Number(r.count) || 0]));
    const series = lastNDays(DAYS).map((day) => ({ day, count: byDay.get(day) || 0 }));
    barChart(fig, series, { noun: 'signup', ariaLabel: `Signups per day for the last ${DAYS} days; ${series.reduce((t, p) => t + p.count, 0)} in total` });
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
    setHtml(plot, html`<div class="stats-grid stats-grid--pairs">
      ${tiles.map((t) => html`<div class="stat stat--sm"><div><div class="stat__value">${t.value}</div><div class="stat__label">${t.label}</div></div></div>`)}
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
loadBiodataTile();
loadGrowth();
loadEngagement();
initRecentUsers();
