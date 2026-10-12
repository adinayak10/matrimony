// Banners (C3.4). Verified in apps/api/controllers/admin/bannerController.js + models/Banner.js:
//   GET    /api/admin/banners                       → data [{ _id, title, imageUrl, link, isActive, order, type, createdAt }] (order asc)
//   POST   /api/admin/banners                       { title, imageUrl, link, type, order, isActive }
//   PUT    /api/admin/banners/:id                   same fields (allowlisted)
//   POST   /api/admin/banners/:id/toggle-status     flips isActive
//   DELETE /api/admin/banners/:id
// The list is not paginated by the API; the table shows it as one page.
import { api, errorMessage } from '../core/api.js';
import { html, el, delegate } from '../core/dom.js';
import { createTable } from '../core/table.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid } from '../core/fields.js';
import { imageUrl, IMAGE_FALLBACK } from '../core/imageUrl.js';
import { busy } from '../core/ui.js';

const mount = el('#banners-table');
const isHttpUrl = (v) => /^https?:\/\/[^\s]+$/i.test(v);

const table = createTable({
  mount,
  caption: 'App banners',
  limit: 200,
  emptyTitle: 'No banners yet',
  emptyHint: 'Add the first banner to show it in the app.',
  columns: [
    { key: 'imageUrl', label: 'Preview', width: '120px', render: (b) => html`<img class="thumb" src="${imageUrl(b.imageUrl, IMAGE_FALLBACK)}" alt="" data-fallback="${IMAGE_FALLBACK}" loading="lazy" width="96" height="54">` },
    { key: 'title', label: 'Title', render: (b) => b.title || html`<span class="muted">Untitled</span>` },
    { key: 'link', label: 'Link', render: (b) => (b.link && isHttpUrl(b.link)
      ? html`<a class="truncate" href="${b.link}" target="_blank" rel="noopener noreferrer" title="${b.link}">${b.link}</a>`
      : html`<span class="truncate" title="${b.link || ''}">${b.link || '—'}</span>`) },
    { key: 'type', label: 'Type', render: (b) => html`<span class="badge badge--neutral">${b.type || 'general'}</span>` },
    { key: 'isActive', label: 'Active', render: (b) => html`<label class="switch"><input type="checkbox" role="switch" data-action="toggle" data-id="${b._id}" ${b.isActive !== false ? 'checked' : ''} aria-label="${`Banner ${b.title || 'untitled'} is active`}"><span class="switch__track" aria-hidden="true"></span><span>${b.isActive !== false ? 'Active' : 'Hidden'}</span></label>` },
    { key: 'order', label: 'Order', class: 'num', render: (b) => String(b.order ?? 0) },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (b) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${b._id}">Edit</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${b._id}">Delete</button>` },
  ],
  fetchPage: async () => {
    const resp = await api('/admin/banners');
    const rows = resp.data || [];
    return { rows, pagination: { page: 1, pages: 1, total: rows.length, limit: rows.length || 1 } };
  },
  onAction: (action, id, row, ev, elm) => {
    if (action === 'edit') edit(row);
    else if (action === 'delete') remove(id, row);
    else if (action === 'toggle') toggle(id, elm);
  },
});

async function toggle(id, input) {
  input.disabled = true;
  try {
    const resp = await api(`/admin/banners/${id}/toggle-status`, { method: 'POST' });
    toast.success(resp.data && resp.data.isActive ? 'Banner is active' : 'Banner is hidden');
    await table.reload();
  } catch (err) {
    input.checked = !input.checked;
    input.disabled = false;
    toast.error(errorMessage(err, 'Could not change the banner.'));
  }
}

function edit(banner) {
  const b = banner || {};
  const isNew = !b._id;
  const m = openModal({
    title: isNew ? 'Add banner' : 'Edit banner',
    body: html`<form data-banner-form novalidate>
      ${field({ label: 'Title', name: 'title', value: b.title || '', maxlength: 200, required: true })}
      ${field({ label: 'Image URL', name: 'imageUrl', type: 'url', value: b.imageUrl || '', maxlength: 500, required: true, placeholder: 'https://…', help: 'A full https:// address, or a path the API serves (uploads/…). Images on other hosts are not previewed here.' })}
      ${field({ label: 'Link', name: 'link', value: b.link || '', maxlength: 500, placeholder: 'https://… (optional)', help: 'Where the banner goes when tapped.' })}
      <div class="form-row">
        ${field({ label: 'Type', name: 'type', value: b.type || 'general', maxlength: 40, help: 'Free text the app groups banners by. Default: general.' })}
        ${field({ label: 'Order', name: 'order', type: 'number', value: b.order ?? 0, min: 0, step: 1, help: 'Lower numbers show first.' })}
      </div>
      ${field({ label: 'Active (sent to the app)', name: 'isActive', type: 'switch', value: b.isActive !== false })}
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>${isNew ? 'Add banner' : 'Save changes'}</button>`,
  });
  const form = m.body.querySelector('[data-banner-form]');
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const submit = () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const body = {
      title: f.title.value.trim(),
      imageUrl: f.imageUrl.value.trim(),
      link: f.link.value.trim(),
      type: f.type.value.trim() || 'general',
      order: Math.max(0, parseInt(f.order.value, 10) || 0),
      isActive: f.isActive.checked,
    };
    if (!body.title) { invalid(f.title, 'A title is required.'); return; }
    if (!body.imageUrl) { invalid(f.imageUrl, 'An image URL is required.'); return; }
    if (/^[a-z][a-z0-9+.-]*:/i.test(body.imageUrl) && !/^https:\/\//i.test(body.imageUrl)) { invalid(f.imageUrl, 'Use an https:// address.'); return; }
    if (body.link && /^(javascript|data|vbscript):/i.test(body.link)) { invalid(f.link, 'That link type is not allowed.'); return; }
    try {
      await api(isNew ? '/admin/banners' : `/admin/banners/${b._id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast.success(isNew ? 'Banner added' : 'Banner saved');
      m.close();
      table.reload();
    } catch (err) { toast.error(errorMessage(err, 'Could not save the banner.')); }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

async function remove(id, row) {
  const ok = await confirm({
    title: 'Delete this banner?',
    message: `"${(row && row.title) || 'This banner'}" is removed from the app on its next refresh.`,
    confirmText: 'Delete banner',
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/admin/banners/${id}`, { method: 'DELETE' });
    toast.success('Banner deleted');
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the banner.')); }
}

delegate(document, 'click', '[data-action="create"]', () => edit(null));

table.reload();
