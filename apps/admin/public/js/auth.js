// Legacy-compat shim (docs/plans/admin-base-ui.md C1.8). Loaded by the
// un-migrated public/*.html pages; deleted in C6 when the last one is replaced.
//
// The admin server already gates every page with middleware/requireAdmin.js
// (302 /login without a valid admin_session cookie), so by the time this file
// runs the admin IS signed in. There is no token in the browser:
//   checkAuth()   resolves true (the server did the check)
//   logout()      submits a real POST form to /auth/logout
//
// Same-origin /api normaliser: the legacy pages call fetch() directly in a
// dozen places. routes/proxy.js answers 403 to any non-GET without
// `X-Requested-With: admin` (CSRF belt and braces), so one wrapper here adds
// that header, forces credentials:'same-origin' and drops any stale
// Authorization/Cookie headers the old code still builds. It never reads a
// token and only touches requests to this host's /api/.
(function () {
    if (typeof window.fetch !== 'function' || window.__adminApiFetchShim) return;
    window.__adminApiFetchShim = true;
    const nativeFetch = window.fetch.bind(window);
    const origin = window.location.origin;

    function isApiUrl(url) {
        if (typeof url !== 'string') return false;
        return url.startsWith('/api/') || url.startsWith(origin + '/api/');
    }

    window.fetch = function (input, init) {
        try {
            const isRequest = typeof Request !== 'undefined' && input instanceof Request;
            const url = typeof input === 'string' ? input : (isRequest ? input.url : String((input && input.url) || ''));
            if (isApiUrl(url)) {
                init = Object.assign({}, init || {});
                const headers = new Headers(init.headers || (isRequest ? input.headers : undefined));
                headers.delete('authorization');
                headers.delete('cookie');
                if (!headers.has('x-requested-with')) headers.set('X-Requested-With', 'admin');
                init.headers = headers;
                init.credentials = 'same-origin';
            }
        } catch (e) { /* fall through to the native fetch */ }
        return nativeFetch(input, init);
    };
})();

// The server-side gate already verified the session; nothing to do here.
async function checkAuth() {
    return true;
}

function redirectToLogin() {
    const next = window.location.pathname + window.location.search;
    window.location.assign('/login?next=' + encodeURIComponent(next || '/dashboard'));
}

// No admin profile is held in the browser any more; pages fall back to their
// default label. The migrated layout renders the name server-side.
function getCurrentAdmin() {
    return null;
}

// Logout: POST /auth/logout (the server tells the API, clears the cookie and
// redirects to /login). Works from the legacy inline `onclick="logout()"`
// anchors; the pending anchor navigation is cancelled so it cannot race the
// form submission.
function logout() {
    try {
        if (window.event && typeof window.event.preventDefault === 'function') window.event.preventDefault();
    } catch (e) { /* noop */ }
    const form = document.createElement('form');
    form.method = 'post';
    form.action = '/auth/logout';
    form.style.display = 'none';
    document.body.appendChild(form);
    form.submit();
    return false;
}

window.checkAuth = checkAuth;
window.logout = logout;
window.getCurrentAdmin = getCurrentAdmin;
window.redirectToLogin = redirectToLogin;
