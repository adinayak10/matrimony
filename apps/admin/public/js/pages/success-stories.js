// Success stories moderation (feature expansion B4).
//   GET    /api/admin/success-stories?status&featured&search&page&limit
//          → data [{ _id, groomName, brideName, story, photo, weddingDate, city, isFeatured, publishedAt, status, reason, submittedBy, createdAt }]
//   GET    /api/admin/success-stories/:id
//   PUT    /api/admin/success-stories/:id {groomName, brideName, story, weddingDate, city}
//   PATCH  /api/admin/success-stories/:id/status {status, reason?}   status: pending|approved|published|rejected
//   PATCH  /api/admin/success-stories/:id/featured {isFeatured}
//   DELETE /api/admin/success-stories/:id
// No content is ever written here: stories ship with an empty state until couples submit.
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase, truncate, toDateInput } from '../core/format.js';
import { imageUrl, bindImageFallbacks, IMAGE_FALLBACK } from '../core/imageUrl.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid, bindCounters } from '../core/fields.js';
import { busy } from '../core/ui.js';
import { askReason } from '../core/verification-actions.js';

const STATUSES = ['pending', 'approved', 'published', 'rejected', 'all'];
const BADGE = { pending: 'warning', approved: 'info', published: 'success', rejected: 'danger' };
const badge = (s) => html`<span class="badge badge--${BADGE[s] || 'neutral'}">${titleCase(s || 'pending')}</span>`;
const couple = (s) => `${s.groomName || '—'} & ${s.brideName || '—'}`;
const submitter = (s) => {
  const u = s.submittedBy && typeof s.submittedBy === 'object' ? s.submittedBy : null;
  return u && u._id ? html`<a href="/users/${u._id}">${u.full_name || 'Member'}</a>` : html`<span class="muted">—</span>`;
};

function actions(s) {
  const st = s.status || 'pending';
  return html`
    <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${s._id}">View</button>
    ${st === 'pending' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="approve" data-id="${s._id}">Approve</button>` : ''}
    ${st === 'pending' || st === 'approved' ? html`<button type="button" class="btn btn--primary btn--sm" data-action="publish" data-id="${s._id}">Publish</button>` : ''}
    ${st === 'published' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="feature" data-id="${s._id}">${s.isFeatured ? 'Unfeature' : 'Feature'}</button>` : ''}
    ${st !== 'rejected' ? html`<button type="button" class="btn btn--ghost btn--sm" data-action="reject" data-id="${s._id}">Reject</button>` : ''}
    <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${s._id}">Delete</button>`;
}

const table = createTable({
  mount: el('#stories-table'),
  caption: 'Success stories',
  limit: 20,
  emptyTitle: 'No success stories match these filters',
  emptyHint: 'Stories appear here when couples share them from the app or the website.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'photo', label: '', width: '64px', render: (s) => html`<img class="thumb" src="${imageUrl(s.photo, IMAGE_FALLBACK)}" alt="" data-fallback="${IMAGE_FALLBACK}" width="48" height="48" loading="lazy">` },
    { key: 'couple', label: 'Couple', render: (s) => html`<strong>${couple(s)}</strong>${s.city ? html`<span class="cell-sub">${s.city}</span>` : ''}` },
    { key: 'story', label: 'Story', render: (s) => html`<span class="cell-wrap" title="${truncate(s.story || '', 300)}">${truncate(s.story || '—', 110)}</span>` },
    { key: 'submittedBy', label: 'Submitted by', render: submitter },
    { key: 'createdAt', label: 'Received', render: (s) => html`<span class="nowrap">${fmtDate(s.createdAt)}</span>` },
    { key: 'status', label: 'Status', render: (s) => html`${badge(s.status)}${s.isFeatured ? html` <span class="badge badge--info">Featured</span>` : ''}` },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: actions },
  ],
  fetchPage: async (params) => {
    const query = { ...params };
    if (query.status === 'all') delete query.status;
    const resp = await api('/admin/success-stories', { query });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (!row && action !== 'view') return;
    if (action === 'view') view(id);
    else if (action === 'approve') setStatus(row, 'approved');
    else if (action === 'publish') setStatus(row, 'published');
    else if (action === 'reject') setStatus(row, 'rejected');
    else if (action === 'feature') toggleFeatured(row);
    else if (action === 'delete') remove(row);
  },
});

const filters = bindFilters(el('#story-filters'), (values) => {
  const status = STATUSES.includes(values.status) ? values.status : 'pending';
  table.setParams({ search: '', featured: '', ...values, status });
}, { defaults: { status: 'pending' } });

async function setStatus(s, status, modal = null) {
  let reason;
  if (status === 'rejected') {
    reason = await askReason({ title: 'Reject story', message: `The story by ${couple(s)} is not published. The member sees the reason.`, label: 'Reason (shown to the member)', confirmText: 'Reject story' });
    if (reason === null) return;
  } else if (status === 'published') {
    const ok = await confirm({
      title: 'Publish this story?',
      message: `${couple(s)} appears on the public success stories page and the member who shared it is notified.`,
      detail: 'Check the photo and text are what the couple sent and that both agreed to share it.',
      confirmText: 'Publish',
    });
    if (!ok) return;
  }
  try {
    await api(`/admin/success-stories/${s._id}/status`, { method: 'PATCH', body: reason !== undefined ? { status, reason } : { status } });
    toast.success(status === 'published' ? 'Story published' : status === 'approved' ? 'Story approved (not public yet)' : 'Story rejected');
    if (modal) modal.close();
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not update the story.')); }
}

async function toggleFeatured(s, modal = null) {
  const isFeatured = !s.isFeatured;
  try {
    await api(`/admin/success-stories/${s._id}/featured`, { method: 'PATCH', body: { isFeatured } });
    toast.success(isFeatured ? 'Story featured' : 'Story no longer featured');
    if (modal) modal.close();
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not change the featured flag.')); }
}

async function remove(s, modal = null) {
  const ok = await confirm({
    title: 'Delete this story permanently?',
    message: `The story of ${couple(s)} and its photo are removed${s.status === 'published' ? ' from the website' : ''}. This cannot be undone.`,
    confirmText: 'Delete story',
    danger: true,
    typed: 'DELETE',
  });
  if (!ok) return;
  try {
    await api(`/admin/success-stories/${s._id}`, { method: 'DELETE' });
    toast.success('Story deleted');
    if (modal) modal.close();
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the story.')); }
}

function edit(s, parent) {
  const m = openModal({
    title: 'Correct story details',
    size: 'lg',
    body: html`<form data-story-form novalidate>
      <p class="form-help">For typos and formatting only. Do not rewrite the couple's words.</p>
      <div class="form-row">
        ${field({ label: 'Groom name', name: 'groomName', value: s.groomName || '', required: true, maxlength: 80 })}
        ${field({ label: 'Bride name', name: 'brideName', value: s.brideName || '', required: true, maxlength: 80 })}
      </div>
      <div class="form-row">
        ${field({ label: 'Wedding date', name: 'weddingDate', type: 'date', value: toDateInput(s.weddingDate) })}
        ${field({ label: 'City', name: 'city', value: s.city || '', maxlength: 80 })}
      </div>
      ${field({ label: 'Story', name: 'story', type: 'textarea', rows: 8, value: s.story || '', required: true, maxlength: 3000, counter: true })}
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>Save changes</button>`,
  });
  const form = m.body.querySelector('[data-story-form]');
  bindCounters(form);
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  save.addEventListener('click', () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const body = { groomName: f.groomName.value.trim(), brideName: f.brideName.value.trim(), story: f.story.value.trim(), weddingDate: f.weddingDate.value || null, city: f.city.value.trim() };
    if (!body.groomName) { invalid(f.groomName, 'Enter the groom\'s name.'); return; }
    if (!body.brideName) { invalid(f.brideName, 'Enter the bride\'s name.'); return; }
    if (!body.story) { invalid(f.story, 'The story cannot be empty.'); return; }
    try {
      await api(`/admin/success-stories/${s._id}`, { method: 'PUT', body });
      toast.success('Story updated');
      m.close();
      if (parent) parent.close();
      table.reload();
    } catch (err) { toast.error(errorMessage(err, 'Could not save the story.')); }
  }));
}

async function view(id) {
  const m = openModal({ title: 'Success story', size: 'lg', body: html`<div class="skeleton skeleton--block"></div><div class="skeleton skeleton--row"></div>` });
  try {
    const { data: s } = await api(`/admin/success-stories/${id}`);
    m.setTitle(couple(s));
    m.setBody(html`
      ${s.photo ? html`<img class="story-photo" src="${imageUrl(s.photo, IMAGE_FALLBACK)}" alt="${`Photo of ${couple(s)}`}" data-fallback="${IMAGE_FALLBACK}">` : html`<p class="form-help">No photo was uploaded.</p>`}
      <dl class="key-value">
        <dt>Groom</dt><dd>${s.groomName || '—'}</dd>
        <dt>Bride</dt><dd>${s.brideName || '—'}</dd>
        <dt>Wedding date</dt><dd>${fmtDate(s.weddingDate)}</dd>
        <dt>City</dt><dd>${s.city || '—'}</dd>
        <dt>Submitted by</dt><dd>${submitter(s)}</dd>
        <dt>Status</dt><dd>${badge(s.status)}${s.isFeatured ? html` <span class="badge badge--info">Featured</span>` : ''}</dd>
        <dt>Received</dt><dd>${fmtDateTime(s.createdAt)}</dd>
        ${s.publishedAt ? html`<dt>Published</dt><dd>${fmtDateTime(s.publishedAt)}</dd>` : ''}
        ${s.reason ? html`<dt>Reason</dt><dd class="pre-wrap">${s.reason}</dd>` : ''}
      </dl>
      <h3 class="info-section__title mt-3">Story</h3>
      <p class="pre-wrap">${s.story || '—'}</p>`);
    bindImageFallbacks(m.body);
    const st = s.status || 'pending';
    m.setFooter(html`
      <button type="button" class="btn btn--danger" data-do="delete">Delete</button>
      <button type="button" class="btn btn--secondary" data-do="edit">Correct details</button>
      ${st !== 'rejected' ? html`<button type="button" class="btn btn--ghost" data-do="reject">Reject</button>` : ''}
      ${st === 'pending' ? html`<button type="button" class="btn btn--secondary" data-do="approve">Approve</button>` : ''}
      ${st === 'published' ? html`<button type="button" class="btn btn--secondary" data-do="feature">${s.isFeatured ? 'Unfeature' : 'Feature'}</button>` : html`<button type="button" class="btn btn--primary" data-do="publish">Publish</button>`}`);
    m.footer.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => {
      const d = b.dataset.do;
      if (d === 'delete') remove(s, m);
      else if (d === 'edit') edit(s, m);
      else if (d === 'reject') setStatus(s, 'rejected', m);
      else if (d === 'approve') setStatus(s, 'approved', m);
      else if (d === 'publish') setStatus(s, 'published', m);
      else if (d === 'feature') toggleFeatured(s, m);
    }));
  } catch (err) {
    m.setBody(html`<div class="alert alert--error" role="alert">${errorMessage(err, 'Could not load the story.')}</div>`);
  }
}
