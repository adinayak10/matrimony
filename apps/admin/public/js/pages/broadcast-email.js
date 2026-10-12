// Broadcast email (C3.7). Verified in apps/api/routes/admin.js (broadcast block):
//   GET  /api/admin/broadcast-email/preview?gender&minAge&maxAge&verified=1|0&blocked=1|0&platform=mobile|web
//        → { count, max: 500, tooMany }   (only members with an email address are counted)
//   POST /api/admin/broadcast-email/send-test { userId, subject, bodyHtml, bodyText }
//   POST /api/admin/broadcast-email/send { subject, bodyHtml, bodyText, filter, confirmCount }
//        → { jobId, total }; 400 TOO_MANY / CONFIRM_MISMATCH, 429 DAILY_CAP (2 a day) or RATE_LIMITED (1 a minute)
//   GET  /api/admin/broadcast-email/jobs/:id → data { status, subject, total, sent, failed, errorMessages, startedBy, … }
//   GET  /api/admin/broadcast-email/jobs     → data [last 20]
//   GET  /api/admin/users?search&limit=10    (test-recipient picker)
// The send is behind a typed confirmation of the exact recipient count, and that same
// number goes to the API as confirmCount so a changed audience is refused.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, delegate } from '../core/dom.js';
import { fmtDateTime, fmtNumber, titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { bindTypeahead } from '../core/typeahead.js';
import { bindCounters, invalid, clearInvalid } from '../core/fields.js';
import { busy } from '../core/ui.js';

const form = el('#broadcast-form');
const audience = el('#audience-form');
const sendBtn = el('[data-send]', form);
const sendNote = el('[data-send-note]', form);
const testBtn = el('[data-action="send-test"]', form);
const countEl = el('[data-preview-count]');
const hintEl = el('[data-preview-hint]');
const progressCard = el('[data-progress-card]');
const progressBody = el('[data-progress-body]');
const STATUS_BADGE = { queued: 'neutral', running: 'info', completed: 'success', failed: 'danger' };

let preview = { count: null, max: 500, tooMany: false, key: '' };
let testUser = null;
let previewSeq = 0;
let pollTimer = null;

function filterValues() {
  const f = audience.elements;
  const out = {};
  for (const name of ['gender', 'minAge', 'maxAge', 'verified', 'blocked', 'platform']) {
    const v = String(f[name].value || '').trim();
    if (v !== '') out[name] = v;
  }
  return out;
}

function syncSend() {
  const ready = preview.count > 0 && !preview.tooMany && preview.key === JSON.stringify(filterValues());
  sendBtn.disabled = !ready;
  sendBtn.textContent = ready ? `Send to ${fmtNumber(preview.count)} member${preview.count === 1 ? '' : 's'}` : 'Send broadcast';
  sendNote.textContent = ready ? 'You will be asked to type the recipient count.' : 'Preview the audience before sending.';
}

async function loadPreview() {
  const filter = filterValues();
  const key = JSON.stringify(filter);
  const mine = ++previewSeq;
  const minAge = Number(filter.minAge || 0);
  const maxAge = Number(filter.maxAge || 0);
  if (minAge && maxAge && minAge > maxAge) {
    preview = { count: null, max: 500, tooMany: false, key: '' };
    countEl.textContent = '–';
    hintEl.textContent = 'The minimum age is above the maximum age.';
    syncSend();
    return;
  }
  countEl.textContent = '…';
  hintEl.textContent = 'Counting recipients…';
  try {
    const resp = await api('/admin/broadcast-email/preview', { query: filter });
    if (mine !== previewSeq) return;
    preview = { count: Number(resp.count) || 0, max: Number(resp.max) || 500, tooMany: !!resp.tooMany, key };
    countEl.textContent = fmtNumber(preview.count, '0');
    if (preview.tooMany) hintEl.textContent = `members match. The limit is ${preview.max} per broadcast: narrow the audience.`;
    else if (!preview.count) hintEl.textContent = 'members match. Nobody would receive this email.';
    else hintEl.textContent = `member${preview.count === 1 ? '' : 's'} with an email address will receive this (limit ${preview.max}, two broadcasts a day).`;
  } catch (err) {
    if (mine !== previewSeq) return;
    preview = { count: null, max: 500, tooMany: false, key: '' };
    countEl.textContent = '–';
    hintEl.textContent = errorMessage(err, 'Could not count the recipients.');
  }
  syncSend();
}

let previewTimer = null;
const schedulePreview = () => { preview.key = ''; syncSend(); clearTimeout(previewTimer); previewTimer = setTimeout(loadPreview, 350); };
audience.addEventListener('input', schedulePreview);
audience.addEventListener('change', schedulePreview);
audience.addEventListener('submit', (ev) => { ev.preventDefault(); loadPreview(); });

function readMessage() {
  clearInvalid(form);
  const f = form.elements;
  const subject = f.subject.value.trim();
  const bodyHtml = f.bodyHtml.value.trim();
  if (!subject) { invalid(f.subject, 'A subject is required.'); return null; }
  if (!bodyHtml) { invalid(f.bodyHtml, 'The email needs a body.'); return null; }
  return { subject, bodyHtml, bodyText: f.bodyText.value };
}

// ---- Test send ---------------------------------------------------------------
bindTypeahead({
  input: el('#bc-test-user'),
  list: el('[data-test-list]'),
  search: async (q) => (await api('/admin/users', { query: { search: q, limit: 10 } })).data || [],
  label: (u) => `${u.full_name || 'Member'} · ${u.email || 'no email'}`,
  onPick: (u) => {
    testUser = u;
    el('#bc-test-user').value = u.full_name || u.email || '';
    el('[data-test-picked]').textContent = u.email ? `The test goes to ${u.full_name || 'this member'} <${u.email}>.` : `${u.full_name || 'This member'} has no email address. Pick someone else.`;
    testBtn.disabled = !u.email;
  },
  emptyText: 'No member matches',
});

testBtn.addEventListener('click', () => busy(testBtn, async () => {
  if (!testUser) return;
  const msg = readMessage();
  if (!msg) return;
  try {
    const resp = await api('/admin/broadcast-email/send-test', { method: 'POST', body: { userId: testUser._id, ...msg }, timeout: 60000 });
    toast.success(resp.message || 'Test email sent');
  } catch (err) { toast.error(errorMessage(err, 'The test email could not be sent.')); }
}));

// ---- Send --------------------------------------------------------------------
form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(sendBtn, async () => {
    const msg = readMessage();
    if (!msg) return;
    const filter = filterValues();
    if (!(preview.count > 0) || preview.tooMany || preview.key !== JSON.stringify(filter)) { toast.warning('Wait for the audience count before sending.'); return; }
    const count = preview.count;
    const ok = await confirm({
      title: `Send this email to ${fmtNumber(count)} member${count === 1 ? '' : 's'}?`,
      message: `"${truncate(msg.subject, 80)}" goes out immediately and cannot be recalled. Only two broadcasts are allowed per day.`,
      detail: 'Type the number of recipients to confirm you have checked the audience.',
      confirmText: 'Send broadcast',
      danger: true,
      typed: String(count),
    });
    if (!ok) return;
    try {
      const resp = await api('/admin/broadcast-email/send', { method: 'POST', body: { ...msg, filter, confirmCount: count }, timeout: 60000 });
      toast.success(resp.message || 'Broadcast started');
      if (resp.jobId) watch(resp.jobId);
      jobs.reload();
    } catch (err) {
      toast.error(errorMessage(err, 'The broadcast could not be started.'));
      if (err && err.data && (err.data.code === 'CONFIRM_MISMATCH' || err.data.code === 'TOO_MANY')) loadPreview();
    }
  });
});

// ---- Job progress ------------------------------------------------------------
function renderJob(job) {
  const done = (Number(job.sent) || 0) + (Number(job.failed) || 0);
  const total = Number(job.total) || 0;
  const finished = job.status === 'completed' || job.status === 'failed';
  setHtml(progressBody, html`
    <p><strong>${job.subject || 'Broadcast'}</strong> <span class="badge badge--${STATUS_BADGE[job.status] || 'neutral'}">${titleCase(job.status || 'running')}</span></p>
    <label class="form-label" for="job-progress">${fmtNumber(done, '0')} of ${fmtNumber(total, '0')} processed</label>
    <progress class="progress" id="job-progress" max="${total || 1}" value="${done}"></progress>
    <dl class="key-value mt-3">
      <dt>Sent</dt><dd>${fmtNumber(job.sent, '0')}</dd>
      <dt>Failed</dt><dd>${fmtNumber(job.failed, '0')}</dd>
      <dt>Started</dt><dd>${fmtDateTime(job.startedAt || job.createdAt)}</dd>
      ${finished ? html`<dt>Finished</dt><dd>${fmtDateTime(job.finishedAt)}</dd>` : ''}
    </dl>
    ${Array.isArray(job.errorMessages) && job.errorMessages.length ? html`<details class="mt-3"><summary>${job.errorMessages.length} error message${job.errorMessages.length === 1 ? '' : 's'}</summary><pre class="code-block">${job.errorMessages.join('\n')}</pre></details>` : ''}
    ${finished ? '' : html`<p class="form-help" role="status">Updating every few seconds. You can leave this page; the send continues on the server.</p>`}`);
  return finished;
}

function watch(jobId) {
  clearTimeout(pollTimer);
  progressCard.hidden = false;
  let failures = 0;
  const tick = async () => {
    try {
      const { data } = await api(`/admin/broadcast-email/jobs/${jobId}`);
      failures = 0;
      if (renderJob(data)) { jobs.reload(); return; }
    } catch (err) {
      failures += 1;
      if (failures >= 5) {
        setHtml(progressBody, html`<div class="alert alert--error alert--flush" role="alert"><span>${errorMessage(err, 'Lost track of the broadcast.')} The send itself continues on the server.</span><button type="button" class="btn btn--secondary btn--sm alert__retry" data-action="watch" data-id="${jobId}">Retry</button></div>`);
        return;
      }
    }
    pollTimer = setTimeout(tick, 3000);
  };
  tick();
}

const jobs = createTable({
  mount: el('#jobs-table'),
  caption: 'Recent broadcasts',
  limit: 20,
  emptyTitle: 'No broadcasts yet',
  columns: [
    { key: 'createdAt', label: 'Started', render: (j) => html`<span class="nowrap">${fmtDateTime(j.startedAt || j.createdAt)}</span>` },
    { key: 'subject', label: 'Subject', render: (j) => html`<span class="cell-wrap">${truncate(j.subject || '—', 90)}</span>` },
    { key: 'startedBy', label: 'Sent by', render: (j) => (j.startedBy && (j.startedBy.full_name || j.startedBy.email)) || '—' },
    { key: 'status', label: 'Status', render: (j) => html`<span class="badge badge--${STATUS_BADGE[j.status] || 'neutral'}">${titleCase(j.status || 'queued')}</span>` },
    { key: 'total', label: 'Recipients', class: 'num', render: (j) => fmtNumber(j.total, '0') },
    { key: 'sent', label: 'Sent', class: 'num', render: (j) => fmtNumber(j.sent, '0') },
    { key: 'failed', label: 'Failed', class: 'num', render: (j) => fmtNumber(j.failed, '0') },
    { key: 'actions', label: 'Actions', class: 'table__actions', render: (j) => html`<button type="button" class="btn btn--secondary btn--sm" data-action="watch" data-id="${j._id}">Details</button>` },
  ],
  fetchPage: async () => {
    const resp = await api('/admin/broadcast-email/jobs');
    const rows = resp.data || [];
    return { rows, pagination: { page: 1, pages: 1, total: rows.length, limit: rows.length || 1 } };
  },
});

delegate(document, 'click', '[data-action="watch"]', (ev, btn) => { watch(btn.dataset.id); progressCard.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
delegate(document, 'click', '[data-action="reload-jobs"]', () => jobs.reload());
window.addEventListener('pagehide', () => clearTimeout(pollTimer));

bindCounters(form);
loadPreview();
jobs.reload().then(() => {
  const running = jobs.getRows().find((j) => j.status === 'running' || j.status === 'queued');
  if (running) watch(running._id);
});
