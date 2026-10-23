// Biodata templates (biodata maker, Phase 4). Contract: docs/plans/02-biodata-maker-contract.md §2.
//   GET    /api/admin/biodata/stats
//          → data { documents:{ total, last30Days, users }, shares:{ active }, templates:{ active, total },
//                   pages:{ published, total } }   (flat keys documentsTotal, documentsLast30Days,
//                   usersWithDocuments, activeShares, templatesActive, templatesTotal, pagesPublished also read)
//   GET    /api/admin/biodata/templates
//          → data [{ templateId, isActive, isFeatured, order, usageCount, hasOverrides?,
//                    displayName, description, category, tags[], thumbnailUrl   (the stored overrides, null/empty = unset)
//                    registry: { name, description, category, tags[], thumbnail } (the design defaults) }],
//            categories [{ slug, name }]   (top level, or data.templates + data.categories)
//          Without a registry object, name/thumbnail are read as the design defaults.
//   PUT    /api/admin/biodata/templates/:templateId {displayName, description, category, tags, thumbnailUrl, isActive, isFeatured}
//   POST   /api/admin/biodata/templates/reorder {templateIds}   the full list in the new order
//   DELETE /api/admin/biodata/templates/:templateId/overrides  back to the registry defaults
// The design itself lives in the shared kit (code); only the listing metadata is editable.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, delegate } from '../core/dom.js';
import { fmtNumber, truncate, titleCase } from '../core/format.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid, bindCounters, listToText, textToList } from '../core/fields.js';
import { IMAGE_FALLBACK, bindImageFallbacks } from '../core/imageUrl.js';
import { busy, webUrl } from '../core/ui.js';

const mount = el('#biodata-templates-table');
const MAX_TAGS = 10;
const TAG_MAX = 30;
// Own-host image paths only (the API enforces the same).
const THUMB_PATH = /^\/images\/[A-Za-z0-9/_.-]+\.(webp|png|jpe?g)$/;

let templates = [];
let categories = [];

// ---- helpers ----------------------------------------------------------------------
const pick = (obj, ...paths) => {
  for (const p of paths) {
    const v = p.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
    if (v !== undefined && v !== null && typeof v !== 'object') return v;
  }
  return null;
};
const idOf = (t) => String(t.templateId || t.id || t.slug || '');
const reg = (t) => (t.registry && typeof t.registry === 'object' ? t.registry : {});
const registryName = (t) => reg(t).name || t.registryName || t.name || idOf(t);
const categoryOf = (t) => t.category || reg(t).category || '';
const tagsOf = (t) => (Array.isArray(t.tags) && t.tags.length ? t.tags : (Array.isArray(reg(t).tags) ? reg(t).tags : []));
const shownName = (t) => t.displayName || t.name || registryName(t);
const usageOf = (t) => pick(t, 'usageCount', 'usage', 'documents', 'documentCount');
const categoryName = (slug) => {
  const c = categories.find((x) => x.slug === slug);
  return c ? (c.name || titleCase(c.slug)) : (slug ? titleCase(slug) : '');
};
function thumbFor(t) {
  const own = typeof t.thumbnailUrl === 'string' && t.thumbnailUrl.startsWith('/') ? t.thumbnailUrl : '';
  const def = [reg(t).thumbnail, t.thumbnail].find((p) => typeof p === 'string' && p.startsWith('/')) || '';
  return webUrl(own || def || `/images/biodata/${encodeURIComponent(idOf(t))}.webp`);
}
const builderUrl = (t) => webUrl(`/biodata-maker/create?template=${encodeURIComponent(idOf(t))}`);

// ---- stats ------------------------------------------------------------------------
async function loadStats() {
  try {
    const { data } = await api('/admin/biodata/stats');
    const d = data || {};
    const set = (key, v) => {
      const n = el(`[data-stat="${key}"]`);
      if (n) n.textContent = fmtNumber(v, '0');
    };
    set('documents', pick(d, 'documents.total', 'documentsTotal', 'totalDocuments', 'documents'));
    set('last30Days', pick(d, 'documents.last30Days', 'documentsLast30Days', 'last30Days', 'created30d'));
    set('users', pick(d, 'documents.users', 'usersWithDocuments', 'users'));
    set('activeShares', pick(d, 'shares.active', 'activeShares'));
    set('pagesPublished', pick(d, 'pages.published', 'pagesPublished'));
    const active = pick(d, 'templates.active', 'templatesActive');
    const total = pick(d, 'templates.total', 'templatesTotal');
    const tile = el('[data-stat-text="templates"]');
    if (tile) tile.textContent = `${fmtNumber(active, '0')} / ${fmtNumber(total, '0')}`;
  } catch (err) {
    toast.error(errorMessage(err, 'Could not load the biodata numbers.'));
  }
}

// ---- table ------------------------------------------------------------------------
function nameCell(t) {
  const design = registryName(t);
  const shown = shownName(t);
  return html`<strong>${shown}</strong>
    ${design !== shown ? html`<span class="cell-sub">Design: ${design}</span>` : ''}
    <span class="cell-sub mono">${idOf(t)}</span>`;
}

function badges(t) {
  return html`${t.isActive !== false ? html`<span class="badge badge--success">Active</span>` : html`<span class="badge badge--neutral">Hidden</span>`}${t.isFeatured ? html`<span class="badge badge--info">Featured</span>` : ''}`;
}

function render() {
  mount.setAttribute('aria-busy', 'false');
  if (!templates.length) {
    setHtml(mount, html`<div class="empty">
      <div class="empty__title">No templates found</div>
      <div class="empty__hint">The template registry ships with the shared biodata kit. If this stays empty after a deploy, the API is running without the kit.</div>
      <button type="button" class="btn btn--secondary btn--sm" data-action="reload">Retry</button>
    </div>`);
    return;
  }
  const last = templates.length - 1;
  setHtml(mount, html`<div class="table-wrap"><table class="table">
    <caption class="sr-only">Biodata templates in gallery order</caption>
    <thead><tr>
      <th scope="col" class="num">#</th><th scope="col">Thumbnail</th><th scope="col">Name</th><th scope="col">Category</th>
      <th scope="col">Tags</th><th scope="col" class="num">Used by</th><th scope="col">Status</th><th scope="col">Order</th>
      <th scope="col" class="bt-actions">Actions</th>
    </tr></thead>
    <tbody>${templates.map((t, i) => {
    const id = idOf(t);
    const label = truncate(shownName(t), 40);
    const tags = tagsOf(t);
    return html`<tr data-id="${id}">
      <td class="num">${i + 1}</td>
      <td><img class="thumb thumb--portrait" src="${thumbFor(t)}" alt="" loading="lazy" data-fallback="${IMAGE_FALLBACK}"></td>
      <td class="bt-name">${nameCell(t)}</td>
      <td>${categoryName(categoryOf(t)) || html`<span class="muted">—</span>`}</td>
      <td class="bt-tags">${tags.length ? html`<span class="cluster">${tags.map((g) => html`<span class="tag">${g}</span>`)}</span>` : html`<span class="muted">—</span>`}</td>
      <td class="num">${fmtNumber(usageOf(t), '0')}</td>
      <td class="nowrap">${badges(t)}</td>
      <td class="nowrap">
        <button type="button" class="btn btn--ghost btn--sm" data-action="move" data-dir="-1" data-id="${id}" ${i === 0 ? 'disabled' : ''} aria-label="${`Move ${label} up`}">Up</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="move" data-dir="1" data-id="${id}" ${i === last ? 'disabled' : ''} aria-label="${`Move ${label} down`}">Down</button>
      </td>
      <td class="bt-actions"><div class="cluster cluster--end">
        <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${id}">Edit</button>
        <button type="button" class="btn btn--ghost btn--sm" data-action="reset" data-id="${id}" ${t.hasOverrides === false ? 'disabled' : ''}>Reset overrides</button>
        <a class="btn btn--ghost btn--sm" href="${builderUrl(t)}" target="_blank" rel="noopener noreferrer">Open in builder</a>
      </div></td>
    </tr>`;
  })}</tbody></table></div>`);
  bindImageFallbacks(mount, IMAGE_FALLBACK);
}

async function load() {
  mount.setAttribute('aria-busy', 'true');
  if (!templates.length) setHtml(mount, html`<div class="card__body"><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div></div>`);
  try {
    const resp = await api('/admin/biodata/templates');
    const data = resp.data;
    const rows = Array.isArray(data) ? data : (data && Array.isArray(data.templates) ? data.templates : []);
    const cats = Array.isArray(resp.categories) ? resp.categories : (data && Array.isArray(data.categories) ? data.categories : []);
    categories = cats.filter((c) => c && c.slug);
    templates = rows.slice().sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
    render();
  } catch (err) {
    mount.setAttribute('aria-busy', 'false');
    setHtml(mount, html`<div class="card__body"><div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load the templates.')}</span><button type="button" class="btn btn--secondary btn--sm alert__retry" data-action="reload">Retry</button></div></div>`);
  }
}

// ---- edit -------------------------------------------------------------------------
function editModal(t) {
  const id = idOf(t);
  const regCat = reg(t).category || '';
  const catOptions = [
    { value: '', label: regCat ? `Design default (${categoryName(regCat)})` : 'Design default' },
    ...categories.map((c) => ({ value: c.slug, label: c.name || titleCase(c.slug) })),
  ];
  // An override category the API no longer lists stays selectable so a save does not silently drop it.
  if (t.category && !categories.some((c) => c.slug === t.category) && t.category !== regCat) catOptions.push({ value: t.category, label: titleCase(t.category) });
  const m = openModal({
    title: `Edit ${shownName(t)}`,
    size: 'lg',
    body: html`<form data-tpl-form novalidate>
      <p class="form-help">Design: <strong>${registryName(t)}</strong> <span class="mono">(${id})</span>. Empty fields fall back to the design's own text.</p>
      ${field({ label: 'Display name', name: 'displayName', value: t.displayName || '', maxlength: 60, counter: true, placeholder: registryName(t) })}
      ${field({ label: 'Description', name: 'description', type: 'textarea', rows: 3, value: t.description || '', maxlength: 300, counter: true, placeholder: truncate(reg(t).description || '', 120), help: 'Plain text, shown on the gallery card and the template picker.' })}
      <div class="form-row">
        ${field({ label: 'Category', name: 'category', type: 'select', value: t.category && t.category !== regCat ? t.category : '', options: catOptions })}
        ${field({ label: 'Tags', name: 'tags', value: listToText(t.tags), help: `Comma separated, up to ${MAX_TAGS}.` })}
      </div>
      ${field({ label: 'Thumbnail path', name: 'thumbnailUrl', value: t.thumbnailUrl || '', placeholder: `/images/biodata/${id}.webp`, help: 'Optional. A path on the website starting with /images/ (WebP, PNG or JPG). Empty uses the generated thumbnail.' })}
      <div class="form-row">
        ${field({ label: 'Offer this template (gallery and builder)', name: 'isActive', type: 'switch', value: t.isActive !== false })}
        ${field({ label: 'Featured', name: 'isFeatured', type: 'switch', value: !!t.isFeatured })}
      </div>
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>Save changes</button>`,
  });
  const form = m.body.querySelector('[data-tpl-form]');
  bindCounters(form);
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const submit = () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const tags = textToList(f.tags.value).map((g) => g.toLowerCase());
    const body = {
      displayName: f.displayName.value.trim(),
      description: f.description.value.trim(),
      category: f.category.value,
      tags: [...new Set(tags)],
      thumbnailUrl: f.thumbnailUrl.value.trim(),
      isActive: f.isActive.checked,
      isFeatured: f.isFeatured.checked,
    };
    if (body.displayName.length > 60) { invalid(f.displayName, 'Keep the name to 60 characters.'); return; }
    if (body.description.length > 300) { invalid(f.description, 'Keep the description to 300 characters.'); return; }
    if (body.tags.length > MAX_TAGS) { invalid(f.tags, `Use at most ${MAX_TAGS} tags.`); return; }
    if (body.tags.some((g) => g.length > TAG_MAX)) { invalid(f.tags, `Keep each tag to ${TAG_MAX} characters.`); return; }
    if (body.thumbnailUrl && (!THUMB_PATH.test(body.thumbnailUrl) || body.thumbnailUrl.includes('..') || body.thumbnailUrl.includes('//'))) {
      invalid(f.thumbnailUrl, 'Use a website path such as /images/biodata/name.webp.');
      return;
    }
    if (t.isActive !== false && !body.isActive && Number(usageOf(t)) > 0) {
      const ok = await confirm({
        title: 'Hide this template?',
        message: `${fmtNumber(usageOf(t), '0')} saved biodata(s) use it. They keep working; it is only removed from the gallery and the picker.`,
        confirmText: 'Hide it',
      });
      if (!ok) return;
    }
    try {
      await api(`/admin/biodata/templates/${encodeURIComponent(id)}`, { method: 'PUT', body });
      toast.success('Template saved');
      m.close();
      load();
      loadStats();
    } catch (err) {
      const fieldName = err && err.data && err.data.field;
      if (fieldName && f[fieldName]) invalid(f[fieldName], errorMessage(err, 'Check this field.'));
      toast.error(errorMessage(err, 'Could not save the template.'));
    }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

async function resetOverrides(t) {
  const ok = await confirm({
    title: 'Reset this template?',
    message: `The name, description, category, tags, thumbnail, featured flag and visibility of "${shownName(t)}" go back to the design defaults. Its position in the list is kept.`,
    confirmText: 'Reset overrides',
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`/admin/biodata/templates/${encodeURIComponent(idOf(t))}/overrides`, { method: 'DELETE' });
    toast.success('Overrides removed');
    load();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not reset the template.')); }
}

async function move(t, dir, btn) {
  const i = templates.indexOf(t);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= templates.length) return;
  const next = templates.slice();
  [next[i], next[j]] = [next[j], next[i]];
  const templateIds = next.map(idOf);
  await busy(btn, async () => {
    try {
      await api('/admin/biodata/templates/reorder', { method: 'POST', body: { templateIds } });
      templates = next;
      templates.forEach((x, n) => { x.order = n; });
      render();
      const id = idOf(t);
      const again = mount.querySelector(`[data-action="move"][data-id="${CSS.escape(id)}"][data-dir="${dir}"]:not([disabled])`)
        || mount.querySelector(`[data-action="move"][data-id="${CSS.escape(id)}"]:not([disabled])`);
      if (again) again.focus();
    } catch (err) { toast.error(errorMessage(err, 'Could not change the order.')); }
  });
}

const find = (id) => templates.find((t) => idOf(t) === String(id));

delegate(document, 'click', '[data-action]', (ev, btn) => {
  const a = btn.dataset.action;
  if (a === 'reload') { load(); loadStats(); return; }
  const t = find(btn.dataset.id);
  if (!t) return;
  if (a === 'edit') editModal(t);
  else if (a === 'reset') resetOverrides(t);
  else if (a === 'move' && !btn.disabled) move(t, Number(btn.dataset.dir), btn);
});

loadStats();
load();
