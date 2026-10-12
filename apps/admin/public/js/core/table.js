// createTable({ mount, columns, fetchPage, rowKey, emptyTitle, emptyHint, parsePagination, caption, onAction, onClear })
//
//   columns: [{ key, label, render(row) → Raw|string, width, class, sortable }]
//   fetchPage(params) → Promise<{ rows, pagination }> — params = { page, limit, ...filters }
//   parsePagination(resp) → { page, pages, total, limit } for APIs with other shapes
//
// States: loading (skeleton rows, aria-busy), empty (.empty with optional Clear),
// error (.alert--error + Retry). Sticky header via .table thead th in admin.css.
// Row actions: any element with data-action (and data-id) inside tbody → onAction(action, id, row, event, el).
import { html, raw, setHtml, delegate } from './dom.js';
import { renderPagination } from './pagination.js';
import { errorMessage } from './api.js';

export function createTable({
  mount,
  columns,
  fetchPage,
  rowKey = '_id',
  emptyTitle = 'Nothing here',
  emptyHint = '',
  caption = '',
  limit = 20,
  parsePagination = null,
  onAction = null,
  onClear = null,
  skeletonRows = 6,
} = {}) {
  if (!mount) throw new Error('createTable: mount missing');
  let params = { page: 1, limit };
  let rows = [];
  let pagination = { page: 1, pages: 1, total: 0, limit };
  let seq = 0;

  setHtml(mount, html`
    <div class="table-wrap">
      <table class="table">
        ${caption ? html`<caption class="sr-only">${caption}</caption>` : ''}
        <thead><tr>${columns.map((c) => html`<th scope="col" ${c.width ? raw(`style="width:${String(c.width).replace(/[^0-9a-z%.]/gi, '')}"`) : ''} class="${c.class || ''}">${c.label}</th>`)}</tr></thead>
        <tbody></tbody>
      </table>
    </div>
    <div data-table-foot></div>
  `);
  const wrap = mount.querySelector('.table-wrap');
  const table = mount.querySelector('table');
  const tbody = mount.querySelector('tbody');
  const foot = mount.querySelector('[data-table-foot]');

  const rowById = (id) => rows.find((r) => String(r[rowKey]) === String(id));

  delegate(tbody, 'click', '[data-action]', (ev, elm) => {
    if (typeof onAction !== 'function') return;
    const tr = elm.closest('tr[data-id]');
    const id = elm.dataset.id || (tr ? tr.dataset.id : '');
    onAction(elm.dataset.action, id, rowById(id), ev, elm);
  });
  delegate(mount, 'click', '[data-table-retry]', () => load());
  delegate(mount, 'click', '[data-table-clear]', () => { if (typeof onClear === 'function') onClear(); });

  function renderLoading() {
    table.classList.add('table--loading');
    wrap.setAttribute('aria-busy', 'true');
    if (!rows.length) {
      setHtml(tbody, html`${Array.from({ length: skeletonRows }, () => html`<tr>${columns.map(() => html`<td><div class="skeleton skeleton--text"></div></td>`)}</tr>`)}`);
    }
  }

  function renderRows() {
    table.classList.remove('table--loading');
    wrap.setAttribute('aria-busy', 'false');
    if (!rows.length) {
      setHtml(tbody, html`<tr><td colspan="${columns.length}">
        <div class="empty">
          <div class="empty__title">${emptyTitle}</div>
          ${emptyHint ? html`<div class="empty__hint">${emptyHint}</div>` : ''}
          ${onClear ? html`<button type="button" class="btn btn--secondary btn--sm" data-table-clear>Clear filters</button>` : ''}
        </div></td></tr>`);
      renderPagination(foot, { ...pagination, pages: 1 }, goTo);
      return;
    }
    setHtml(tbody, html`${rows.map((row) => html`<tr data-id="${row[rowKey] ?? ''}">${columns.map((c) => html`<td class="${c.class || ''}">${c.render ? c.render(row) : (row[c.key] ?? '')}</td>`)}</tr>`)}`);
    renderPagination(foot, pagination, goTo);
  }

  function renderError(err) {
    table.classList.remove('table--loading');
    wrap.setAttribute('aria-busy', 'false');
    setHtml(tbody, html`<tr><td colspan="${columns.length}">
      <div class="alert alert--error" role="alert">
        <span>${errorMessage(err, 'Could not load this list.')}</span>
        <button type="button" class="btn btn--secondary btn--sm alert__retry" data-table-retry>Retry</button>
      </div></td></tr>`);
    setHtml(foot, '');
  }

  function normalisePagination(resp) {
    if (typeof parsePagination === 'function') return parsePagination(resp);
    const p = (resp && resp.pagination) || {};
    return {
      page: Number(p.page || p.currentPage || params.page || 1),
      pages: Number(p.pages || p.totalPages || 1),
      total: p.total != null ? Number(p.total) : (p.totalItems != null ? Number(p.totalItems) : null),
      limit: Number(p.limit || params.limit || limit),
    };
  }

  async function load() {
    const mine = ++seq;
    renderLoading();
    try {
      const resp = await fetchPage({ ...params });
      if (mine !== seq) return;
      rows = Array.isArray(resp.rows) ? resp.rows : (Array.isArray(resp.data) ? resp.data : []);
      pagination = normalisePagination(resp);
      renderRows();
    } catch (err) {
      if (mine !== seq) return;
      rows = [];
      renderError(err);
    }
  }

  function goTo(page) {
    params.page = page;
    load();
    mount.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  return {
    el: mount,
    reload: load,
    goTo,
    setParams(next, { resetPage = true } = {}) {
      params = { ...params, ...next };
      if (resetPage) params.page = 1;
      return load();
    },
    getParams: () => ({ ...params }),
    getRows: () => rows.slice(),
    getPagination: () => ({ ...pagination }),
    updateRow(id, patch) {
      const row = rowById(id);
      if (row) { Object.assign(row, patch); renderRows(); }
    },
    removeRow(id) {
      rows = rows.filter((r) => String(r[rowKey]) !== String(id));
      renderRows();
    },
  };
}

export default createTable;
