// Analytics (feature expansion B9). Period = ?days=7|30|90 (URL-synced).
//   GET /api/admin/analytics/active          → data { onlineNow, dau, wau, mau }   (ActivityLog)
//   GET /api/admin/analytics/funnel?days     → data { steps:[{ key, count }] }      signups → profile_complete_70 → interest_sent → interest_accepted → first_message
//   GET /api/admin/analytics/activity?days   → data { days:[{ date, signups, interests, accepted, shortlists, visitors, messages }] }
//                                              (also accepted: { <metric>: [{ _id:'YYYY-MM-DD', count }] })
//   GET /api/admin/analytics/demographics    → data { cities, states, castes, gotras, ageBuckets, gender: [{ _id|label|name, count }] }
//   GET /api/admin/dashboard/stats           → data.membership [{ _id, count, plan:[{ name }] }], data.loginTypes [{ _id, count }]
// Nothing is invented: every block has a "Not enough data yet" state.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, els } from '../core/dom.js';
import { fmtDate, fmtNumber, titleCase } from '../core/format.js';
import { bindFilters } from '../core/filters.js';
import { lastNDays, renderBars, lineChart } from '../core/charts.js';
import { setStats } from '../core/ui.js';

const EMPTY = 'Not enough data yet.';
const PERIODS = ['7', '30', '90'];
const FUNNEL = [
  ['signups', 'Signed up'],
  ['profile_complete_70', 'Profile 70% complete'],
  ['interest_sent', 'Sent an interest'],
  ['interest_accepted', 'Had an interest accepted'],
  ['first_message', 'Sent a first message'],
];
const METRICS = {
  signups: 'signup', interests: 'interest', accepted: 'accepted interest', shortlists: 'shortlist', visitors: 'profile visit', messages: 'message',
};
const metricSelect = el('[data-chart-metric]');
let days = 30;
let activity = null; // { days: ['YYYY-MM-DD'], series: { metric: [n…] } }
const seq = { funnel: 0, activity: 0 };

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const labelOf = (r) => {
  const raw = r && (r.label ?? r.name ?? r.title ?? r._id);
  if (raw && typeof raw === 'object') return raw.name || raw.title || '';
  return raw == null || raw === '' ? '' : String(raw);
};

function errorBox(mount, err, fallback) {
  setHtml(mount, html`<p class="empty empty--inline">${errorMessage(err, fallback)}</p>`);
}

// ---- Active members --------------------------------------------------------------
async function loadActive() {
  const note = el('[data-active-note]');
  try {
    const { data } = await api('/admin/analytics/active');
    const d = data || {};
    setStats({ onlineNow: d.onlineNow, dau: d.dau, wau: d.wau, mau: d.mau });
    const any = num(d.onlineNow) + num(d.dau) + num(d.wau) + num(d.mau);
    note.hidden = !!any;
    note.textContent = any ? '' : `${EMPTY} Activity is counted when members open the app or the website.`;
  } catch (err) {
    note.hidden = false;
    note.textContent = errorMessage(err, 'Could not load active members.');
  }
}

// ---- Membership + sign-in method (dashboard stats) -------------------------------
async function loadDashboardBreakdowns() {
  const plans = el('[data-bars="membership"]');
  const logins = el('[data-bars="loginTypes"]');
  try {
    const { data } = await api('/admin/dashboard/stats');
    const membership = (Array.isArray(data.membership) ? data.membership : []).map((r) => {
      const plan = Array.isArray(r.plan) ? r.plan[0] : r.plan;
      return { label: r._id ? ((plan && plan.name) || 'Removed plan') : 'No plan (free)', value: num(r.count) };
    }).sort((a, b) => b.value - a.value);
    renderBars(plans, membership, { emptyText: EMPTY });
    const LOGIN = { email: 'Email', google: 'Google', apple: 'Apple', phone: 'Phone', facebook: 'Facebook' };
    const loginTypes = (Array.isArray(data.loginTypes) ? data.loginTypes : []).map((r) => ({
      label: r._id == null || r._id === '' ? 'Not recorded' : (LOGIN[String(r._id).toLowerCase()] || titleCase(String(r._id))),
      value: num(r.count),
    })).sort((a, b) => b.value - a.value);
    renderBars(logins, loginTypes, { emptyText: EMPTY });
  } catch (err) {
    errorBox(plans, err, 'Could not load plan counts.');
    errorBox(logins, err, 'Could not load sign-in methods.');
  }
}

// ---- Funnel -----------------------------------------------------------------------
function normaliseFunnel(data) {
  const out = new Map();
  const steps = Array.isArray(data) ? data : (data && Array.isArray(data.steps) ? data.steps : null);
  if (steps) steps.forEach((s) => out.set(String(s.key || s.step || s.name || s._id), num(s.count ?? s.value)));
  else if (data && typeof data === 'object') FUNNEL.forEach(([k]) => { if (data[k] != null) out.set(k, num(data[k])); });
  return FUNNEL.map(([key, label]) => ({ key, label, value: out.get(key) || 0 }));
}

async function loadFunnel() {
  const mine = ++seq.funnel;
  const mount = el('[data-bars="funnel"]');
  const tableWrap = el('[data-funnel-table]');
  try {
    const { data } = await api('/admin/analytics/funnel', { query: { days } });
    if (mine !== seq.funnel) return;
    const rows = normaliseFunnel(data);
    renderBars(mount, rows, { emptyText: `${EMPTY} Nobody joined in this period.` });
    const first = rows[0].value;
    if (!first) { tableWrap.hidden = true; return; }
    const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');
    setHtml(el('tbody', tableWrap), html`${rows.map((r, i) => html`<tr><td>${r.label}</td><td class="num">${fmtNumber(r.value, '0')}</td><td class="num">${i ? pct(r.value, rows[i - 1].value) : '—'}</td><td class="num">${i ? pct(r.value, first) : '100%'}</td></tr>`)}`);
    tableWrap.hidden = false;
  } catch (err) {
    if (mine !== seq.funnel) return;
    tableWrap.hidden = true;
    errorBox(mount, err, 'Could not load the funnel.');
  }
}

// ---- Activity ---------------------------------------------------------------------
const dayKey = (v) => {
  const s = String(v || '');
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

function normaliseActivity(data) {
  const range = lastNDays(days);
  const maps = Object.fromEntries(Object.keys(METRICS).map((m) => [m, new Map()]));
  const rows = Array.isArray(data) ? data : (data && Array.isArray(data.days) ? data.days : (data && Array.isArray(data.rows) ? data.rows : null));
  if (rows) {
    rows.forEach((r) => {
      const k = dayKey(r.date || r.day || r._id);
      if (k) Object.keys(METRICS).forEach((m) => { if (r[m] != null) maps[m].set(k, num(r[m])); });
    });
  } else if (data && typeof data === 'object') {
    Object.keys(METRICS).forEach((m) => {
      (Array.isArray(data[m]) ? data[m] : []).forEach((p) => { const k = dayKey(p._id || p.date || p.day); if (k) maps[m].set(k, num(p.count)); });
    });
  }
  return { days: range, series: Object.fromEntries(Object.keys(METRICS).map((m) => [m, range.map((d) => maps[m].get(d) || 0)])) };
}

function renderActivity() {
  const fig = el('[data-chart="activity"]');
  const tbody = el('[data-activity-table] tbody');
  if (!activity) return;
  const metric = METRICS[metricSelect.value] ? metricSelect.value : 'signups';
  const label = metricSelect.options[metricSelect.selectedIndex] ? metricSelect.options[metricSelect.selectedIndex].text : titleCase(metric);
  const series = activity.days.map((day, i) => ({ day, count: activity.series[metric][i] }));
  fig.setAttribute('aria-label', `${label} per day, last ${days} days`);
  lineChart(fig, series, { noun: METRICS[metric], ariaLabel: `${label} per day for the last ${days} days; ${series.reduce((t, p) => t + p.count, 0)} in total` });
  const busyDays = activity.days.map((day, i) => ({ day, values: Object.keys(METRICS).map((m) => activity.series[m][i]) })).filter((r) => r.values.some((v) => v > 0));
  setHtml(tbody, busyDays.length
    ? html`${busyDays.reverse().map((r) => html`<tr><td class="nowrap">${fmtDate(r.day)}</td>${r.values.map((v) => html`<td class="num">${fmtNumber(v, '0')}</td>`)}</tr>`)}`
    : html`<tr><td colspan="${Object.keys(METRICS).length + 1}">${EMPTY}</td></tr>`);
}

async function loadActivity() {
  const mine = ++seq.activity;
  const fig = el('[data-chart="activity"]');
  const empty = fig.querySelector('[data-chart-empty]');
  try {
    const { data } = await api('/admin/analytics/activity', { query: { days } });
    if (mine !== seq.activity) return;
    activity = normaliseActivity(data);
    empty.textContent = EMPTY;
    renderActivity();
  } catch (err) {
    if (mine !== seq.activity) return;
    activity = null;
    setHtml(fig.querySelector('[data-chart-plot]'), '');
    empty.textContent = errorMessage(err, 'Could not load activity.');
    empty.hidden = false;
  }
}
metricSelect.addEventListener('change', renderActivity);

// ---- Demographics ------------------------------------------------------------------
function demoTable(mount, rows) {
  const heading = mount.dataset.demoLabel || 'Value';
  const list = (Array.isArray(rows) ? rows : []).map((r) => ({ label: labelOf(r) || 'Not specified', count: num(r.count ?? r.value) })).filter((r) => r.count > 0);
  if (!list.length) { setHtml(mount, html`<p class="empty empty--inline">${EMPTY}</p>`); return; }
  const total = list.reduce((s, r) => s + r.count, 0);
  const caption = (mount.closest('section') && mount.closest('section').querySelector('.card__title')) ? mount.closest('section').querySelector('.card__title').textContent : heading;
  setHtml(mount, html`<div class="table-wrap"><table class="table table--compact"><caption class="sr-only">${caption}</caption>
    <thead><tr><th scope="col">${heading}</th><th scope="col" class="num">Members</th><th scope="col" class="num">Share</th></tr></thead>
    <tbody>${list.slice(0, 15).map((r) => html`<tr><td>${r.label}</td><td class="num">${fmtNumber(r.count, '0')}</td><td class="num">${Math.round((r.count / total) * 1000) / 10}%</td></tr>`)}</tbody></table></div>
    ${list.length > 15 ? html`<div class="table-foot"><span class="table-foot__summary">Top 15 of ${list.length}</span></div>` : ''}`);
}

async function loadDemographics() {
  const mounts = els('[data-demo]');
  try {
    const { data } = await api('/admin/analytics/demographics');
    const d = data || {};
    mounts.forEach((m) => demoTable(m, d[m.dataset.demo]));
  } catch (err) {
    mounts.forEach((m) => errorBox(m, err, 'Could not load demographics.'));
  }
}

bindFilters(el('#analytics-filters'), (values) => {
  days = Number(PERIODS.includes(String(values.days)) ? values.days : 30);
  loadFunnel();
  loadActivity();
}, { defaults: { days: '30' } });

loadActive();
loadDashboardBreakdowns();
loadDemographics();
