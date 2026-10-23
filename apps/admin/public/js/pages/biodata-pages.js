// Biodata pages list (biodata maker, Phase 4). Contract: docs/plans/02-biodata-maker-contract.md §2.
//   GET    /api/admin/biodata/pages?kind&published&page&limit
//          → data [{ _id, slug, kind, metaTitle, isPublished, publishedAt, contentWords, updatedAt }], pagination?
//   POST   /api/admin/biodata/pages/:id/publish { published }   (publish regenerates the sitemap)
//   DELETE /api/admin/biodata/pages/:id                          (the landing page cannot be deleted)
// Create/edit live on /biodata-pages/new and /biodata-pages/:id/edit (pages/biodata-page-form.js).
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtNumber, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { webUrl } from '../core/ui.js';

const LIMIT = 50;
const INDEX_MIN_WORDS = 300;
const KIND_BADGE = { landing: 'info', guide: 'success', category: 'warning' };
const KIND_LABEL = { landing: 'Landing', guide: 'Guide', category: 'Category' };

function liveUrl(p) {
  const slug = encodeURIComponent(p.slug || '');
  if (p.kind === 'landing') return webUrl('/biodata-maker');
  if (p.kind === 'category') return webUrl(`/biodata-maker/templates/${slug}`);
  return webUrl(`/${slug}`);
}

function wordsCell(p) {
  const n = Number(p.contentWords) || 0;
  const thin = p.kind !== 'landing' && n < INDEX_MIN_WORDS;
  return html`<span class="nowrap">${fmtNumber(n, '0')}</span>${thin ? html` <span class="badge badge--warning" title="Guides and category pages need 300 unique words to be indexed">&lt;300 words: not indexed</span>` : ''}`;
}

function actions(p) {
  const isLanding = p.kind === 'landing';
  return html`<div class="cluster cluster--end">
    <a class="btn btn--secondary btn--sm" href="/biodata-pages/${p._id}/edit">Edit</a>
    ${p.isPublished
    ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="unpublish" data-id="${p._id}">Unpublish</button>`
    : html`<button type="button" class="btn btn--secondary btn--sm" data-action="publish" data-id="${p._id}">Publish</button>`}
    <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${p._id}" ${isLanding ? html`disabled title="The landing page cannot be deleted"` : ''}>Delete</button>
    ${p.isPublished || isLanding ? html`<a class="btn btn--ghost btn--sm" href="${liveUrl(p)}" target="_blank" rel="noopener noreferrer">Open on website</a>` : ''}</div>`;
}

const table = createTable({
  mount: el('#biodata-pages-table'),
  caption: 'Biodata pages',
  limit: LIMIT,
  emptyTitle: 'No biodata pages match these filters',
  emptyHint: 'Create one with New page, or run the seed tool (apps/api/tools/seedBiodataPages.js) to load the starter pages.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'slug', label: 'Slug', render: (p) => html`<a class="mono" href="/biodata-pages/${p._id}/edit">${p.slug || '(no slug)'}</a>` },
    { key: 'kind', label: 'Kind', render: (p) => html`<span class="badge badge--${KIND_BADGE[p.kind] || 'neutral'}">${KIND_LABEL[p.kind] || p.kind || '—'}</span>` },
    { key: 'metaTitle', label: 'Meta title', render: (p) => (p.metaTitle ? html`<span class="cell-wrap" title="${p.metaTitle}">${truncate(p.metaTitle, 70)}</span>` : html`<span class="muted">Not set</span>`) },
    { key: 'contentWords', label: 'Unique words', render: wordsCell },
    { key: 'isPublished', label: 'Status', render: (p) => (p.isPublished ? html`<span class="badge badge--success">Published</span>` : html`<span class="badge badge--neutral">Draft</span>`) },
    { key: 'updatedAt', label: 'Updated', render: (p) => html`<span class="nowrap">${fmtDate(p.updatedAt)}</span>` },
    { key: 'actions', label: 'Actions', class: 'bt-actions', render: actions },
  ],
  fetchPage: async (params) => {
    const resp = await api('/admin/biodata/pages', { query: params });
    return { rows: Array.isArray(resp.data) ? resp.data : [], pagination: resp.pagination };
  },
  onAction: (action, id, row, ev, btn) => {
    if (!row || (btn && btn.disabled)) return;
    if (action === 'publish') setPublished(row, true);
    else if (action === 'unpublish') setPublished(row, false);
    else if (action === 'delete') remove(row);
  },
});

const filters = bindFilters(el('#biodata-page-filters'), (values) => {
  table.setParams({ kind: '', published: '', ...values });
});

async function setPublished(p, published) {
  const words = Number(p.contentWords) || 0;
  const copy = published
    ? {
      title: 'Publish this page?',
      message: `/${p.slug} goes live on the website${p.kind === 'landing' ? '' : ' and is added to the sitemap once it has 300 unique words'}.`,
      detail: p.kind !== 'landing' && words < INDEX_MIN_WORDS ? `It has ${words} unique words, so it is published with noindex until it reaches ${INDEX_MIN_WORDS}.` : '',
      confirmText: 'Publish',
    }
    : {
      title: 'Unpublish this page?',
      message: p.kind === 'landing'
        ? 'The landing page falls back to the built-in copy until this page is published again.'
        : `/${p.slug} is taken off the website and its URL returns 404 until it is published again.`,
      confirmText: 'Unpublish',
      danger: true,
    };
  if (!(await confirm(copy))) return;
  try {
    await api(`/admin/biodata/pages/${p._id}/publish`, { method: 'POST', body: { published } });
    toast.success(published ? 'Page published' : 'Page unpublished');
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not change the status.')); }
}

async function remove(p) {
  if (p.kind === 'landing') { toast.warning('The landing page cannot be deleted. Unpublish it instead.'); return; }
  const ok = await confirm({
    title: 'Delete this page?',
    message: `/${p.slug} and its content are deleted permanently.`,
    detail: p.isPublished ? 'This page is published: deleting it breaks a URL that search engines may have indexed. Unpublish it instead if you only want it hidden.' : '',
    confirmText: 'Delete page',
    danger: true,
    typed: p.isPublished ? p.slug : null,
  });
  if (!ok) return;
  try {
    await api(`/admin/biodata/pages/${p._id}`, { method: 'DELETE' });
    toast.success('Page deleted');
    table.reload();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the page.')); }
}
