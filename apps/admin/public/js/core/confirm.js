// confirm({ title, message, confirmText, cancelText, danger, typed }) → Promise<boolean>
// Replaces window.confirm/prompt. With `typed: 'DELETE'` (or the user's email)
// the confirm button stays disabled until the text matches exactly. Cancel,
// Esc and the overlay all resolve false — never a thrown error.
import { openModal } from './modal.js';
import { html } from './dom.js';

let seq = 0;

export function confirm({
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  typed = null,
  detail = null,
} = {}) {
  return new Promise((resolve) => {
    const id = `confirm-${++seq}`;
    const body = html`
      ${message ? html`<p>${message}</p>` : ''}
      ${detail ? html`<div class="form-help">${detail}</div>` : ''}
      ${typed ? html`
        <div class="form-group mt-3">
          <label class="form-label" for="${id}-typed">Type <code>${typed}</code> to confirm</label>
          <input class="form-control" id="${id}-typed" type="text" autocomplete="off" spellcheck="false" data-typed>
        </div>` : ''}
    `;
    const footer = html`
      <button type="button" class="btn btn--secondary" data-cancel>${cancelText}</button>
      <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-ok ${typed ? 'disabled' : ''}>${confirmText}</button>
    `;
    let settled = false;
    const done = (v) => { if (!settled) { settled = true; resolve(v); } };
    const modal = openModal({ title, body, footer, size: 'sm', onClose: () => done(false) });
    const ok = modal.footer.querySelector('[data-ok]');
    const cancel = modal.footer.querySelector('[data-cancel]');
    const input = modal.body.querySelector('[data-typed]');
    if (input) {
      input.addEventListener('input', () => { ok.disabled = input.value.trim() !== String(typed); });
      input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ok.disabled) ok.click(); });
    }
    ok.addEventListener('click', () => { done(true); modal.close(); });
    cancel.addEventListener('click', () => { done(false); modal.close(); });
  });
}

export default confirm;
