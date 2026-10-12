// Formatting helpers. All return plain strings (no markup) so they can be
// interpolated into html`` safely.

const DATE_OPTS = { year: 'numeric', month: 'short', day: 'numeric' };
const DATETIME_OPTS = { ...DATE_OPTS, hour: '2-digit', minute: '2-digit' };
const LOCALE = 'en-IN';

function toDate(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(v, empty = '—') {
  const d = toDate(v);
  return d ? d.toLocaleDateString(LOCALE, DATE_OPTS) : empty;
}

export function fmtDateTime(v, empty = '—') {
  const d = toDate(v);
  return d ? d.toLocaleString(LOCALE, DATETIME_OPTS) : empty;
}

/** "Just now", "5m ago", "3h ago", "2d ago", "3w ago", "4mo ago", "1y ago"; "Never" for empty. */
export function timeAgo(v, { never = 'Never', now = Date.now() } = {}) {
  const d = toDate(v);
  if (!d) return never;
  const diff = Math.max(0, now - d.getTime());
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function fmtNumber(n, empty = '—') {
  if (n === null || n === undefined || n === '') return empty;
  const num = Number(n);
  return Number.isFinite(num) ? num.toLocaleString(LOCALE) : empty;
}

export function fmtBytes(bytes, decimals = 1) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(decimals)} ${units[i]}`;
}

/** titleCase('in_progress') → 'In Progress'; also splits '-' and camelCase. */
export function titleCase(s) {
  return String(s == null ? '' : s)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function truncate(s, n = 120) {
  const str = String(s == null ? '' : s);
  return str.length > n ? `${str.slice(0, n - 1).trimEnd()}…` : str;
}

export function ageFromDob(dob) {
  const d = toDate(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

/** For <input type="date"> values. */
export function toDateInput(v) {
  const d = toDate(v);
  if (!d) return '';
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
