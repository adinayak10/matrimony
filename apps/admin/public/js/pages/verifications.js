// Verification queue (feature expansion B2).
//   GET    /api/admin/verifications/stats                → data { pending, approved, rejected, total, byDocumentType? }
//   GET    /api/admin/verifications?status&page&limit&search&documentType
//          → data [{ _id, user:{ _id, full_name, email, profile, is_verified }, fullName, documentType, status, reason, createdAt|submittedAt, reviewedAt, reviewedBy, filesPurgedAt }]
//   GET    /api/admin/verifications/:id
//   GET    /api/admin/verifications/:id/files/selfie|document-0|document-1
//   POST   /api/admin/verifications/:id/approve | /reject {reason}
//   DELETE /api/admin/verifications/:id/files
// Approve/reject/purge live in core/verification-actions.js (shared with /users/:id).
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el } from '../core/dom.js';
import { fmtDate, fmtDateTime, titleCase } from '../core/format.js';
import { imageUrl, bindImageFallbacks } from '../core/imageUrl.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';
import { setStats } from '../core/ui.js';
import { verificationBadge, filesMarkup, approveVerification, rejectVerification, purgeVerificationFiles } from '../core/verification-actions.js';

const STATUSES = ['pending', 'approved', 'rejected', 'all'];
const docTypes = new Set();
const submitted = (v) => v.submittedAt || v.createdAt;
const member = (v) => {
  const u = v.user && typeof v.user === 'object' ? v.user : null;
  if (!u || !u._id) return html`<span class="muted">Deleted member</span>`;
  return html`<div class="table__cell-user"><img class="avatar avatar--sm" src="${imageUrl(u.profile)}" alt="" data-fallback width="32" height="32" loading="lazy"><span><a href="/users/${u._id}">${u.full_name || 'Member'}</a>${u.email ? html`<span class="cell-sub">${u.email}</span>` : ''}</span></div>`;
};

async function loadStats() {
  try {
    const { data } = await api('/admin/verifications/stats');
    const d = data || {};
    setStats({ pending: d.pending, approved: d.approved, rejected: d.rejected, total: d.total ?? (Number(d.pending || 0) + Number(d.approved || 0) + Number(d.rejected || 0)) });
    const byType = Array.isArray(d.byDocumentType) ? d.byDocumentType : [];
    byType.forEach((t) => { const name = t && (t._id || t.documentType || t.name); if (name) docTypes.add(String(name)); });
    fillDocTypes();
  } catch (err) { toast.error(errorMessage(err, 'Could not load verification counts.')); }
}

function fillDocTypes() {
  const select = el('#verification-filters-documentType');
  if (!select) return;
  const current = select.value || new URL(location.href).searchParams.get('documentType') || '';
  if (current) docTypes.add(current);
  setHtml(select, html`<option value="">Any document</option>${[...docTypes].sort().map((t) => html`<option value="${t}">${titleCase(t)}</option>`)}`);
  select.value = current;
}

const table = createTable({
  mount: el('#verifications-table'),
  caption: 'Verification requests',
  limit: 20,
  emptyTitle: 'No verification requests match these filters',
  emptyHint: 'Requests appear here when members submit a document and a selfie.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'submitted', label: 'Submitted', render: (v) => html`<span class="nowrap">${fmtDate(submitted(v))}</span>` },
    { key: 'user', label: 'Member', render: member },
    { key: 'fullName', label: 'Name on document', render: (v) => v.fullName || '—' },
    { key: 'documentType', label: 'Document', render: (v) => (v.documentType ? titleCase(v.documentType) : '—') },
    { key: 'status', label: 'Status', render: (v) => verificationBadge(v.status) },
    { key: 'reviewedAt', label: 'Reviewed', render: (v) => html`<span class="nowrap">${v.reviewedAt ? fmtDate(v.reviewedAt) : '—'}</span>` },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (v) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="view" data-id="${v._id}">Review</button>
      ${v.status === 'pending' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="approve" data-id="${v._id}">Approve</button>
        <button type="button" class="btn btn--danger btn--sm" data-action="reject" data-id="${v._id}">Reject</button>` : ''}` },
  ],
  fetchPage: async (params) => {
    const query = { ...params };
    if (query.status === 'all') delete query.status;
    const resp = await api('/admin/verifications', { query });
    const rows = resp.data || [];
    rows.forEach((v) => { if (v.documentType) docTypes.add(String(v.documentType)); });
    queueMicrotask(fillDocTypes);
    return { rows, pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (action === 'view') view(id);
    else if (action === 'approve' && row) act(approveVerification, row);
    else if (action === 'reject' && row) act(rejectVerification, row);
  },
});

const filters = bindFilters(el('#verification-filters'), (values) => {
  const status = STATUSES.includes(values.status) ? values.status : 'pending';
  table.setParams({ search: '', documentType: '', ...values, status });
}, { defaults: { status: 'pending' } });

async function act(fn, row, modal = null) {
  if (await fn(row)) {
    if (modal) modal.close();
    table.reload();
    loadStats();
  }
}

async function view(id) {
  const m = openModal({ title: 'Verification request', size: 'lg', body: html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--block"></div>` });
  try {
    const { data: v } = await api(`/admin/verifications/${id}`);
    const u = v.user && typeof v.user === 'object' ? v.user : {};
    m.setBody(html`
      <dl class="key-value">
        <dt>Member</dt><dd>${u._id ? html`<a href="/users/${u._id}">${u.full_name || 'Member'}</a>` : 'Deleted member'} ${u.email ? html`<span class="muted">(${u.email})</span>` : ''} ${u.is_verified ? html`<span class="badge badge--info">Verified</span>` : ''}</dd>
        <dt>Name on document</dt><dd>${v.fullName || '—'}</dd>
        <dt>Document type</dt><dd>${v.documentType ? titleCase(v.documentType) : '—'}</dd>
        <dt>Status</dt><dd>${verificationBadge(v.status)}</dd>
        <dt>Submitted</dt><dd>${fmtDateTime(submitted(v))}</dd>
        ${v.reviewedAt ? html`<dt>Reviewed</dt><dd>${fmtDateTime(v.reviewedAt)}${v.reviewedBy && (v.reviewedBy.full_name || v.reviewedBy.email) ? ` by ${v.reviewedBy.full_name || v.reviewedBy.email}` : ''}</dd>` : ''}
        ${v.reason ? html`<dt>Reason</dt><dd class="pre-wrap">${v.reason}</dd>` : ''}
      </dl>
      ${filesMarkup(v)}`);
    bindImageFallbacks(m.body);
    const pending = v.status === 'pending';
    const canPurge = !pending && !v.filesPurgedAt;
    m.setFooter(html`
      ${canPurge ? html`<button type="button" class="btn btn--ghost" data-do="purge">Delete files now</button>` : ''}
      <button type="button" class="btn btn--secondary" data-do="close">Close</button>
      ${pending ? html`<button type="button" class="btn btn--danger" data-do="reject">Reject</button><button type="button" class="btn btn--primary" data-do="approve">Approve</button>` : ''}`);
    m.footer.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => {
      const d = b.dataset.do;
      if (d === 'close') m.close();
      else if (d === 'approve') act(approveVerification, v, m);
      else if (d === 'reject') act(rejectVerification, v, m);
      else if (d === 'purge') act(purgeVerificationFiles, v, m);
    }));
  } catch (err) {
    m.setBody(html`<div class="alert alert--error" role="alert">${errorMessage(err, 'Could not load the request.')}</div>`);
  }
}

loadStats();
