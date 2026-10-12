// Blog list (C3.4). Verified in apps/api/routes/adminRoutes.js + controllers/admin/blogController.js:
//   GET    /api/admin/blogs/stats → data { totalBlogs, publishedBlogs, draftBlogs, archivedBlogs, featuredBlogs, totalViews, … }
//   GET    /api/admin/blogs?page&limit&status&category&search&sortBy&sortOrder
//          → { data:[…without content], pagination:{ currentPage, totalPages, totalBlogs, hasMore } }
//          sortBy ∈ createdAt|updatedAt|publishedAt|views|likes|title|status
//   PATCH  /api/admin/blogs/:id/featured            (toggles)
//   PATCH  /api/admin/blogs/:id/status { status }   draft|published|archived
//   DELETE /api/admin/blogs/:id
// Create/edit live on /blogs/new and /blogs/:id/edit (pages/blog-form.js).
import { api, errorMessage } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, fmtNumber, titleCase } from '../core/format.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { statsLoader, webUrl } from '../core/ui.js';

const LIMIT = 10;
const STATUS_BADGE = { published: 'success', draft: 'warning', archived: 'neutral' };
const liveUrl = (b) => webUrl(`/blogs/${encodeURIComponent(String(b.category || 'General').toLowerCase())}/${encodeURIComponent(b.slug || '')}`);

const loadStats = statsLoader(async () => (await api('/admin/blogs/stats')).data, (err) => toast.error(errorMessage(err, 'Could not load blog counts.')));

function titleCell(b) {
  return html`<a href="/blogs/${b._id}/edit"><strong>${b.title || 'Untitled'}</strong></a>
    <span class="cell-sub">${b.status === 'published'
    ? html`<a class="mono" href="${liveUrl(b)}" target="_blank" rel="noopener noreferrer">/${b.slug}</a>`
    : html`<span class="mono">/${b.slug}</span>`}</span>`;
}

function actions(b) {
  return html`
    <a class="btn btn--secondary btn--sm" href="/blogs/${b._id}/edit">Edit</a>
    <button type="button" class="btn btn--secondary btn--sm" data-action="feature" data-id="${b._id}" aria-pressed="${b.isFeatured ? 'true' : 'false'}">${b.isFeatured ? 'Unfeature' : 'Feature'}</button>
    ${b.status !== 'published' ? html`<button type="button" class="btn btn--secondary btn--sm" data-action="publish" data-id="${b._id}">Publish</button>` : html`<button type="button" class="btn btn--secondary btn--sm" data-action="draft" data-id="${b._id}">Unpublish</button>`}
    ${b.status !== 'archived' ? html`<button type="button" class="btn btn--ghost btn--sm" data-action="archive" data-id="${b._id}">Archive</button>` : ''}
    <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${b._id}">Delete</button>`;
}

const table = createTable({
  mount: el('#blogs-table'),
  caption: 'Blog posts',
  limit: LIMIT,
  emptyTitle: 'No posts match these filters',
  emptyHint: 'Write the first one with New post.',
  onClear: () => filters.clear(),
  parsePagination: (resp) => {
    const p = (resp && resp.pagination) || {};
    return { page: Number(p.currentPage || 1), pages: Number(p.totalPages || 1), total: p.totalBlogs != null ? Number(p.totalBlogs) : null, limit: LIMIT };
  },
  columns: [
    { key: 'title', label: 'Title and URL', render: titleCell },
    { key: 'category', label: 'Category', render: (b) => b.category || '—' },
    { key: 'status', label: 'Status', render: (b) => html`<span class="badge badge--${STATUS_BADGE[b.status] || 'neutral'}">${titleCase(b.status || 'draft')}</span>` },
    { key: 'isFeatured', label: 'Featured', render: (b) => (b.isFeatured ? html`<span class="badge badge--info">Featured</span>` : html`<span class="muted">No</span>`) },
    { key: 'views', label: 'Views', class: 'num', render: (b) => fmtNumber(b.views, '0') },
    { key: 'publishedAt', label: 'Published', render: (b) => html`<span class="nowrap">${fmtDate(b.publishedAt)}</span>` },
    { key: 'updatedAt', label: 'Updated', render: (b) => html`<span class="nowrap">${fmtDate(b.updatedAt)}</span>` },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: actions },
  ],
  fetchPage: async ({ sort, ...params }) => {
    const [sortBy, sortOrder] = String(sort || 'createdAt:desc').split(':');
    const resp = await api('/admin/blogs', { query: { ...params, sortBy, sortOrder } });
    return { rows: resp.data || [], pagination: resp.pagination };
  },
  onAction: (action, id, row) => {
    if (action === 'feature') toggleFeatured(id);
    else if (action === 'publish') setStatus(id, row, 'published');
    else if (action === 'draft') setStatus(id, row, 'draft');
    else if (action === 'archive') setStatus(id, row, 'archived');
    else if (action === 'delete') remove(id, row);
  },
});

const filters = bindFilters(el('#blog-filters'), (values) => {
  table.setParams({ search: '', status: '', category: '', sort: 'createdAt:desc', ...values });
}, { defaults: { sort: 'createdAt:desc' } });

async function toggleFeatured(id) {
  try {
    const resp = await api(`/admin/blogs/${id}/featured`, { method: 'PATCH' });
    toast.success(resp.data && resp.data.isFeatured ? 'Post featured' : 'Post no longer featured');
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not change the featured flag.')); }
}

async function setStatus(id, row, status) {
  const title = (row && row.title) || 'this post';
  const copy = {
    published: { title: 'Publish this post?', message: `"${title}" becomes public on the website and is added to the sitemap.`, confirmText: 'Publish' },
    draft: { title: 'Unpublish this post?', message: `"${title}" is taken off the website. Its URL returns 404 until it is published again.`, confirmText: 'Unpublish', danger: true },
    archived: { title: 'Archive this post?', message: `"${title}" is hidden from the website${row && row.status === 'published' ? ' and its URL returns 404' : ''}. It can be published again later.`, confirmText: 'Archive', danger: row && row.status === 'published' },
  }[status];
  if (!(await confirm(copy))) return;
  try {
    await api(`/admin/blogs/${id}/status`, { method: 'PATCH', body: { status } });
    toast.success(`Post ${status === 'draft' ? 'moved to drafts' : status}`);
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not change the status.')); }
}

async function remove(id, row) {
  const slug = (row && row.slug) || 'DELETE';
  const ok = await confirm({
    title: 'Delete this post?',
    message: `"${(row && row.title) || 'This post'}" and its image are deleted permanently.`,
    detail: row && row.status === 'published' ? 'This post is published: deleting it breaks a URL that search engines may have indexed. Archive it instead if you only want it hidden.' : '',
    confirmText: 'Delete post',
    danger: true,
    typed: slug,
  });
  if (!ok) return;
  try {
    await api(`/admin/blogs/${id}`, { method: 'DELETE' });
    toast.success('Post deleted');
    table.reload();
    loadStats();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the post.')); }
}

loadStats();
