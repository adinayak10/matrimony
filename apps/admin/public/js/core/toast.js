// toast.success('Saved') / toast.error(msg) / toast.warning / toast.info
// Renders into #toast-root (aria-live="polite" in the layout). Text only
// (textContent), max 3 stacked, each with a close button.

const MAX = 3;
const DEFAULT_TIMEOUT = 5000;

function root() {
  let r = document.getElementById('toast-root');
  if (!r) {
    r = document.createElement('div');
    r.id = 'toast-root';
    r.className = 'toast-root';
    r.setAttribute('aria-live', 'polite');
    document.body.appendChild(r);
  }
  return r;
}

function show(type, message, { timeout = DEFAULT_TIMEOUT } = {}) {
  const host = root();
  while (host.children.length >= MAX) host.firstElementChild.remove();

  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const text = document.createElement('div');
  text.className = 'toast__text';
  text.textContent = String(message == null ? '' : message);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast__close';
  close.setAttribute('aria-label', 'Dismiss');
  close.textContent = '×';

  el.append(text, close);
  host.appendChild(el);

  let done = false;
  const remove = () => {
    if (done) return;
    done = true;
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 250);
  };
  close.addEventListener('click', remove);
  if (timeout > 0) setTimeout(remove, type === 'error' ? Math.max(timeout, 8000) : timeout);
  return { el, close: remove };
}

export const toast = {
  success: (m, o) => show('success', m, o),
  error: (m, o) => show('error', m, o),
  warning: (m, o) => show('warning', m, o),
  info: (m, o) => show('info', m, o),
};

export default toast;
