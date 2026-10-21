// User detail (C3.1). Reads the id from [data-user-id] (set by routes/pages.js).
//   GET    /api/admin/users/:id                → data (populated) + data.photos + data.stats
//   PUT    /api/admin/users/:id                {full_name,email,phone,gender,dob,bio,maritalStatus,height}
//   POST   /api/admin/users/:id/verify         {verify}      (sends push + email)
//   POST   /api/admin/users/:id/block          {block, reason}
//   POST   /api/admin/users/:id/reset-password {newPassword}
//   DELETE /api/admin/users/:id
//   GET    /api/admin/users/:id/activity, /blocks
//   GET    /api/admin/reports?reportedUser=:id (C4.2 filter)
//   POST   /api/admin/photos/:id/approve | /reject {reason}
//   POST   /api/assignMembership {user_id, plan_id}
//   GET    /api/admin/membership-plans            → data [{ _id, name, duration_days, price }]
//   GET    /api/admin/verifications?userId=:id    (Verification tab; rows filtered to this member here too)
//          + approve/reject/files via core/verification-actions.js
//   POST   /api/admin/users/:id/recommend {targetUserId, note?, notifyBoth?} → data { warnings? }; 409 duplicate
//   GET    /api/admin/users/:id/recommendations   → data [{ _id, targetUser, note, notifyBoth, createdBy, createdAt }]
//   DELETE /api/admin/recommendations/:id
// Never renders user.password; the API stops returning it in C4.1.
import { api, errorMessage } from '../core/api.js';
import { html, raw, setHtml, el, els, delegate, formValues } from '../core/dom.js';
import { fmtDate, fmtDateTime, timeAgo, fmtNumber, titleCase, ageFromDob, toDateInput, truncate } from '../core/format.js';
import { imageUrl, bindImageFallbacks, IMAGE_FALLBACK } from '../core/imageUrl.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { bindTypeahead } from '../core/typeahead.js';
import { bindCounters } from '../core/fields.js';
import { busy } from '../core/ui.js';
import { verificationBadge, filesMarkup, approveVerification, rejectVerification, purgeVerificationFiles } from '../core/verification-actions.js';

const root = el('[data-user-id]');
const userId = root ? root.dataset.userId : '';
let user = null;
const loaded = new Set();

const GENDERS = ['Male', 'Female', 'Not specified'];
const MARITAL = ['Single', 'Divorced', 'Widowed', 'Never Married'];
const CREATED_BY = { self: 'Self', parent: 'Parent', sibling: 'Sibling', relative: 'Relative', friend: 'Friend' };
const createdByLabel = (v) => CREATED_BY[String(v || 'self').toLowerCase()] || titleCase(v);
const completion = (u) => (u.profileCompletion && u.profileCompletion.percentage != null ? Math.round(Number(u.profileCompletion.percentage) || 0) : null);

const nameOf = (ref) => (ref && typeof ref === 'object' ? (ref.name || ref.title || '') : '') || '—';
const val = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
const yesNo = (v) => (v === true ? 'Yes' : v === false ? 'No' : '—');

function panel(key) { return el(`[data-panel="${key}"] [data-panel-body]`); }

// ---- Header ---------------------------------------------------------------
function renderHead() {
  const u = user;
  const crumb = el('[data-user-crumb]');
  if (crumb) crumb.textContent = u.full_name || 'User';
  document.title = `${u.full_name || 'User'} · Banjara Match Admin`;
  const title = el('.topbar__title');
  if (title) title.textContent = u.full_name || 'User';

  setHtml(el('[data-user-head]'), html`
    <img class="avatar avatar--lg" src="${imageUrl(u.profile)}" alt="" data-fallback width="88" height="88">
    <div class="user-head__text">
      <div class="user-head__name">${u.full_name || 'Not specified'}</div>
      <div class="user-head__meta">
        <span>${u.email || 'No email'}</span>
        <span>${u.phone || 'No phone'}</span>
        <span>Joined ${fmtDate(u.createdAt)}</span>
        <span>${u.isOnline ? 'Online now' : `Last seen ${timeAgo(u.lastSeen)}`}</span>
        <span>${u.last_login_platform === 'mobile' ? 'Mobile' : 'Web'}</span>
        ${u.role === 'admin' ? html`<span class="tag">Admin</span>` : ''}
      </div>
      <div class="user-head__badges">
        ${u.is_verified ? html`<span class="badge badge--info">Verified</span>` : html`<span class="badge badge--neutral">Unverified</span>`}
        ${u.is_block ? html`<span class="badge badge--danger" title="${u.block_reason || ''}">Blocked</span>` : html`<span class="badge badge--success">Active</span>`}
        ${u.gender ? html`<span class="badge badge--neutral">${u.gender}</span>` : ''}
        ${completion(u) != null ? html`<span class="badge badge--${completion(u) >= 70 ? 'success' : 'warning'}" title="Profile completion">${completion(u)}% complete</span>` : ''}
        ${u.profileCreatedBy && String(u.profileCreatedBy).toLowerCase() !== 'self' ? html`<span class="badge badge--neutral" title="Who manages this profile">Managed by ${createdByLabel(u.profileCreatedBy).toLowerCase()}</span>` : ''}
        ${u.membershipPlan && u.membershipPlan.name ? html`<span class="badge badge--warning">${u.membershipPlan.name}</span>` : ''}
      </div>
    </div>`);
  bindImageFallbacks(el('[data-user-head]'));

  const actions = el('[data-user-actions]');
  actions.hidden = false;
  el('[data-verify-btn]').textContent = u.is_verified ? 'Unverify' : 'Verify';
  const blockBtn = el('[data-block-btn]');
  blockBtn.textContent = u.is_block ? 'Unblock' : 'Block';
  blockBtn.classList.toggle('btn--danger', !u.is_block);
  blockBtn.classList.toggle('btn--secondary', !!u.is_block);
  const count = el('[data-count="photos"]');
  if (count) count.textContent = Array.isArray(u.photos) && u.photos.length ? `(${u.photos.length})` : '';
}

// ---- Profile tab ----------------------------------------------------------
function section(title, items) {
  return html`<div class="info-section"><h3 class="info-section__title">${title}</h3>
    <div class="info-grid">${items.map(([label, value]) => html`<div class="info-item"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`)}</div></div>`;
}

function renderProfile() {
  const u = user;
  const loc = u.location || {};
  const fam = u.family || {};
  const pref = u.preferences || {};
  const age = ageFromDob(u.dob);
  setHtml(panel('profile'), html`
    ${section('Personal', [
      ['Full name', val(u.full_name)], ['Gender', val(u.gender)], ['Date of birth', u.dob ? `${fmtDate(u.dob)}${age != null ? ` (${age})` : ''}` : '—'],
      ['Marital status', val(u.maritalStatus)], ['Height', u.height ? `${u.height} cm` : '—'], ['Weight', u.weight ? `${u.weight} kg` : '—'],
      ['Mother tongue', val(u.motherTongue)], ['Known languages', Array.isArray(u.knownLanguages) && u.knownLanguages.length ? u.knownLanguages.join(', ') : '—'],
      ['Bio', val(u.bio)], ['About', val(u.about)],
    ])}
    ${section('Professional', [
      ['Profession', nameOf(u.profession)], ['Qualification', nameOf(u.qualification)], ['Education field', val(u.educationField)],
      ['College', val(u.collegeName)], ['Income range', nameOf(u.incomeRange)],
    ])}
    ${section('Community', [
      ['Caste', nameOf(u.caste)], ['Gotra', nameOf(u.gotra)], ['Manglik', val(u.manglikStatus)], ['Horoscope required', yesNo(u.horoscopeRequired)],
      ['Spiritual belief', val(u.spiritualBelief)],
    ])}
    ${section('Location', [
      ['Country', nameOf(loc.country)], ['State', nameOf(loc.state)], ['City', nameOf(loc.city)], ['PIN code', val(u.pinCode)],
      ['Present address', val(u.presentAddress)], ['Permanent address', val(u.permanentAddress)], ['Residency', val(u.residencyStatus)], ['Visa status', val(u.visaStatus)],
    ])}
    ${section('Family', [
      ["Father's name", val(fam.fatherName)], ["Father's profession", val(fam.father && fam.father.profession)], ["Mother's name", val(fam.motherName)], ["Mother's profession", val(fam.mother && fam.mother.profession)],
      ['Brothers', fmtNumber(fam.brothers && fam.brothers.total, '0')], ['Sisters', fmtNumber(fam.sisters && fam.sisters.total, '0')],
      ['Family type', val(fam.familyType)], ['Family status', val(fam.familyStatus)], ['Family values', val(fam.familyValues)],
      ['Based out', [nameOf(fam.basedOut && fam.basedOut.city), nameOf(fam.basedOut && fam.basedOut.state)].filter((x) => x !== '—').join(', ') || '—'],
    ])}
    ${section('Lifestyle', [
      ['Diet', val(u.diet)], ['Smoking', val(u.smoke)], ['Drinking', val(u.drink)], ['Complexion', val(u.complexion)], ['Body type', val(u.bodyType)], ['Lives with family', yesNo(u.livingWithFamily)],
    ])}
    ${section('Partner preferences', [
      ['Age range', pref.age_range ? `${val(pref.age_range.min)}–${val(pref.age_range.max)}` : '—'],
      ['Height range', pref.height_range ? `${val(pref.height_range.min)}–${val(pref.height_range.max)} cm` : '—'],
      ['Marital status', Array.isArray(pref.marital_status) && pref.marital_status.length ? pref.marital_status.join(', ') : '—'],
      ['Caste', Array.isArray(pref.caste) && pref.caste.length ? pref.caste.map(nameOf).join(', ') : 'Any'],
      ['Gotra', Array.isArray(pref.gotra) && pref.gotra.length ? pref.gotra.map(nameOf).join(', ') : 'Any'],
      ['Qualification', Array.isArray(pref.qualification) && pref.qualification.length ? pref.qualification.map(nameOf).join(', ') : 'Any'],
      ['Profession', Array.isArray(pref.profession) && pref.profession.length ? pref.profession.map(nameOf).join(', ') : 'Any'],
      ['Diet', val(pref.diet)], ['Location', val(pref.location)],
    ])}
    ${section('Account', [
      ['User id', html`<span class="mono">${u._id}</span>`], ['Role', val(u.role)], ['Login platform', val(u.last_login_platform)],
      ['Profile created by', createdByLabel(u.profileCreatedBy)], ['Verified on', u.verifiedAt ? fmtDateTime(u.verifiedAt) : '—'],
      ['Profile completion', u.profileCompletion ? `${fmtNumber(u.profileCompletion.percentage, '0')}%` : '—'],
      ['Push notifications', u.is_push_notifications ? 'On' : 'Off'], ['Block reason', val(u.block_reason)],
      ['Interests sent / received', `${fmtNumber(u.stats && u.stats.sentRequests, '0')} / ${fmtNumber(u.stats && u.stats.receivedRequests, '0')}`],
      ['Messages sent / received', `${fmtNumber(u.stats && u.stats.sentMessages, '0')} / ${fmtNumber(u.stats && u.stats.receivedMessages, '0')}`],
      ['Created', fmtDateTime(u.createdAt)], ['Updated', fmtDateTime(u.updatedAt)],
    ])}
  `);
}

// ---- Photos tab -----------------------------------------------------------
const PHOTO_BADGE = { pending: 'warning', approved: 'success', rejected: 'danger' };
function renderPhotos() {
  const host = panel('photos');
  const photos = Array.isArray(user.photos) ? user.photos : [];
  if (!photos.length) { setHtml(host, html`<div class="empty"><div class="empty__title">No photos uploaded</div></div>`); return; }
  setHtml(host, html`<div class="photo-grid">${photos.map((p) => html`
    <div class="photo-card" data-photo="${p._id}">
      <img class="photo-card__img" src="${imageUrl(p.imageUrl, IMAGE_FALLBACK)}" alt="" data-fallback="${IMAGE_FALLBACK}" loading="lazy">
      <div class="photo-card__body">
        <span><span class="badge badge--${PHOTO_BADGE[p.moderationStatus] || 'neutral'}">${titleCase(p.moderationStatus || 'approved')}</span> ${p.isProfile ? html`<span class="badge badge--info">Profile</span>` : ''}</span>
        <span class="muted">Uploaded ${fmtDate(p.uploadedAt)}</span>
        ${p.rejectionReason ? html`<span class="muted">Reason: ${p.rejectionReason}</span>` : ''}
      </div>
      <div class="photo-card__actions">
        <button type="button" class="btn btn--secondary btn--sm" data-photo-action="approve" data-id="${p._id}" ${p.moderationStatus === 'approved' ? 'disabled' : ''}>Approve</button>
        <button type="button" class="btn btn--danger btn--sm" data-photo-action="reject" data-id="${p._id}" ${p.moderationStatus === 'rejected' ? 'disabled' : ''}>Reject</button>
      </div>
    </div>`)}</div>`);
  bindImageFallbacks(host);
}

async function moderatePhoto(action, id) {
  const card = el(`[data-photo="${id}"]`);
  let reason = '';
  if (action === 'reject') {
    const r = await askReason();
    if (r === null) return;
    reason = r;
  }
  if (card) card.classList.add('is-busy');
  try {
    const resp = await api(`/admin/photos/${id}/${action}`, { method: 'POST', body: action === 'reject' ? { reason } : {} });
    const idx = user.photos.findIndex((p) => String(p._id) === String(id));
    if (idx >= 0) user.photos[idx] = { ...user.photos[idx], ...(resp.data || {}) };
    toast.success(action === 'approve' ? 'Photo approved' : 'Photo rejected');
    renderPhotos();
  } catch (err) {
    toast.error(errorMessage(err, 'Could not update the photo.'));
    if (card) card.classList.remove('is-busy');
  }
}

function askReason() {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal({
      title: 'Reject photo',
      body: html`<div class="form-group"><label class="form-label" for="reject-reason">Reason (optional, shown to the member)</label><textarea class="form-control" id="reject-reason" maxlength="300"></textarea></div>`,
      footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--danger" data-ok>Reject photo</button>`,
      size: 'sm',
      onClose: () => finish(null),
    });
    m.footer.querySelector('[data-cancel]').addEventListener('click', () => { finish(null); m.close(); });
    m.footer.querySelector('[data-ok]').addEventListener('click', () => { finish(m.body.querySelector('#reject-reason').value.trim()); m.close(); });
  });
}

// ---- Activity / blocks / reports tabs --------------------------------------
async function loadActivity() {
  const host = panel('activity');
  setHtml(host, html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div>`);
  try {
    const { data } = await api(`/admin/users/${userId}/activity`);
    const rows = Array.isArray(data) ? data : [];
    const auditLink = html`<div class="table-foot"><a href="/audit-log?targetType=user&amp;targetId=${userId}">Admin actions on this member (audit log)</a></div>`;
    if (!rows.length) { setHtml(host, html`<div class="empty"><div class="empty__title">No activity recorded</div><div class="empty__hint">Activity entries are written when the member opens the app.</div></div>${auditLink}`); return; }
    setHtml(host, html`<div class="table-wrap"><table class="table table--compact"><caption class="sr-only">Activity log</caption>
      <thead><tr><th scope="col">When</th><th scope="col">Entry</th></tr></thead>
      <tbody>${rows.map((r) => html`<tr><td class="nowrap">${fmtDateTime(r.timestamp || r.createdAt)}</td><td>${r.action ? titleCase(r.action) : 'App session'}</td></tr>`)}</tbody></table></div>${auditLink}`);
  } catch (err) {
    setHtml(host, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load activity.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry="activity">Retry</button></div>`);
  }
}

async function loadBlocks() {
  const host = panel('blocks');
  setHtml(host, html`<div class="skeleton skeleton--row"></div>`);
  try {
    const { data } = await api(`/admin/users/${userId}/blocks`);
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { setHtml(host, html`<div class="empty"><div class="empty__title">This member has not blocked anyone</div></div>`); return; }
    setHtml(host, html`<div class="table-wrap"><table class="table"><caption class="sr-only">Members blocked by this user</caption>
      <thead><tr><th scope="col">Blocked member</th><th scope="col">Email</th><th scope="col">Status</th><th scope="col">Since</th></tr></thead>
      <tbody>${rows.map((b) => { const t = b.blocked || {}; return html`<tr>
        <td><div class="table__cell-user"><img class="avatar avatar--sm" src="${imageUrl(t.profile)}" alt="" data-fallback width="32" height="32">${t._id ? html`<a href="/users/${t._id}">${t.full_name || 'Member'}</a>` : 'Deleted member'}</div></td>
        <td>${t.email || '—'}</td>
        <td>${t.is_block ? html`<span class="badge badge--danger">Blocked</span>` : html`<span class="badge badge--success">Active</span>`}</td>
        <td class="nowrap">${fmtDate(b.createdAt)}</td></tr>`; })}</tbody></table></div>`);
    bindImageFallbacks(host);
  } catch (err) {
    setHtml(host, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load blocks.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry="blocks">Retry</button></div>`);
  }
}

const STATUS_BADGE = { pending: 'warning', resolved: 'success', dismissed: 'neutral' };
async function loadReports() {
  const host = panel('reports');
  setHtml(host, html`<div class="skeleton skeleton--row"></div>`);
  try {
    const { data } = await api('/admin/reports', { query: { reportedUser: userId, limit: 50, sort: '-createdAt' } });
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { setHtml(host, html`<div class="empty"><div class="empty__title">No reports against this member</div></div>`); return; }
    setHtml(host, html`<div class="table-wrap"><table class="table"><caption class="sr-only">Reports against this member</caption>
      <thead><tr><th scope="col">Date</th><th scope="col">Reporter</th><th scope="col">Reason</th><th scope="col">Description</th><th scope="col">Status</th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td class="nowrap">${fmtDate(r.createdAt)}</td>
        <td>${r.reportedBy && r.reportedBy._id ? html`<a href="/users/${r.reportedBy._id}">${r.reportedBy.full_name || 'Member'}</a>` : 'Unknown'}</td>
        <td>${r.reason || '—'}</td>
        <td title="${r.desc || ''}">${truncate(r.desc || '—', 120)}</td>
        <td><span class="badge badge--${STATUS_BADGE[r.status] || 'neutral'}">${titleCase(r.status || 'pending')}</span></td></tr>`)}</tbody></table></div>
      <div class="table-foot"><a href="/reports">Open the reports queue</a></div>`);
  } catch (err) {
    setHtml(host, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load reports.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry="reports">Retry</button></div>`);
  }
}

// ---- Membership tab -------------------------------------------------------
function renderMembership() {
  const host = panel('membership');
  const plan = user.membershipPlan && typeof user.membershipPlan === 'object' ? user.membershipPlan : null;
  setHtml(host, html`
    <dl class="key-value">
      <dt>Current plan</dt><dd>${plan ? plan.name : 'None (free)'}</dd>
      <dt>Duration</dt><dd>${plan && plan.duration_days ? `${plan.duration_days} days` : '—'}</dd>
      <dt>Assigned</dt><dd>${plan ? 'By an admin' : '—'}</dd>
    </dl>
    <p class="form-help mt-3">The product is free for everyone; plans are assigned by admins only and change nothing for other members.</p>
    <div class="mt-3"><button type="button" class="btn btn--secondary btn--sm" data-assign-plan>Assign plan</button></div>`);
}

async function assignPlan() {
  const m = openModal({
    title: 'Assign membership plan',
    body: html`<div class="skeleton skeleton--row"></div>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-ok disabled>Assign</button>`,
    size: 'sm',
  });
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  const okBtn = m.footer.querySelector('[data-ok]');
  try {
    const { data } = await api('/admin/membership-plans');
    const plans = Array.isArray(data) ? data : [];
    const currentId = user.membershipPlan && typeof user.membershipPlan === 'object' ? String(user.membershipPlan._id) : String(user.membershipPlan || '');
    if (!plans.length) {
      m.setBody(html`<div class="empty empty--tight"><div class="empty__title">No plans exist</div><div class="empty__hint">There is nothing to assign. The product is free for everyone.</div></div>`);
      return;
    }
    m.setBody(html`<div class="form-group"><label class="form-label" for="plan-id">Plan</label><select class="form-select" id="plan-id"><option value="">Choose a plan</option>${plans.map((p) => html`<option value="${p._id}" ${String(p._id) === currentId ? 'selected' : ''}>${p.name || 'Unnamed plan'}${p.duration_days ? ` (${p.duration_days} days)` : ''}${p.is_active === false || p.isActive === false ? ' (inactive)' : ''}</option>`)}</select><p class="form-help">Plans change nothing for other members.</p></div>`);
    okBtn.disabled = false;
  } catch (err) {
    m.setBody(html`<div class="alert alert--error" role="alert">${errorMessage(err, 'Could not load the plans.')}</div>`);
    return;
  }
  okBtn.addEventListener('click', async () => {
    const input = m.body.querySelector('#plan-id');
    const planId = input.value.trim();
    if (!/^[a-f0-9]{24}$/i.test(planId)) { input.classList.add('is-invalid'); input.focus(); return; }
    m.setBusy(true);
    try {
      const resp = await api('/assignMembership', { method: 'POST', body: { user_id: userId, plan_id: planId } });
      toast.success(resp.message || 'Plan assigned');
      m.close();
      await loadUser();
    } catch (err) {
      m.setBusy(false);
      toast.error(errorMessage(err, 'Could not assign the plan.'));
    }
  });
}

// ---- Verification tab -----------------------------------------------------
let verifications = [];
const refId = (v) => String((v && typeof v === 'object' ? v._id : v) || '');

async function loadVerification() {
  const host = panel('verification');
  setHtml(host, html`<div class="skeleton skeleton--row"></div><div class="skeleton skeleton--block"></div>`);
  try {
    const resp = await api('/admin/verifications', { query: { userId, limit: 20 } });
    verifications = (Array.isArray(resp.data) ? resp.data : [])
      .filter((v) => refId(v.user) === String(userId))
      .sort((a, b) => new Date(b.submittedAt || b.createdAt || 0) - new Date(a.submittedAt || a.createdAt || 0));
    renderVerification();
  } catch (err) {
    setHtml(host, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load verification requests.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry="verification">Retry</button></div>`);
  }
}

function renderVerification() {
  const host = panel('verification');
  const latest = verifications[0];
  if (!latest) {
    setHtml(host, html`<div class="empty"><div class="empty__title">No verification request</div><div class="empty__hint">${user && user.is_verified ? 'This member was verified directly by an admin.' : 'The member has not submitted a document and selfie yet. The Verify button above still works for a manual check.'}</div></div>`);
    return;
  }
  const older = verifications.slice(1);
  setHtml(host, html`
    <dl class="key-value">
      <dt>Latest request</dt><dd>${verificationBadge(latest.status)} submitted ${fmtDateTime(latest.submittedAt || latest.createdAt)}</dd>
      <dt>Name on document</dt><dd>${latest.fullName || '—'}</dd>
      <dt>Document type</dt><dd>${latest.documentType ? titleCase(latest.documentType) : '—'}</dd>
      ${latest.reviewedAt ? html`<dt>Reviewed</dt><dd>${fmtDateTime(latest.reviewedAt)}</dd>` : ''}
      ${latest.reason ? html`<dt>Reason</dt><dd class="pre-wrap">${latest.reason}</dd>` : ''}
    </dl>
    ${filesMarkup(latest)}
    <div class="btn-group mt-3">
      ${latest.status === 'pending' ? html`<button type="button" class="btn btn--primary btn--sm" data-verif-action="approve">Approve</button><button type="button" class="btn btn--danger btn--sm" data-verif-action="reject">Reject</button>` : ''}
      ${latest.status !== 'pending' && !latest.filesPurgedAt ? html`<button type="button" class="btn btn--ghost btn--sm" data-verif-action="purge">Delete files now</button>` : ''}
      <a class="btn btn--secondary btn--sm" href="/verifications">Open the verification queue</a>
    </div>
    ${older.length ? html`<div class="table-wrap mt-3"><table class="table table--compact"><caption class="sr-only">Earlier verification requests</caption>
      <thead><tr><th scope="col">Submitted</th><th scope="col">Document</th><th scope="col">Status</th><th scope="col">Reason</th></tr></thead>
      <tbody>${older.map((v) => html`<tr><td class="nowrap">${fmtDate(v.submittedAt || v.createdAt)}</td><td>${v.documentType ? titleCase(v.documentType) : '—'}</td><td>${verificationBadge(v.status)}</td><td>${truncate(v.reason || '—', 120)}</td></tr>`)}</tbody></table></div>` : ''}`);
  bindImageFallbacks(host);
}

async function verificationAction(action) {
  const latest = verifications[0];
  if (!latest) return;
  const fn = action === 'approve' ? approveVerification : action === 'reject' ? rejectVerification : purgeVerificationFiles;
  if (await fn({ ...latest, user: latest.user && typeof latest.user === 'object' ? latest.user : { full_name: user && user.full_name } })) {
    // loadUser() refreshes every opened tab, this one included.
    loaded.add('verification');
    await loadUser();
  }
}

// ---- Recommend a match tab --------------------------------------------------
let recoTarget = null;
const recoForm = el('#recommend-form');
const recoSend = recoForm ? el('[data-reco-send]', recoForm) : null;
const recoHistory = el('[data-reco-history]');

function warningsMarkup(list) {
  const items = (Array.isArray(list) ? list : []).map((w) => (typeof w === 'string' ? w : (w && (w.message || w.code)) || '')).filter(Boolean);
  if (!items.length) return '';
  return html`<div class="alert alert--warning mt-3" role="status"><span>Sent, with warnings:<ul class="reco-warnings">${items.map((w) => html`<li>${w}</li>`)}</ul></span></div>`;
}

function initRecommend() {
  if (!recoForm) return;
  bindCounters(recoForm);
  bindTypeahead({
    input: el('#reco-target'),
    list: el('[data-reco-list]'),
    search: async (q) => ((await api('/admin/users', { query: { search: q, limit: 10 } })).data || []).filter((u) => String(u._id) !== String(userId)),
    label: (u) => `${u.full_name || 'Member'} · ${u.gender || 'gender not set'}${u.email ? ` · ${u.email}` : ''}${u.is_block ? ' · blocked' : ''}`,
    onPick: (u) => {
      recoTarget = u;
      el('#reco-target').value = u.full_name || u.email || '';
      el('[data-reco-picked]').textContent = `Recommending ${u.full_name || 'this member'}${u.gender ? ` (${u.gender})` : ''}.`;
      recoSend.disabled = false;
    },
    emptyText: 'No member matches',
  });
  el('#reco-target').addEventListener('input', () => {
    if (recoTarget && el('#reco-target').value.trim() !== (recoTarget.full_name || recoTarget.email || '')) {
      recoTarget = null;
      recoSend.disabled = true;
      el('[data-reco-picked]').textContent = 'No member picked.';
    }
  });
  recoForm.addEventListener('submit', (ev) => {
    ev.preventDefault();
    busy(recoSend, async () => {
      if (!recoTarget) { toast.warning('Pick the member to recommend first.'); return; }
      const f = recoForm.elements;
      const body = { targetUserId: recoTarget._id, note: f.note.value.trim() || undefined, notifyBoth: f.notifyBoth.checked };
      const warnEl = el('[data-reco-warnings]', recoForm);
      setHtml(warnEl, '');
      try {
        const resp = await api(`/admin/users/${userId}/recommend`, { method: 'POST', body });
        const warnings = (resp.data && resp.data.warnings) || resp.warnings || [];
        toast.success('Recommendation sent');
        setHtml(warnEl, warningsMarkup(warnings));
        recoTarget = null;
        recoForm.reset();
        recoSend.disabled = true;
        el('[data-reco-picked]').textContent = 'No member picked.';
        loadRecommendations();
      } catch (err) {
        toast.error(err && err.status === 409 ? 'This member was already recommended to them.' : errorMessage(err, 'Could not send the recommendation.'));
      }
    });
  });
}

async function loadRecommendations() {
  if (!recoHistory) return;
  setHtml(recoHistory, html`<div class="card__body"><div class="skeleton skeleton--row"></div></div>`);
  try {
    const { data } = await api(`/admin/users/${userId}/recommendations`);
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { setHtml(recoHistory, html`<div class="empty empty--tight"><div class="empty__title">No recommendations sent to this member yet</div></div>`); return; }
    setHtml(recoHistory, html`<div class="table-wrap"><table class="table"><caption class="sr-only">Matches recommended to this member</caption>
      <thead><tr><th scope="col">Recommended member</th><th scope="col">Note</th><th scope="col">Sent by</th><th scope="col">When</th><th scope="col" class="table__actions">Actions</th></tr></thead>
      <tbody>${rows.map((r) => {
    const t = r.targetUser || r.target || r.recommendedUser || {};
    const by = r.createdBy || r.admin || {};
    return html`<tr>
        <td>${t._id ? html`<a href="/users/${t._id}">${t.full_name || 'Member'}</a>` : 'Deleted member'}</td>
        <td><span class="cell-wrap">${truncate(r.note || '—', 120)}</span></td>
        <td>${by.full_name || by.email || '—'}</td>
        <td class="nowrap">${fmtDateTime(r.createdAt)}</td>
        <td class="table__actions"><button type="button" class="btn btn--danger btn--sm" data-reco-delete="${r._id}">Delete</button></td></tr>`;
  })}</tbody></table></div>`);
  } catch (err) {
    setHtml(recoHistory, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load recommendations.')}</span><button type="button" class="btn btn--secondary btn--sm" data-retry="recommend">Retry</button></div>`);
  }
}

async function deleteRecommendation(id) {
  const ok = await confirm({ title: 'Delete this recommendation?', message: 'It disappears from the member\'s recommendations. A notification already delivered is not recalled.', confirmText: 'Delete', danger: true });
  if (!ok) return;
  try {
    await api(`/admin/recommendations/${id}`, { method: 'DELETE' });
    toast.success('Recommendation deleted');
    loadRecommendations();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the recommendation.')); }
}

// ---- Actions --------------------------------------------------------------
function openEdit() {
  const u = user;
  const m = openModal({
    title: 'Edit member',
    size: 'lg',
    body: html`<form id="edit-user-form" novalidate>
      <div class="form-row">
        <div class="form-group"><label class="form-label" for="eu-name">Full name</label><input class="form-control" id="eu-name" name="full_name" value="${u.full_name || ''}" maxlength="120"></div>
        <div class="form-group"><label class="form-label" for="eu-email">Email</label><input class="form-control" id="eu-email" name="email" type="email" value="${u.email || ''}" maxlength="200"></div>
        <div class="form-group"><label class="form-label" for="eu-phone">Phone</label><input class="form-control" id="eu-phone" name="phone" value="${u.phone || ''}" maxlength="20"></div>
        <div class="form-group"><label class="form-label" for="eu-gender">Gender</label><select class="form-select" id="eu-gender" name="gender">${GENDERS.map((g) => html`<option value="${g}" ${u.gender === g ? 'selected' : ''}>${g}</option>`)}</select></div>
        <div class="form-group"><label class="form-label" for="eu-dob">Date of birth</label><input class="form-control" id="eu-dob" name="dob" type="date" value="${toDateInput(u.dob)}"></div>
        <div class="form-group"><label class="form-label" for="eu-marital">Marital status</label><select class="form-select" id="eu-marital" name="maritalStatus"><option value="">—</option>${MARITAL.map((s) => html`<option value="${s}" ${u.maritalStatus === s ? 'selected' : ''}>${s}</option>`)}</select></div>
        <div class="form-group"><label class="form-label" for="eu-height">Height (cm)</label><input class="form-control" id="eu-height" name="height" type="number" min="30" max="250" value="${u.height || ''}"></div>
        <div class="form-group"><label class="form-label" for="eu-created-by">Profile created by</label><select class="form-select" id="eu-created-by" name="profileCreatedBy">${Object.entries(CREATED_BY).map(([v, l]) => html`<option value="${v}" ${String(u.profileCreatedBy || 'self').toLowerCase() === v ? 'selected' : ''}>${l}</option>`)}</select></div>
      </div>
      <div class="form-group"><label class="form-label" for="eu-bio">Bio</label><textarea class="form-control" id="eu-bio" name="bio" maxlength="1000">${u.bio || ''}</textarea></div>
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="submit" class="btn btn--primary" form="edit-user-form">Save changes</button>`,
  });
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  m.body.querySelector('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const v = formValues(ev.target);
    const body = {
      full_name: v.full_name.trim(),
      gender: v.gender,
      bio: v.bio,
      maritalStatus: v.maritalStatus || null,
      dob: v.dob || null,
      height: v.height === '' ? null : Number(v.height),
      profileCreatedBy: v.profileCreatedBy || 'self',
    };
    if (v.email.trim()) body.email = v.email.trim().toLowerCase();
    if (v.phone.trim()) body.phone = v.phone.trim();
    m.setBusy(true);
    try {
      await api(`/admin/users/${userId}`, { method: 'PUT', body });
      toast.success('Member updated');
      m.close();
      await loadUser();
    } catch (err) {
      m.setBusy(false);
      toast.error(errorMessage(err, 'Could not save the changes.'));
    }
  });
}

async function toggleVerify() {
  const verify = !user.is_verified;
  const ok = await confirm({
    title: verify ? 'Verify this member?' : 'Remove verification?',
    message: verify ? `${user.full_name || 'The member'} will get a push notification and an email saying their profile is verified.` : 'The verified badge is removed from their profile.',
    confirmText: verify ? 'Verify' : 'Unverify',
  });
  if (!ok) return;
  try {
    await api(`/admin/users/${userId}/verify`, { method: 'POST', body: { verify } });
    toast.success(verify ? 'Member verified' : 'Verification removed');
    await loadUser();
  } catch (err) { toast.error(errorMessage(err, 'Could not update verification.')); }
}

async function toggleBlock() {
  if (user.is_block) {
    const ok = await confirm({ title: 'Unblock this member?', message: 'They will be able to sign in and appear in matches again.', confirmText: 'Unblock' });
    if (!ok) return;
    try {
      await api(`/admin/users/${userId}/block`, { method: 'POST', body: { block: false } });
      toast.success('Member unblocked');
      await loadUser();
    } catch (err) { toast.error(errorMessage(err, 'Could not unblock.')); }
    return;
  }
  const m = openModal({
    title: 'Block this member',
    size: 'sm',
    body: html`<p>Blocking signs the member out and hides them from everyone. A reason is required and is kept on the account.</p>
      <div class="form-group"><label class="form-label" for="block-reason">Reason</label><textarea class="form-control" id="block-reason" maxlength="500" required></textarea><p class="form-error" hidden data-err>Enter a reason.</p></div>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--danger" data-ok>Block member</button>`,
  });
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  m.footer.querySelector('[data-ok]').addEventListener('click', async () => {
    const ta = m.body.querySelector('#block-reason');
    const reason = ta.value.trim();
    if (!reason) { m.body.querySelector('[data-err]').hidden = false; ta.classList.add('is-invalid'); ta.focus(); return; }
    m.setBusy(true);
    try {
      await api(`/admin/users/${userId}/block`, { method: 'POST', body: { block: true, reason } });
      toast.success('Member blocked');
      m.close();
      await loadUser();
    } catch (err) { m.setBusy(false); toast.error(errorMessage(err, 'Could not block.')); }
  });
}

function generatePassword(len = 14) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint32Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

async function resetPassword() {
  const ok = await confirm({
    title: 'Reset password?',
    message: 'A new random password is generated and shown to you once. The member must be told it out of band; it is not emailed.',
    confirmText: 'Generate and reset',
    danger: true,
  });
  if (!ok) return;
  const newPassword = generatePassword();
  try {
    await api(`/admin/users/${userId}/reset-password`, { method: 'POST', body: { newPassword } });
    const m = openModal({
      title: 'New password',
      size: 'sm',
      body: html`<p>Copy it now, it will not be shown again.</p><div class="secret-box">${newPassword}</div>`,
      footer: html`<button type="button" class="btn btn--primary" data-ok>Done</button>`,
      closeOnOverlay: false,
    });
    m.footer.querySelector('[data-ok]').addEventListener('click', () => m.close());
  } catch (err) { toast.error(errorMessage(err, 'Could not reset the password.')); }
}

async function deleteUser() {
  const typed = user.email || 'DELETE';
  const ok = await confirm({
    title: 'Delete this member permanently?',
    message: 'Their profile, photos, messages, interests, reports and Firebase account are removed. This cannot be undone.',
    confirmText: 'Delete member',
    danger: true,
    typed,
  });
  if (!ok) return;
  try {
    await api(`/admin/users/${userId}`, { method: 'DELETE' });
    toast.success('Member deleted');
    location.assign('/users');
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the member.')); }
}

// ---- Tabs -----------------------------------------------------------------
const LOADERS = { activity: loadActivity, blocks: loadBlocks, reports: loadReports, verification: loadVerification, recommend: loadRecommendations };

function showTab(key, { focus = false } = {}) {
  els('[data-tab]').forEach((t) => {
    const on = t.dataset.tab === key;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
  });
  els('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== key; });
  if (LOADERS[key] && !loaded.has(key)) { loaded.add(key); LOADERS[key](); }
  const url = new URL(location.href);
  if (key === 'profile') url.searchParams.delete('tab'); else url.searchParams.set('tab', key);
  history.replaceState(history.state, '', url);
}

function initTabs() {
  const tabs = el('[data-tabs]');
  delegate(tabs, 'click', '[data-tab]', (ev, t) => showTab(t.dataset.tab));
  tabs.addEventListener('keydown', (ev) => {
    const list = els('[data-tab]', tabs);
    const i = list.findIndex((t) => t === document.activeElement);
    if (i < 0) return;
    let n = null;
    if (ev.key === 'ArrowRight') n = (i + 1) % list.length;
    if (ev.key === 'ArrowLeft') n = (i - 1 + list.length) % list.length;
    if (ev.key === 'Home') n = 0;
    if (ev.key === 'End') n = list.length - 1;
    if (n !== null) { ev.preventDefault(); showTab(list[n].dataset.tab, { focus: true }); }
  });
  const initial = new URL(location.href).searchParams.get('tab');
  if (initial && el(`[data-tab="${initial}"]`)) showTab(initial);
}

// ---- Load -----------------------------------------------------------------
async function loadUser() {
  try {
    const { data } = await api(`/admin/users/${userId}`);
    user = data;
    renderHead();
    renderProfile();
    renderPhotos();
    renderMembership();
    // refresh the lists that depend on the user if already opened
    ['activity', 'blocks', 'reports', 'verification'].forEach((k) => { if (loaded.has(k)) LOADERS[k](); });
  } catch (err) {
    const host = panel('profile');
    const notFound = err && err.status === 404;
    setHtml(el('[data-user-head]'), html`<div class="empty empty--tight"><div class="empty__title">${notFound ? 'User not found' : 'Could not load this user'}</div><div class="empty__hint">${notFound ? 'The account may have been deleted.' : errorMessage(err)}</div></div>`);
    setHtml(host, html`${notFound ? html`<a class="btn btn--secondary" href="/users">Back to users</a>` : html`<button type="button" class="btn btn--secondary" data-retry="user">Retry</button>`}`);
  }
}

if (root) {
  initTabs();
  delegate(root, 'click', '[data-action]', (ev, btn) => {
    const a = btn.dataset.action;
    if (a === 'edit') openEdit();
    else if (a === 'verify') toggleVerify();
    else if (a === 'block') toggleBlock();
    else if (a === 'reset-password') resetPassword();
    else if (a === 'delete') deleteUser();
  });
  delegate(root, 'click', '[data-photo-action]', (ev, btn) => moderatePhoto(btn.dataset.photoAction, btn.dataset.id));
  delegate(root, 'click', '[data-assign-plan]', () => assignPlan());
  delegate(root, 'click', '[data-verif-action]', (ev, btn) => verificationAction(btn.dataset.verifAction));
  delegate(root, 'click', '[data-reco-delete]', (ev, btn) => deleteRecommendation(btn.dataset.recoDelete));
  initRecommend();
  delegate(root, 'click', '[data-retry]', (ev, btn) => {
    const k = btn.dataset.retry;
    if (k === 'user') loadUser(); else if (LOADERS[k]) LOADERS[k]();
  });
  loadUser();
}
