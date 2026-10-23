// Settings (C3.7 + integrator conflict #16).
// Verified in apps/api/controllers/admin/settingsController.js (ALLOWED) and authController.js:
//   GET  /api/admin/settings → data (the settings document)
//   PUT  /api/admin/settings   allowlist only: appName, helpUrl, termsUrl, privacyPolicyUrl,
//        setRoomUsersLimit, maxImagesCanBeUploadedInOnePost, minuteLimitInCreatingStory,
//        isAdmobOn, adBannerAndroid, adInterstitialAndroid,
//        matching.enforceGotraExogamy, security.legacySocketJoin, limits.interestDailyCap,
//        biodata.enabled, biodata.guestDownloads, biodata.maxPerUser (1..50), biodata.shareDefaultDays (1..365),
//        biodata.languages (sent as comma text "en, hi"; the API coerces it to a list that always has 'en')
//        Nested fields are sent as NESTED OBJECTS ({ security: { legacySocketJoin: false } }):
//        express-mongo-sanitize strips body keys that contain a dot. apk.* is never sent here.
//   POST /api/admin/auth/change-password { currentPassword, newPassword } → { reauth: true }
//        (401 = wrong current password, so the call opts out of the 401 → /login redirect)
// Only the fields that changed are sent, so an untouched field can never be overwritten.
import { api, errorMessage } from '../core/api.js';
import { el, els } from '../core/dom.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { invalid, clearInvalid } from '../core/fields.js';
import { busy } from '../core/ui.js';

const form = el('#settings-form');
const saveBtn = el('[data-save]', form);
const resetBtn = el('[data-action="reset"]', form);
const dirtyNote = el('[data-dirty-note]', form);
const loadError = el('[data-load-error]');
const controls = () => Array.from(form.elements).filter((c) => c.name);
const getPath = (obj, path) => path.split('.').reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), obj);
// Defaults the API applies when a nested block has never been saved (models/settings.js).
const DEFAULTS = {
  'matching.enforceGotraExogamy': true,
  'security.legacySocketJoin': true,
  'limits.interestDailyCap': 20,
  'biodata.enabled': true,
  'biodata.guestDownloads': true,
  'biodata.maxPerUser': 10,
  'biodata.shareDefaultDays': 30,
  'biodata.languages': 'en, hi',
};

/** [ 'en', 'hi' ] or ' EN,hi,,en ' → 'en, hi' (lower case, no blanks, no repeats). */
function normaliseList(v) {
  const items = (Array.isArray(v) ? v : String(v == null ? '' : v).split(','))
    .map((x) => String(x).trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(items)].join(', ');
}

let loaded = {};   // name → value as last loaded/saved

function readControl(c) {
  if (c.type === 'checkbox') return c.checked;
  if (c.hasAttribute('data-number')) return c.value === '' ? null : Number(c.value);
  if (c.hasAttribute('data-list')) return normaliseList(c.value);
  return c.value.trim();
}

function writeControl(c, value) {
  if (c.type === 'checkbox') c.checked = !!value;
  else if (c.hasAttribute('data-list')) c.value = normaliseList(value);
  else c.value = value === null || value === undefined ? '' : String(value);
}

function changes() {
  const out = {};
  for (const c of controls()) {
    const now = readControl(c);
    if (now !== loaded[c.name]) out[c.name] = now;
  }
  return out;
}

function syncDirty() {
  const n = Object.keys(changes()).length;
  saveBtn.disabled = n === 0;
  resetBtn.disabled = n === 0;
  dirtyNote.textContent = n ? `${n} unsaved change${n === 1 ? '' : 's'}` : 'No unsaved changes';
}

function apply(settings) {
  loaded = {};
  for (const c of controls()) {
    let v = getPath(settings, c.name);
    if (v === undefined || v === null) v = c.name in DEFAULTS ? DEFAULTS[c.name] : (c.type === 'checkbox' ? false : (c.hasAttribute('data-number') ? null : ''));
    writeControl(c, v);
    c.disabled = false;
    loaded[c.name] = readControl(c);
  }
  form.setAttribute('aria-busy', 'false');
  syncDirty();
}

async function load() {
  loadError.hidden = true;
  form.setAttribute('aria-busy', 'true');
  try {
    const { data } = await api('/admin/settings');
    apply(data || {});
  } catch (err) {
    el('[data-load-error-text]').textContent = errorMessage(err, 'Could not load the settings.');
    loadError.hidden = false;
  }
}

function validate(diff) {
  clearInvalid(form);
  for (const c of els('[data-url]', form)) {
    if (c.name in diff && diff[c.name] && !/^https:\/\/[^\s]+$/i.test(diff[c.name])) return invalid(c, 'Enter a full https:// address.');
  }
  for (const c of els('[data-number]', form)) {
    if (!(c.name in diff)) continue;
    const v = diff[c.name];
    if (v === null || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return invalid(c, 'Enter a whole number, zero or more.');
  }
  const cap = diff['limits.interestDailyCap'];
  if (cap !== undefined && (cap < 1 || cap > 500)) return invalid(form.elements['limits.interestDailyCap'], 'Enter a number between 1 and 500.');
  const perUser = diff['biodata.maxPerUser'];
  if (perUser !== undefined && (perUser < 1 || perUser > 50)) return invalid(form.elements['biodata.maxPerUser'], 'Enter a number between 1 and 50.');
  const days = diff['biodata.shareDefaultDays'];
  if (days !== undefined && (days < 1 || days > 365)) return invalid(form.elements['biodata.shareDefaultDays'], 'Enter a number between 1 and 365.');
  if ('biodata.languages' in diff) {
    const langs = diff['biodata.languages'] ? diff['biodata.languages'].split(', ') : [];
    const input = form.elements['biodata.languages'];
    if (!langs.includes('en')) return invalid(input, 'English (en) must stay in the list.');
    if (langs.some((l) => !/^[a-z]{2}$/.test(l))) return invalid(input, 'Use two-letter language codes such as en, hi.');
  }
  return true;
}

/** { 'security.legacySocketJoin': false } → { security: { legacySocketJoin: false } } */
function nest(diff) {
  const body = {};
  for (const [path, value] of Object.entries(diff)) {
    const parts = path.split('.');
    let node = body;
    for (let i = 0; i < parts.length - 1; i += 1) { node[parts[i]] = node[parts[i]] || {}; node = node[parts[i]]; }
    node[parts[parts.length - 1]] = value;
  }
  return body;
}

async function save() {
  const diff = changes();
  if (!Object.keys(diff).length || !validate(diff)) return;

  if ('security.legacySocketJoin' in diff) {
    const off = diff['security.legacySocketJoin'] === false;
    const ok = await confirm({
      title: off ? 'Switch off legacy socket join?' : 'Switch legacy socket join back on?',
      message: off
        ? 'Every member on an app build without token-based chat loses chat and calls immediately, until they update the app.'
        : 'Old app builds can connect again by sending a bare user id. That is not proof of identity.',
      detail: off ? 'Do this only after the mandatory update is live and legacy joins have been at zero for seven days.' : 'Only do this to recover from an outage caused by switching it off too early.',
      confirmText: off ? 'Switch it off' : 'Switch it on',
      danger: true,
      typed: off ? 'OFF' : 'ON',
    });
    if (!ok) return;
  }
  if ('biodata.enabled' in diff && diff['biodata.enabled'] === false) {
    const ok = await confirm({
      title: 'Switch off the biodata maker?',
      message: 'Members and visitors can no longer build, save or download biodatas until it is switched back on. Existing biodatas are kept.',
      confirmText: 'Switch it off',
      danger: true,
    });
    if (!ok) return;
  }
  if ('matching.enforceGotraExogamy' in diff && diff['matching.enforceGotraExogamy'] === false) {
    const ok = await confirm({
      title: 'Stop enforcing gotra exogamy?',
      message: 'Members will be shown profiles from their own gotra. This changes match results for everyone at once.',
      confirmText: 'Stop enforcing',
      danger: true,
    });
    if (!ok) return;
  }

  try {
    const resp = await api('/admin/settings', { method: 'PUT', body: nest(diff) });
    toast.success('Settings saved');
    apply(resp.data || {});
  } catch (err) { toast.error(errorMessage(err, 'Could not save the settings.')); }
}

form.addEventListener('input', syncDirty);
form.addEventListener('change', syncDirty);
form.addEventListener('submit', (ev) => { ev.preventDefault(); busy(saveBtn, save); });
resetBtn.addEventListener('click', () => {
  clearInvalid(form);
  for (const c of controls()) writeControl(c, loaded[c.name]);
  syncDirty();
});
el('[data-action="retry"]').addEventListener('click', load);
window.addEventListener('beforeunload', (ev) => { if (Object.keys(changes()).length) { ev.preventDefault(); ev.returnValue = ''; } });

// ---- Change password ---------------------------------------------------------
const pwForm = el('#password-form');
pwForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(el('[data-save-password]', pwForm), async () => {
    clearInvalid(pwForm);
    const f = pwForm.elements;
    const currentPassword = f.currentPassword.value;
    const newPassword = f.newPassword.value;
    if (!currentPassword) { invalid(f.currentPassword, 'Enter your current password.'); return; }
    if (newPassword.length < 12) { invalid(f.newPassword, 'Use at least 12 characters.'); return; }
    if (newPassword === currentPassword) { invalid(f.newPassword, 'The new password must differ from the current one.'); return; }
    if (f.confirmPassword.value !== newPassword) { invalid(f.confirmPassword, 'The two new passwords do not match.'); return; }
    try {
      await api('/admin/auth/change-password', { method: 'POST', body: { currentPassword, newPassword }, authRedirect: false });
    } catch (err) {
      if (err.status === 401) { f.currentPassword.value = ''; invalid(f.currentPassword, 'The current password is incorrect.'); return; }
      toast.error(errorMessage(err, 'Could not change the password.'));
      return;
    }
    pwForm.reset();
    toast.success('Password changed. Signing you out…');
    // The API revoked every admin token (this one included): drop the cookie and sign in again.
    try {
      await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'admin', Accept: 'application/json' } });
    } catch (e) { /* the login page clears a dead cookie anyway */ }
    setTimeout(() => location.assign('/login'), 900);
  });
});

load();
