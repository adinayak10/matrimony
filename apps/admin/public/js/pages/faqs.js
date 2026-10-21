// FAQs (feature expansion B6). Categories hold FAQs; the public shape is built by the API.
//   GET    /api/admin/faq-categories          → data [{ _id, title, order, isActive }]
//   POST   /api/admin/faq-categories {title}
//   PUT    /api/admin/faq-categories/:id {title}
//   DELETE /api/admin/faq-categories/:id      409 while the category still has FAQs
//   GET    /api/admin/faqs                    → data [{ _id, category, question, answer, isActive, order }]
//   POST   /api/admin/faqs {category, question, answer, isActive}
//   PUT    /api/admin/faqs/:id
//   DELETE /api/admin/faqs/:id
//   POST   /api/admin/faqs/reorder {ids}      ids = one category's FAQ ids in the new order
// No content is seeded: the page starts empty and the website keeps its static FAQ until there is data.
import { api, errorMessage } from '../core/api.js';
import { html, setHtml, el, delegate } from '../core/dom.js';
import { truncate } from '../core/format.js';
import { openModal } from '../core/modal.js';
import { confirm } from '../core/confirm.js';
import { toast } from '../core/toast.js';
import { field, invalid, clearInvalid, bindCounters } from '../core/fields.js';
import { busy } from '../core/ui.js';

const mount = el('#faq-groups');
let categories = [];
let faqs = [];

const catId = (f) => String((f.category && typeof f.category === 'object' ? f.category._id : f.category) || f.categoryId || f.faqs_type_id || '');
const byOrder = (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0);
const faqsOf = (id) => faqs.filter((f) => catId(f) === String(id)).sort(byOrder);
const active = (v) => (v !== false ? html`<span class="badge badge--success">Active</span>` : html`<span class="badge badge--neutral">Hidden</span>`);

function renderGroups() {
  mount.setAttribute('aria-busy', 'false');
  if (!categories.length) {
    setHtml(mount, html`<section class="card"><div class="card__body"><div class="empty">
      <div class="empty__title">No FAQ categories yet</div>
      <div class="empty__hint">Add a category (for example "Account" or "Safety"), then add questions to it. Until there is data the website shows its built-in FAQ.</div>
      <button type="button" class="btn btn--primary btn--sm" data-action="add-category">Add category</button>
    </div></div></section>`);
    return;
  }
  const orphans = faqs.filter((f) => !categories.some((c) => String(c._id) === catId(f)));
  setHtml(mount, html`${categories.slice().sort(byOrder).map((c) => {
    const rows = faqsOf(c._id);
    return html`<section class="card faq-card" aria-labelledby="faq-cat-${c._id}">
      <div class="card__header">
        <h2 class="card__title" id="faq-cat-${c._id}">${c.title || 'Untitled'} <span class="tab__count">(${rows.length})</span></h2>
        <div class="btn-group">
          <button type="button" class="btn btn--secondary btn--sm" data-action="add-faq" data-cat="${c._id}">Add FAQ</button>
          <button type="button" class="btn btn--secondary btn--sm" data-action="rename-category" data-cat="${c._id}">Rename</button>
          <button type="button" class="btn btn--danger btn--sm" data-action="delete-category" data-cat="${c._id}">Delete</button>
        </div>
      </div>
      <div class="card__body card__body--flush">
        ${rows.length ? html`<div class="table-wrap"><table class="table table--compact">
          <caption class="sr-only">${`FAQs in ${c.title || 'this category'}`}</caption>
          <thead><tr><th scope="col" class="num">#</th><th scope="col">Question</th><th scope="col">Answer</th><th scope="col">Status</th><th scope="col">Order</th><th scope="col" class="table__actions">Actions</th></tr></thead>
          <tbody>${rows.map((f, i) => html`<tr data-id="${f._id}">
            <td class="num">${i + 1}</td>
            <td><span class="cell-wrap">${f.question || '—'}</span></td>
            <td><span class="cell-wrap faq-answer" title="${truncate(f.answer || '', 400)}">${truncate(f.answer || '—', 140)}</span></td>
            <td>${active(f.isActive)}</td>
            <td class="nowrap">
              <button type="button" class="btn btn--ghost btn--sm" data-action="move" data-dir="-1" data-id="${f._id}" ${i === 0 ? 'disabled' : ''} aria-label="${`Move "${truncate(f.question || '', 40)}" up`}">Up</button>
              <button type="button" class="btn btn--ghost btn--sm" data-action="move" data-dir="1" data-id="${f._id}" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="${`Move "${truncate(f.question || '', 40)}" down`}">Down</button>
            </td>
            <td class="table__actions">
              <button type="button" class="btn btn--secondary btn--sm" data-action="edit-faq" data-id="${f._id}">Edit</button>
              <button type="button" class="btn btn--danger btn--sm" data-action="delete-faq" data-id="${f._id}">Delete</button>
            </td>
          </tr>`)}</tbody></table></div>` : html`<div class="empty empty--tight"><div class="empty__title">No questions in this category</div></div>`}
      </div>
    </section>`;
  })}
  ${orphans.length ? html`<section class="card faq-card"><div class="card__body"><div class="alert alert--warning" role="status">${orphans.length} FAQ${orphans.length === 1 ? ' has' : 's have'} no category and ${orphans.length === 1 ? 'is' : 'are'} not shown. Edit ${orphans.length === 1 ? 'it' : 'them'} to pick a category: ${orphans.map((f) => truncate(f.question || '', 50)).join('; ')}</div>
    <div class="btn-group mt-3">${orphans.map((f) => html`<button type="button" class="btn btn--secondary btn--sm" data-action="edit-faq" data-id="${f._id}">${`Edit "${truncate(f.question || '', 30)}"`}</button>`)}</div></div></section>` : ''}`);
}

async function load() {
  mount.setAttribute('aria-busy', 'true');
  if (!categories.length) setHtml(mount, html`<section class="card"><div class="card__body"><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div><div class="skeleton skeleton--row"></div></div></section>`);
  try {
    const [cats, list] = await Promise.all([api('/admin/faq-categories'), api('/admin/faqs', { query: { limit: 500 } })]);
    categories = Array.isArray(cats.data) ? cats.data : [];
    faqs = Array.isArray(list.data) ? list.data : [];
    renderGroups();
  } catch (err) {
    mount.setAttribute('aria-busy', 'false');
    setHtml(mount, html`<div class="alert alert--error" role="alert"><span>${errorMessage(err, 'Could not load the FAQs.')}</span><button type="button" class="btn btn--secondary btn--sm alert__retry" data-action="retry">Retry</button></div>`);
  }
}

// ---- Categories -----------------------------------------------------------------
function categoryModal(cat = null) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const m = openModal({
      title: cat ? 'Rename category' : 'Add category',
      size: 'sm',
      body: html`<form data-cat-form novalidate>${field({ label: 'Category title', name: 'title', value: cat ? cat.title || '' : '', required: true, maxlength: 80 })}</form>`,
      footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>${cat ? 'Save' : 'Add category'}</button>`,
      onClose: () => finish(null),
    });
    const form = m.body.querySelector('[data-cat-form]');
    const save = m.footer.querySelector('[data-save]');
    m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
    const submit = () => busy(save, async () => {
      clearInvalid(form);
      const title = form.elements.title.value.trim();
      if (!title) { invalid(form.elements.title, 'Enter a title.'); return; }
      try {
        const resp = await api(cat ? `/admin/faq-categories/${cat._id}` : '/admin/faq-categories', { method: cat ? 'PUT' : 'POST', body: { title } });
        toast.success(cat ? 'Category renamed' : 'Category added');
        finish(resp.data || { title });
        m.close();
      } catch (err) { toast.error(errorMessage(err, 'Could not save the category.')); }
    });
    save.addEventListener('click', submit);
    form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
  });
}

async function deleteCategory(cat) {
  const count = faqsOf(cat._id).length;
  if (count) {
    toast.warning(`Move or delete the ${count} FAQ${count === 1 ? '' : 's'} in "${cat.title}" first.`);
    return;
  }
  const ok = await confirm({ title: 'Delete this category?', message: `"${cat.title}" is removed.`, confirmText: 'Delete', danger: true });
  if (!ok) return;
  try {
    await api(`/admin/faq-categories/${cat._id}`, { method: 'DELETE' });
    toast.success('Category deleted');
    load();
  } catch (err) {
    toast.error(err && err.status === 409 ? 'This category still has FAQs. Move or delete them first.' : errorMessage(err, 'Could not delete the category.'));
  }
}

// ---- FAQs -----------------------------------------------------------------------
const NEW_CAT = '__new__';
function faqModal(faq = null, presetCat = '') {
  const isNew = !faq;
  const src = faq || { isActive: true };
  const options = [{ value: '', label: 'Choose a category' }, ...categories.map((c) => ({ value: c._id, label: c.title || 'Untitled' })), { value: NEW_CAT, label: 'New category…' }];
  const m = openModal({
    title: isNew ? 'Add FAQ' : 'Edit FAQ',
    size: 'lg',
    body: html`<form data-faq-form novalidate>
      ${field({ label: 'Category', name: 'category', type: 'select', value: isNew ? presetCat : catId(src), options, required: true })}
      ${field({ label: 'Question', name: 'question', value: src.question || '', required: true, maxlength: 250, counter: true })}
      ${field({ label: 'Answer', name: 'answer', type: 'textarea', rows: 6, value: src.answer || '', required: true, maxlength: 3000, counter: true, help: 'Plain text. Line breaks are kept.' })}
      ${field({ label: 'Show to members', name: 'isActive', type: 'switch', value: src.isActive !== false })}
    </form>`,
    footer: html`<button type="button" class="btn btn--secondary" data-cancel>Cancel</button><button type="button" class="btn btn--primary" data-save>${isNew ? 'Add FAQ' : 'Save changes'}</button>`,
  });
  const form = m.body.querySelector('[data-faq-form]');
  bindCounters(form);
  const select = form.elements.category;
  const save = m.footer.querySelector('[data-save]');
  m.footer.querySelector('[data-cancel]').addEventListener('click', () => m.close());
  select.addEventListener('change', async () => {
    if (select.value !== NEW_CAT) return;
    const created = await categoryModal(null);
    if (created && created._id) {
      categories.push(created);
      select.insertBefore(new Option(created.title || 'New category', created._id), select.querySelector(`option[value="${NEW_CAT}"]`));
      select.value = created._id;
      load();
    } else {
      select.value = '';
    }
  });
  const submit = () => busy(save, async () => {
    clearInvalid(form);
    const f = form.elements;
    const body = { category: f.category.value, question: f.question.value.trim(), answer: f.answer.value.trim(), isActive: f.isActive.checked };
    if (!body.category || body.category === NEW_CAT) { invalid(f.category, 'Choose a category.'); return; }
    if (!body.question) { invalid(f.question, 'Enter the question.'); return; }
    if (!body.answer) { invalid(f.answer, 'Enter the answer.'); return; }
    try {
      await api(isNew ? '/admin/faqs' : `/admin/faqs/${src._id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast.success(isNew ? 'FAQ added' : 'FAQ saved');
      m.close();
      load();
    } catch (err) { toast.error(errorMessage(err, 'Could not save the FAQ.')); }
  });
  save.addEventListener('click', submit);
  form.addEventListener('submit', (ev) => { ev.preventDefault(); submit(); });
}

async function deleteFaq(faq) {
  const ok = await confirm({ title: 'Delete this FAQ?', message: `"${truncate(faq.question || '', 100)}" is removed from the website and the app.`, confirmText: 'Delete', danger: true });
  if (!ok) return;
  try {
    await api(`/admin/faqs/${faq._id}`, { method: 'DELETE' });
    toast.success('FAQ deleted');
    load();
  } catch (err) { toast.error(errorMessage(err, 'Could not delete the FAQ.')); }
}

async function move(faq, dir, btn) {
  const rows = faqsOf(catId(faq));
  const i = rows.findIndex((f) => String(f._id) === String(faq._id));
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  const ids = rows.map((f) => f._id);
  await busy(btn, async () => {
    try {
      await api('/admin/faqs/reorder', { method: 'POST', body: { ids } });
      ids.forEach((id, n) => { const f = faqs.find((x) => String(x._id) === String(id)); if (f) f.order = n; });
      renderGroups();
      const again = mount.querySelector(`[data-action="move"][data-id="${faq._id}"][data-dir="${dir}"]:not([disabled])`) || mount.querySelector(`[data-action="move"][data-id="${faq._id}"]:not([disabled])`);
      if (again) again.focus();
    } catch (err) { toast.error(errorMessage(err, 'Could not change the order.')); }
  });
}

const findCat = (id) => categories.find((c) => String(c._id) === String(id));
const findFaq = (id) => faqs.find((f) => String(f._id) === String(id));

delegate(document, 'click', '[data-action]', async (ev, btn) => {
  const a = btn.dataset.action;
  if (a === 'add-category') { if (await categoryModal(null)) load(); }
  else if (a === 'add-faq') {
    if (!categories.length) { toast.info('Add a category first.'); if (await categoryModal(null)) load(); return; }
    faqModal(null, btn.dataset.cat || '');
  }
  else if (a === 'rename-category') { const c = findCat(btn.dataset.cat); if (c && await categoryModal(c)) load(); }
  else if (a === 'delete-category') { const c = findCat(btn.dataset.cat); if (c) deleteCategory(c); }
  else if (a === 'edit-faq') { const f = findFaq(btn.dataset.id); if (f) faqModal(f); }
  else if (a === 'delete-faq') { const f = findFaq(btn.dataset.id); if (f) deleteFaq(f); }
  else if (a === 'move') { const f = findFaq(btn.dataset.id); if (f && !btn.disabled) move(f, Number(btn.dataset.dir), btn); }
  else if (a === 'retry') load();
});

load();
