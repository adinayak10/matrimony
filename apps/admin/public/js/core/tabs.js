// initTabs(tablist, { onShow, param, defaultKey, panels }) → { show, current }
// WAI-ARIA tabs: role=tablist/tab, aria-selected, roving tabindex, Left/Right/
// Home/End. The active key is mirrored into ?tab= so a tab is deep-linkable
// (/master-data?tab=gotras). Panels are the [data-panel] elements in `panels`
// (default: document); a page with one shared panel simply has none and does
// its own rendering in onShow(key).
import { delegate, els } from './dom.js';

export function initTabs(tablist, { onShow = null, param = 'tab', defaultKey = null, panels = document } = {}) {
  if (!tablist) return { show() {}, current: () => null };
  const tabs = () => els('[data-tab]', tablist);
  const keys = () => tabs().map((t) => t.dataset.tab);
  const first = defaultKey || keys()[0] || null;
  let current = null;

  function show(key, { focus = false, silent = false } = {}) {
    const next = keys().includes(key) ? key : first;
    tabs().forEach((t) => {
      const on = t.dataset.tab === next;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (on && focus) t.focus();
    });
    els('[data-panel]', panels).forEach((p) => { p.hidden = p.dataset.panel !== next; });
    const changed = next !== current;
    current = next;
    if (param) {
      const url = new URL(location.href);
      if (next === first) url.searchParams.delete(param); else url.searchParams.set(param, next);
      history.replaceState(history.state, '', url);
    }
    if (changed && !silent && typeof onShow === 'function') onShow(next);
  }

  delegate(tablist, 'click', '[data-tab]', (ev, t) => show(t.dataset.tab));
  tablist.addEventListener('keydown', (ev) => {
    const list = tabs();
    const i = list.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    let n = null;
    if (ev.key === 'ArrowRight') n = (i + 1) % list.length;
    if (ev.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
    if (ev.key === 'Home') n = 0;
    if (ev.key === 'End') n = list.length - 1;
    if (n !== null) { ev.preventDefault(); show(list[n].dataset.tab, { focus: true }); }
  });

  const initial = param ? new URL(location.href).searchParams.get(param) : null;
  show(initial || first);

  return { show, current: () => current };
}

export default initTabs;
