// Announcements (feature expansion B5).
//   GET    /api/admin/announcements?status&type&search&page&limit
//          → data [{ _id, title, body, type, platform, linkUrl, expiresAt, status: draft|published|archived, publishedAt, pushResult, createdAt }]
//   POST   /api/admin/announcements {title, body, type, platform, linkUrl, expiresAt}
//   GET    /api/admin/announcements/:id
//   PUT    /api/admin/announcements/:id
//   DELETE /api/admin/announcements/:id
//   POST   /api/admin/announcements/:id/publish {sendPush}
//   POST   /api/admin/announcements/:id/archive
//   POST   /api/admin/push/preview {filters:{platform}} → { count }   (push audience before "Publish & push")
import { api, errorMessage } from '../core/api.js';
import { html, el, delegate } from '../core/dom.js';
import { fmtDate, fmtDateTime, fmtNumber, titleCase, truncate, toDateInput } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid, bindCounters } from '../core/fields.js';
import { busy } from '../core/ui.js';

const TYPES = ['announcement', 'update', 'maintenance', 'event'];
const PLATFORMS = [{ value: 'all', label: 'Android and iOS' }, { value: 'android', label: 'Android only' }, { value: 'ios', label: 'iOS only' }];
const BADGE = { draft: 'neutral', published: 'success', expired: 'warning', archived: 'neutral' };

/** draft | published | expired | archived — expired is derived from expiresAt. */
function displayStatus(a) {
  const s = a.status || 'draft';
  if (s === 'published' && a.expiresAt && new Date(a.expiresAt).getTime() < Date.now()) return 'expired';
  return s;
}
const badge = (a) => { const s = displayStatus(a); return html`<span class="badge badge--${BADGE[s] || 'neutral'}">${titleCase(s)}</span>`; };
const platformLabel = (p) => (PLATFORMS.find((x) => x.value === p) || PLATFORMS[0]).label;
const safeLink = (u) => (/^(https?:\/\/|\/)/i.test(String(u || '')) ? String(u) : '');

function pushSummary(a) {
  const r = a.pushResult;
  if (!r) return '—';
  if (r.ok === false) return html`<span class="text-danger" title="${r.error || ''}">Push failed</span>`;
  return 'Pushed';
}

const table = createTable({
  mount: el('#announcements-table'),
  caption: 'Announcements',
  limit: 20,
  emptyTitle: 'No announcements yet',
  emptyHint: 'Create one with New announcement. Nothing is shown to members until you publish it.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'title', label: 'Title', render: (a) => html`<strong>${truncate(a.title || '—', 80)}</strong><span class="cell-sub">${truncate(a.body || '', 90)}</span>` },
    { key: 'type', label: 'Type', render: (a) => titleCase(a.type || 'announcement') },
    { key: 'platform', label: 'Platform', render: (a) => platformLabel(a.platform) },
    { key: 'status', label: 'Status', render: badge },
    { key: 'publishedAt', label: 'Published', render: (a) => html`<span class="nowrap">${a.publishedAt ? fmtDate(a.publishedAt) : '—'}</span>` },
    { key: 'expiresAt', label: 'Expires', render: (a) => html`<span class="nowrap">${a.expiresAt ? fmtDate(a.expiresAt) : 'Never'}</span>` },
    { key: 'push', label: 'Push', render: pushSummary },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (a) => {
      const s = a.status || 'draft';
      return html`
        <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${a._id}">Edit</button>
        ${s === 'draft' ? html`<button type="button" class="btn btn--primary btn--sm" data-action="publish" data-id="${a._id}">Publish</button>` : ''}
        ${s === 'published' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="archive" data-id="${a._id}">Archive</button>` : ''}
        <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${a._id}">Delete</button>`;
    } },
  ],
  fetchPage: async (params) => {
    const resp = await api('/admin/announcements', { query: params });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (!row) return;
    if (action === 'edit') edit(row);
    else if (action === 'publish') publish(row);
    else if (action === 'archive') archive(row);
    else if (action === 'delete') remove(row);
  },
});

const filters = bindFilters(el('#announcement-filters'), (values) => {
  table.setParams({ search: '', status: '', type: '', ...values });
});

// ---- Create / edit ------------------------------------------------------------
function edit(a) {
  const isNew = !a;
  const src = a || { type: 'announcement', platform: 'all' };
  const m = openModal({
    title: isNew ? 'New announcement' : 'Edit announcement',
    size: 'lg',
    body: html`<form data-ann-form novalidate>
      ${field({ label: 'Title', name: 'title', value: src.title || '', required: true, maxlength: 120, counter: true })}
      ${field({ label: 'Message', name: 'body', type: 'textarea', rows: 5, value: src.body || '', required: true, maxlength: 1000, counter: true, help: 'Plain text. Also used as the push notification text (shortened to 180 characters).' })}
      <div class="form-row">
        ${field({ label: 'Type', name: 'type', type: 'select', value: src.type || 'announcement', options: TYPES.map((t) => ({ value: t, label: titleCase(t) })) })}
        ${field({ label: 'Platform', name: 'platform', type: 'select', value: src.platform || 'all', options: PLATFORMS })}
      </div>
      <div class="form-row">
        ${field({ label: 'Link (optional)', name: 'linkUrl', type: 'url', value: src.linkUrl || '', maxlength: 500, placeholder: 'https://www.banjaramatch.com/…', help: 'An https:// address or a site path such as /blogs/… Opened when the member taps the announcement.' })}
        ${field({ label: 'Expires on (optional)', name: 'expiresAt', type: 'date', value: toDateInput(src.expiresAt), help: 'Hidden from members after this day.' })}
      </div>
      ${!isNew && src.status === 'published' ? html`<p class="form-help">This announcement is live: changes show to members immediately. Editing never re-sends the push.</p>` : ''}
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>${isNew ? 'Save draft' : 'Save changes'}</button>`,
  });
  const form = m.body.querySelector('[data-ann-form]');
  bindCounters(form);
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const submit = () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const body = {
      title: f.title.value.trim(),
      body: f.body.value.trim(),
      type: f.type.value,
      platform: f.platform.value,
      linkUrl: f.linkUrl.value.trim(),
      expiresAt: f.expiresAt.value ? new Date(`${f.expiresAt.value}T23:59:59`).toISOString() : null,
    };
    if (!body.title) { invalid(f.title, 'A title is required.'); return; }
    if (!body.body) { invalid(f.body, 'A message is required.'); return; }
    if (body.linkUrl && !safeLink(body.linkUrl)) { invalid(f.linkUrl, 'Use an https:// address or a path starting with /.'); return; }
    if (body.expiresAt && new Date(body.expiresAt).getTime() < Date.now()) { invalid(f.expiresAt, 'The expiry date is in the past.'); return; }
    try {
      await api(isNew ? '/admin/announcements' : `/admin/announcements/${src._id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast.success(isNew ? 'Draft saved' : 'Announcement saved');
      m.close();
      table.reload();
    } catch (err) { toast.error(errorMessage(err, 'Could not save the announcement.')); }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

// ---- Publish (optionally with push) ---------------------------------------------
function publish(a) {
  const m = openModal({
    title: 'Publish announcement',
    body: html`<p><strong>${a.title}</strong></p>
      <p class="pre-wrap">${truncate(a.body || '', 400)}</p>
      <dl class="key-value">
        <dt>Platform</dt><dd>${platformLabel(a.platform)}</dd>
        <dt>Expires</dt><dd>${a.expiresAt ? fmtDateTime(a.expiresAt) : 'Never'}</dd>
      </dl>
      <div class="word-counter word-counter--static mt-3" role="status">
        <span class="word-counter__value" data-push-count>&hellip;</span>
        <span class="word-counter__hint" data-push-hint>Counting app users who can receive a push…</span>
      </div>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button>
      <button type="button" class="btn btn--secondary" data-publish>Publish without push</button>
      <button type="button" class="btn btn--danger" data-publish-push disabled>Publish &amp; push</button>`,
  });
  const countEl = m.body.querySelector('[data-push-count]');
  const hintEl = m.body.querySelector('[data-push-hint]');
  const pushBtn = m.footer.querySelector('[data-publish-push]');
  const plainBtn = m.footer.querySelector('[data-publish]');
  let count = null;
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());

  api('/admin/push/preview', { method: 'POST', body: { filters: { platform: a.platform || 'all' } } })
    .then((resp) => {
      count = Number((resp.data && resp.data.count) ?? resp.count) || 0;
      countEl.textContent = fmtNumber(count, '0');
      hintEl.textContent = count ? `app user${count === 1 ? '' : 's'} on ${platformLabel(a.platform).toLowerCase()} can receive the push.` : 'app users can receive a push. Publish without push instead.';
      pushBtn.disabled = !count;
      if (count) pushBtn.textContent = `Publish & push to ${fmtNumber(count)}`;
    })
    .catch((err) => {
      countEl.textContent = '–';
      hintEl.textContent = errorMessage(err, 'Could not count the push audience. You can still publish without push.');
    });

  const run = (sendPush, btn) => busy(btn, async () => {
    if (sendPush) {
      const ok = await confirm({
        title: `Send a push to ${fmtNumber(count)} app user${count === 1 ? '' : 's'}?`,
        message: `"${truncate(a.title, 80)}" is published and pushed immediately. A push cannot be recalled.`,
        detail: 'Type the number of recipients to confirm.',
        confirmText: 'Publish & push',
        danger: true,
        typed: String(count),
      });
      if (!ok) return;
    }
    try {
      const resp = await api(`/admin/announcements/${a._id}/publish`, { method: 'POST', body: { sendPush }, timeout: 60000 });
      const pr = resp.data && resp.data.pushResult;
      if (sendPush && pr && pr.ok === false) toast.warning(`Published, but the push failed: ${pr.error || 'unknown error'}`);
      else toast.success(sendPush ? 'Published and pushed' : 'Published');
      m.close();
      table.reload();
    } catch (err) { toast.error(errorMessage(err, 'Could not publish the announcement.')); }
  });
  plainBtn.addEventListener('click', () => run(false, plainBtn));
  pushBtn.addEventListener('click', () => run(true, pushBtn));
}

async function archive(a) {
  const ok = await confirm({ title: 'Archive this announcement?', message: `"${truncate(a.title, 80)}" is hidden from members. It stays here for the record.`, confirmText: 'Archive' });
  if (!ok) return;
  try {
    await api(`/admin/announcements/${a._id}/archive`, { method: 'POST', body: {} });
    toast.success('Announcement archived');
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not archive the announcement.')); }
}

async function remove(a) {
  const ok = await confirm({
    title: 'Delete this announcement?',
    message: `"${truncate(a.title, 80)}" is removed${a.status === 'published' ? ' from the app and the website' : ''}. This cannot be undone.`,
    confirmText: 'Delete',
    danger: true,
    typed: a.status === 'published' ? 'DELETE' : null,
  });
  if (!ok) return;
  try {
    await api(`/admin/announcements/${a._id}`, { method: 'DELETE' });
    toast.success('Announcement deleted');
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the announcement.')); }
}

delegate(document, 'click', '[data-action="create"]', () => edit(null));
