// APK manager (C3.7). Verified in apps/api/routes/adminRoutes.js + middleware/apkUpload.js:
//   GET    /api/admin/apk/info        → data null | { versionName, versionCode, fileName, filePath, fileSize,
//                                        releaseNotes, isMandatoryUpdate, downloadCount, lastUpdated }
//   POST   /api/admin/apk/upload      multipart: apkFile (.apk, ≤150 MB), versionName, versionCode,
//                                        releaseNotes, isMandatoryUpdate ('true'|'false')
//   PUT    /api/admin/apk/update-info { versionName?, versionCode?, releaseNotes?, isMandatoryUpdate? }
//   DELETE /api/admin/apk/delete
// The app reads the result through POST /api/fetchSetting (apkVersion) and GET /api/download-apk;
// neither is called from here. After a delete the API keeps a placeholder record
// (version 1.0.0, empty fileName), which this page treats as "no APK".
import { api, apiUpload, errorMessage } from '../core/api.js';
import { html, setHtml, el, delegate } from '../core/dom.js';
import { fmtBytes, fmtDateTime, fmtNumber } from '../core/format.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid } from '../core/fields.js';
import { busy, apiPublicUrl } from '../core/ui.js';

const MAX_BYTES = 150 * 1024 * 1024;
const currentEl = el('[data-current]');
const actionsEl = el('[data-current-actions]');
const mandatory = el('#apk-mandatory');
const mandatoryLabel = el('[data-mandatory-label]');
const mandatoryHelp = el('[data-mandatory-help]');
const uploadForm = el('#apk-upload-form');
const progressWrap = el('[data-upload-progress]');
const progress = el('#apk-progress');
const pct = el('[data-upload-pct]');

let apk = null; // null = no file on the server

function renderCurrent() {
  currentEl.setAttribute('aria-busy', 'false');
  actionsEl.hidden = !apk;
  mandatory.disabled = !apk;
  mandatory.checked = !!(apk && apk.isMandatoryUpdate);
  mandatoryLabel.textContent = mandatory.checked ? 'Mandatory update is ON' : 'Mandatory update is off';
  if (!apk) {
    setHtml(currentEl, html`<div class="empty empty--inline"><div class="empty__title">No APK uploaded</div><div class="empty__hint">Upload a build below. Until then the app offers no download.</div></div>`);
    mandatoryHelp.textContent = 'There is no APK to make mandatory. Upload a build first.';
    return;
  }
  mandatoryHelp.textContent = mandatory.checked
    ? `Every app user on a versionCode below ${apk.versionCode} is blocked until they update.`
    : `When this is on, every app user on a versionCode below ${apk.versionCode} is blocked until they update. Test the build first.`;
  setHtml(currentEl, html`
    <dl class="key-value">
      <dt>Version</dt><dd><strong>${apk.versionName || '—'}</strong> <span class="muted">(versionCode ${apk.versionCode ?? '—'})</span> ${apk.isMandatoryUpdate ? html`<span class="badge badge--danger">Mandatory</span>` : html`<span class="badge badge--neutral">Optional</span>`}</dd>
      <dt>File</dt><dd class="mono">${apk.fileName}</dd>
      <dt>Size</dt><dd>${fmtBytes(apk.fileSize)}</dd>
      <dt>Downloads</dt><dd>${fmtNumber(apk.downloadCount, '0')}</dd>
      <dt>Last updated</dt><dd>${fmtDateTime(apk.lastUpdated)}</dd>
      <dt>Release notes</dt><dd class="pre-wrap">${apk.releaseNotes || '—'}</dd>
      <dt>Download link</dt><dd><a href="${apiPublicUrl('/api/download-apk')}" rel="noopener noreferrer">${apiPublicUrl('/api/download-apk')}</a><span class="cell-sub">Opening it counts as a download.</span></dd>
    </dl>`);
}

async function load() {
  currentEl.setAttribute('aria-busy', 'true');
  try {
    const { data } = await api('/admin/apk/info');
    apk = data && data.fileName ? data : null;
    renderCurrent();
  } catch (err) {
    currentEl.setAttribute('aria-busy', 'false');
    actionsEl.hidden = true;
    mandatory.disabled = true;
    setHtml(currentEl, html`<div class="alert alert--error alert--flush" role="alert"><span>${errorMessage(err, 'Could not load the APK details.')}</span><button type="button" class="btn btn--secondary btn--sm alert__retry" data-action="retry">Retry</button></div>`);
  }
}

// ---- Mandatory update: a dedicated switch behind a confirm that states the consequence
mandatory.addEventListener('change', async () => {
  if (!apk) { mandatory.checked = false; return; }
  const turnOn = mandatory.checked;
  const ok = await confirm({
    title: turnOn ? 'Make this update mandatory?' : 'Stop forcing this update?',
    message: turnOn
      ? `Every app user on versionCode < ${apk.versionCode} will be blocked until they update. They cannot use the app at all until they install version ${apk.versionName}.`
      : `Members on a versionCode below ${apk.versionCode} can use the app again without updating.`,
    detail: turnOn ? 'Make sure this exact file installs and runs on a real phone first. A broken mandatory build locks everyone out.' : '',
    confirmText: turnOn ? 'Force the update' : 'Stop forcing it',
    danger: turnOn,
    typed: turnOn ? String(apk.versionCode) : null,
  });
  if (!ok) { mandatory.checked = !turnOn; return; }
  mandatory.disabled = true;
  try {
    await api('/admin/apk/update-info', { method: 'PUT', body: { isMandatoryUpdate: turnOn } });
    toast.success(turnOn ? 'The update is now mandatory' : 'The update is no longer mandatory');
  } catch (err) {
    toast.error(errorMessage(err, 'Could not change the mandatory flag.'));
  }
  await load();
});

// ---- Edit info (never the mandatory flag: that has its own switch)
function editInfo() {
  if (!apk) return;
  const m = openModal({
    title: 'Edit APK info',
    body: html`<form data-info-form novalidate>
      <div class="form-row">
        ${field({ label: 'Version name', name: 'versionName', value: apk.versionName || '', maxlength: 40, required: true })}
        ${field({ label: 'Version code', name: 'versionCode', type: 'number', value: apk.versionCode ?? '', min: 1, step: 1, required: true, help: 'Must match the versionCode inside the uploaded file.' })}
      </div>
      ${field({ label: 'Release notes', name: 'releaseNotes', type: 'textarea', value: apk.releaseNotes || '', maxlength: 2000, rows: 5 })}
      ${apk.isMandatoryUpdate ? html`<p class="form-help">This update is mandatory: raising the version code blocks more app users at once.</p>` : ''}
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>Save changes</button>`,
  });
  const form = m.body.querySelector('[data-info-form]');
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const submit = () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const versionName = f.versionName.value.trim();
    const versionCode = Number(f.versionCode.value);
    if (!versionName) { invalid(f.versionName, 'A version name is required.'); return; }
    if (!Number.isInteger(versionCode) || versionCode < 1) { invalid(f.versionCode, 'Enter a whole number, 1 or more.'); return; }
    try {
      await api('/admin/apk/update-info', { method: 'PUT', body: { versionName, versionCode, releaseNotes: f.releaseNotes.value } });
      toast.success('APK info saved');
      m.close();
      load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save the APK info.')); }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

async function deleteApk() {
  if (!apk) return;
  const ok = await confirm({
    title: 'Delete the APK?',
    message: `Version ${apk.versionName} is removed from the server. The download link stops working and the app can no longer offer this update.`,
    detail: apk.isMandatoryUpdate ? 'This update is mandatory right now. Deleting the file also switches the mandatory flag off.' : '',
    confirmText: 'Delete APK',
    danger: true,
    typed: 'DELETE',
  });
  if (!ok) return;
  try {
    await api('/admin/apk/delete', { method: 'DELETE' });
    toast.success('APK deleted');
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the APK.')); }
  load();
}

// ---- Upload with progress
uploadForm.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(el('[data-upload]', uploadForm), async () => {
    clearInvalid(uploadForm);
    const f = uploadForm.elements;
    const file = f.apkFile.files && f.apkFile.files[0];
    const versionName = f.versionName.value.trim();
    const versionCode = Number(f.versionCode.value);
    if (!file) { invalid(f.apkFile, 'Choose the .apk file.'); return; }
    if (!/\.apk$/i.test(file.name)) { invalid(f.apkFile, 'The file must end in .apk.'); return; }
    if (file.size > MAX_BYTES) { invalid(f.apkFile, `The file is ${fmtBytes(file.size)}; the limit is 150 MB.`); return; }
    if (!versionName) { invalid(f.versionName, 'A version name is required.'); return; }
    if (!Number.isInteger(versionCode) || versionCode < 1) { invalid(f.versionCode, 'Enter a whole number, 1 or more.'); return; }
    if (apk && versionCode <= Number(apk.versionCode)) {
      const ok = await confirm({
        title: 'Version code is not higher',
        message: `The current APK is versionCode ${apk.versionCode}. Phones only see an update when the new code is higher.`,
        confirmText: 'Upload anyway',
      });
      if (!ok) return;
    }
    if (apk) {
      const ok = await confirm({
        title: 'Replace the current APK?',
        message: `Version ${apk.versionName} (${fmtBytes(apk.fileSize)}) is deleted and replaced by ${versionName}. The download count restarts at zero${apk.isMandatoryUpdate ? ' and the mandatory flag is switched off' : ''}.`,
        confirmText: 'Replace',
        danger: true,
      });
      if (!ok) return;
    }

    const fd = new FormData();
    // Text fields first so the API has them when the file stream ends.
    fd.append('versionName', versionName);
    fd.append('versionCode', String(versionCode));
    fd.append('releaseNotes', f.releaseNotes.value);
    fd.append('isMandatoryUpdate', 'false');
    fd.append('apkFile', file);

    progress.value = 0;
    pct.textContent = '0%';
    progressWrap.hidden = false;
    try {
      await apiUpload('/admin/apk/upload', fd, (p) => { progress.value = p; pct.textContent = `${p}%`; }, { timeout: 175000 });
      toast.success(`APK ${versionName} uploaded`);
      uploadForm.reset();
      await load();
    } catch (err) {
      toast.error(errorMessage(err, 'The upload failed.'));
    } finally {
      progressWrap.hidden = true;
    }
  });
});

delegate(document, 'click', '[data-action="edit-info"]', editInfo);
delegate(document, 'click', '[data-action="delete-apk"]', deleteApk);
delegate(document, 'click', '[data-action="retry"]', load);

load();
