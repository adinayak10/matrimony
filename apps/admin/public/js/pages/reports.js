// Reports queue (C3.2).
//   GET   /api/admin/reports/stats                       → { pending, resolved, dismissed, total }
//   GET   /api/admin/reports?page&limit=20&status&reason&sort=-createdAt
//   GET   /api/admin/reports/:id
//   PATCH /api/admin/reports/:id/status {status, resolutionNote}
//   POST  /api/admin/reports/:id/block-user {resolutionNote}
//   GET   /api/admin/constants/report-reasons             → data [{ title, is_active }]
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';

const STATUS_BADGE = { pending: 'warning', resolved: 'success', dismissed: 'neutral' };
const badge = (s) => html`<span class="badge badge--${STATUS_BADGE[s] || 'neutral'}">${titleCase(s || 'pending')}</span>`;
const userLink = (u, { blocked = false } = {}) => (u && u._id
  ? html`<a href="/users/${u._id}">${u.full_name || 'Member'}</a>${blocked && u.is_block ? html` <span class="badge badge--danger">Blocked</span>` : ''}`
  : html`<span class="muted">Unknown</span>`);

async function loadStats() {
  try {
    const { data } = await api('/admin/reports/stats');
    for (const k of ['pending', 'resolved', 'dismissed', 'total']) {
      const node = el(`[data-stat="${k}"]`);
      if (node) node.textContent = Number(data[k] || 0).toLocaleString();
    }
  } catch (err) { toast.error(errorMessage(err, 'Could not load report counts.')); }
}

async function loadReasons() {
  const select = el('#report-filters-reason');
  if (!select) return;
  try {
    const { data } = await api('/admin/constants/report-reasons');
    const current = new URL(location.href).searchParams.get('reason') || '';
    const opts = (data || []).map((r) => html`<option value="${r.title}" ${r.title === current ? 'selected' : ''}>${r.title}${r.is_active === false ? ' (inactive)' : ''}</option>`);
    setHtml(select, html`<option value="">Any reason</option>${opts}`);
    if (current) select.value = current;
  } catch (e) { /* the filter is optional */ }
}

const mount = el('#reports-table');
const table = createTable({
  mount,
  caption: 'Abuse reports',
  limit: 20,
  emptyTitle: 'No reports match these filters',
  onClear: () => filters.clear(),
  columns: [
    { key: 'createdAt', label: 'Date', render: (r) => html`<span class="nowrap">${fmtDate(r.createdAt)}</span>` },
    { key: 'reportedBy', label: 'Reporter', render: (r) => userLink(r.reportedBy) },
    { key: 'reportedUser', label: 'Reported user', render: (r) => userLink(r.reportedUser, { blocked: true }) },
    { key: 'reason', label: 'Reason', render: (r) => r.reason || '—' },
    { key: 'desc', label: 'Description', render: (r) => html`<span title="${r.desc || ''}">${truncate(r.desc || '—', 120)}</span>` },
    { key: 'status', label: 'Status', render: (r) => badge(r.status) },
    { key: 'actions', label: '', class: 'table__actions', render: (r) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${r._id}">View</button>
      ${r.status === 'pending' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="resolve" data-id="${r._id}">Resolve</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="dismiss" data-id="${r._id}">Dismiss</button>
        ${r.reportedUser && !r.reportedUser.is_block ? html`<button type="button" class="btn btn--danger btn--sm" data-action="block" data-id="${r._id}">Block user</button>` : ''}` : ''}` },
  ],
  fetchPage: async (params) => {
    const resp = await api('/admin/reports', { query: { sort: '-createdAt', ...params } });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (action === 'view') view(id);
    else if (action === 'resolve') setStatus(id, 'resolved');
    else if (action === 'dismiss') setStatus(id, 'dismissed');
    else if (action === 'block') blockUser(id, row);
  },
});

const filters = bindFilters(el('#report-filters'), (values) => {
  table.setParams({ status: '', reason: '', ...values });
});

function noteModal({ title, label, confirmText, danger = false, requireNote = false }) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal({
      title,
      size: 'sm',
      body: html`<div class="form-group"><label class="form-label" for="res-note">${label}</label><textarea class="form-control" id="res-note" maxlength="1000"></textarea><p class="form-error" hidden data-err>A note is required.</p></div>`,
      footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-ok>${confirmText}</button>`,
      onClose: () => finish(null),
    });
    m.footer.querySelector('[data-cancel]').addEventListener('click', () => { finish(null); m.close(); });
    m.footer.querySelector('[data-ok]').addEventListener('click', () => {
      const ta = m.body.querySelector('#res-note');
      const note = ta.value.trim();
      if (requireNote && !note) { m.body.querySelector('[data-err]').hidden = false; ta.focus(); return; }
      finish(note); m.close();
    });
  });
}

async function setStatus(id, status) {
  const note = await noteModal({
    title: status === 'resolved' ? 'Mark as resolved' : status === 'dismissed' ? 'Dismiss report' : 'Reopen report',
    label: 'Resolution note (optional)',
    confirmText: status === 'resolved' ? 'Resolve' : status === 'dismissed' ? 'Dismiss' : 'Reopen',
  });
  if (note === null) return;
  try {
    await api(`/admin/reports/${id}/status`, { method: 'PATCH', body: { status, resolutionNote: note || undefined } });
    toast.success(`Report marked as ${status}`);
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not update the report.')); }
}

async function blockUser(id, row) {
  const name = row && row.reportedUser ? (row.reportedUser.full_name || 'this member') : 'this member';
  const ok = await confirm({
    title: `Block ${name}?`,
    message: 'The member is blocked immediately and the report is marked resolved.',
    confirmText: 'Block and resolve',
    danger: true,
  });
  if (!ok) return;
  const note = await noteModal({ title: 'Resolution note', label: 'Why was the member blocked? (optional)', confirmText: 'Block member', danger: true });
  if (note === null) return;
  try {
    await api(`/admin/reports/${id}/block-user`, { method: 'POST', body: { resolutionNote: note || 'User blocked' } });
    toast.success('Member blocked and report resolved');
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not block the member.')); }
}

async function view(id) {
  const m = openModal({ title: 'Report', body: html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div>` });
  try {
    const { data: r } = await api(`/admin/reports/${id}`);
    m.setBody(html`
      <dl class="key-value">
        <dt>Reported user</dt><dd>${userLink(r.reportedUser, { blocked: true })} ${r.reportedUser && r.reportedUser.email ? html`<span class="muted">(${r.reportedUser.email})</span>` : ''}</dd>
        <dt>Reported by</dt><dd>${userLink(r.reportedBy)} ${r.reportedBy && r.reportedBy.email ? html`<span class="muted">(${r.reportedBy.email})</span>` : ''}</dd>
        <dt>Reason</dt><dd>${r.reason || '—'}</dd>
        <dt>Description</dt><dd class="pre-wrap">${r.desc || 'No additional description provided.'}</dd>
        <dt>Status</dt><dd>${badge(r.status)}</dd>
        <dt>Filed</dt><dd>${fmtDateTime(r.createdAt)}</dd>
        ${r.resolvedBy ? html`<dt>Resolved by</dt><dd>${r.resolvedBy.full_name || r.resolvedBy.email || 'Admin'} on ${fmtDateTime(r.resolvedAt)}</dd>` : ''}
        ${r.resolutionNote ? html`<dt>Resolution note</dt><dd class="pre-wrap">${r.resolutionNote}</dd>` : ''}
      </dl>`);
    m.setFooter(r.status === 'pending'
      ? html`<button type="button" class="btn btn--secondary" data-do="dismissed">Dismiss</button><button type="button" class="btn btn--primary" data-do="resolved">Mark resolved</button>`
      : html`<button type="button" class="btn btn--secondary" data-do="pending">Reopen</button>`);
    m.footer.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => { m.close(); setStatus(id, b.dataset.do); }));
  } catch (err) {
    m.setBody(html`<div class="alert alert--error" role="alert">${errorMessage(err, 'Could not load the report.')}</div>`);
  }
}

loadStats();
loadReasons();
