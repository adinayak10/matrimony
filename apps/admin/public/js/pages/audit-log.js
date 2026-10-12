// Audit log (C3.8). Verified in apps/api/controllers/admin/auditLogController.js
// and models/AdminAuditLog.js (written by services/auditLog.js):
//   GET /api/admin/audit-log?page&limit=50&action&adminId&targetType&targetId&from&to
//       → { data:[{ _id, adminId:{ _id, full_name, email }, adminEmail, action, targetType, targetId,
//                   before, after, ip, userAgent, createdAt }], pagination:{ total, page, limit, pages } }
//       from/to are parsed with new Date(); the date inputs are sent as local start/end of day.
//   GET /api/admin/audit-log/actions → data [distinct action names, sorted]
// Read-only: there is no write endpoint and this page offers none.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el } from '../core/dom.js';
import { fmtDateTime, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';

const OBJECT_ID = /^[a-f0-9]{24}$/i;
const TARGET_LINK = {
  user: (id) => `/users/${id}`,
  blog: (id) => `/blogs/${id}/edit`,
  statePage: (id) => `/regional-pages?tab=states&edit=${id}`,
  cityPage: (id) => `/regional-pages?tab=cities&edit=${id}`,
};
const TARGET_PAGE = {
  report: '/reports', photo: '/photo-moderation', communityFeedback: '/community-feedback', banner: '/banners',
  settings: '/settings', apk: '/apk-manager', broadcast: '/broadcast-email',
};

function targetCell(r) {
  const type = r.targetType || '';
  const id = r.targetId || '';
  if (!type) return html`<span class="muted">—</span>`;
  const deleted = /\.delete$/.test(r.action || '');
  const href = !deleted && TARGET_LINK[type] && OBJECT_ID.test(id) ? TARGET_LINK[type](id) : (TARGET_PAGE[type] || '');
  return html`${href ? html`<a href="${href}">${type}</a>` : type}${id ? html`<span class="cell-sub mono">${id}</span>` : ''}`;
}

function summary(r) {
  const keys = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v) : []);
  const after = keys(r.after);
  const before = keys(r.before);
  const all = [...new Set([...after, ...before])];
  if (!all.length) return html`<span class="muted">No details recorded</span>`;
  const simple = all.slice(0, 3).map((k) => {
    const v = r.after && r.after[k] !== undefined ? r.after[k] : (r.before ? r.before[k] : undefined);
    return (v === null || ['string', 'number', 'boolean'].includes(typeof v)) ? `${k}: ${truncate(String(v), 40)}` : k;
  });
  return html`<span class="cell-wrap">${simple.join(', ')}${all.length > 3 ? ` +${all.length - 3} more` : ''}</span>`;
}

const dayStart = (d) => { const x = new Date(`${d}T00:00:00`); return Number.isNaN(x.getTime()) ? '' : x.toISOString(); };
const dayEnd = (d) => { const x = new Date(`${d}T23:59:59.999`); return Number.isNaN(x.getTime()) ? '' : x.toISOString(); };

const table = createTable({
  mount: el('#audit-table'),
  caption: 'Admin audit log',
  limit: 50,
  emptyTitle: 'No audit entries match these filters',
  emptyHint: 'Entries appear as soon as an admin changes something.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'createdAt', label: 'Time', render: (r) => html`<span class="nowrap">${fmtDateTime(r.createdAt)}</span>` },
    { key: 'admin', label: 'Admin', render: (r) => {
      const a = r.adminId && typeof r.adminId === 'object' ? r.adminId : null;
      return html`${(a && (a.full_name || a.email)) || r.adminEmail || 'Unknown'}${a && a.full_name && a.email ? html`<span class="cell-sub">${a.email}</span>` : ''}`;
    } },
    { key: 'action', label: 'Action', render: (r) => html`<span class="badge badge--${/\.delete$/.test(r.action || '') ? 'danger' : 'neutral'}">${r.action || 'unknown'}</span>` },
    { key: 'target', label: 'Target', render: targetCell },
    { key: 'summary', label: 'Summary', render: summary },
    { key: 'ip', label: 'IP', render: (r) => html`<span class="mono">${r.ip || '—'}</span>` },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (r) => html`<button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${r._id}">Details</button>` },
  ],
  fetchPage: async ({ from, to, targetId, ...params }) => {
    const query = { ...params, targetId: String(targetId || '').trim() };
    if (from) query.from = dayStart(from);
    if (to) query.to = dayEnd(to);
    const resp = await api('/admin/audit-log', { query });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => { if (action === 'view' && row) view(row); },
});

const filters = bindFilters(el('#audit-filters'), (values) => {
  table.setParams({ action: '', targetType: '', targetId: '', from: '', to: '', ...values });
});

async function loadActions() {
  const select = el('#audit-action');
  try {
    const { data } = await api('/admin/audit-log/actions');
    const wanted = new URL(location.href).searchParams.get('action') || '';
    setHtml(select, html`<option value="">Any action</option>${(data || []).map((a) => html`<option value="${a}">${a}</option>`)}`);
    // The filter was restored from the URL before its options existed: apply it now.
    if (wanted && (data || []).includes(wanted)) filters.set({ action: wanted });
  } catch (e) { /* the action filter is optional */ }
}

const pretty = (v) => (v === null || v === undefined ? 'Nothing recorded' : JSON.stringify(v, null, 2));

function view(r) {
  const a = r.adminId && typeof r.adminId === 'object' ? r.adminId : null;
  const m = openModal({
    title: r.action || 'Audit entry',
    size: 'lg',
    body: html`
      <dl class="key-value">
        <dt>Time</dt><dd>${fmtDateTime(r.createdAt)}</dd>
        <dt>Admin</dt><dd>${(a && (a.full_name || a.email)) || r.adminEmail || 'Unknown'}${a && a.email ? html` <span class="muted">(${a.email})</span>` : ''}</dd>
        <dt>Target</dt><dd>${targetCell(r)}</dd>
        <dt>IP address</dt><dd class="mono">${r.ip || '—'}</dd>
        <dt>Browser</dt><dd>${r.userAgent || '—'}</dd>
      </dl>
      <h3 class="info-section__title mt-3">Before</h3>
      <pre class="code-block" tabindex="0" aria-label="State before the change">${pretty(r.before)}</pre>
      <h3 class="info-section__title mt-3">After</h3>
      <pre class="code-block" tabindex="0" aria-label="State after the change">${pretty(r.after)}</pre>`,
    footer: html`<button type="button" class="btn btn--primary" data-ok>Close</button>`,
  });
  m.footer.querySelector('[data-ok]').addEventListener('click', () => m.close());
}

loadActions();
