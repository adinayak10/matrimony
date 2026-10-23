// Master data (C3.6): ONE page, one tab per list. Replaces constants.html and
// community-data.html.
//
// Verified in apps/api/routes/admin.js + controllers/admin/constantsController.js
// and the models (Caste, Gotra, Clan, SurnameTitle, Profession, Qualification,
// IncomeRange, Interest, ReportReason, AboutOption):
//   GET    /api/admin/constants/<key>          → data [ … ]   (whole list, sorted by name, gotras with clan populated)
//   POST   /api/admin/constants/<key>          body = the fields below
//   PUT    /api/admin/constants/<key>/:id
//   DELETE /api/admin/constants/<key>/:id      409 { code:'IN_USE', inUse, message } while members reference it
//   POST   /api/admin/gotras/ai-suggest {}     → data [{ gotraId, name, suggestedClanId, suggestedClanName, confidence, reasoning }]
//   POST   /api/admin/gotras/ai-apply { assignments:[{ gotraId, clanId }] } → { modifiedCount }
// The API returns whole lists, so search and paging happen here over the cached list.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, appendHtml, el, els, delegate } from '../core/dom.js';
import { titleCase, truncate } from '../core/format.js';
import { createTable } from '../core/table.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { initTabs } from '../core/tabs.js';
import { field, invalid, clearInvalid, listToText, textToList, uid } from '../core/fields.js';
import { busy } from '../core/ui.js';

const PAGE_SIZE = 50;
const yesNo = (v) => (v !== false ? html`<span class="badge badge--success">Active</span>` : html`<span class="badge badge--neutral">Inactive</span>`);
const list = (v, n = 4) => {
  const arr = Array.isArray(v) ? v.filter(Boolean) : [];
  if (!arr.length) return html`<span class="muted">—</span>`;
  return html`<span class="cell-wrap">${arr.slice(0, n).join(', ')}${arr.length > n ? ` +${arr.length - n} more` : ''}</span>`;
};
const states = (r) => {
  const n = Array.isArray(r.statePresence) ? r.statePresence.length : 0;
  return n ? html`<span title="${r.statePresence.map((s) => s.state).join(', ')}">${n} state${n === 1 ? '' : 's'}</span>` : html`<span class="muted">—</span>`;
};

const text = (name, label, extra = {}) => ({ name, label, type: 'text', ...extra });
const NAME = text('name', 'Name', { required: true, maxlength: 120 });
const ACTIVE = { name: 'isActive', label: 'Active (offered to members)', type: 'switch', fallback: true };
const SORT_ORDER = { name: 'sortOrder', label: 'Sort order', type: 'number', min: 0, step: 1, fallback: 0, help: 'Lower numbers show first.' };

const STATE_SCHEMAS = {
  clans: [text('state', 'State', { required: true }), text('localName', 'Local name'), text('strongholdDistricts', 'Stronghold districts', { kind: 'list' }), text('commonSurnames', 'Common surnames', { kind: 'list' })],
  gotras: [text('state', 'State', { required: true }), text('localGotraName', 'Local gotra name'), text('commonSurnames', 'Common surnames', { kind: 'list' })],
  'surname-titles': [text('state', 'State', { required: true }),
    { name: 'prevalence', label: 'Prevalence', type: 'select', options: ['very common', 'common', 'occasional'], fallback: 'common' },
    text('exampleNames', 'Example names', { kind: 'list' }), text('notes', 'Notes')],
};

const simple = (noun, help) => ({
  noun,
  help,
  columns: [{ key: 'name', label: 'Name', render: (r) => r.name || '—' }],
  fields: [NAME],
  search: (r) => [r.name],
});

const TABS = {
  castes: simple('caste', 'Castes offered on profiles and in partner preferences.'),
  gotras: {
    noun: 'gotra',
    size: 'lg',
    help: 'Gotras and the clan each belongs to. The public gotra list on the website is built from this, so only record what is documented.',
    columns: [
      { key: 'name', label: 'Gotra', render: (r) => html`<strong>${r.name}</strong>` },
      { key: 'clan', label: 'Clan', render: (r) => (r.clan && r.clan.name ? r.clan.name : html`<span class="badge badge--warning">No clan</span>`) },
      { key: 'alternateNames', label: 'Also written', render: (r) => list(r.alternateNames) },
      { key: 'statePresence', label: 'States', render: states },
      { key: 'isActive', label: 'Status', render: (r) => yesNo(r.isActive) },
    ],
    fields: [
      NAME,
      { name: 'clan', label: 'Clan', type: 'clan' },
      text('alternateNames', 'Alternate names', { kind: 'list', help: 'Comma separated.' }),
      { name: 'description', label: 'Description', type: 'textarea' },
      text('origin', 'Origin'),
      text('deity', 'Deity'),
      { name: 'statePresence', label: 'Presence by state', type: 'states' },
      ACTIVE,
    ],
    search: (r) => [r.name, r.clan && r.clan.name, ...(r.alternateNames || [])],
  },
  clans: {
    noun: 'clan',
    size: 'lg',
    help: 'The clans gotras are grouped under. A clan that still has gotras cannot be deleted.',
    columns: [
      { key: 'name', label: 'Clan', render: (r) => html`<strong>${r.name}</strong>` },
      { key: 'displayName', label: 'Display name', render: (r) => r.displayName || '—' },
      { key: 'alternateNames', label: 'Also written', render: (r) => list(r.alternateNames) },
      { key: 'statePresence', label: 'States', render: states },
      { key: 'isActive', label: 'Status', render: (r) => yesNo(r.isActive) },
      { key: 'sortOrder', label: 'Order', class: 'num', render: (r) => String(r.sortOrder ?? 0) },
    ],
    fields: [
      NAME,
      text('displayName', 'Display name', { omitEmpty: true, help: 'Left empty on a new clan, the API uses "<name> Gor". Left empty on an edit, the stored display name is kept.' }),
      { name: 'description', label: 'Description', type: 'textarea' },
      text('origin', 'Origin'),
      text('alternateNames', 'Alternate names', { kind: 'list', help: 'Comma separated.' }),
      text('disputedStatus', 'Disputed status', { help: 'Leave empty unless the classification is contested; say by whom.' }),
      { name: 'statePresence', label: 'Presence by state', type: 'states' },
      ACTIVE,
      SORT_ORDER,
    ],
    search: (r) => [r.name, r.displayName, ...(r.alternateNames || [])],
  },
  'surname-titles': {
    noun: 'surname title',
    size: 'lg',
    help: 'Cross-clan titles such as Naik or Rao. These are honorifics, not gotras.',
    columns: [
      { key: 'name', label: 'Title', render: (r) => html`<strong>${r.name}</strong>` },
      { key: 'usageType', label: 'Usage', render: (r) => titleCase(r.usageType || 'title-suffix') },
      { key: 'applicableClans', label: 'Clans', render: (r) => list(r.applicableClans) },
      { key: 'statePresence', label: 'States', render: states },
      { key: 'isActive', label: 'Status', render: (r) => yesNo(r.isActive) },
      { key: 'sortOrder', label: 'Order', class: 'num', render: (r) => String(r.sortOrder ?? 0) },
    ],
    fields: [
      NAME,
      text('alternateSpellings', 'Alternate spellings', { kind: 'list', help: 'Comma separated.' }),
      { name: 'meaning', label: 'Meaning', type: 'textarea' },
      text('origin', 'Origin'),
      { name: 'usagePattern', label: 'Usage pattern', type: 'textarea' },
      { name: 'usageType', label: 'Usage type', type: 'select', fallback: 'title-suffix', options: ['title-suffix', 'occupational', 'status', 'regional-honorific'].map((v) => ({ value: v, label: titleCase(v) })) },
      text('applicableClans', 'Applicable clans', { kind: 'list', help: 'Clan names, comma separated.' }),
      { name: 'statePresence', label: 'Presence by state', type: 'states' },
      ACTIVE,
      SORT_ORDER,
    ],
    search: (r) => [r.name, ...(r.alternateSpellings || []), ...(r.applicableClans || [])],
  },
  professions: simple('profession', 'Professions offered on profiles and in partner preferences.'),
  qualifications: simple('qualification', 'Education levels offered on profiles and in partner preferences.'),
  'income-ranges': {
    noun: 'income range',
    help: 'Annual income bands. Min and max are numbers in rupees and drive the income filter.',
    columns: [
      { key: 'name', label: 'Label', render: (r) => r.name || '—' },
      { key: 'min', label: 'Min', class: 'num', render: (r) => Number(r.min || 0).toLocaleString('en-IN') },
      { key: 'max', label: 'Max', class: 'num', render: (r) => Number(r.max || 0).toLocaleString('en-IN') },
      { key: 'sortOrder', label: 'Order', class: 'num', render: (r) => String(r.sortOrder ?? 0) },
    ],
    fields: [
      text('name', 'Label', { required: true, maxlength: 120 }),
      { name: 'min', label: 'Minimum (rupees a year)', type: 'number', min: 0, step: 1, required: true },
      { name: 'max', label: 'Maximum (rupees a year)', type: 'number', min: 0, step: 1, required: true },
      SORT_ORDER,
    ],
    sort: (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (a.min || 0) - (b.min || 0),
    search: (r) => [r.name],
  },
  interests: {
    noun: 'interest',
    help: 'Interests members can pick on their profile.',
    columns: [{ key: 'title', label: 'Title', render: (r) => r.title || '—' }],
    fields: [text('title', 'Title', { required: true, maxlength: 120 })],
    sort: (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
    search: (r) => [r.title],
  },
  'report-reasons': {
    noun: 'report reason',
    help: 'Reasons a member can choose when reporting a profile. Inactive reasons stay on old reports but are no longer offered.',
    columns: [
      { key: 'title', label: 'Reason', render: (r) => r.title || '—' },
      { key: 'is_active', label: 'Status', render: (r) => yesNo(r.is_active) },
    ],
    fields: [text('title', 'Reason', { required: true, maxlength: 200 }), { name: 'is_active', label: 'Active (offered to members)', type: 'switch', fallback: true }],
    sort: (a, b) => String(a.title || '').localeCompare(String(b.title || '')),
    search: (r) => [r.title],
  },
  'about-options': {
    noun: 'about option',
    help: 'Building blocks for the "About me" helper: tone, trait, hobby and goal phrases.',
    columns: [
      { key: 'category', label: 'Category', render: (r) => html`<span class="badge badge--neutral">${titleCase(r.category || '')}</span>` },
      { key: 'value', label: 'Value', render: (r) => r.value || '—' },
    ],
    fields: [
      { name: 'category', label: 'Category', type: 'select', required: true, fallback: 'tone', options: ['tone', 'trait', 'hobby', 'goal'].map((v) => ({ value: v, label: titleCase(v) })) },
      text('value', 'Value', { required: true, maxlength: 200 }),
    ],
    sort: (a, b) => String(a.category || '').localeCompare(String(b.category || '')) || String(a.value || '').localeCompare(String(b.value || '')),
    search: (r) => [r.category, r.value],
  },
};

/** Where a tab's list lives. */
const endpointFor = (key) => `/admin/constants/${key}`;

// ---------------------------------------------------------------- state
const cache = {};          // key → rows
const tables = {};         // key → table
let current = 'castes';
const searchInput = el('#md-search');
const clanFilter = el('#md-clan');
const aiBtn = el('[data-action="ai-suggest"]');
const helpEl = el('[data-tab-help]');

async function rowsFor(key) {
  if (!cache[key]) {
    const resp = await api(endpointFor(key));
    const rows = Array.isArray(resp.data) ? resp.data : [];
    if (TABS[key].sort) rows.sort(TABS[key].sort);
    cache[key] = rows;
  }
  return cache[key];
}

function tableFor(key) {
  if (tables[key]) return tables[key];
  const cfg = TABS[key];
  tables[key] = createTable({
    mount: el(`[data-md-mount="${key}"]`),
    caption: titleCase(key),
    limit: PAGE_SIZE,
    emptyTitle: `No ${cfg.noun}s found`,
    emptyHint: 'Clear the search or add one.',
    columns: [...cfg.columns, { key: 'actions', label: 'Actions', class: 'table__actions', render: (r) => html`
      <button type="button" class="btn btn--secondary btn--sm" data-action="edit" data-id="${r._id}">Edit</button>
      <button type="button" class="btn btn--danger btn--sm" data-action="delete" data-id="${r._id}">Delete</button>` }],
    fetchPage: async ({ page, limit, search, clan }) => {
      let rows = await rowsFor(key);
      const q = String(search || '').trim().toLowerCase();
      if (q) rows = rows.filter((r) => cfg.search(r).some((v) => String(v || '').toLowerCase().includes(q)));
      if (key === 'gotras' && clan) rows = rows.filter((r) => (clan === 'none' ? !r.clan : r.clan && String(r.clan._id || r.clan) === clan));
      const pages = Math.max(1, Math.ceil(rows.length / limit));
      const p = Math.min(page, pages);
      return { rows: rows.slice((p - 1) * limit, p * limit), pagination: { page: p, pages, total: rows.length, limit } };
    },
    onAction: (action, id, row) => {
      if (action === 'edit') edit(key, row);
      else if (action === 'delete') remove(key, id, row);
    },
  });
  return tables[key];
}

/** Drops the cached list and reloads the table on its current page. */
function reload(key) {
  delete cache[key];
  return tableFor(key).reload();
}

function applySearch() {
  tableFor(current).setParams({ search: searchInput.value.trim(), clan: current === 'gotras' ? clanFilter.value : '' });
}

async function fillClanFilter() {
  try {
    const clans = await rowsFor('clans');
    const keep = clanFilter.value;
    setHtml(clanFilter, html`<option value="">Any clan</option><option value="none">No clan assigned</option>${clans.map((c) => html`<option value="${c._id}">${c.name}</option>`)}`);
    clanFilter.value = keep;
  } catch (e) { /* the clan filter is optional */ }
}

let searchTimer = null;
searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applySearch, 200); });
clanFilter.addEventListener('change', applySearch);
el('#md-filters').addEventListener('submit', (ev) => { ev.preventDefault(); applySearch(); });

initTabs(el('[data-tabs]'), {
  onShow: (key) => {
    current = key;
    helpEl.textContent = TABS[key].help;
    searchInput.value = '';
    searchInput.placeholder = `Search ${titleCase(key).toLowerCase()}`;
    aiBtn.hidden = key !== 'gotras';
    els('[data-gotra-only]').forEach((n) => { n.hidden = key !== 'gotras'; });
    if (key === 'gotras') fillClanFilter();
    applySearch();
  },
});

// ---------------------------------------------------------------- form
function stateRow(key, data = {}) {
  const schema = STATE_SCHEMAS[key];
  return html`<div class="repeater__row" data-state-row>
    <div class="repeater__head"><span>State entry</span><button type="button" class="btn btn--ghost btn--sm" data-action="state-remove">Remove</button></div>
    <div class="form-row">${schema.map((f) => {
    const id = uid('sp');
    const v = data[f.name];
    if (f.type === 'select') {
      return html`<div class="form-group mb-0"><label class="form-label" for="${id}">${f.label}</label><select class="form-select" id="${id}" data-key="${f.name}">${f.options.map((o) => html`<option value="${o}" ${(v || f.fallback) === o ? 'selected' : ''}>${titleCase(o)}</option>`)}</select></div>`;
    }
    return html`<div class="form-group mb-0"><label class="form-label" for="${id}">${f.label}${f.kind === 'list' ? ' (comma separated)' : ''}</label><input class="form-control" type="text" id="${id}" data-key="${f.name}" value="${f.kind === 'list' ? listToText(v) : (v || '')}" autocomplete="off"></div>`;
  })}</div>
  </div>`;
}

function controlFor(key, f, item, clans) {
  const stored = item[f.name];
  const value = stored === undefined || stored === null ? (f.fallback ?? '') : stored;
  if (f.type === 'states') {
    return html`<fieldset class="fieldset">
      <legend class="fieldset__legend">${f.label}</legend>
      <div class="repeater" data-states>${(Array.isArray(stored) ? stored : []).map((row) => stateRow(key, row))}</div>
      <button type="button" class="btn btn--secondary btn--sm" data-action="state-add">Add a state</button>
    </fieldset>`;
  }
  if (f.type === 'clan') {
    const currentId = stored && typeof stored === 'object' ? stored._id : (stored || '');
    return field({ label: f.label, name: f.name, type: 'select', value: currentId, options: [{ value: '', label: 'No clan assigned' }, ...clans.map((c) => ({ value: c._id, label: c.name }))] });
  }
  if (f.kind === 'list') return field({ label: f.label, name: f.name, value: listToText(stored), help: f.help || '' });
  return field({ label: f.label, name: f.name, type: f.type, value, required: !!f.required, maxlength: f.maxlength || null, options: f.options || [], min: f.min ?? null, step: f.step ?? null, help: f.help || '', rows: 3 });
}

function readBody(key, form) {
  const cfg = TABS[key];
  const body = {};
  for (const f of cfg.fields) {
    if (f.type === 'states') {
      body[f.name] = els('[data-state-row]', form).map((row) => {
        const out = {};
        for (const s of STATE_SCHEMAS[key]) {
          const input = row.querySelector(`[data-key="${s.name}"]`);
          const v = input ? input.value.trim() : '';
          out[s.name] = s.kind === 'list' ? textToList(v) : v;
        }
        return out;
      }).filter((row) => row.state);
      continue;
    }
    const input = form.elements[f.name];
    if (!input) continue;
    if (f.type === 'switch' || f.type === 'checkbox') body[f.name] = input.checked;
    else if (f.type === 'number') body[f.name] = input.value === '' ? null : Number(input.value);
    else if (f.type === 'clan') body[f.name] = input.value || null;
    else if (f.kind === 'list') body[f.name] = textToList(input.value);
    else body[f.name] = input.value.trim();
    if (f.omitEmpty && body[f.name] === '') delete body[f.name];
  }
  return body;
}

function validate(key, form, body) {
  clearInvalid(form);
  for (const f of TABS[key].fields) {
    const input = form.elements[f.name];
    if (!input) continue;
    if (f.required && (body[f.name] === '' || body[f.name] === null || body[f.name] === undefined)) return invalid(input, `${f.label} is required.`);
    if (f.type === 'number' && body[f.name] !== null && (!Number.isFinite(body[f.name]) || body[f.name] < 0)) return invalid(input, `${f.label} must be a number, zero or more.`);
  }
  if (key === 'income-ranges' && body.max < body.min) return invalid(form.elements.max, 'The maximum must not be below the minimum.');
  return true;
}

async function edit(key, item) {
  const cfg = TABS[key];
  const isNew = !item;
  const source = item || {};
  let clans = [];
  if (cfg.fields.some((f) => f.type === 'clan')) {
    try { clans = await rowsFor('clans'); } catch (err) { toast.error(errorMessage(err, 'Could not load the clans.')); return; }
  }
  const m = openModal({
    title: `${isNew ? 'Add' : 'Edit'} ${cfg.noun}`,
    size: cfg.size || '',
    body: html`<form data-md-form novalidate>${cfg.fields.map((f) => controlFor(key, f, source, clans))}</form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>${isNew ? 'Add' : 'Save changes'}</button>`,
  });
  const form = m.body.querySelector('[data-md-form]');
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  delegate(form, 'click', '[data-action="state-add"]', () => {
    const host = form.querySelector('[data-states]');
    appendHtml(host, stateRow(key));
    host.lastElementChild.querySelector('input').focus();
  });
  delegate(form, 'click', '[data-action="state-remove"]', (ev, btn) => {
    btn.closest('[data-state-row]').remove();
    form.querySelector('[data-action="state-add"]').focus();
  });
  const submit = () => busy(save, async () => {
    const body = readBody(key, form);
    if (!validate(key, form, body)) return;
    try {
      await api(isNew ? endpointFor(key) : `${endpointFor(key)}/${source._id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast.success(`${titleCase(cfg.noun)} ${isNew ? 'added' : 'saved'}`);
      m.close();
      if (key === 'clans') delete cache.gotras; // gotras carry the populated clan
      reload(key);
    } catch (err) { toast.error(errorMessage(err, `Could not save the ${cfg.noun}.`)); }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

async function remove(key, id, row) {
  const cfg = TABS[key];
  const label = (row && (row.name || row.title || row.value)) || `this ${cfg.noun}`;
  const ok = await confirm({
    title: `Delete ${cfg.noun}?`,
    message: `"${label}" is removed from the list.`,
    detail: 'The API refuses the delete while any member or record still uses it.',
    confirmText: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    await api(`${endpointFor(key)}/${id}`, { method: 'DELETE' });
    toast.success(`${titleCase(cfg.noun)} deleted`);
    reload(key);
  } catch (err) {
    if (err && err.status === 409) {
      const m = openModal({
        title: `"${truncate(label, 60)}" is in use`,
        size: 'sm',
        body: html`<p>${errorMessage(err, 'This item is still in use and cannot be deleted.')}</p><p class="form-help">Mark it inactive instead (where the list has that switch), or move those records to another value first.</p>`,
        footer: html`<button type="button" class="btn btn--primary" data-ok>OK</button>`,
      });
      m.footer.querySelector('[data-ok]').addEventListener('click', () => m.close());
    } else {
      toast.error(errorMessage(err, `Could not delete the ${cfg.noun}.`));
    }
  }
}

// ---------------------------------------------------------------- AI clan suggestions (gotras)
const CONFIDENCE_BADGE = { high: 'success', medium: 'warning', low: 'danger' };

async function aiSuggest() {
  const m = openModal({
    title: 'Suggest clans for unassigned gotras',
    size: 'lg',
    body: html`<p>The AI proposes a clan for each gotra that has none. Nothing is saved until you review the rows and choose Apply selected. Low-confidence and unmatched rows start unticked.</p>
      <div data-ai-body><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div><p class="form-help" role="status">Asking the AI. This can take up to a minute.</p></div>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Close</button><button type="button" class="btn btn--primary" data-apply disabled>Apply selected</button>`,
  });
  const body = m.body.querySelector('[data-ai-body]');
  const apply = m.footer.querySelector('[data-apply]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());

  let suggestions = [];
  let clans = [];
  try {
    [clans, suggestions] = await Promise.all([
      rowsFor('clans'),
      api('/admin/gotras/ai-suggest', { method: 'POST', body: {}, timeout: 150000 }).then((r) => r.data || []),
    ]);
  } catch (err) {
    setHtml(body, html`<div class="alert alert--error alert--flush" role="alert">${errorMessage(err, 'The AI suggestion request failed.')}</div>`);
    return;
  }
  if (!suggestions.length) {
    setHtml(body, html`<div class="empty"><div class="empty__title">Every gotra already has a clan</div><div class="empty__hint">There is nothing to suggest.</div></div>`);
    return;
  }

  const selected = () => els('[data-ai-row]', body).map((tr) => ({
    gotraId: tr.dataset.aiRow,
    clanId: tr.querySelector('select').value,
    checked: tr.querySelector('input[type="checkbox"]').checked,
  })).filter((r) => r.checked && r.clanId);
  const sync = () => {
    const n = selected().length;
    apply.disabled = n === 0;
    apply.textContent = n ? `Apply ${n} selected` : 'Apply selected';
  };

  setHtml(body, html`
    <div class="cluster mt-3">
      <button type="button" class="btn btn--secondary btn--sm" data-ai-select="high">Select high confidence</button>
      <button type="button" class="btn btn--secondary btn--sm" data-ai-select="all">Select all matched</button>
      <button type="button" class="btn btn--secondary btn--sm" data-ai-select="none">Clear selection</button>
      <span class="muted">${suggestions.length} unassigned gotra${suggestions.length === 1 ? '' : 's'} checked</span>
    </div>
    <div class="table-wrap mt-3"><table class="table table--compact">
      <caption class="sr-only">AI clan suggestions</caption>
      <thead><tr><th scope="col">Apply</th><th scope="col">Gotra</th><th scope="col">Clan</th><th scope="col">Confidence</th><th scope="col">Reasoning</th></tr></thead>
      <tbody>${suggestions.map((s) => {
    const id = uid('ai');
    const on = !!s.suggestedClanId && s.confidence !== 'low';
    return html`<tr data-ai-row="${s.gotraId}" data-confidence="${s.confidence || 'low'}" data-matched="${s.suggestedClanId ? '1' : ''}">
          <td><input type="checkbox" id="${id}-cb" ${on ? 'checked' : ''} aria-label="${`Apply the suggestion for ${s.name}`}"></td>
          <td><strong>${s.name}</strong></td>
          <td><label class="sr-only" for="${id}-clan">${`Clan for ${s.name}`}</label><select class="form-select" id="${id}-clan"><option value="">Skip</option>${clans.map((c) => html`<option value="${c._id}" ${String(c._id) === String(s.suggestedClanId || '') ? 'selected' : ''}>${c.name}</option>`)}</select></td>
          <td><span class="badge badge--${CONFIDENCE_BADGE[s.confidence] || 'neutral'}">${titleCase(s.confidence || 'low')}</span></td>
          <td><span class="cell-wrap">${s.reasoning || '—'}</span></td>
        </tr>`;
  })}</tbody></table></div>`);

  delegate(body, 'click', '[data-ai-select]', (ev, btn) => {
    const mode = btn.dataset.aiSelect;
    els('[data-ai-row]', body).forEach((tr) => {
      const cb = tr.querySelector('input[type="checkbox"]');
      if (mode === 'none') cb.checked = false;
      else if (mode === 'all') cb.checked = !!tr.querySelector('select').value;
      else cb.checked = tr.dataset.confidence === 'high' && !!tr.dataset.matched && !!tr.querySelector('select').value;
    });
    sync();
  });
  body.addEventListener('change', sync);
  sync();

  apply.addEventListener('click', async () => {
    const rows = selected();
    if (!rows.length) return;
    const ok = await confirm({
      title: `Assign a clan to ${rows.length} gotra${rows.length === 1 ? '' : 's'}?`,
      message: 'The selected gotras are updated now and the public gotra list changes with them.',
      confirmText: 'Apply',
    });
    if (!ok) return;
    await busy(apply, async () => {
      try {
        const resp = await api('/admin/gotras/ai-apply', { method: 'POST', body: { assignments: rows.map((r) => ({ gotraId: r.gotraId, clanId: r.clanId })) } });
        toast.success(`${resp.modifiedCount ?? rows.length} gotra${rows.length === 1 ? '' : 's'} updated`);
        m.close();
        reload('gotras');
      } catch (err) { toast.error(errorMessage(err, 'Could not apply the suggestions.')); }
    });
  });
}

delegate(document, 'click', '[data-action="create"]', () => edit(current, null));
aiBtn.addEventListener('click', aiSuggest);
