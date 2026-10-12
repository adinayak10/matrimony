// bindTypeahead({ input, list, search, label, onPick, minChars, debounce })
// A small search-and-pick list: `search(query)` resolves an array, `label(item)`
// is the visible text (escaped by html``), `onPick(item)` gets the chosen item.
// Results are real <button>s in a list, so Tab/Enter work; Esc clears them.
import { html, setHtml, delegate } from './dom.js';
import { errorMessage } from './api.js';

export function bindTypeahead({ input, list, search, label, onPick, minChars = 2, debounce = 250, emptyText = 'No matches' } = {}) {
  if (!input || !list) return { clear() {} };
  let items = [];
  let timer = null;
  let seq = 0;

  const clear = () => { items = []; setHtml(list, ''); list.hidden = true; };

  async function run() {
    const q = input.value.trim();
    if (q.length < minChars) { clear(); return; }
    const mine = ++seq;
    list.hidden = false;
    setHtml(list, html`<li class="muted typeahead__item" role="status">Searching…</li>`);
    try {
      const found = await search(q);
      if (mine !== seq) return;
      items = Array.isArray(found) ? found : [];
      setHtml(list, items.length
        ? html`${items.map((item, i) => html`<li><button type="button" class="typeahead__item" data-pick="${i}">${label(item)}</button></li>`)}`
        : html`<li class="muted typeahead__item" role="status">${emptyText}</li>`);
    } catch (err) {
      if (mine !== seq) return;
      setHtml(list, html`<li class="text-danger typeahead__item" role="alert">${errorMessage(err, 'Search failed.')}</li>`);
    }
  }

  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, debounce); });
  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !list.hidden) { ev.stopPropagation(); clear(); }
    if (ev.key === 'ArrowDown') { const first = list.querySelector('button'); if (first) { ev.preventDefault(); first.focus(); } }
    if (ev.key === 'Enter') ev.preventDefault();
  });
  delegate(list, 'click', '[data-pick]', (ev, btn) => {
    const item = items[Number(btn.dataset.pick)];
    clear();
    if (item && typeof onPick === 'function') onPick(item);
  });

  return { clear };
}

export default bindTypeahead;
