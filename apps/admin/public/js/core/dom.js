// DOM helpers. The escaping contract for every page script:
//   - build markup with the html`` tag; every ${} is escaped
//   - wrap pre-built markup (another html`` result) in raw() — html`` results
//     are already Raw, so nesting just works
//   - setHtml(el, html`...`) instead of el.innerHTML = `...`
// scripts/check-admin-raw.js fails CI on a plain template literal assigned to
// innerHTML, so the only way to put data in the DOM is through here.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);
}

class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}

export function raw(markup) {
  return markup instanceof Raw ? markup : new Raw(String(markup == null ? '' : markup));
}

export function isRaw(v) { return v instanceof Raw; }

function part(v) {
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(part).join('');
  if (v == null || v === false) return '';
  return esc(v);
}

/** html`<b>${name}</b>` → Raw; interpolations are escaped unless Raw/array of Raw. */
export function html(strings, ...values) {
  let out = '';
  for (let i = 0; i < strings.length; i += 1) {
    out += strings[i];
    if (i < values.length) out += part(values[i]);
  }
  return new Raw(out);
}

/** Replace an element's content with a Raw (html``) or plain text (escaped). */
export function setHtml(el, content) {
  if (!el) return;
  el.innerHTML = content instanceof Raw ? content.s : esc(content);
}

export function appendHtml(el, content) {
  if (!el) return;
  el.insertAdjacentHTML('beforeend', content instanceof Raw ? content.s : esc(content));
}

export function el(selector, root = document) {
  return root.querySelector(selector);
}

export function els(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/** Event delegation: delegate(tbody, 'click', '[data-action]', (ev, target) => {}) */
export function delegate(root, event, selector, handler, opts) {
  if (!root) return () => {};
  const fn = (ev) => {
    const target = ev.target instanceof Element ? ev.target.closest(selector) : null;
    if (target && root.contains(target)) handler(ev, target);
  };
  root.addEventListener(event, fn, opts);
  return () => root.removeEventListener(event, fn, opts);
}

/** Build a DOM node from an html`` result. */
export function node(content) {
  const tpl = document.createElement('template');
  tpl.innerHTML = (content instanceof Raw ? content.s : esc(content)).trim();
  return tpl.content.firstElementChild;
}

/** Read named form controls into a plain object (strings; checkboxes → boolean). */
export function formValues(form) {
  const out = {};
  for (const field of form.elements) {
    if (!field.name || field.disabled) continue;
    if (field.type === 'checkbox') out[field.name] = field.checked;
    else if (field.type === 'radio') { if (field.checked) out[field.name] = field.value; }
    else out[field.name] = field.value;
  }
  return out;
}
