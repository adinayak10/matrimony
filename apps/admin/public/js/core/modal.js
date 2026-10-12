// openModal({ title, body, footer, size, onClose }) → { el, body, footer, close, setBusy }
// body/footer: an html`` result (Raw), a Node, or plain text (escaped).
// Focus trap, Esc + overlay close, role=dialog aria-modal aria-labelledby,
// focus returned to the opener, body scroll lock. Modals stack (confirm() on
// top of an edit modal works).
import { esc, isRaw, applyDataStyles } from './dom.js';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const stack = [];
let seq = 0;

function fill(target, content) {
  if (content == null) { target.innerHTML = ''; return; }
  if (content instanceof Node) { target.innerHTML = ''; target.appendChild(content); return; }
  target.innerHTML = isRaw(content) ? content.s : esc(content);
  applyDataStyles(target);
}

export function openModal({ title = '', body = null, footer = null, size = '', onClose = null, closeOnOverlay = true, closeLabel = 'Close' } = {}) {
  const root = document.getElementById('modal-root') || document.body;
  const opener = document.activeElement;
  // If the opener is re-rendered while the modal is open (a table row after a
  // reload), focus goes back to its replacement: same data-action + data-id.
  const openerKey = opener && opener.dataset && opener.dataset.action
    ? { action: opener.dataset.action, id: opener.dataset.id || '' }
    : null;
  const id = `modal-${++seq}`;

  const el = document.createElement('div');
  el.className = `modal${size ? ` modal--${size}` : ''}`;
  el.setAttribute('data-modal', id);

  const dialog = document.createElement('div');
  dialog.className = 'modal__dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  dialog.tabIndex = -1;

  const header = document.createElement('div');
  header.className = 'modal__header';
  const h = document.createElement('h2');
  h.className = 'modal__title';
  h.id = `${id}-title`;
  h.textContent = title;
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'btn btn--icon btn--ghost modal__close';
  closeBtn.setAttribute('aria-label', closeLabel);
  closeBtn.textContent = '×';
  header.append(h, closeBtn);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'modal__body';
  fill(bodyEl, body);

  const footerEl = document.createElement('div');
  footerEl.className = 'modal__footer';
  fill(footerEl, footer);
  if (!footer) footerEl.hidden = true;

  dialog.append(header, bodyEl, footerEl);
  el.appendChild(dialog);
  root.appendChild(el);
  document.body.classList.add('has-modal');

  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    el.remove();
    const i = stack.indexOf(api);
    if (i >= 0) stack.splice(i, 1);
    if (!stack.length) document.body.classList.remove('has-modal');
    if (typeof onClose === 'function') onClose(result);
    if (opener && typeof opener.focus === 'function' && document.contains(opener)) { opener.focus(); return; }
    const again = openerKey
      ? Array.from(document.querySelectorAll('[data-action]')).find((n) => n.dataset.action === openerKey.action && (n.dataset.id || '') === openerKey.id)
      : null;
    const fallback = again || document.getElementById('main');
    if (fallback && typeof fallback.focus === 'function') fallback.focus({ preventScroll: true });
  };

  const focusables = () => Array.from(dialog.querySelectorAll(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === closeBtn);
  const onKey = (ev) => {
    if (stack[stack.length - 1] !== api) return;
    if (ev.key === 'Escape') { ev.preventDefault(); close(); return; }
    if (ev.key !== 'Tab') return;
    const list = focusables();
    if (!list.length) { ev.preventDefault(); dialog.focus(); return; }
    const first = list[0];
    const last = list[list.length - 1];
    if (ev.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  };

  closeBtn.addEventListener('click', () => close());
  el.addEventListener('mousedown', (ev) => {
    if (closeOnOverlay && ev.target === el) close();
  });
  document.addEventListener('keydown', onKey, true);

  const api = {
    el,
    dialog,
    body: bodyEl,
    footer: footerEl,
    close,
    setTitle(t) { h.textContent = t; },
    setBody(c) { fill(bodyEl, c); },
    setFooter(c) { fill(footerEl, c); footerEl.hidden = !c; },
    setBusy(busy) {
      dialog.setAttribute('aria-busy', busy ? 'true' : 'false');
      footerEl.querySelectorAll('button').forEach((b) => { b.disabled = !!busy; });
    },
  };
  stack.push(api);

  // Focus the first field, else the first button, else the dialog.
  requestAnimationFrame(() => {
    const first = dialog.querySelector('input:not([type="hidden"]), select, textarea') || focusables().find((n) => n !== closeBtn) || dialog;
    first.focus();
  });

  return api;
}

export function closeAllModals() {
  [...stack].reverse().forEach((m) => m.close());
}
