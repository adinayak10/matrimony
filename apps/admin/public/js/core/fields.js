// Form-control builders for modals and JS-rendered forms. Every control gets a
// <label for> bound to a unique id (C5), every value goes through html`` (so
// it is escaped), and nothing here emits a style="" attribute.
//
//   field({ label, name, type, value, help, required, maxlength, options, rows })
//     type: text | url | email | number | date | password | textarea | select
//           | checkbox | switch
//   bindCounters(root)        live "12/60" counters for controls with maxlength
//   listToText / textToList   [String] <-> "a, b, c" (or one per line)
import { html } from './dom.js';

let seq = 0;
export const uid = (prefix = 'f') => `${prefix}-${++seq}`;

export function listToText(list, sep = ', ') {
  return Array.isArray(list) ? list.filter((v) => v != null && String(v).trim() !== '').join(sep) : '';
}

export function textToList(text, sep = ',') {
  return String(text == null ? '' : text)
    .split(sep === '\n' ? /\r?\n/ : sep)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function field({
  label, name, type = 'text', value = '', help = '', required = false, maxlength = null, options = [],
  rows = 3, placeholder = '', readonly = false, disabled = false, min = null, max = null, step = null,
  counter = false, autocomplete = 'off', id = null, cls = '', danger = false, data = '',
} = {}) {
  const fid = id || uid(name || 'field');
  const helpId = help ? `${fid}-help` : '';
  const common = html`id="${fid}" name="${name || ''}" ${required ? 'required' : ''} ${readonly ? 'readonly' : ''} ${disabled ? 'disabled' : ''} ${helpId ? html`aria-describedby="${helpId}"` : ''} ${data ? html`data-field="${data}"` : ''}`;
  const helpEl = help ? html`<p class="form-help" id="${helpId}">${help}</p>` : '';

  if (type === 'checkbox') {
    return html`<div class="form-group ${cls}"><label class="form-check" for="${fid}"><input type="checkbox" ${common} ${value ? 'checked' : ''}><span>${label}</span></label>${helpEl}</div>`;
  }
  if (type === 'switch') {
    return html`<div class="form-group ${cls}"><label class="switch ${danger ? 'switch--danger' : ''}" for="${fid}"><input type="checkbox" role="switch" ${common} ${value ? 'checked' : ''}><span class="switch__track" aria-hidden="true"></span><span>${label}</span></label>${helpEl}</div>`;
  }

  const count = counter && maxlength ? html`<span class="form-count" data-count-for="${fid}" aria-hidden="true">${String(value == null ? '' : value).length}/${maxlength}</span>` : '';
  const labelEl = html`<label class="form-label" for="${fid}">${label}${required ? html` <span class="text-danger" aria-hidden="true">*</span>` : ''}${count}</label>`;

  let control;
  if (type === 'textarea') {
    control = html`<textarea class="form-control" rows="${rows}" ${common} ${maxlength ? html`maxlength="${maxlength}"` : ''} placeholder="${placeholder}">${value == null ? '' : value}</textarea>`;
  } else if (type === 'select') {
    control = html`<select class="form-select" ${common}>${options.map((o) => {
      const opt = typeof o === 'object' && o !== null ? o : { value: o, label: o };
      return html`<option value="${opt.value}" ${String(opt.value) === String(value == null ? '' : value) ? 'selected' : ''}>${opt.label}</option>`;
    })}</select>`;
  } else {
    control = html`<input class="form-control" type="${type}" ${common} value="${value == null ? '' : value}" placeholder="${placeholder}" autocomplete="${autocomplete}" ${maxlength ? html`maxlength="${maxlength}"` : ''} ${min != null ? html`min="${min}"` : ''} ${max != null ? html`max="${max}"` : ''} ${step != null ? html`step="${step}"` : ''}>`;
  }
  return html`<div class="form-group ${cls}">${labelEl}${control}${helpEl}</div>`;
}

/** Keeps every [data-count-for] in `root` in sync with its control. */
export function bindCounters(root = document) {
  root.querySelectorAll('[data-count-for]').forEach((out) => {
    const input = root.querySelector(`#${CSS.escape(out.dataset.countFor)}`);
    if (!input || out.dataset.bound) return;
    out.dataset.bound = '1';
    const max = Number(input.getAttribute('maxlength')) || Number(out.dataset.max) || 0;
    const sync = () => {
      const n = input.value.length;
      out.textContent = max ? `${n}/${max}` : String(n);
      out.classList.toggle('is-over', !!max && n > max);
    };
    input.addEventListener('input', sync);
    sync();
  });
}

/** Marks a control invalid with a message under it; returns false for chaining. */
export function invalid(input, message) {
  if (!input) return false;
  input.classList.add('is-invalid');
  input.setAttribute('aria-invalid', 'true');
  const group = input.closest('.form-group');
  if (group && !group.querySelector('.form-error')) {
    const p = document.createElement('p');
    p.className = 'form-error';
    p.setAttribute('role', 'alert');
    p.textContent = message;
    group.appendChild(p);
  }
  input.focus();
  return false;
}

export function clearInvalid(root) {
  root.querySelectorAll('.is-invalid').forEach((n) => { n.classList.remove('is-invalid'); n.removeAttribute('aria-invalid'); });
  root.querySelectorAll('.form-error[role="alert"]').forEach((n) => n.remove());
}
