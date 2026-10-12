// Mobile sidebar: hamburger toggles .is-open + overlay, Esc closes, focus goes
// to the first link on open and back to the hamburger on close.

export function initSidebar() {
  const sidebar = document.querySelector('[data-sidebar]');
  const toggle = document.querySelector('[data-sidebar-toggle]');
  const overlay = document.querySelector('[data-sidebar-overlay]');
  const closeBtn = document.querySelector('[data-sidebar-close]');
  if (!sidebar || !toggle) return;

  const isOpen = () => sidebar.classList.contains('is-open');

  const open = () => {
    sidebar.classList.add('is-open');
    if (overlay) overlay.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    const first = sidebar.querySelector('.sidebar__link');
    if (first) first.focus();
  };

  const close = ({ refocus = true } = {}) => {
    if (!isOpen()) return;
    sidebar.classList.remove('is-open');
    if (overlay) overlay.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    if (refocus) toggle.focus();
  };

  toggle.addEventListener('click', () => (isOpen() ? close() : open()));
  if (closeBtn) closeBtn.addEventListener('click', () => close());
  if (overlay) overlay.addEventListener('click', () => close());
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && isOpen()) close(); });
  sidebar.addEventListener('click', (ev) => {
    if (ev.target instanceof Element && ev.target.closest('.sidebar__link')) close({ refocus: false });
  });
  const mq = window.matchMedia('(min-width: 769px)');
  mq.addEventListener('change', (e) => { if (e.matches) close({ refocus: false }); });
}
