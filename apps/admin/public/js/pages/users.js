// Users list (C3.1). Contract after C4.1 (ships in the same deploy):
//   GET /api/admin/users?page&limit=20&search&gender&platform&verified&blocked&sort
//   verified/blocked = 1|0, platform = mobile|web,
//   sort ∈ -createdAt|createdAt|-lastSeen|full_name
// No edit/delete here — everything is on /users/:id.
import { api } from '../core/api.js';
import { html, el } from '../core/dom.js';
import { fmtDate, timeAgo } from '../core/format.js';
import { imageUrl, bindImageFallbacks } from '../core/imageUrl.js';
import { createTable } from '../core/table.js';
import { bindFilters } from '../core/filters.js';

const PLATFORM = { mobile: 'Mobile', web: 'Web' };

function lastActive(u) {
  if (u.isOnline) return html`<span class="nowrap"><span class="dot dot--online"></span>Online now</span>`;
  return html`<span class="nowrap" title="${u.lastSeen ? fmtDate(u.lastSeen) : ''}"><span class="dot"></span>${timeAgo(u.lastSeen)}</span>`;
}

function statusBadges(u) {
  return html`${u.is_verified ? html`<span class="badge badge--info">Verified</span>` : html`<span class="badge badge--neutral">Unverified</span>`}
    ${u.is_block ? html`<span class="badge badge--danger">Blocked</span>` : html`<span class="badge badge--success">Active</span>`}`;
}

const mount = el('#users-table');
const filtersForm = el('#user-filters');

const table = createTable({
  mount,
  caption: 'Members',
  limit: 20,
  emptyTitle: 'No users match these filters',
  emptyHint: 'Try a broader search or clear the filters.',
  onClear: () => filters.clear(),
  columns: [
    { key: 'profile', label: '', width: '56px', render: (u) => html`<img class="avatar" src="${imageUrl(u.profile)}" alt="" data-fallback width="40" height="40" loading="lazy">` },
    { key: 'full_name', label: 'Name', render: (u) => html`<a href="/users/${u._id}">${u.full_name || 'Not specified'}</a>` },
    { key: 'email', label: 'Email', render: (u) => html`<span class="truncate" title="${u.email || ''}">${u.email || '—'}</span>` },
    { key: 'phone', label: 'Phone', render: (u) => u.phone || '—' },
    { key: 'gender', label: 'Gender', render: (u) => u.gender || '—' },
    { key: 'platform', label: 'Platform', render: (u) => html`<span class="badge badge--neutral">${PLATFORM[u.last_login_platform] || '—'}</span>` },
    { key: 'lastSeen', label: 'Last active', render: lastActive },
    { key: 'status', label: 'Status', render: statusBadges },
    { key: 'actions', label: '', class: 'table__actions', render: (u) => html`<a class="btn btn--secondary btn--sm" href="/users/${u._id}">View</a>` },
  ],
  fetchPage: async (params) => {
    const resp = await api('/admin/users', { query: params });
    queueMicrotask(() => bindImageFallbacks(mount));
    return { rows: resp.data || [], pagination: resp.pagination };
  },
});

const filters = bindFilters(filtersForm, (values) => {
  table.setParams({ search: '', gender: '', platform: '', verified: '', blocked: '', sort: '-createdAt', ...values });
}, { defaults: { sort: '-createdAt' } });
