// Community feedback (C3.3, integrator conflict #18: /api/admin/community-feedback).
// Verified in apps/api/routes/admin.js + controllers/CommunityFeedbackController.js:
//   GET   /api/admin/community-feedback/stats → data { total, childSafety, pending, reviewed, in_progress, completed, rejected }
//   GET   /api/admin/community-feedback?page&limit&status&category&priority&search
//         → { data:[…], pagination:{ total, page, pages, limit } }  (child_safety rows first)
//   GET   /api/admin/community-feedback/:id
//   PATCH /api/admin/community-feedback/:id { status, priority, adminNotes }
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { field } from '../core/fields.js';
import { statsLoader, busy } from '../core/ui.js';

const BASE = '/admin/community-feedback';
const STATUSES = ['pending', 'reviewed', 'in_progress', 'completed', 'rejected'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const CATEGORY_LABEL = {
  child_safety: 'Child safety', feature_request: 'Feature request', bug_report: 'Bug report', design_ux: 'Design / UX',
  cultural_concern: 'Cultural concern', general_feedback: 'General feedback', appreciation: 'Appreciation', other: 'Other',
};
const STATUS_BADGE = { pending: 'warning', reviewed: 'info', in_progress: 'info', completed: 'success', rejected: 'neutral' };
const PRIORITY_BADGE = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };

const statusBadge = (s) => html`<span class="badge badge--${STATUS_BADGE[s] || 'neutral'}">${titleCase(s || 'pending')}</span>`;
const priorityBadge = (p) => html`<span class="badge badge--${PRIORITY_BADGE[p] || 'neutral'}">${titleCase(p || 'medium')}</span>`;
const categoryCell = (c) => (c === 'child_safety'
  ? html`<span class="badge badge--danger">Child safety</span>`
  : html`<span class="badge badge--neutral">${CATEGORY_LABEL[c] || titleCase(c || 'other')}</span>`);

const loadStats = statsLoader(async () => (await api(`${BASE}/stats`)).data, (err) => toast.error(errorMessage(err, 'Could not load feedback counts.')));

const table = createTable({
  mount: el('#feedback-table'),
  caption: 'Community feedback',
  limit: 20,
  emptyTitle: 'No feedback matches these filters',
  onClear: () => filters.clear(),
  columns: [
    { key: 'createdAt', label: 'Date', render: (r) => html`<span class="nowrap">${fmtDate(r.createdAt)}</span>` },
    { key: 'name', label: 'From', render: (r) => html`${r.name || '—'}<span class="cell-sub truncate" title="${r.email || ''}">${r.email || ''}</span>` },
    { key: 'category', label: 'Category', render: (r) => categoryCell(r.category) },
    { key: 'subject', label: 'Subject', render: (r) => html`<span class="cell-wrap">${truncate(r.subject || '—', 110)}</span>` },
    { key: 'priority', label: 'Priority', render: (r) => priorityBadge(r.priority) },
    { key: 'status', label: 'Status', render: (r) => statusBadge(r.status) },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (r) => html`<button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${r._id}">View</button>` },
  ],
  fetchPage: async (params) => {
    const resp = await api(BASE, { query: params });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id) => { if (action === 'view') view(id); },
});

const filters = bindFilters(el('#feedback-filters'), (values) => {
  table.setParams({ search: '', status: '', category: '', priority: '', ...values });
});

async function view(id) {
  const m = openModal({ title: 'Feedback', size: 'lg', body: html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div>` });
  let f;
  try {
    ({ data: f } = await api(`${BASE}/${id}`));
  } catch (err) {
    m.setBody(html`<div class="alert alert--error alert--flush" role="alert">${errorMessage(err, 'Could not load this feedback.')}</div>`);
    return;
  }
  m.setTitle(f.subject || 'Feedback');
  m.setBody(html`
    ${f.category === 'child_safety' ? html`<div class="alert alert--error alert--flush" role="alert"><span><strong>Child-safety report.</strong> Handle this before anything else and keep the reporter's details confidential.</span></div>` : ''}
    <dl class="key-value">
      <dt>Received</dt><dd>${fmtDateTime(f.createdAt)}</dd>
      <dt>From</dt><dd>${f.name || '—'}</dd>
      <dt>Email</dt><dd>${f.email ? html`<a href="mailto:${f.email}">${f.email}</a>` : '—'}</dd>
      <dt>Phone</dt><dd>${f.phone || '—'}</dd>
      <dt>Category</dt><dd>${categoryCell(f.category)}</dd>
      <dt>Wants a reply</dt><dd>${f.followUp ? 'Yes' : 'No'}</dd>
      <dt>Message</dt><dd class="pre-wrap">${f.message || '—'}</dd>
      ${f.respondedAt ? html`<dt>Reviewed</dt><dd>${fmtDateTime(f.respondedAt)}</dd>` : ''}
      ${f.implementedAt ? html`<dt>Completed</dt><dd>${fmtDateTime(f.implementedAt)}</dd>` : ''}
    </dl>
    <form class="mt-3" data-feedback-form novalidate>
      <div class="form-row">
        ${field({ label: 'Status', name: 'status', type: 'select', value: f.status || 'pending', options: STATUSES.map((s) => ({ value: s, label: titleCase(s) })) })}
        ${field({ label: 'Priority', name: 'priority', type: 'select', value: f.priority || 'medium', options: PRIORITIES.map((p) => ({ value: p, label: titleCase(p) })) })}
      </div>
      ${field({ label: 'Admin notes', name: 'adminNotes', type: 'textarea', value: f.adminNotes || '', maxlength: 5000, rows: 4, help: 'Internal only. Never published.' })}
      ${f.category === 'child_safety' ? '' : html`<p class="form-help">Setting the status to Completed lists the name, category and subject on the public contributors list.</p>`}
    </form>`);
  m.setFooter(html`<button type="button" class="btn btn--secondary" data-cancel>Close</button><button type="button" class="btn btn--primary" data-save>Save</button>`);
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const save = m.footer.querySelector('[data-save]');
  save.addEventListener('click', () => busy(save, async () => {
    const form = m.body.querySelector('[data-feedback-form]');
    try {
      await api(`${BASE}/${id}`, {
        method: 'PATCH',
        body: { status: form.elements.status.value, priority: form.elements.priority.value, adminNotes: form.elements.adminNotes.value.trim() },
      });
      toast.success('Feedback updated');
      m.close();
      table.reload();
      loadStats();
    } catch (err) { toast.error(errorMessage(err, 'Could not update the feedback.')); }
  }));
}

loadStats();
