// renderPagination(mount, { page, pages, total, limit }, onPage)
// Windowed: first, last, ±2 around the current page, ellipsis between
// (port of users.html:502-538). Hidden when there is a single page.
import { html, setHtml, delegate } from './dom.js';

const bound = new WeakSet();

export function renderPagination(mount, { page = 1, pages = 1, total = null, limit = null } = {}, onPage) {
  if (!mount) return;
  const current = Math.max(1, Number(page) || 1);
  const count = Math.max(1, Number(pages) || 1);

  if (count <= 1 && !total) { setHtml(mount, ''); return; }

  const items = [];
  for (let i = 1; i <= count; i += 1) {
    if (i === 1 || i === count || (i >= current - 2 && i <= current + 2)) {
      items.push(html`<button type="button" class="pagination__btn${i === current ? ' is-active' : ''}" data-page="${i}" ${i === current ? 'aria-current="page"' : ''}>${i}</button>`);
    } else if (i === current - 3 || i === current + 3) {
      items.push(html`<span class="pagination__ellipsis" aria-hidden="true">&hellip;</span>`);
    }
  }

  let summary = '';
  if (total != null) {
    const n = Number(total) || 0;
    const per = Number(limit) || 0;
    if (per && n) {
      const from = (current - 1) * per + 1;
      const to = Math.min(n, current * per);
      summary = `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${n.toLocaleString()}`;
    } else {
      summary = `${n.toLocaleString()} total`;
    }
  }

  setHtml(mount, html`
    <div class="table-foot">
      <span class="table-foot__summary">${summary}</span>
      ${count > 1 ? html`
        <nav class="pagination" aria-label="Pagination">
          <button type="button" class="pagination__btn" data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''} aria-label="Previous page">&lsaquo;</button>
          ${items}
          <button type="button" class="pagination__btn" data-page="${current + 1}" ${current >= count ? 'disabled' : ''} aria-label="Next page">&rsaquo;</button>
        </nav>` : ''}
    </div>
  `);

  if (!bound.has(mount)) {
    bound.add(mount);
    delegate(mount, 'click', 'button[data-page]', (ev, btn) => {
      if (btn.disabled) return;
      const n = Number(btn.dataset.page);
      if (Number.isFinite(n) && n >= 1 && typeof mount._onPage === 'function') mount._onPage(n);
    });
  }
  mount._onPage = onPage;
}

export default renderPagination;
