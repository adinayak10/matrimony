// Beta tester applications (C3.3). Verified in apps/api/routes/betaTesterRoutes.js
// and controllers/BetaTesterController.js (there is no GET /:id — the row is the record):
//   GET    /api/beta-tester/stats → data { total, pending, approved, active, unread }
//   GET    /api/beta-tester/all?page&limit&status&isRead=true|false&sortBy=createdAt&sortOrder=asc|desc
//          → { data:[…], pagination:{ page, limit, total, pages } }
//   PATCH  /api/beta-tester/:id/read
//   PATCH  /api/beta-tester/:id/status { status, adminNotes, inviteSent }
//   DELETE /api/beta-tester/:id
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field } from '../core/fields.js';
import { statsLoader, busy } from '../core/ui.js';

const STATUSES = ['pending', 'approved', 'active', 'rejected'];
const STATUS_BADGE = { pending: 'warning', approved: 'info', active: 'success', rejected: 'neutral' };
const badge = (s) => html`<span class="badge badge--${STATUS_BADGE[s] || 'neutral'}">${titleCase(s || 'pending')}</span>`;
const device = (r) => {
  const parts = [r.deviceModel, r.androidVersion ? `Android ${r.androidVersion}` : ''].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
};
const readCell = (r) => (r.isRead
  ? html`<span class="nowrap muted"><span class="dot"></span>Read</span>`
  : html`<span class="nowrap"><span class="dot dot--online"></span><strong>Unread</strong></span>`);

const loadStats = statsLoader(async () => (await api('/beta-tester/stats')).data, (err) => toast.error(errorMessage(err, 'Could not load application counts.')));

const table = createTable({
  mount: el('#beta-table'),
  caption: 'Beta tester applications',
  limit: 20,
  emptyTitle: 'No applications match these filters',
  onClear: () => filters.clear(),
  columns: [
    { key: 'createdAt', label: 'Date', render: (r) => html`<span class="nowrap">${fmtDate(r.createdAt)}</span>` },
    { key: 'name', label: 'Name', render: (r) => r.name || '—' },
    { key: 'email', label: 'Email', render: (r) => (r.email ? html`<a class="truncate" href="mailto:${r.email}" title="${r.email}">${r.email}</a>` : '—') },
    { key: 'phone', label: 'Phone', render: (r) => html`<span class="nowrap">${r.phone || '—'}</span>` },
    { key: 'device', label: 'Device', render: device },
    { key: 'location', label: 'Location', render: (r) => r.location || '—' },
    { key: 'status', label: 'Status', render: (r) => html`${badge(r.status)}${r.inviteSent ? html` <span class="badge badge--info">Invite sent</span>` : ''}` },
    { key: 'isRead', label: 'Read', render: readCell },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (r) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${r._id}">View</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${r._id}">Delete</button>` },
  ],
  fetchPage: async (params) => {
    const resp = await api('/beta-tester/all', { query: { sortBy: 'createdAt', ...params } });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (action === 'view') view(id, row);
    else if (action === 'delete') remove(id, row);
  },
});

const filters = bindFilters(el('#beta-filters'), (values) => {
  table.setParams({ status: '', isRead: '', sortOrder: 'desc', ...values });
}, { defaults: { sortOrder: 'desc' } });

async function view(id, row) {
  if (!row) return;
  const r = { ...row };
  const m = openModal({
    title: `Application from ${r.name || 'applicant'}`,
    body: html`
      <dl class="key-value">
        <dt>Applied</dt><dd>${fmtDateTime(r.createdAt)}</dd>
        <dt>Name</dt><dd>${r.name || '—'}</dd>
        <dt>Email</dt><dd>${r.email ? html`<a href="mailto:${r.email}">${r.email}</a>` : '—'}</dd>
        <dt>Phone</dt><dd>${r.phone || '—'}</dd>
        <dt>Device</dt><dd>${device(r)}</dd>
        <dt>Location</dt><dd>${r.location || '—'}</dd>
        <dt>Why join</dt><dd class="pre-wrap">${r.whyJoin || '—'}</dd>
        ${r.inviteSentDate ? html`<dt>Invite sent</dt><dd>${fmtDateTime(r.inviteSentDate)}</dd>` : ''}
      </dl>
      <form class="mt-3" data-beta-form novalidate>
        ${field({ label: 'Status', name: 'status', type: 'select', value: r.status || 'pending', options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })) })}
        ${field({ label: 'Invite sent', name: 'inviteSent', type: 'checkbox', value: !!r.inviteSent, help: 'Tick once the Play testing invite has gone out. Ticking records today as the invite date.' })}
        ${field({ label: 'Admin notes', name: 'adminNotes', type: 'textarea', value: r.adminNotes || '', maxlength: 2000, rows: 4, help: 'Internal only.' })}
      </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Close</button><button type="button" class="btn btn--primary" data-save>Save</button>`,
  });
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const save = m.footer.querySelector('[data-save]');
  save.addEventListener('click', () => busy(save, async () => {
    const form = m.body.querySelector('[data-beta-form]');
    const body = { status: form.elements.status.value, adminNotes: form.elements.adminNotes.value.trim() };
    // Only send inviteSent when it changed: sending `true` again would reset the invite date.
    if (form.elements.inviteSent.checked !== !!r.inviteSent) body.inviteSent = form.elements.inviteSent.checked;
    try {
      await api(`/beta-tester/${id}/status`, { method: 'PATCH', body });
      toast.success('Application updated');
      m.close();
      table.reload();
      loadStats();
    } catch (err) { toast.error(errorMessage(err, 'Could not update the application.')); }
  }));

  if (!r.isRead) {
    try {
      await api(`/beta-tester/${id}/read`, { method: 'PATCH' });
      table.updateRow(id, { isRead: true });
      loadStats();
    } catch (e) { /* the read flag is a convenience; viewing still works */ }
  }
}

async function remove(id, row) {
  const ok = await confirm({
    title: 'Delete this application?',
    message: `The application from ${(row && row.name) || 'this applicant'} is removed permanently.`,
    confirmText: 'Delete application',
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/beta-tester/${id}`, { method: 'DELETE' });
    toast.success('Application deleted');
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the application.')); }
}

loadStats();
