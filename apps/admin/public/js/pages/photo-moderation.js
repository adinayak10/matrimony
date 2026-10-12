// Photo moderation (C3.2). Default filter is `pending` (integrator conflict:
// UserPhoto default becomes 'pending' in Phase 3).
//   GET  /api/admin/photos?status=pending|approved|rejected|all&page&limit=40
//        → data [{ _id, imageUrl, uploadedAt, isProfile, moderationStatus, rejectionReason, userId:{ full_name, email, is_block } }]
//   POST /api/admin/photos/:id/approve
//   POST /api/admin/photos/:id/reject {reason}
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, delegate } from '../core/dom.js';
import { fmtDate, titleCase } from '../core/format.js';
import { imageUrl, bindImageFallbacks, IMAGE_FALLBACK } from '../core/imageUrl.js';
import { renderPagination } from '../core/pagination.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { toast } from '../core/toast.js';

const LIMIT = 40;
const BADGE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const grid = el('#photo-grid');
const pager = el('#photo-pagination');
const summary = el('[data-photo-summary]');

let params = { status: 'pending', page: 1 };
let photos = [];
let seq = 0;

function card(p) {
  const u = p.userId && typeof p.userId === 'object' ? p.userId : null;
  return html`<div class="photo-card" data-photo="${p._id}">
    <img class="photo-card__img" src="${imageUrl(p.imageUrl, IMAGE_FALLBACK)}" alt="" data-fallback="${IMAGE_FALLBACK}" loading="lazy">
    <div class="photo-card__body">
      <span>${u && u._id ? html`<a href="/users/${u._id}">${u.full_name || 'Member'}</a>` : html`<span class="muted">Deleted member</span>`}${u && u.is_block ? html` <span class="badge badge--danger">Blocked</span>` : ''}</span>
      <span><span class="badge badge--${BADGE[p.moderationStatus] || 'neutral'}">${titleCase(p.moderationStatus || 'approved')}</span>${p.isProfile ? html` <span class="badge badge--info">Profile</span>` : ''}</span>
      <span class="muted">Uploaded ${fmtDate(p.uploadedAt)}</span>
      ${p.rejectionReason ? html`<span class="muted" title="${p.rejectionReason}">Reason: ${p.rejectionReason}</span>` : ''}
    </div>
    <div class="photo-card__actions">
      <button type="button" class="btn btn--secondary btn--sm" data-action="approve" data-id="${p._id}" ${p.moderationStatus === 'approved' ? 'disabled' : ''}>Approve</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="reject" data-id="${p._id}" ${p.moderationStatus === 'rejected' ? 'disabled' : ''}>Reject</button>
    </div>
  </div>`;
}

async function load() {
  const mine = ++seq;
  grid.setAttribute('aria-busy', 'true');
  if (!photos.length) setHtml(grid, html`${Array.from({ length: 8 }, () => html`<div class="photo-card"><div class="skeleton" style="aspect-ratio:1"></div><div class="photo-card__body"><div class="skeleton skeleton--text"></div><div class="skeleton skeleton--text" style="width:60%"></div></div></div>`)}`);
  try {
    const resp = await api('/admin/photos', { query: { status: params.status, page: params.page, limit: LIMIT } });
    if (mine !== seq) return;
    photos = resp.data || [];
    const pg = resp.pagination || {};
    grid.setAttribute('aria-busy', 'false');
    if (!photos.length) {
      setHtml(grid, html`<div class="empty" style="grid-column:1/-1"><div class="empty__title">${params.status === 'pending' ? 'No photos waiting for review' : 'No photos'}</div><div class="empty__hint">${params.status === 'pending' ? 'New uploads land here once the pending default ships. Switch the filter to review approved photos.' : ''}</div></div>`);
    } else {
      setHtml(grid, html`${photos.map(card)}`);
      bindImageFallbacks(grid);
    }
    if (summary) summary.textContent = pg.total != null ? `${Number(pg.total).toLocaleString()} photo${pg.total === 1 ? '' : 's'} · ${titleCase(params.status === 'all' ? 'all statuses' : params.status)}` : '';
    renderPagination(pager, { page: pg.page || params.page, pages: pg.pages || 1, total: pg.total, limit: LIMIT }, (n) => { params.page = n; load(); });
  } catch (err) {
    if (mine !== seq) return;
    grid.setAttribute('aria-busy', 'false');
    setHtml(grid, html`<div class="alert alert--error" role="alert" style="grid-column:1/-1"><span>${errorMessage(err, 'Failed to load photos.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry>Retry</button></div>`);
    setHtml(pager, '');
  }
}

function askReason() {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal({
      title: 'Reject photo',
      size: 'sm',
      body: html`<p>The photo is hidden from the member's gallery. If it is their profile picture it is cleared too.</p>
        <div class="form-group"><label class="form-label" for="reject-reason">Reason (optional, shown to the member)</label><textarea class="form-control" id="reject-reason" maxlength="300"></textarea></div>`,
      footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--danger" data-ok>Reject photo</button>`,
      onClose: () => finish(null),
    });
    m.footer.querySelector('[data-cancel]').addEventListener('click', () => { finish(null); m.close(); });
    m.footer.querySelector('[data-ok]').addEventListener('click', () => { finish(m.body.querySelector('#reject-reason').value.trim()); m.close(); });
  });
}

async function moderate(action, id) {
  const node = grid.querySelector(`[data-photo="${id}"]`);
  let reason = '';
  if (action === 'reject') {
    const r = await askReason();
    if (r === null) return; // Cancel never rejects
    reason = r;
  }
  if (node) node.classList.add('is-busy');
  try {
    await api(`/admin/photos/${id}/${action}`, { method: 'POST', body: action === 'reject' ? { reason } : {} });
    toast.success(action === 'approve' ? 'Photo approved' : 'Photo rejected and hidden');
    load();
  } catch (err) {
    if (node) node.classList.remove('is-busy');
    toast.error(errorMessage(err, 'Could not update the photo.'));
  }
}

delegate(grid, 'click', '[data-action]', (ev, btn) => moderate(btn.dataset.action, btn.dataset.id));
delegate(grid, 'click', '[data-retry]', () => load());

bindFilters(el('#photo-filters'), (values) => {
  const status = ['all', 'pending', 'approved', 'rejected'].includes(values.status) ? values.status : 'pending';
  params = { status, page: 1 };
  photos = [];
  load();
}, { defaults: { status: 'pending' } });
