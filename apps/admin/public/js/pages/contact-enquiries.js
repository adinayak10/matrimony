// Contact enquiries (C3.3). Endpoints verified in apps/api/routes/contactRoutes.js
// and controllers/ContactController.js:
//   GET    /api/contact/stats   → data { totalCount:[{count}], statusBreakdown:[{_id,count}], readStatus:[{_id:Boolean,count}] }
//   GET    /api/contact/all?page&limit&status&isRead=true|false&sortBy=createdAt&sortOrder=asc|desc
//          → { data:[…], pagination:{ total, page, limit, pages } }
//   GET    /api/contact/:id
//   PATCH  /api/contact/:id/read
//   PATCH  /api/contact/:id/status { status, adminNotes }
//   DELETE /api/contact/:id
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field } from '../core/fields.js';
import { statsLoader, busy } from '../core/ui.js';

const STATUSES = ['new', 'read', 'replied', 'resolved', 'spam'];
const STATUS_BADGE = { new: 'info', read: 'neutral', replied: 'warning', resolved: 'success', spam: 'danger' };
const badge = (s) => html`<span class="badge badge--${STATUS_BADGE[s] || 'neutral'}">${titleCase(s || 'new')}</span>`;
const readCell = (r) => (r.isRead
  ? html`<span class="nowrap muted"><span class="dot"></span>Read</span>`
  : html`<span class="nowrap"><span class="dot dot--online"></span><strong>Unread</strong></span>`);

const loadStats = statsLoader(async () => {
  const { data } = await api('/contact/stats');
  const stats = { total: 0, unread: 0 };
  for (const s of STATUSES) stats[s] = 0;
  stats.total = (data.totalCount && data.totalCount[0] && data.totalCount[0].count) || 0;
  for (const row of data.statusBreakdown || []) if (row._id in stats) stats[row._id] = row.count;
  for (const row of data.readStatus || []) if (row._id === false) stats.unread = row.count;
  return stats;
}, (err) => toast.error(errorMessage(err, 'Could not load enquiry counts.')));

const mount = el('#contact-table');
const table = createTable({
  mount,
  caption: 'Contact enquiries',
  limit: 20,
  emptyTitle: 'No enquiries match these filters',
  emptyHint: 'Messages sent from the website contact form appear here.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'createdAt', label: 'Date', render: (r) => html`<span class="nowrap">${fmtDate(r.createdAt)}</span>` },
    { key: 'name', label: 'Name', render: (r) => r.name || '—' },
    { key: 'email', label: 'Email', render: (r) => (r.email ? html`<a class="truncate" href="mailto:${r.email}" title="${r.email}">${r.email}</a>` : '—') },
    { key: 'phone', label: 'Phone', render: (r) => html`<span class="nowrap">${r.phone || '—'}</span>` },
    { key: 'message', label: 'Message', render: (r) => html`<span class="cell-wrap">${truncate(r.message || '—', 150)}</span>` },
    { key: 'status', label: 'Status', render: (r) => badge(r.status) },
    { key: 'isRead', label: 'Read', render: readCell },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (r) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${r._id}">View</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${r._id}">Delete</button>` },
  ],
  fetchPage: async (params) => {
    const resp = await api('/contact/all', { query: { sortBy: 'createdAt', ...params } });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (action === 'view') view(id);
    else if (action === 'delete') remove(id, row);
  },
});

const filters = bindFilters(el('#contact-filters'), (values) => {
  table.setParams({ status: '', isRead: '', sortOrder: 'desc', ...values });
}, { defaults: { sortOrder: 'desc' } });

async function view(id) {
  const m = openModal({ title: 'Enquiry', body: html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div>` });
  let c;
  try {
    ({ data: c } = await api(`/contact/${id}`));
  } catch (err) {
    m.setBody(html`<div class="alert alert--error alert--flush" role="alert">${errorMessage(err, 'Could not load the enquiry.')}</div>`);
    return;
  }
  m.setTitle(`Enquiry from ${c.name || 'visitor'}`);
  m.setBody(html`
    <dl class="key-value">
      <dt>Received</dt><dd>${fmtDateTime(c.createdAt)}</dd>
      <dt>Name</dt><dd>${c.name || '—'}</dd>
      <dt>Email</dt><dd>${c.email ? html`<a href="mailto:${c.email}">${c.email}</a>` : '—'}</dd>
      <dt>Phone</dt><dd>${c.phone ? html`<a href="tel:${c.phone}">${c.phone}</a>` : '—'}</dd>
      <dt>Source</dt><dd>${titleCase(c.source || 'website')}</dd>
      <dt>Message</dt><dd class="pre-wrap">${c.message || '—'}</dd>
    </dl>
    <form class="mt-3" data-status-form novalidate>
      ${field({ label: 'Status', name: 'status', type: 'select', value: c.status || 'new', options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })) })}
      ${field({ label: 'Admin notes', name: 'adminNotes', type: 'textarea', value: c.adminNotes || '', maxlength: 2000, rows: 4, help: 'Internal only. Never shown to the person who wrote in.' })}
    </form>`);
  m.setFooter(html`<button type="button" class="btn btn--secondary" data-cancel>Close</button><button type="button" class="btn btn--primary" data-save>Save</button>`);
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const save = m.footer.querySelector('[data-save]');
  save.addEventListener('click', () => busy(save, async () => {
    const form = m.body.querySelector('[data-status-form]');
    try {
      await api(`/contact/${id}/status`, { method: 'PATCH', body: { status: form.elements.status.value, adminNotes: form.elements.adminNotes.value.trim() } });
      toast.success('Enquiry updated');
      m.close();
      table.reload();
      loadStats();
    } catch (err) { toast.error(errorMessage(err, 'Could not update the enquiry.')); }
  }));

  if (!c.isRead) {
    try {
      await api(`/contact/${id}/read`, { method: 'PATCH' });
      table.updateRow(id, { isRead: true });
      loadStats();
    } catch (e) { /* the read flag is a convenience; viewing still works */ }
  }
}

async function remove(id, row) {
  const ok = await confirm({
    title: 'Delete this enquiry?',
    message: `The message from ${(row && row.name) || 'this visitor'} is removed permanently.`,
    confirmText: 'Delete enquiry',
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/contact/${id}`, { method: 'DELETE' });
    toast.success('Enquiry deleted');
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the enquiry.')); }
}

loadStats();
