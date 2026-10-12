// Blog create / edit form (C3.4) on /blogs/new and /blogs/:id/edit.
// Verified in apps/api/controllers/admin/blogController.js:
//   GET  /api/admin/blogs/:id                       → data (full post incl. content, slug)
//   POST /api/admin/blogs        multipart          title, description, content (required), category, tags,
//   PUT  /api/admin/blogs/:id    multipart          status, isFeatured, author (JSON string {name, role}),
//                                                   metaTitle, metaDescription, metaKeywords, featuredImage (file)
// The slug is generated once by createBlog and never changes (updateBlog ignores it),
// so the form shows it read-only and never sends it. createBlog rejects a missing
// author name and the placeholder "BanjaraMatch Team"; the form enforces the same on edit.
import { api, apiUpload, errorMessage } from '../core/api.js';
import { el } from '../core/dom.js';
import { toast } from '../core/toast.js';
import { bindCounters, invalid, clearInvalid, listToText } from '../core/fields.js';
import { busy, webUrl } from '../core/ui.js';

const root = el('.page-blog-form');
const blogId = root.dataset.blogId || '';
const form = el('#blog-form');
const f = form.elements;
const errorBox = el('[data-form-error]');
const errorText = el('[data-form-error-text]');
const retryBtn = el('[data-retry]');
const preview = el('[data-image-preview]');
const currentNote = el('[data-image-current]');
const progressWrap = el('[data-upload-progress]');
const progress = el('#blog-progress');
const wordsOut = el('[data-content-words]');
const MAX_IMAGE = 5 * 1024 * 1024;
const PLACEHOLDER_AUTHORS = new Set(['banjaramatch team', 'banjara match team', 'admin', 'team']);

let dirty = false;

function showError(message, { retry = false } = {}) {
  errorText.textContent = message;
  errorBox.hidden = false;
  retryBtn.hidden = !retry;
  errorBox.scrollIntoView({ block: 'nearest' });
}

function countWords() {
  const text = f.content.value.replace(/<[^>]*>/g, ' ').trim();
  const n = text ? text.split(/\s+/).length : 0;
  wordsOut.textContent = n ? `${n.toLocaleString()} word${n === 1 ? '' : 's'}, about ${Math.max(1, Math.ceil(n / 200))} min read.` : '';
}

function fill(b) {
  f.title.value = b.title || '';
  if (f.slug) f.slug.value = b.slug || '';
  f.description.value = b.description || '';
  f.content.value = b.content || '';
  f.category.value = b.category || 'General';
  f.status.value = b.status || 'draft';
  f.tags.value = listToText(b.tags);
  f.isFeatured.checked = !!b.isFeatured;
  const author = b.author || {};
  f.authorName.value = PLACEHOLDER_AUTHORS.has(String(author.name || '').trim().toLowerCase()) ? '' : (author.name || '');
  f.authorRole.value = author.role || '';
  f.metaTitle.value = b.metaTitle || '';
  f.metaDescription.value = b.metaDescription || '';
  f.metaKeywords.value = listToText(b.metaKeywords);
  el('[data-blog-crumb]').textContent = b.title || 'Edit post';

  const live = el('[data-live-link]');
  if (live && b.status === 'published' && b.slug) {
    live.href = webUrl(`/blogs/${encodeURIComponent(String(b.category || 'General').toLowerCase())}/${encodeURIComponent(b.slug)}`);
    live.hidden = false;
  }
  if (b.featuredImage && b.featuredImage !== 'images/blog/default.jpg') {
    el('[data-image-path]').textContent = `Current image: ${b.featuredImage}.`;
    el('[data-image-link]').href = webUrl(b.featuredImage);
    currentNote.hidden = false;
    preview.dataset.remote = '1';
    preview.src = webUrl(b.featuredImage);
    preview.hidden = false;
  }
  // Non-bubbling input events refresh the live counters without marking the form dirty.
  form.querySelectorAll('[maxlength]').forEach((c) => c.dispatchEvent(new Event('input')));
  countWords();
  dirty = false;
}

async function load() {
  errorBox.hidden = true;
  form.setAttribute('aria-busy', 'true');
  Array.from(f).forEach((c) => { c.disabled = true; });
  try {
    const { data } = await api(`/admin/blogs/${blogId}`);
    Array.from(f).forEach((c) => { c.disabled = false; });
    fill(data);
    form.setAttribute('aria-busy', 'false');
    dirty = false;
  } catch (err) {
    showError(errorMessage(err, 'Could not load this post.'), { retry: err.status !== 404 });
  }
}

function validate() {
  clearInvalid(form);
  const title = f.title.value.trim();
  const description = f.description.value.trim();
  const content = f.content.value.trim();
  const author = f.authorName.value.trim();
  if (!title) return invalid(f.title, 'A title is required.');
  if (!/[a-z0-9]/i.test(title)) return invalid(f.title, 'The title must contain letters or numbers (the URL is built from it).');
  if (!description) return invalid(f.description, 'A description is required.');
  if (!content) return invalid(f.content, 'The post needs content.');
  if (!author) return invalid(f.authorName, 'Enter the name of the person who wrote this post.');
  if (PLACEHOLDER_AUTHORS.has(author.toLowerCase())) return invalid(f.authorName, 'Use the real author name, not a team name.');
  if (f.metaTitle.value.length > 60) return invalid(f.metaTitle, 'Keep the meta title to 60 characters.');
  if (f.metaDescription.value.length > 160) return invalid(f.metaDescription, 'Keep the meta description to 160 characters.');
  const file = f.featuredImage.files && f.featuredImage.files[0];
  if (file) {
    if (!/^image\/(jpeg|png|gif|webp)$/.test(file.type)) return invalid(f.featuredImage, 'Choose a JPG, PNG, GIF or WebP image.');
    if (file.size > MAX_IMAGE) return invalid(f.featuredImage, 'The image is larger than 5 MB.');
  }
  return true;
}

function payload() {
  const title = f.title.value.trim();
  const description = f.description.value.trim();
  const fd = new FormData();
  fd.append('title', title);
  fd.append('description', description);
  fd.append('content', f.content.value);
  fd.append('category', f.category.value);
  fd.append('status', f.status.value);
  fd.append('tags', f.tags.value);
  fd.append('isFeatured', f.isFeatured.checked ? 'true' : 'false');
  fd.append('author', JSON.stringify({ name: f.authorName.value.trim(), role: f.authorRole.value.trim() || 'Author' }));
  // The schema caps metaTitle at 60 and metaDescription at 160; the API's own
  // fallback (full title / description) can exceed that, so fall back here.
  fd.append('metaTitle', f.metaTitle.value.trim() || title.slice(0, 60));
  fd.append('metaDescription', f.metaDescription.value.trim() || description.slice(0, 160));
  fd.append('metaKeywords', f.metaKeywords.value);
  const file = f.featuredImage.files && f.featuredImage.files[0];
  if (file) fd.append('featuredImage', file);
  return fd;
}

async function save() {
  if (!validate()) return;
  errorBox.hidden = true;
  const hasFile = !!(f.featuredImage.files && f.featuredImage.files[0]);
  progress.value = 0;
  progressWrap.hidden = !hasFile;
  try {
    const resp = await apiUpload(blogId ? `/admin/blogs/${blogId}` : '/admin/blogs', payload(), (pct) => { progress.value = pct; }, { method: blogId ? 'PUT' : 'POST' });
    dirty = false;
    if (blogId) {
      toast.success('Post saved');
      progressWrap.hidden = true;
      f.featuredImage.value = '';
      if (resp.data) fill(resp.data);
      dirty = false;
    } else {
      const id = resp.data && resp.data._id;
      location.assign(id ? `/blogs/${id}/edit?created=1` : '/blogs');
    }
  } catch (err) {
    progressWrap.hidden = true;
    showError(errorMessage(err, 'Could not save the post.'));
  }
}

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  busy(el('[data-save]'), save);
});
form.addEventListener('input', () => { dirty = true; });
f.content.addEventListener('input', countWords);
f.featuredImage.addEventListener('change', () => {
  const file = f.featuredImage.files && f.featuredImage.files[0];
  if (!file || !/^image\//.test(file.type) || file.size > MAX_IMAGE) return;
  // data: URL (allowed by the CSP img-src) rather than a blob: URL.
  const reader = new FileReader();
  reader.addEventListener('load', () => { delete preview.dataset.remote; preview.src = String(reader.result); preview.hidden = false; });
  reader.readAsDataURL(file);
});
// The website may refuse to let another origin embed its images
// (Cross-Origin-Resource-Policy: same-origin). Then there is no inline preview:
// hide the broken image and leave the "Open the image" link.
preview.addEventListener('error', () => {
  if (!preview.dataset.remote) return;
  preview.hidden = true;
  el('[data-image-path]').textContent += ' The website does not allow an inline preview here.';
});
retryBtn.addEventListener('click', load);
window.addEventListener('beforeunload', (ev) => { if (dirty) { ev.preventDefault(); ev.returnValue = ''; } });

bindCounters(form);
if (blogId) {
  load();
  const url = new URL(location.href);
  if (url.searchParams.get('created')) {
    toast.success('Post created. Its URL is now fixed.');
    url.searchParams.delete('created');
    history.replaceState(history.state, '', url);
  }
}
