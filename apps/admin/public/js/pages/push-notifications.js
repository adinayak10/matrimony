// Push notifications (feature expansion B8). Mirrors broadcast-email.js.
//   POST /api/admin/push/preview   {filters}                               → { count }
//   POST /api/admin/push/broadcast {title, body, platform, data}           FCM topics banjaramatch_android / _ios
//   POST /api/admin/push/filtered  {filters, title, body, data, confirmCount}  cap 2000 recipients
//   POST /api/admin/push/user      {userId, title, body}                   test send to one member
//   GET  /api/admin/push/jobs      → data [{ _id, mode, title, body, platform, filters, total, sent, failed, status, startedBy, createdAt }]
//   GET  /api/admin/users?search&limit=10  (test-recipient picker)
//   POST /api/states, /api/cities         (audience filter lists)
// filters = { platform: all|android|ios, gender, state, city, verified: 1|0, lastSeenDays }.
// Every send is behind a typed confirmation of the counted audience. The API
// allows 5 broadcasts per admin per day and audits every send.
// FCM data always carries `type`: 'announcement' (+announcementId) or 'admin_message'
// with linkType profile (userId) | blog (slug) | url (url).
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, els, delegate } from '../core/dom.js';
import { fmtDateTime, fmtNumber, titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { bindTypeahead } from '../core/typeahead.js';
import { bindCounters, invalid, clearInvalid } from '../core/fields.js';
import { busy } from '../core/ui.js';

const MAX_FILTERED = 2000;
const form = el('#push-form');
const audience = el('#push-audience');
const sendBtn = el('[data-send]', form);
const sendNote = el('[data-send-note]', form);
const testBtn = el('[data-action="send-test"]', form);
const countEl = el('[data-preview-count]');
const hintEl = el('[data-preview-hint]');
const stateSelect = el('#push-state');
const cityInput = el('#push-city');
const STATUS_BADGE = { queued: 'neutral', running: 'info', completed: 'success', sent: 'success', partial: 'warning', failed: 'danger' };
const ID = /^[a-f0-9]{24}$/i;

const LINKS = {
  none: null,
  announcement: { label: 'Announcement id', help: 'The 24-character id from the Announcements page. Publish it first.', test: (v) => ID.test(v), error: 'Enter a 24-character announcement id.' },
  profile: { label: 'Member id', help: 'The 24-character id from the member\'s page (/users/<id>).', test: (v) => ID.test(v), error: 'Enter a 24-character member id.' },
  blog: { label: 'Blog slug', help: 'The last part of the blog URL, for example banjara-wedding-rituals.', test: (v) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v), error: 'Enter the blog slug: lowercase letters, numbers and hyphens.' },
  url: { label: 'Web address', help: 'An https:// address.', test: (v) => /^https:\/\/[^\s]+$/i.test(v), error: 'Enter an address starting with https://.' },
};

let preview = { count: null, key: '' };
let testUser = null;
let city = null;
let previewSeq = 0;

// ---- Audience ----------------------------------------------------------------
const mode = () => (audience.elements.mode.value === 'filters' ? 'filters' : 'topic');

function filterValues() {
  const f = audience.elements;
  const out = { platform: f.platform.value || 'all' };
  if (mode() === 'filters') {
    for (const name of ['gender', 'state', 'verified', 'lastSeenDays']) {
      const v = String(f[name].value || '').trim();
      if (v !== '') out[name] = v;
    }
    if (city && out.state) out.city = city._id;
  }
  return out;
}
const audienceKey = () => JSON.stringify({ mode: mode(), ...filterValues() });

function tooMany() { return mode() === 'filters' && preview.count > MAX_FILTERED; }

function syncSend() {
  const ready = preview.count > 0 && !tooMany() && preview.key === audienceKey();
  sendBtn.disabled = !ready;
  sendBtn.textContent = ready ? `Send to ${fmtNumber(preview.count)} member${preview.count === 1 ? '' : 's'}` : 'Send push';
  sendNote.textContent = ready ? 'You will be asked to type the recipient count.' : 'Count the audience before sending.';
}

async function loadPreview() {
  const filters = filterValues();
  const key = audienceKey();
  const mine = ++previewSeq;
  countEl.textContent = '…';
  hintEl.textContent = 'Counting recipients…';
  try {
    const resp = await api('/admin/push/preview', { method: 'POST', body: { filters } });
    if (mine !== previewSeq) return;
    const count = Number((resp.data && resp.data.count) ?? resp.count) || 0;
    preview = { count, key };
    countEl.textContent = fmtNumber(count, '0');
    if (!count) hintEl.textContent = 'members can receive a push with this audience.';
    else if (tooMany()) hintEl.textContent = `members match. Filtered sends are limited to ${fmtNumber(MAX_FILTERED)}: narrow the filters or send to everyone instead.`;
    else hintEl.textContent = `member${count === 1 ? '' : 's'} with the app and notifications on will receive this.`;
  } catch (err) {
    if (mine !== previewSeq) return;
    preview = { count: null, key: '' };
    countEl.textContent = '–';
    hintEl.textContent = errorMessage(err, 'Could not count the recipients.');
  }
  syncSend();
}

let previewTimer = null;
const schedulePreview = () => { preview.key = ''; syncSend(); clearTimeout(previewTimer); previewTimer = setTimeout(loadPreview, 350); };

function syncMode() {
  els('[data-filters-only]').forEach((n) => { n.hidden = mode() !== 'filters'; });
}
audience.addEventListener('change', (ev) => {
  if (ev.target === stateSelect) {
    city = null;
    cityInput.value = '';
    cityInput.disabled = !stateSelect.value;
    cityInput.placeholder = stateSelect.value ? 'Search cities in this state' : 'Pick a state, then search';
    el('[data-city-picked]').textContent = 'Any city.';
  }
  if (ev.target === cityInput) return;
  syncMode();
  schedulePreview();
});
audience.addEventListener('submit', (ev) => { ev.preventDefault(); loadPreview(); });
cityInput.addEventListener('input', () => {
  if (city && cityInput.value.trim() !== city.name) {
    city = null;
    el('[data-city-picked]').textContent = 'Any city.';
    schedulePreview();
  }
});

async function fillStates() {
  try {
    const resp = await api('/states', { method: 'POST', body: { limit: 500 } });
    const states = (resp.data || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name)));
    setHtml(stateSelect, html`<option value="">Any state</option>${states.map((s) => html`<option value="${s._id}">${s.name}</option>`)}`);
  } catch (e) { /* the state filter stays "Any state" */ }
}

bindTypeahead({
  input: cityInput,
  list: el('[data-city-list]'),
  search: async (q) => (await api('/cities', { method: 'POST', body: { state: stateSelect.value, search: q, limit: 30 } })).data || [],
  label: (c) => `${c.name}${c.district ? ` (${c.district})` : ''}`,
  onPick: (c) => {
    city = c;
    cityInput.value = c.name;
    el('[data-city-picked]').textContent = `Only members in ${c.name}.`;
    schedulePreview();
  },
  emptyText: 'No city with that name in this state',
});

// ---- Message -----------------------------------------------------------------
const linkType = el('#push-link-type');
const linkWrap = el('[data-link-value]');
function syncLink() {
  const cfg = LINKS[linkType.value];
  linkWrap.hidden = !cfg;
  if (cfg) {
    el('[data-link-label]').textContent = cfg.label;
    el('[data-link-help]').textContent = cfg.help;
  }
}
linkType.addEventListener('change', syncLink);

function readMessage() {
  clearInvalid(form);
  const f = form.elements;
  const title = f.title.value.trim();
  const body = f.body.value.trim();
  if (!title) { invalid(f.title, 'A title is required.'); return null; }
  if (title.length > 60) { invalid(f.title, 'Keep the title to 60 characters.'); return null; }
  if (!body) { invalid(f.body, 'A message is required.'); return null; }
  if (body.length > 180) { invalid(f.body, 'Keep the message to 180 characters.'); return null; }
  const type = f.linkType.value;
  const cfg = LINKS[type];
  let data = { type: 'admin_message' };
  if (cfg) {
    const v = f.linkValue.value.trim();
    if (!cfg.test(v)) { invalid(f.linkValue, cfg.error); return null; }
    if (type === 'announcement') data = { type: 'announcement', announcementId: v };
    else if (type === 'profile') data = { type: 'admin_message', linkType: 'profile', userId: v };
    else if (type === 'blog') data = { type: 'admin_message', linkType: 'blog', slug: v };
    else data = { type: 'admin_message', linkType: 'url', url: v };
  }
  return { title, body, data };
}

// ---- Test send ---------------------------------------------------------------
bindTypeahead({
  input: el('#push-test-user'),
  list: el('[data-test-list]'),
  search: async (q) => (await api('/admin/users', { query: { search: q, limit: 10 } })).data || [],
  label: (u) => `${u.full_name || 'Member'} · ${u.email || u.phone || 'no contact'}`,
  onPick: (u) => {
    testUser = u;
    el('#push-test-user').value = u.full_name || u.email || '';
    el('[data-test-picked]').textContent = `The test goes to ${u.full_name || 'this member'}${u.email ? ` <${u.email}>` : ''}. Nothing arrives if they have no app session with notifications on.`;
    testBtn.disabled = false;
  },
  emptyText: 'No member matches',
});

testBtn.addEventListener('click', () => busy(testBtn, async () => {
  if (!testUser) return;
  const msg = readMessage();
  if (!msg) return;
  try {
    const resp = await api('/admin/push/user', { method: 'POST', body: { userId: testUser._id, title: msg.title, body: msg.body }, timeout: 30000 });
    const r = resp.data || {};
    if (r.ok === false) toast.warning(`Not delivered: ${r.error || 'the member has no push token'}`);
    else toast.success(resp.message || 'Test push sent');
  } catch (err) { toast.error(errorMessage(err, 'The test push could not be sent.')); }
}));

// ---- Send --------------------------------------------------------------------
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(sendBtn, async () => {
    const msg = readMessage();
    if (!msg) return;
    if (!(preview.count > 0) || tooMany() || preview.key !== audienceKey()) { toast.warning('Wait for the audience count before sending.'); return; }
    const count = preview.count;
    const filters = filterValues();
    const topic = mode() === 'topic';
    const ok = await confirm({
      title: `Push to ${fmtNumber(count)} member${count === 1 ? '' : 's'}?`,
      message: `"${truncate(msg.title, 60)}" is sent immediately and cannot be recalled. Each admin can send 5 pushes a day.`,
      detail: topic ? 'Sent to every phone subscribed to the app topic, which can differ slightly from the counted members. Type the count to confirm you checked the audience.' : 'Type the number of recipients to confirm you checked the audience.',
      confirmText: 'Send push',
      danger: true,
      typed: String(count),
    });
    if (!ok) return;
    try {
      const resp = topic
        ? await api('/admin/push/broadcast', { method: 'POST', body: { title: msg.title, body: msg.body, platform: filters.platform, data: msg.data }, timeout: 60000 })
        : await api('/admin/push/filtered', { method: 'POST', body: { filters, title: msg.title, body: msg.body, data: msg.data, confirmCount: count }, timeout: 120000 });
      toast.success(resp.message || 'Push sent');
      jobs.reload();
    } catch (err) {
      toast.error(errorMessage(err, 'The push could not be sent.'));
      if (err && err.data && /CONFIRM|TOO_MANY/.test(String(err.data.code || ''))) loadPreview();
    }
  });
});

// ---- Jobs --------------------------------------------------------------------
function audienceSummary(j) {
  if (j.mode === 'user') return 'One member (test)';
  if (j.mode === 'broadcast' || j.mode === 'topic') return `Everyone · ${j.platform && j.platform !== 'all' ? titleCase(j.platform) : 'Android and iOS'}`;
  const f = j.filters || {};
  const bits = [f.gender, f.verified === '1' || f.verified === 1 ? 'verified' : '', f.lastSeenDays ? `seen ${f.lastSeenDays}d` : '', f.city ? 'one city' : (f.state ? 'one state' : ''), f.platform && f.platform !== 'all' ? f.platform : ''].filter(Boolean);
  return `Filtered${bits.length ? ` · ${bits.join(', ')}` : ''}`;
}

const jobs = createTable({
  mount: el('#push-jobs-table'),
  caption: 'Recent push notifications',
  limit: 20,
  emptyTitle: 'No pushes sent yet',
  columns: [
    { key: 'createdAt', label: 'Sent', render: (j) => html`<span class="nowrap">${fmtDateTime(j.startedAt || j.createdAt)}</span>` },
    { key: 'title', label: 'Title', render: (j) => html`<strong>${truncate(j.title || '—', 60)}</strong><span class="cell-sub">${truncate(j.body || '', 80)}</span>` },
    { key: 'audience', label: 'Audience', render: audienceSummary },
    { key: 'startedBy', label: 'Sent by', render: (j) => (j.startedBy && (j.startedBy.full_name || j.startedBy.email)) || '—' },
    { key: 'status', label: 'Status', render: (j) => html`<span class="badge badge--${STATUS_BADGE[j.status] || 'neutral'}">${titleCase(j.status || 'queued')}</span>` },
    { key: 'total', label: 'Recipients', class: 'num', render: (j) => (j.total != null ? fmtNumber(j.total, '0') : '—') },
    { key: 'sent', label: 'Sent', class: 'num', render: (j) => (j.sent != null ? fmtNumber(j.sent, '0') : '—') },
    { key: 'failed', label: 'Failed', class: 'num', render: (j) => (j.failed != null ? fmtNumber(j.failed, '0') : '—') },
  ],
  fetchPage: async () => {
    const resp = await api('/admin/push/jobs');
    const rows = resp.data || [];
    return { rows, pagination: { page: 1, pages: 1, total: rows.length, limit: rows.length || 1 } };
  },
});

delegate(document, 'click', '[data-action="reload-jobs"]', () => jobs.reload());

bindCounters(form);
syncLink();
syncMode();
fillStates();
loadPreview();
jobs.reload();
