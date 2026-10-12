// Logout: the topbar renders a real <form method="post" action="/auth/logout">
// so it works without JS. This only adds the fetch variant and falls back to
// the native submit on any failure.

export function bindLogout(root = document) {
  const forms = root.querySelectorAll('form[data-logout]');
  forms.forEach((form) => {
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.classList.add('is-loading');
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'admin', Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        location.assign('/login');
      } catch (e) {
        if (btn) btn.classList.remove('is-loading');
        form.submit();
      }
    });
  });
}
