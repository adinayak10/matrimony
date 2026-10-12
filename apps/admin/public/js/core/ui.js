// Small shared page helpers.
//   setStats({ pending: 3 })         fills every [data-stat="pending"] tile
//   statsLoader(fetch, onError)      → load(): refreshes the tiles; a slow, older response never
//                                    overwrites a newer one (two refreshes can overlap)
//   busy(button, async () => {})     disables + spinner while the promise runs
//   webUrl('/blogs/x')               absolute URL on the public website
import { fmtNumber } from './format.js';

export function setStats(values, root = document) {
  for (const [key, value] of Object.entries(values || {})) {
    root.querySelectorAll(`[data-stat="${key}"]`).forEach((node) => { node.textContent = fmtNumber(value, '0'); });
  }
}

export function statsLoader(fetchStats, onError = null, root = document) {
  let seq = 0;
  return async function load() {
    const mine = ++seq;
    try {
      const values = await fetchStats();
      if (mine === seq) setStats(values, root);
    } catch (err) {
      if (mine === seq && typeof onError === 'function') onError(err);
    }
  };
}

export async function busy(button, fn) {
  if (!button) return fn();
  if (button.classList.contains('is-loading')) return undefined;
  button.classList.add('is-loading');
  button.setAttribute('aria-busy', 'true');
  try {
    return await fn();
  } finally {
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
  }
}

export function webUrl(path = '/') {
  const base = ((document.body && document.body.dataset.webPublicUrl) || '').replace(/\/+$/, '');
  const p = String(path || '/');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}

export function apiPublicUrl(path = '/') {
  const base = ((document.body && document.body.dataset.apiPublicUrl) || '').replace(/\/+$/, '');
  const p = String(path || '/');
  return `${base}${p.startsWith('/') ? p : `/${p}`}`;
}
