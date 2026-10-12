// Runs on every page (layouts/base.ejs and layouts/auth.ejs):
// sidebar, logout fetch variant, flash auto-dismiss, [data-dismiss] buttons.
import { initSidebar } from './sidebar.js';
import { bindLogout } from './auth.js';

document.documentElement.classList.add('js');

initSidebar();
bindLogout();

document.querySelectorAll('.flash').forEach((flash) => {
  const remove = () => { flash.classList.add('is-leaving'); setTimeout(() => flash.remove(), 300); };
  const btn = flash.querySelector('[data-dismiss]');
  if (btn) btn.addEventListener('click', remove);
  if (flash.hasAttribute('data-autodismiss')) setTimeout(remove, 6000);
});
