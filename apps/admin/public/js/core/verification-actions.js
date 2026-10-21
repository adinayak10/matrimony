// Verification review helpers shared by /verifications and /users/:id
// (Verification tab).
//   GET    /api/admin/verifications/:id/files/selfie|document-0|document-1   (private file, same origin via the proxy)
//   POST   /api/admin/verifications/:id/approve
//   POST   /api/admin/verifications/:id/reject {reason}
//   DELETE /api/admin/verifications/:id/files
// The images are same-origin (/api/... through routes/proxy.js), so CSP
// img-src 'self' allows them and the session cookie authorises the request.
import { api, errorMessage } from './api.js';
import { html } from './dom.js';
import { fmtDateTime, titleCase } from './format.js';
import { openModal } from './modal.js';
import { confirm } from './confirm.js';
import { toast } from './toast.js';
import { IMAGE_FALLBACK } from './imageUrl.js';

export const VERIFICATION_BADGE = { pending: 'warning', approved: 'success', rejected: 'danger' };
const FILE_LABEL = { selfie: 'Selfie', 'document-0': 'Document (front)', 'document-1': 'Document (back)' };
const ID = /^[a-f0-9]{24}$/i;

export function verificationBadge(status) {
  const s = status || 'pending';
  return html`<span class="badge badge--${VERIFICATION_BADGE[s] || 'neutral'}">${titleCase(s)}</span>`;
}

export function fileUrl(id, kind) {
  if (!ID.test(String(id || '')) || !FILE_LABEL[kind]) return IMAGE_FALLBACK;
  return `/api/admin/verifications/${id}/files/${kind}`;
}

/** Which private files this request still has. Never guesses for a purged request. */
export function fileKinds(v) {
  if (!v || v.filesPurgedAt) return [];
  if (Array.isArray(v.files)) return v.files.filter((k) => FILE_LABEL[k]);
  const kinds = [];
  const docs = Array.isArray(v.documentFiles) ? v.documentFiles : null;
  if (v.selfieFile || v.hasSelfie) kinds.push('selfie');
  if (docs) docs.slice(0, 2).forEach((d, i) => { if (d) kinds.push(`document-${i}`); });
  // The API may strip private paths from the payload: then ask for the usual pair
  // and let the image fallback cover a missing one.
  if (!kinds.length && v.selfieFile === undefined && docs === null) return ['selfie', 'document-0'];
  return kinds;
}

/** <figure>s with the selfie and document images; a notice once files are purged. */
export function filesMarkup(v) {
  if (v && v.filesPurgedAt) {
    return html`<p class="form-help">The uploaded files were deleted on ${fmtDateTime(v.filesPurgedAt)} (retention policy or an admin purge).</p>`;
  }
  const kinds = fileKinds(v);
  if (!kinds.length) return html`<p class="form-help">No files on this request.</p>`;
  return html`<div class="doc-grid">${kinds.map((k) => html`<figure class="doc-figure">
    <a href="${fileUrl(v._id, k)}" target="_blank" rel="noopener"><img src="${fileUrl(v._id, k)}" alt="${FILE_LABEL[k]} submitted by the member" data-fallback="${IMAGE_FALLBACK}" loading="lazy"></a>
    <figcaption><span>${FILE_LABEL[k]}</span><a href="${fileUrl(v._id, k)}" target="_blank" rel="noopener">Open</a></figcaption>
  </figure>`)}</div>`;
}

/** Reason modal. Resolves the trimmed reason, or null on cancel. */
export function askReason({ title = 'Reject', message = '', label = 'Reason', confirmText = 'Reject', required = true, maxlength = 500 } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (val) => { if (!done) { done = true; resolve(val); } };
    const m = openModal({
      title,
      size: 'sm',
      body: html`${message ? html`<p>${message}</p>` : ''}
        <div class="form-group"><label class="form-label" for="ask-reason">${label}${required ? html` <span class="text-danger" aria-hidden="true">*</span>` : ''}</label>
        <textarea class="form-control" id="ask-reason" maxlength="${maxlength}" ${required ? 'required' : ''}></textarea>
        <p class="form-error" hidden data-err>A reason is required.</p></div>`,
      footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--danger" data-ok>${confirmText}</button>`,
      onClose: () => finish(null),
    });
    m.footer.querySelector('[data-cancel]').addEventListener('click', () => { finish(null); m.close(); });
    m.footer.querySelector('[data-ok]').addEventListener('click', () => {
      const ta = m.body.querySelector('#ask-reason');
      const reason = ta.value.trim();
      if (required && !reason) { m.body.querySelector('[data-err]').hidden = false; ta.classList.add('is-invalid'); ta.focus(); return; }
      finish(reason); m.close();
    });
  });
}

const who = (v) => (v && v.user && typeof v.user === 'object' && v.user.full_name) || v.fullName || 'the member';

/** Confirm + approve. Resolves true when the request was approved. */
export async function approveVerification(v) {
  const ok = await confirm({
    title: 'Approve this verification?',
    message: `${who(v)} gets the verified badge and a notification.`,
    detail: 'Check that the name and photo on the document match the selfie and the profile.',
    confirmText: 'Approve',
  });
  if (!ok) return false;
  try {
    await api(`/admin/verifications/${v._id}/approve`, { method: 'POST', body: {} });
    toast.success('Verification approved');
    return true;
  } catch (err) {
    toast.error(errorMessage(err, 'Could not approve the verification.'));
    return false;
  }
}

/** Required reason + reject. Resolves true when the request was rejected. */
export async function rejectVerification(v) {
  const reason = await askReason({
    title: 'Reject verification',
    message: `${who(v)} is told the reason and can submit again.`,
    label: 'Reason (shown to the member)',
    confirmText: 'Reject',
  });
  if (reason === null) return false;
  try {
    await api(`/admin/verifications/${v._id}/reject`, { method: 'POST', body: { reason } });
    toast.success('Verification rejected');
    return true;
  } catch (err) {
    toast.error(errorMessage(err, 'Could not reject the verification.'));
    return false;
  }
}

/** Deletes the private files of a reviewed request now instead of at retention. */
export async function purgeVerificationFiles(v) {
  const ok = await confirm({
    title: 'Delete the uploaded files?',
    message: 'The selfie and document images are deleted from the server. The decision and its history are kept.',
    confirmText: 'Delete files',
    danger: true,
  });
  if (!ok) return false;
  try {
    await api(`/admin/verifications/${v._id}/files`, { method: 'DELETE' });
    toast.success('Files deleted');
    return true;
  } catch (err) {
    toast.error(errorMessage(err, 'Could not delete the files.'));
    return false;
  }
}
