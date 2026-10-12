# Track C — apps/admin: base UI shell, server-side auth gate, page migration, API fixes

Repo-relative paths below are inside `/var/www/banjaramatch/` (monorepo). Audit citations use today's absolute paths.

## C0. Decisions (read before starting)

1. **Stack**: Express 4 (already `^4.18.2` in `/var/www/admin.banjaramatch.com/package.json`) + EJS (already a dependency). No SPA, no Bootstrap, no FontAwesome, no CDN. One stylesheet, ES-module JS, self-hosted SVG icon sprite, self-hosted `chart.umd.min.js` (pinned 4.4.x) for the two dashboard charts.
2. **Layout mechanism**: copy the pattern from `/var/www/feribazaar.com/website/src/lib/render.js` — render `views/pages/<name>.ejs` to a string, then render `views/layouts/base.ejs` with `body`. No `express-ejs-layouts` dependency.
3. **Brand**: website `theme-color` is `#f6af04` (`/var/www/banjaramatch.com/views/pages/index.ejs`) and the dominant site colour is `#66451c` (24 uses in `public/css/style.min.css`). Gold on white is ~1.9:1 contrast, so: `--accent: #f6af04` (active nav bar, focus ring, logo mark, stat highlights), `--primary: #66451c` (buttons/links, 8.9:1 on white), sidebar stays dark `#1f2937`. Indigo `#6366f1` is dropped. Semantic text colours are darkened vs today's `style.css` (`#10b981` on white is 2.5:1 and fails AA): success `#15803d`, warning `#b45309`, danger `#b91c1c`, info `#1d4ed8`, each with a `-soft` background.
4. **Auth gate = proxy `/api/admin/auth/me`, not a shared secret.** The admin server never signs or verifies JWTs, so JWT rotation in Track A cannot lock admins out of the admin server; a rotated secret just makes `/me` return 401 and the user re-logs in. Cookie `admin_session` (httpOnly, Secure, SameSite=Strict, Path=/, **no Domain**, maxAge 12h) holds the API-issued admin JWT. Browser JS never sees it.
5. **Proxy `/api/*` → `http://127.0.0.1:4002`** with an allowlist of admin-safe prefixes, Authorization header injected from the cookie, and the browser's `Cookie` header stripped (because `/var/www/api.banjaramatch.com/middleware/adminAuth.js:12` prefers `req.cookies.token` over the Bearer header, a stale `.banjaramatch.com` `token` cookie would otherwise override the admin token).
6. **Migration is incremental and production never breaks**: C1 ships the shell + gate + a legacy-compat shim so un-migrated pages keep working behind the gate; each later phase replaces pages route by route.
7. **No paid gating UI**: membership is shown read-only on user detail with an admin-only "Assign plan" action (`POST /api/assignMembership`, already `adminAuth` at `/var/www/api.banjaramatch.com/routes/userRoutes.js:33`). No "premium" marketing or stats anywhere in admin.
8. **Fabricated content rule**: settings "Danger zone", fake DB stats, fake password change, dashboard quick-access gradient cards, and the state-page prefill strings for `memberCount`/`successMetric`/`verificationNote` (`/var/www/admin.banjaramatch.com/public/state-pages.html:723,734`) are removed, not replaced.

## C1. Foundation (ships first, one deploy, no page redesign yet)

### C1.1 Directory layout — `apps/admin/`
```
server.js                      boot: env check, helmet, static, proxy, auth routes, page routes, legacy 301s, 404/500
config/env.js                  PORT=4001, API_INTERNAL_URL=http://127.0.0.1:4002, API_PUBLIC_URL=https://api.banjaramatch.com,
                               NODE_ENV, RELEASE_SHA (asset version), SESSION_TTL_HOURS=12. Fails fast if API_INTERNAL_URL missing.
config/nav.js                  single nav array (groups → items {key,label,icon,href,match})
lib/render.js                  renderPage(res, name, locals) → page then layout; passes nav, activeKey, admin, assetVersion, apiPublicUrl, csrf-free
lib/apiClient.js               server-side fetch to API_INTERNAL_URL with 5s timeout; me(token), login(email,password), logout(token)
middleware/requireAdmin.js     cookie → apiClient.me (60s in-memory cache keyed by sha256(token)) → req.admin | 302 /login?next=
middleware/security.js         helmet CSP, X-Robots-Tag: noindex, Cache-Control no-store for HTML, Referrer-Policy
routes/auth.js                 GET /login, POST /auth/login (form-encoded), POST /auth/logout
routes/pages.js                one GET per nav item + /users/:id + /blogs/new + /blogs/:id/edit, all behind requireAdmin
routes/proxy.js                http-proxy-middleware for /api/* with allowlist + header injection
routes/legacy.js               301 map (see C1.7)
views/layouts/base.ejs         head, sidebar, topbar, flash, content slot, modal root, toast root, page-script slot
views/layouts/auth.ejs         login shell (no sidebar)
views/partials/{head,sidebar,topbar,flash,pagination,table-toolbar,icon}.ejs
views/pages/*.ejs              one per page + error.ejs (404/500/503 "API unreachable")
public/css/admin.css           tokens + components (C1.4)
public/img/{icons.svg,logo.svg,favicon.svg}   sprite: ~24 Lucide icons (ISC), referenced via <svg><use href="/img/icons.svg#users">
public/vendor/chart.umd.min.js
public/js/core/*.js, public/js/pages/*.js     (C2)
public/robots.txt              User-agent: * / Disallow: /
.env.example  package.json  test/routes.test.js
```
`package.json` deps: `express`, `ejs`, `cookie-parser`, `dotenv`, `helmet`, `http-proxy-middleware` (pinned ^3), `express-rate-limit`. Remove `axios`, `bcryptjs`, `jsonwebtoken`, `cors`, `body-parser`. Add `"start": "node server.js"`, `"test": "node --test test/"`.

### C1.2 `server.js` middleware order (order is load-bearing)
1. `security.js` (helmet: `default-src 'self'; img-src 'self' data: https://api.banjaramatch.com; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'`; `X-Robots-Tag: noindex, nofollow`). Deploy as `Content-Security-Policy-Report-Only` for the first deploy, then enforce.
2. `cookieParser()`.
3. `express.static('public', { maxAge: '7d', index: false })` — only css/js/img/vendor/robots.txt remain in `public/` after C9.
4. `GET /health` → `200 {ok:true, release, api: <cached boolean>}` (deploy.sh health check; never 5xx because the API is down).
5. `routes/proxy.js` mounted at `/api` **before any body parser** (multipart APK/blog uploads must stream).
6. `express.urlencoded({extended:false})` scoped to `routes/auth.js` only (route-level, not global).
7. `routes/auth.js`, `routes/legacy.js`, `routes/pages.js` (each page route wrapped in `requireAdmin`).
8. `app.get(/\.html$/, 404)`; generic 404 (`error.ejs`); error handler that renders `error.ejs` with a retry link (never leaks stack).
9. `app.listen(PORT, '127.0.0.1')` (ports bound to all interfaces is a P0 finding).

### C1.3 Auth routes (`routes/auth.js`)
- `GET /login`: if cookie valid → 302 `/dashboard`. Renders `pages/login.ejs` in `layouts/auth.ejs`: plain `<form method="post" action="/auth/login">` (email, password, hidden `next`). Works without JS.
- `POST /auth/login`: `express-rate-limit` 10 req / 15 min / IP (independent of Track A's API limiter) → `apiClient.login()` → on `status:true` set `admin_session=<token>` `{httpOnly:true, secure:true, sameSite:'strict', path:'/', maxAge: SESSION_TTL_HOURS*3600e3}` → 302 to `next` (same-origin path only, default `/dashboard`). On failure re-render login with a generic flash "Invalid email or password" (no 401/403 distinction).
- `POST /auth/logout`: call `apiClient.logout(token)` (clears the legacy `.banjaramatch.com` `token` cookie via `authController.js:144-152`), `res.clearCookie('admin_session')`, 302 `/login`. Topbar renders a real `<form method="post">` button so logout works without JS; `core/auth.js` only adds a confirm-free fetch variant.
- `requireAdmin`: no cookie → 302 `/login?next=`; `/me` 401/403 → clear cookie, 302 `/login`; `/me` network error/5xx → render `error.ejs` 503 "API unreachable, retry" (not a redirect loop); success → `req.admin = {_id,email,full_name}`.

### C1.4 Proxy (`routes/proxy.js`)
`createProxyMiddleware({ target: API_INTERNAL_URL, changeOrigin: false, xfwd: true, proxyTimeout: 180000, timeout: 180000, on: { proxyReq } })` where `proxyReq` sets `Authorization: Bearer <cookie>` and `proxyReq.removeHeader('cookie')`. Before the proxy, a guard:
- 401 JSON if no cookie (do not redirect; `core/api.js` handles 401 by navigating to `/login`).
- 403 JSON if method ≠ GET/HEAD and header `X-Requested-With !== 'admin'` (CSRF belt-and-braces on top of SameSite=Strict).
- 404 JSON unless path matches the allowlist: `^/api/admin/`, `^/api/contact/(all|stats|[a-f0-9]{24})`, `^/api/beta-tester/(all|stats|[a-f0-9]{24})`, `^/api/city-pages/admin`, `^/api/state-pages/admin`, `^/api/states$`, `^/api/cities$`, `^/api/assignMembership$`, and **temporarily** `^/api/auth/community-feedback` (removed in C5 when Track A ships `/api/admin/community-feedback`). Everything else (e.g. `/api/deleteUser`, `/api/editProfile`) is unreachable through the admin host.

### C1.5 Layout + nav (`views/layouts/base.ejs`, `config/nav.js`)
- `base.ejs` locals: `title`, `activeKey`, `admin`, `nav`, `assetVersion`, `apiPublicUrl`, `pageScript`, `flash`. Emits `<link href="/css/admin.css?v=<%= assetVersion %>">`, `<body data-page="<%= activeKey %>" data-api-public-url="<%= apiPublicUrl %>">`, sidebar partial, topbar partial (page title, hamburger button `aria-controls="sidebar" aria-expanded`, admin name, logout form), `<main id="main">` with `<%- body %>` (the only allowed raw output — see C1.8), `<div id="modal-root">`, `<div id="toast-root" aria-live="polite">`, `<script type="module" src="/js/core/boot.js?v=…">` + `<script type="module" src="/js/pages/<%= pageScript %>.js?v=…">` when set.
- `assetVersion = process.env.RELEASE_SHA || require('./package.json').version + '-' + bootTime` (deploy.sh exports RELEASE_SHA — Track B). This replaces the stale manual `?v=1764497821` and the 1-year immutable cache finding (`/etc/nginx/sites-available/admin.banjaramatch.com:50`).
- `config/nav.js` groups: Overview(dashboard) · Members(users, reports, photo-moderation) · Inbox(contact-enquiries, community-feedback, beta-testers) · Content(blogs, banners, regional-pages, master-data) · System(settings, apk-manager, broadcast-email, audit-log). Each item `{key,label,icon,href,match:RegExp}`; sidebar partial sets `class="is-active" aria-current="page"` when `match.test(req.path)`. `/users/:id` highlights Users; `/blogs/*` highlights Blogs.

### C1.6 `public/css/admin.css` (seeded from `/var/www/admin.banjaramatch.com/public/css/style.css`, 710 lines)
Keep the structural selectors that 12 pages already use (`.sidebar`, `.main-content`, `.topbar`, `.content-area`, `.stats-grid`, `.card`, `.form-group`, `.btn`, `.table-container`, `.badge`, `.modal`, `.pagination`, `.spinner`, `.info-grid`) so the legacy shim phase still looks right, and add:
- Tokens: `--accent --primary --primary-hover --primary-soft`, semantic colours + `-soft`, `--bg --surface --surface-2 --border --border-strong --text --text-2 --text-3`, `--sidebar-bg --sidebar-w:260px --topbar-h:60px`, spacing `--space-1..8` (4px scale), `--radius-sm/--radius/--radius-lg/--radius-pill`, `--shadow-sm/--shadow/--shadow-lg`, `--font` (system stack, no Google Fonts), `--fs-xs..--fs-2xl`, `--z-sticky/--z-sidebar/--z-modal/--z-toast`, `--focus: 0 0 0 3px rgba(246,175,4,.45)`.
- Components (BEM-ish): `.btn .btn--primary .btn--secondary .btn--ghost .btn--danger .btn--sm .btn--icon .is-loading`; `.card .card__header .card__body .card__footer`; `.table-wrap` (overflow-x) + `.table` with `thead th { position: sticky; top: 0 }`, `.table__actions`, `.table--loading`; `.badge .badge--success|warning|danger|info|neutral`; `.modal .modal__dialog .modal__header .modal__body .modal__footer .modal--lg` (`role=dialog aria-modal`); `.toast .toast--success|error|warning|info`; `.form-group .form-label .form-control .form-select .form-check .form-help .form-error .form-row`; `.pagination .pagination__btn .is-active`; `.empty .empty__icon .empty__title .empty__hint`; `.skeleton .skeleton--text .skeleton--row`; `.stat .stat__value .stat__label .stat__icon`; `.tabs .tab .is-active` (`role=tablist`); `.filters`; `.alert .alert--error .alert__retry`; `.tag`; `.sr-only`.
- Sidebar: `.sidebar__group`, `.sidebar__link` (icon + label), `.is-active` with 3px `--accent` left border (replaces indigo). Mobile ≤768px: `transform: translateX(-100%)`, `.sidebar.is-open`, `.sidebar-overlay`; the hamburger in the topbar toggles it (today `style.css:619-625` defines the state but nothing toggles it).
- Focus: `:focus-visible { box-shadow: var(--focus); outline: none }` on buttons, links, inputs, table action buttons.

### C1.7 Legacy routes (`routes/legacy.js`) — all 301
`/` → `/dashboard`; `/login.html` → `/login`; `/<page>.html` → `/<page>` for every old page; `/user-detail?id=X` → `/users/X`; `/constants` → `/master-data?tab=castes`; `/community-data` → `/master-data?tab=gotras`; `/city-pages` → `/regional-pages?tab=cities`; `/state-pages` → `/regional-pages?tab=states`. `debug/flow-test/test-auth/test-dashboard.html` → 404 (files deleted, see C9).

### C1.8 Legacy-compat shim (keeps un-migrated pages working behind the gate during C2–C8)
- Un-migrated pages are served by `routes/pages.js` via `res.sendFile` **behind `requireAdmin`** until each is replaced.
- Overwrite `public/js/api.js` and `public/js/auth.js` (same filenames the legacy pages load) with shims: `API_BASE_URL = ''` (relative `/api`, same origin), no Authorization header, `credentials:'same-origin'`, header `X-Requested-With: admin`, `checkAuth()` resolves `true`, `logout()` submits a POST form to `/auth/logout`. Remove all `console.log` of tokens (`api.js:54` logged the Authorization header).
- Pages with their own absolute constants get a one-line edit: `dashboard.html:~830 const API_URL`, `apk-manager.html API_BASE_URL`, `beta-testers.html API_URL`, `contact-enquiries.html:297,938 API_URL`, `community-feedback.html API_BASE/API_BASE_URL` → `''`/`'/api'`, and delete their `window.fetch` monkey-patches (`contact-enquiries.html:120-134`, `beta-testers.html:43-57`) and page-local `logout()` (`users.html:781`, `city-pages.html:900`, `state-pages.html:960`, `regional-pages.html:327`, `contact-enquiries.html:598`, `apk-manager.html:693`, `community-feedback.html:805`). Legacy pages still have inline handlers, so CSP stays Report-Only until C9.
- Add a lint `scripts/check-admin-raw.js` (adapt `/var/www/feribazaar.com/scripts/check-ejs-raw.js`): fails CI on `<%-` in `apps/admin/views` except `body`/`include(`/`icon(`, and on `innerHTML = \`…${` in `apps/admin/public/js` unless the template literal is the `html\`` tag.

### C1.9 nginx (Track B owns `deploy/nginx/admin.conf`; this is the required content)
Remove `root`/`index`/`try_files`. `location ^~ /css/ | /js/ | /img/ | /vendor/ { root /var/www/banjaramatch/apps/admin/public; expires 7d; add_header Cache-Control "public"; + repeat the security headers }`, `location = /robots.txt`, `location / { proxy_pass http://127.0.0.1:4001; proxy_read_timeout 180s; client_max_body_size 150m; }` (APK uploads now traverse the admin host). Keep `/api/` → :4001. Add HSTS. Test with `nginx -t`; switch vhost in the same deploy as `server.js`.

## C2. Core JS modules — `public/js/core/` (ES modules, no globals)
1. `dom.js`: `esc()` (from `community-data.html:433`, **plus `'` → `&#39;`**, which the original misses), `html\`` tagged template that escapes every interpolation (arrays joined, `raw()` wrapper for pre-built markup), `el(sel)`, `delegate(root, event, selector, handler)`.
2. `api.js`: `api(path, {method, body, headers, timeout=20000, signal})` against relative `/api`, `credentials:'same-origin'`, `X-Requested-With: admin`, AbortController timeout, non-JSON body parsed safely, success = `res.ok && data.status!==false && data.success!==false` (both API conventions), throws `ApiError{status,message,data}`, 401 → `location.assign('/login?next=…')`. `apiUpload(path, formData, onProgress)` via XHR for the APK (progress) and blog image.
3. `auth.js`: `bindLogout()` only.
4. `toast.js`: `toast.success|error|warning|info(msg,{timeout=5000})` into `#toast-root`, `textContent` only (fixes `notifications.js:18` innerHTML), max 3 stacked, close button; keeps the coloured left-border look of `notifications.js:59-95`.
5. `modal.js`: `openModal({title, body, footer, size, onClose})` → `{el, close}`; focus trap, Esc + overlay close, `role=dialog aria-modal aria-labelledby`, returns focus to opener, body scroll lock.
6. `confirm.js`: `confirm({title, message, confirmText, danger, typed})` → `Promise<boolean>`; `typed:'DELETE'` disables the button until the text matches (replaces `window.confirm/prompt`; fixes "Cancel still rejects" in `photo-moderation.html:170` because `null` ≠ confirm).
7. `pagination.js`: `renderPagination(mount, {page,pages,total}, onPage)` windowed (first/last/±2/ellipsis) — port of `users.html:502-538`, replacing the "render every page" versions in `photo-moderation.html:153` and `reports.html:195`.
8. `table.js`: `createTable({mount, columns:[{key,label,render,width,class}], fetchPage(params)→{rows,pagination}, rowKey, emptyTitle, emptyHint, parsePagination})`; states: loading (skeleton rows), empty (`.empty`), error (`.alert--error` + Retry), sticky header; `table.reload()`, `table.setParams()`; row actions via `data-action`/`data-id` + `delegate`.
9. `filters.js`: `bindFilters(formEl, onChange, {debounce:300})` → serialises named inputs to `URLSearchParams`, mirrors to `history.replaceState`, restores from URL on load (deep-linkable filters), "Clear" button.
10. `format.js`: `fmtDate`, `fmtDateTime`, `timeAgo` (port of `users.html:380-396` without the markup), `fmtNumber`, `fmtBytes`, `titleCase('in_progress')`.
11. `imageUrl.js`: `imageUrl(p, fallback)` — port of `photoUrl()` `photo-moderation.html:142-147` using `document.body.dataset.apiPublicUrl`; fallback = the inline SVG data-URI from `users.html:466`; never `via.placeholder.com` (`user-detail.html:91`).
12. `sidebar.js` + `boot.js`: hamburger/overlay/Esc, `aria-expanded`, flash auto-dismiss, `bindLogout()`.
Rules for `public/js/pages/*.js`: no inline `onclick`, every string through `html\``/`esc()`, IDs only in `data-id`, destructive actions through `confirm()`.

## C3. Page migration order and per-page spec

Query contracts below are the ones the API actually reads (verified in controllers). Order chosen so the riskiest XSS surfaces (users, inbox pages) go first.

### C3.1 Login + Dashboard + Users (deploy 2)
- **login** `/login` — `layouts/auth.ejs`, brand mark, email/password, server flash, `autocomplete="username|current-password"`, `noindex`.
- **dashboard** `/dashboard` (`pages/dashboard.js`): `GET /api/admin/dashboard/stats` → 5 `.stat` tiles (Total, Active last 7d [after C4.6], Verified, Blocked, New last 7d); `GET /api/admin/dashboard/user-growth?days=30` + `GET /api/admin/dashboard/engagement` → two Chart.js charts (empty-state text when no data); `GET /api/admin/dashboard/recent-users?limit=10` → table (Avatar, Name→`/users/:id`, Email, Phone, Gender, Status badge, Joined); gender + activity bars rendered with tokens. **Removed**: blog CRUD (`dashboard.html:319-480`, `828-1112` → Blogs page), dead regional section (`:483-665`, `:1114-1526`), inline-gradient quick-access cards (`:150-260`), 39 inline handlers, `alert()` calls.
- **users** `/users` (`pages/users.js`): table columns Avatar, Name (link), Email, Phone, Gender, Platform, Last active (`timeAgo(lastSeen)` + online dot), Status (Verified/Unverified + Active/Blocked badges), Actions (View). Filters: search (debounced), gender (`Male|Female|Not specified`), platform (`mobile|web`), verified (`1|0`), blocked (`1|0`), sort (`-createdAt|createdAt|-lastSeen|full_name`). **Contract after C4.1**: `GET /api/admin/users?page&limit=20&search&gender&platform&verified&blocked&sort` (today's page sends `is_verified`/`is_block`/`registration_platform` which the controller ignores, `users.html:414-416` vs `userController.js:22-44`). Empty state "No users match these filters" + Clear. No edit/delete here; everything is on the detail page.
- **user detail** `/users/:id` (`pages/user-detail.js`, new real page replacing orphaned `user-detail.html` and the `users.html:560-680` modal): header (avatar, name, badges, joined, last seen, platform, role), tabs Profile (info grid: personal, professional (`profession.name`, `qualification.name`, `incomeRange.name`), community (`caste.name`, `gotra.name`), location, family, preferences), Photos (from `data.photos` with moderation badges and inline Approve/Reject using the photo endpoints), Activity (`GET /users/:id/activity`), Blocks (`GET /users/:id/blocks`), Reports (`GET /api/admin/reports?reportedUser=:id` — new filter, C4.2), Membership (read-only plan + admin-only Assign via `POST /api/assignMembership`). Actions: Edit (modal; fields `full_name, email, phone, gender (Male|Female|Not specified — not "Other", user-detail.html:186 vs enum/enum.js:4), dob, bio, maritalStatus, height` → `PUT /api/admin/users/:id`), Verify/Unverify (`POST /users/:id/verify {verify}`, which sends push+email — not the generic PUT used by `user-detail.html:493`), Block (`POST /users/:id/block {block:true, reason}` reason required) / Unblock, Reset password (`POST /users/:id/reset-password {newPassword}` generated client-side, shown once), Delete (`confirm({typed: user.email})` → `DELETE /users/:id`). **Never renders `user.password`** (`users.html:614`); API stops returning it (C4.1).

### C3.2 Reports + Photo moderation (deploy 3)
- **reports** `/reports`: tiles from `GET /api/admin/reports/stats`; filters status (`pending|resolved|dismissed`), reason (options from `GET /api/admin/constants/report-reasons`); `GET /api/admin/reports?page&limit=20&status&reason&sort=-createdAt`; columns Date, Reporter (link), Reported user (link + Blocked badge), Reason, Description (120 chars, full text in View), Status, Actions: View (modal: full desc, resolution note, resolvedBy/At), Resolve/Dismiss (`PATCH /reports/:id/status {status, resolutionNote}`), Block user (`POST /reports/:id/block-user {resolutionNote}` behind `confirm({danger})`). Names escaped (today `reports.html:170-171, 210-211` are not).
- **photo-moderation** `/photo-moderation`: filter status `all|pending|approved|rejected` (default **all**, because `UserPhoto.moderationStatus` defaults to `approved` at `models/UserPhoto.js:16` and the pending queue is always empty), `GET /api/admin/photos?status&page&limit=40`; card grid with user link, status badge, uploaded date; Approve (`POST /photos/:id/approve`), Reject opens modal with optional reason → `POST /photos/:id/reject {reason}`; windowed pagination.

### C3.3 Inbox: contact, feedback, beta testers (deploy 4)
- **contact-enquiries** `/contact-enquiries` (rewrite of the two-documents file `contact-enquiries.html:606/767`): tiles `GET /api/contact/stats`; filters status (`new|read|replied|resolved|spam`), isRead (`true|false`); `GET /api/contact/all?page&limit=20&status&isRead&sortBy=createdAt&sortOrder=desc`; columns Date, Name, Email, Phone, Message (150 chars), Status, Read dot; View (`GET /api/contact/:id` then `PATCH /:id/read`), Set status + notes (`PATCH /:id/status {status, adminNotes}`), Delete (`DELETE /:id`, confirm).
- **community-feedback** `/community-feedback`: tiles (pending/reviewed/in_progress/completed/rejected) from a new stats endpoint; filters status, category (8 enum values from `models/CommunityFeedback.js`), priority; server pagination `page/limit` (replaces `limit=1000` + client-side search in `community-feedback.html:410, 780`); columns Date, Name/Email, Category, Subject, Priority, Status; `child_safety` rows get a danger badge and sort first; View modal edits status/priority/adminNotes → `PATCH`. Endpoint constant switches from `/api/auth/community-feedback` to `/api/admin/community-feedback` when Track A lands (C4.3); until then the proxy allowlist carries the old path.
- **beta-testers** `/beta-testers`: tiles `GET /api/beta-tester/stats`; filters status (`pending|approved|active|rejected`), isRead; `GET /api/beta-tester/all?page&limit=20&status&isRead&sortBy&sortOrder`; columns Date, Name, Email, Phone, Device (`deviceModel` / Android `androidVersion`), Location, Status, Read; View (marks read `PATCH /:id/read`), Set status (`PATCH /:id/status {status, adminNotes}`), Delete (`DELETE /:id` — exists, no UI today). Drops the 404 `css/admin-style.css` and Bootstrap 5.2.3.

### C3.4 Blogs + Banners (deploy 5)
- **blogs** `/blogs`, `/blogs/new`, `/blogs/:id/edit` (full pages, the form is long): list tiles `GET /api/admin/blogs/stats`; filters status (`draft|published|archived`), category (10 enum values in `models/Blog.js:31`), search; `GET /api/admin/blogs?page&limit=10&status&category&search&sortBy=createdAt&sortOrder=desc` (pagination shape `currentPage/totalPages/totalBlogs` → `table.js parsePagination`); columns Title + slug (link to `https://www.banjaramatch.com/blogs/<category>/<slug>`), Category, Status, Featured, Views, Published, Updated; actions Edit, Feature (`PATCH /blogs/:id/featured`), Publish/Draft/Archive (`PATCH /blogs/:id/status {status}`), Delete (typed confirm). Form (multipart via `apiUpload`): title, **slug read-only on edit** with note "URL is frozen to protect indexed links", description ≤500, content (textarea), category, tags, status, isFeatured, author.name/role, metaTitle ≤60, metaDescription ≤160, metaKeywords, featuredImage (preview).
- **banners** `/banners`: `GET /api/admin/banners`; columns Preview (`imageUrl`), Title, Link, Type, Active (switch → `POST /banners/:id/toggle-status`), Order; Add/Edit modal (title, imageUrl, link, type, order, isActive) → `POST /banners` / `PUT /banners/:id`; Delete. Requires the schema fix in C4.9 (today `isActive/order/type` are silently dropped).

### C3.5 Regional pages (deploy 6) — `/regional-pages?tab=states|cities`
One page, two tabs, shared toolbar (search, published `true|false`, sort). States: `GET /api/state-pages/admin/all?page&limit=20&search&isPublished&sortBy&sortOrder`; Cities: `GET /api/city-pages/admin/all?page&limit=20&search&state&isPublished&sortBy&sortOrder`. Columns Name, Slug (link to live page), Published, Active, Members (`stats.totalMembers`), Updated; actions Edit, Refresh stats (`POST …/admin/:id/refresh-stats`), Delete (typed confirm — deleting a published page breaks an indexed URL; warn). Create: pick state (`POST /api/states`) / city (`POST /api/cities {state}`) → Prefill (`GET …/admin/prefill/:id`) → form. Cities also get Bulk create (`POST /api/city-pages/admin/bulk-create {cityIds}`). Edit form reuses the field ids already in `city-pages.html` (`heroTitle…nearbyCitiesData`) and `state-pages.html` (`stateIntro…stateEconomicProfile`) as a `fields` config; **slug read-only on edit**; `stateMemberCount`, `stateSuccessMetric`, `stateVerificationNote` fields are removed from the form and the prefill (fabricated claims, `state-pages.html:723,734`). Replaces `regional-pages.html`, `city-pages.html`, `state-pages.html`.

### C3.6 Master data (deploy 7) — `/master-data?tab=<key>`
Tabs driven by one config in `pages/master-data.js`: `castes{name}`, `clans{name,displayName,description,origin,alternateNames[],disputedStatus,statePresence[],isActive,sortOrder}`, `gotras{name,clan(select from clans),alternateNames[],description,origin,deity,statePresence[],isActive}`, `surname-titles{name,alternateSpellings[],meaning,origin,usagePattern,usageType(enum),applicableClans[],statePresence[],isActive,sortOrder}`, `professions{name}`, `qualifications{name}`, `income-ranges{name,min,max,sortOrder}`, `interests{title}`, `report-reasons{title,is_active}`, `about-options{category(tone|trait|hobby|goal),value}`. Endpoints `GET/POST /api/admin/constants/<key>`, `PUT/DELETE /api/admin/constants/<key>/:id` (PUT exists in `routes/admin.js:67-127` but no UI uses it). `statePresence` sub-forms port `STATE_FIELD_SCHEMAS` + `addStateRow` from `community-data.html:~400-470`. Gotras tab keeps the AI flow: `POST /api/admin/gotras/ai-suggest` → review table → `POST /api/admin/gotras/ai-apply`. Delete shows the API's 409 "in use by N users" (C4.10). Replaces `constants.html` + `community-data.html`.

### C3.7 Settings, APK, Broadcast (deploy 8)
- **settings** `/settings`: form bound to `GET/PUT /api/admin/settings` with the allowlist from C4.7: General (appName, helpUrl, termsUrl, privacyPolicyUrl), App (setRoomUsersLimit, maxImagesCanBeUploadedInOnePost, minuteLimitInCreatingStory), Ads (isAdmobOn, adBannerAndroid, adInterstitialAndroid); Account card: change password (`POST /api/admin/auth/change-password`, C4.8); Session card (logged in as, release sha). **Removed**: fake stats (`settings.html:173-178`), no-op save (`:190`), fake password change (`:319`), bulk verify/unverify/unblock/delete loops (`:196-300`), export, clear cache.
- **apk-manager** `/apk-manager`: current APK card (`GET /api/admin/apk/info`: versionName/Code, size `fmtBytes`, downloads, lastUpdated, Mandatory badge, download link `API_PUBLIC_URL + /api/download-apk`); Upload (`apiUpload('/api/admin/apk/upload', fd, progress)` fields `apkFile, versionName, versionCode, releaseNotes, isMandatoryUpdate`); Edit info (`PUT /api/admin/apk/update-info`); **Mandatory-update switch** as a dedicated control with `confirm()` text "Every app user on versionCode < N will be blocked until they update" (today it is a checkbox buried in two forms, `apk-manager.html:337,386`); Delete (typed confirm). Flutter contract untouched: `POST /api/fetchSetting` and `GET /api/download-apk` keep today's shape.
- **broadcast-email** `/broadcast-email`: audience filters (gender, minAge, maxAge, verified, blocked, platform) → `GET /api/admin/broadcast-email/preview?…` count; compose subject/bodyHtml/bodyText with `{{name}}` hint; Send test (`POST /send-test {userId,…}` with typeahead `GET /api/admin/users?search&limit=10`); Send (`POST /send {subject, bodyHtml, bodyText, filter, confirmCount}`) behind `confirm({typed: String(count)})`; progress panel polls `GET /broadcast-email/jobs/:id` once C4.6 ships.

### C3.8 Audit log (deploy 9, depends on Track A model) — `/audit-log`
`GET /api/admin/audit-log?page&limit=50&action&adminId&targetType&targetId&from&to`; columns Time, Admin, Action, Target (link to `/users/:id`, `/blogs/:id/edit`, …), Summary (diff keys), IP. Filters action (select from API `GET /api/admin/audit-log/actions`), date range, target id. User detail "Activity" tab also shows the user's audit entries.

## C4. API-side changes required by the admin (apps/api)
1. `controllers/admin/userController.js`: `:15-45` accept `verified=1|0`, `blocked=1|0`, `platform=mobile|web`, escape the search regex, whitelist `sort`, add `.select('-password -device_token -firebase_uid -coordinates -block_user_ids')`; `:88-93` `getUserById` add the same `.select` (password hash leak); `:100` `UserPhoto.find({ userId: id })`; `:104-105` `FriendshipRequest.countDocuments({ requester: id })` / `({ recipient: id })`; `:133-181` `updateUser` allowlist (`full_name,email,phone,gender,dob,bio,maritalStatus,height`) — reject `is_verified,is_block,membershipPlan,role,password,firebase_uid,device_token`; `:380` `Notification.deleteMany({ $or: [{ fromUser: id }, { toUser: id }] })`; `:383` `ReportStatus.deleteMany({ $or: [{ reporter: id }, { reportedUser: id }] })`; `:489` `ActivityLog.find({ userId: id })`; extract the cascade into `services/userCascade.js` (also used by the app's self-delete).
2. `controllers/admin/reportController.js:22-25` add `reportedUser`/`reportedBy` query filters, `.lean()`, keep populates; `:88-110` and `:121-145` record audit entries; surface `ReportStatus` rows (written by `UserController.js:670` `reportStatus`, invisible today) by migrating them into `UserReport` once (script) and deleting the second path.
3. `routes/authRoute.js:44-45` → move to `routes/admin.js` as `GET /api/admin/community-feedback?page&limit&status&category&priority&search`, `GET /api/admin/community-feedback/stats`, `GET /:id`, `PATCH /:id {status,priority,adminNotes}` behind `adminAuth`; old paths return 401. (Track A.)
4. `controllers/admin/blogController.js:273-280` delete the slug regeneration block; slug is set only in `createBlog` (`:167-184`); add `GET /api/admin/blogs/:id` returning `slug` read-only; `updateBy` should be `req.userId` (today `req.admin?._id` at `:313` is always undefined).
5. `is_block` enforcement so the admin Block button is truthful: `middleware/authMiddleware.js:13` and `middleware/adminAuth.js:30` select `is_block` and reject 403 `{code:'ACCOUNT_BLOCKED'}`; login handlers `controllers/AuthController.js` (firebase-google-login `:231`, firebase-email-register `:513`, loginWithEmail) reject blocked users; `socket.js:46` join. (Track A.)
6. Dashboard cost + correctness: `controllers/admin/dashboardController.js:12-31` runs 9 `countDocuments` + 2 aggregates per load; add indexes `User {is_block:1}`, `{is_verified:1}`, `{gender:1}`, `{createdAt:-1}`, `{lastSeen:-1}`, `{role:1,email:1}`; `Message {createdAt:-1}`, `{sender:1}`; `UserReport {status:1,createdAt:-1}`; `UserPhoto {moderationStatus:1,uploadedAt:-1}`; `CommunityFeedback {status:1,createdAt:-1}`; cache the stats payload 60s in memory; `:24` "Active Users" = `lastSeen >= now-7d` (DAU/WAU) with "Not blocked" as a separate number; `:178` `FriendshipRequest.distinct('from')` → `'requester'` (always 0 today). Broadcast: `routes/admin.js:189-225` add `BroadcastJob` model (status, total, sent, failed, startedBy, createdAt), max 500 recipients per send and 2 sends/day, `confirmCount` must equal the preview count, rate limit 1/min, `GET /broadcast-email/jobs/:id`; `services/emailService.js:261` escape `full_name` before `{{name}}` substitution, add `List-Unsubscribe` header, 200ms spacing between sends.
7. `controllers/admin/settingsController.js:27-40` replace `Object.assign` with an allowlist (`appName, helpUrl, termsUrl, privacyPolicyUrl, setRoomUsersLimit, maxImagesCanBeUploadedInOnePost, minuteLimitInCreatingStory, isAdmobOn, adBannerAndroid, adInterstitialAndroid`); never accept `apk.*` here (APK routes own it); validate URLs are `https://` on `banjaramatch.com`. Public `PUT /api/updateSettings` at `routes/settingsRoute.js:13` is deleted (Track A).
8. New `POST /api/admin/auth/change-password {currentPassword,newPassword}` (bcrypt, ≥12 chars) in `controllers/admin/authController.js`; `:35-50` check password before role and return one generic 401; `:67-73` stop setting the `.banjaramatch.com` `token` cookie for admin logins (the admin server owns the session now); `adminAuth.js:12` prefer `Authorization` over the cookie and delete the cookie logging at `:15`; remove the request-logging middleware at `routes/admin.js:31-34`.
9. `models/Banner.js:3-8` add `isActive:{Boolean,default:true}`, `order:{Number,default:0}`, `type:{String,default:'general'}` (bannerController already writes them); `UserController.fetchBanner` filters `isActive:true` (additive, app-compatible).
10. `controllers/admin/constantsController.js:79` `deleteItem` → count references (`User.countDocuments({caste:id})`, `{gotra:id}`, `{profession:id}`, `{qualification:id}`, `{incomeRange:id}`, `{interests:id}`, `Gotra.countDocuments({clan:id})`) and return 409 `{inUse:N}`.
11. `controllers/admin/photoModerationController.js:46-57` when the rejected photo `isProfile` or `imageUrl === user.profile`, clear `User.profile`.
12. Audit log (Track A model, admin consumes): `models/AdminAuditLog.js {adminId, action, targetType, targetId, before, after, ip, userAgent, createdAt}`, `services/auditLog.js record(req, action, target, diff)`, called from block/verify/delete/reset-password/settings/apk/broadcast/blog/banner/constants/regional handlers; `GET /api/admin/audit-log` + `/actions`.

## C5. Accessibility + UX baseline (applies to every page)
Keyboard-closable modals with focus trap and focus return; visible `:focus-visible` ring; one toast system with `aria-live`; `confirm()` for every destructive action, typed confirmation for delete user / delete blog / delete regional page / delete APK / broadcast send; skeleton rows while loading; `.alert--error` with Retry on fetch failure; sticky table headers; mobile hamburger + overlay + Esc; `<label for>` on every control; tables have `<caption class="sr-only">`; colour never the only status cue (badge text); sidebar `nav aria-label="Admin"`; skip link to `#main`.

## C6. Cleanup (deploy 9, after every page is migrated)
Delete `public/{debug,flow-test,test-auth,test-dashboard}.html`, all 22 legacy `public/*.html`, `public/js/{api,auth,notifications}.js` shims, `public/css/style.css`, `routes/adminAuth.js`, `ADMIN_CREDENTIALS.md`, `DEPLOYMENT.md` (contains the default password), `ADMIN_PANEL_REFACTORING_COMPLETE.md`, `QUICK_REFERENCE.txt`, `QUICK_START.md`, `SETUP_COMPLETE.md`, `README.md` (rewrite as 30 lines), `deploy.sh`, `setup.sh`, `nginx.conf` (lives in `deploy/nginx/admin.conf`), `views/pages/.gitkeep` leftovers. `.env` keys `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, `API_BASE_URL` dropped from `env/admin.env`. Switch CSP from Report-Only to enforced. Add `/dashboard` and `/users` to the pa11y/Lighthouse check list.

## C7. Order of operations vs. Track A's JWT rotation (lockout avoidance)
1. Deploy C1 (admin in proxy mode; no secret in admin env). 2. Rotate `JWT_SECRET` on the API (Track A). 3. Every admin cookie now fails `/me` → 302 `/login`; admins log in once. 4. Only then delete the `.banjaramatch.com` `token` cookie emission (C4.8) and the legacy `localStorage` paths. At no point does the admin server need the new secret, and the old static pages (if any remain) also keep working because they go through the same proxy.


## files_to_create
- apps/admin/server.js (rewrite)
- apps/admin/config/env.js
- apps/admin/config/nav.js
- apps/admin/lib/render.js
- apps/admin/lib/apiClient.js
- apps/admin/middleware/requireAdmin.js
- apps/admin/middleware/security.js
- apps/admin/routes/auth.js
- apps/admin/routes/pages.js
- apps/admin/routes/proxy.js
- apps/admin/routes/legacy.js
- apps/admin/views/layouts/base.ejs
- apps/admin/views/layouts/auth.ejs
- apps/admin/views/partials/head.ejs
- apps/admin/views/partials/sidebar.ejs
- apps/admin/views/partials/topbar.ejs
- apps/admin/views/partials/flash.ejs
- apps/admin/views/partials/pagination.ejs
- apps/admin/views/partials/table-toolbar.ejs
- apps/admin/views/partials/icon.ejs
- apps/admin/views/pages/login.ejs
- apps/admin/views/pages/dashboard.ejs
- apps/admin/views/pages/users.ejs
- apps/admin/views/pages/user-detail.ejs
- apps/admin/views/pages/reports.ejs
- apps/admin/views/pages/photo-moderation.ejs
- apps/admin/views/pages/contact-enquiries.ejs
- apps/admin/views/pages/community-feedback.ejs
- apps/admin/views/pages/beta-testers.ejs
- apps/admin/views/pages/blogs.ejs
- apps/admin/views/pages/blog-form.ejs
- apps/admin/views/pages/banners.ejs
- apps/admin/views/pages/regional-pages.ejs
- apps/admin/views/pages/master-data.ejs
- apps/admin/views/pages/settings.ejs
- apps/admin/views/pages/apk-manager.ejs
- apps/admin/views/pages/broadcast-email.ejs
- apps/admin/views/pages/audit-log.ejs
- apps/admin/views/pages/error.ejs
- apps/admin/public/css/admin.css
- apps/admin/public/img/icons.svg
- apps/admin/public/img/logo.svg
- apps/admin/public/img/favicon.svg
- apps/admin/public/vendor/chart.umd.min.js (pinned 4.4.x, self-hosted)
- apps/admin/public/robots.txt
- apps/admin/public/js/core/boot.js
- apps/admin/public/js/core/api.js
- apps/admin/public/js/core/auth.js
- apps/admin/public/js/core/dom.js
- apps/admin/public/js/core/toast.js
- apps/admin/public/js/core/modal.js
- apps/admin/public/js/core/confirm.js
- apps/admin/public/js/core/table.js
- apps/admin/public/js/core/pagination.js
- apps/admin/public/js/core/filters.js
- apps/admin/public/js/core/format.js
- apps/admin/public/js/core/imageUrl.js
- apps/admin/public/js/core/sidebar.js
- apps/admin/public/js/pages/dashboard.js
- apps/admin/public/js/pages/users.js
- apps/admin/public/js/pages/user-detail.js
- apps/admin/public/js/pages/reports.js
- apps/admin/public/js/pages/photo-moderation.js
- apps/admin/public/js/pages/contact-enquiries.js
- apps/admin/public/js/pages/community-feedback.js
- apps/admin/public/js/pages/beta-testers.js
- apps/admin/public/js/pages/blogs.js
- apps/admin/public/js/pages/blog-form.js
- apps/admin/public/js/pages/banners.js
- apps/admin/public/js/pages/regional-pages.js
- apps/admin/public/js/pages/master-data.js
- apps/admin/public/js/pages/settings.js
- apps/admin/public/js/pages/apk-manager.js
- apps/admin/public/js/pages/broadcast-email.js
- apps/admin/public/js/pages/audit-log.js
- apps/admin/test/routes.test.js (node:test + supertest; stubs apiClient.me)
- apps/admin/.env.example
- scripts/check-admin-raw.js (adapted from /var/www/feribazaar.com/scripts/check-ejs-raw.js)
- apps/api/services/userCascade.js
- apps/api/services/auditLog.js (Track A model; admin consumes)
- apps/api/models/AdminAuditLog.js (Track A)
- apps/api/models/BroadcastJob.js
- apps/api/scripts/migrateReportStatusToUserReport.js (one-off)

## files_to_modify
- apps/admin/package.json (drop axios/bcryptjs/jsonwebtoken/cors/body-parser; add helmet, http-proxy-middleware ^3, express-rate-limit; scripts start/test)
- apps/admin/public/js/api.js and auth.js (transitional shim during C2-C8, deleted in C6)
- apps/admin/public/dashboard.html, apk-manager.html, beta-testers.html, contact-enquiries.html, community-feedback.html (transitional: API_URL constants → '', remove fetch monkey-patches and page-local logout; deleted in C6)
- deploy/nginx/admin.conf (Track B: remove root/index/try_files; static-only /css /js /img /vendor; proxy everything else to 127.0.0.1:4001; client_max_body_size 150m; HSTS; repeat security headers in location blocks)
- ecosystem.config.js (Track B: banjaramatch-admin cwd apps/admin, node 22, env file link)
- deploy/deploy.sh (Track B: export RELEASE_SHA; health-check http://127.0.0.1:4001/health)
- apps/api/controllers/admin/userController.js (:15-45 filters/select/regex/sort; :88-93 select; :100 userId; :104-105 requester/recipient; :133-181 allowlist; :380 fromUser/toUser; :383 reporter; :489 userId)
- apps/api/controllers/admin/reportController.js (:22-25 filters + lean; audit calls)
- apps/api/routes/admin.js (community-feedback routes, change-password, audit-log, broadcast jobs/limits; remove :31-34 logger)
- apps/api/routes/authRoute.js (:44-45 remove unauthenticated community-feedback list/update)
- apps/api/controllers/CommunityFeedbackController.js (page/limit/search, stats, getById)
- apps/api/controllers/admin/blogController.js (:273-280 delete slug regeneration; :313 updatedBy = req.userId)
- apps/api/controllers/admin/dashboardController.js (:24 active = lastSeen 7d; :178 'requester'; 60s cache)
- apps/api/controllers/admin/settingsController.js (:27-40 allowlist)
- apps/api/controllers/admin/authController.js (:35-50 password-before-role, generic 401; :67-73 drop .banjaramatch.com cookie; add changePassword)
- apps/api/middleware/adminAuth.js (:12 header-first; :15 remove cookie log; :30 select is_block and reject)
- apps/api/models/Banner.js (add isActive, order, type)
- apps/api/models/User.js, Message.js, UserReport.js, UserPhoto.js, CommunityFeedback.js (indexes listed in C4.6)
- apps/api/controllers/admin/constantsController.js (:79 reference check → 409 {inUse})
- apps/api/controllers/admin/photoModerationController.js (:46-57 clear User.profile on reject)
- apps/api/services/emailService.js (:261 escape name; List-Unsubscribe; spacing)
- apps/api/controllers/stateRegionalPageController.js (prefill: drop memberCount/successMetric/verificationNote strings)

## reuse
- /var/www/admin.banjaramatch.com/public/css/style.css — :root tokens and the .sidebar/.topbar/.card/.form-group/.btn/.table/.badge/.modal/.pagination/.spinner/.info-grid selectors become the seed of apps/admin/public/css/admin.css (keep selector names so legacy pages still render during the transition)
- /var/www/admin.banjaramatch.com/public/js/api.js apiRequest() — the dual status/success normalisation and 401 handling become core/api.js (relative /api, AbortController, no logging, X-Requested-With)
- /var/www/admin.banjaramatch.com/public/js/auth.js logout() — the only surviving piece: POST /auth/logout; checkAuth() is replaced by middleware/requireAdmin.js
- /var/www/admin.banjaramatch.com/public/js/notifications.js — icon + coloured left border + close-button toast styling → core/toast.js (textContent instead of innerHTML)
- /var/www/admin.banjaramatch.com/public/community-data.html:433 esc() → core/dom.js esc() (add the missing ' escape) and the html`` tagged template
- /var/www/admin.banjaramatch.com/public/community-data.html ~400-470 STATE_FIELD_SCHEMAS + addStateRow() → master-data.js statePresence sub-form
- /var/www/admin.banjaramatch.com/public/users.html:502-538 windowed pagination → core/pagination.js
- /var/www/admin.banjaramatch.com/public/users.html:380-396 formatTimeAgo → core/format.js timeAgo (without markup)
- /var/www/admin.banjaramatch.com/public/users.html:466 inline SVG placeholder data-URI → core/imageUrl.js fallback
- /var/www/admin.banjaramatch.com/public/photo-moderation.html:142-147 photoUrl() → core/imageUrl.js
- /var/www/admin.banjaramatch.com/public/city-pages.html and state-pages.html form field ids (heroTitle…nearbyCitiesData, stateIntro…stateEconomicProfile) → regional-pages.js fields config
- /var/www/admin.banjaramatch.com/public/dashboard.html:319-480 + 828-1112 blog CRUD → pages/blogs.js and blog-form.js
- /var/www/admin.banjaramatch.com/public/apk-manager.html XHR upload with progress (~:560-600) → core/api.js apiUpload()
- /var/www/feribazaar.com/website/src/lib/render.js — render page then layout with `body` slot → apps/admin/lib/render.js
- /var/www/feribazaar.com/scripts/check-ejs-raw.js — refuse `<%-` and innerHTML-with-data → scripts/check-admin-raw.js
- /var/www/feribazaar.com/.pa11yci.json — WCAG2AA axe+htmlcs config → a11y check for /login, /users, /settings
- /var/www/banjaramatch.com/routes/index.js:149-176 ensureAuth — cookie → /me call → redirect pattern, mirrored (without the token logging) in middleware/requireAdmin.js
- /var/www/api.banjaramatch.com/middleware/adminAuth.js — keep as the API guard; extend with is_block and header-first
- /var/www/api.banjaramatch.com/controllers/admin/reportController.js — reference controller style (validated enum, populate with field selection) for the new community-feedback admin controller
- /var/www/api.banjaramatch.com/controllers/admin/constantsController.js — generic CRUD factory kept; add reference check
- /var/www/api.banjaramatch.com/deleteUsers.js — the most complete cascade list (includes IceBreakerGame) → services/userCascade.js
- /var/www/api.banjaramatch.com/routes/admin.js:228-259 buildBroadcastQuery — unchanged, reused by preview/send with the new limits

## risks
- Admin lockout during JWT rotation — mitigated by design: the admin server never holds JWT_SECRET; it proxies /api/admin/auth/me. Order: deploy C1 → rotate API secret → admins re-login once. Never copy the secret into env/admin.env.
- nginx try_files removed before Node routes exist → every admin URL 404s. Mitigation: ship deploy/nginx/admin.conf and the new server.js in the same deploy; `nginx -t` first; keep the old vhost file for one-command rollback; deploy.sh health-checks /health and /login (expects 200) before pm2 save.
- Body parsers mounted before the proxy consume request streams → every POST through /api hangs/fails (and 100 MB APK uploads break). Mitigation: proxy mounted first; urlencoded parser only on routes/auth.js; proxyTimeout 180s; nginx client_max_body_size 150m on the admin vhost (uploads used to go straight to api host).
- Stale `.banjaramatch.com` `token` cookie overrides the admin Bearer token (adminAuth.js:12 cookie-first) → random 403s. Mitigation: proxy strips the Cookie header; C4.8 makes the API header-first.
- CSP `script-src 'self'` breaks any missed inline handler/CDN script silently. Mitigation: Report-Only for the first deploy, enforce only after C6 when no legacy page remains; Chart.js self-hosted.
- Legacy pages during C2–C8 still contain stored-XSS sinks (contact/feedback/users). Mitigation: migrate users + inbox pages first (C3.1, C3.3); the cookie is httpOnly so XSS can no longer steal the token, only act within the page while it is open.
- Community-feedback endpoint move (Track A) lands before/after the admin page switch → page breaks. Mitigation: single endpoint constant in community-feedback.js; proxy allowlist carries the old path until the switch; remove it in the same PR as the switch.
- Deleting Settings bulk/danger actions — they never worked (endpoints 404) so no behaviour is lost; do not re-implement server-side bulk delete.
- Setting document may already carry a tampered apk.filePath (open audit question) — before enabling the APK page, read the Setting doc once; Track A's download-apk path check (resolve inside uploads/apk) must be in place before the APK page is relied on.
- requireAdmin calling /me on every page load adds one API round trip + DB read; 60s cache keyed by sha256(token) bounds it; API outage renders a 503 page instead of a redirect loop.
- Blog slug fix changes behaviour admins may rely on (renaming a post to change its URL) — intentional per the URL contract; UI explains the freeze.
- Users page filter rename (verified/blocked/platform) must ship with the API change in the same deploy or filters silently ignore again; keep nothing of the old param names.
- pm2 runs the admin on Node 18.19.1 while the monorepo targets 22 (.nvmrc) — http-proxy-middleware v3 and global fetch work on both, but ecosystem.config.js must set the interpreter explicitly (Track B).
- Mongo index creation on live collections — small (320 users), but build in background; add indexes in schema files so `syncIndexes` is explicit, not implicit on boot.

## verification
- Unauthenticated gate: for p in dashboard users users/000000000000000000000000 reports photo-moderation contact-enquiries community-feedback beta-testers blogs banners regional-pages master-data settings apk-manager broadcast-email audit-log; do curl -s -o /dev/null -w "$p %{http_code} %{redirect_url}\n" https://admin.banjaramatch.com/$p; done → every line `302 https://admin.banjaramatch.com/login?next=/<p>`
- Test pages gone: curl -s -o /dev/null -w '%{http_code}\n' https://admin.banjaramatch.com/debug.html https://admin.banjaramatch.com/flow-test.html https://admin.banjaramatch.com/test-auth.html https://admin.banjaramatch.com/test-dashboard.html https://admin.banjaramatch.com/users.html → 404 404 404 404 (and `grep -c admin@banjaramatch.com` on each body = 0)
- Login sets a correctly scoped cookie: curl -si -X POST https://admin.banjaramatch.com/auth/login -d 'email=<admin>&password=<pw>' | grep -i set-cookie → `admin_session=…; Path=/; HttpOnly; Secure; SameSite=Strict` with NO `Domain=` and a 302 Location: /dashboard; wrong password → 200 login page with the generic error and no Set-Cookie
- Every nav link renders inside the layout: T=<cookie value>; for p in <same list>; do curl -s -b "admin_session=$T" https://admin.banjaramatch.com/$p | grep -c 'id="sidebar"' ; done → 1 for every page; and `grep -o 'aria-current="page"' | wc -l` = 1
- Proxy injects auth and strips cookies: curl -s -b "admin_session=$T" https://admin.banjaramatch.com/api/admin/dashboard/stats | jq .status → true; curl -s https://admin.banjaramatch.com/api/admin/dashboard/stats → 401 JSON; curl -s -b "admin_session=$T" -X POST https://admin.banjaramatch.com/api/admin/users/x/block → 403 (missing X-Requested-With); curl -s -b "admin_session=$T" -X POST -H 'X-Requested-With: admin' https://admin.banjaramatch.com/api/deleteUser → 404 (not on allowlist)
- Login rate limit: for i in $(seq 1 11); do curl -s -o /dev/null -w '%{http_code} ' -X POST https://admin.banjaramatch.com/auth/login -d 'email=x&password=y'; done → ten 200s then 429
- Logout clears session: curl -si -b "admin_session=$T" -X POST https://admin.banjaramatch.com/auth/logout | grep -iE 'set-cookie|location' → `admin_session=; …Max-Age=0` and Location: /login; the old $T then yields 302 on /dashboard
- XSS: via the admin Edit modal set a test user's full_name to `<img src=x onerror=document.title='pwned'>`; reload /users and /users/:id; in DevTools `document.title` unchanged, `document.querySelector('img[src="x"]')` is null, the name shows as literal text; `curl -b … /api/admin/users?search=onerror | jq '.data[0].full_name'` returns the raw string (API stores, UI escapes); same with a contact form message containing `<script>` on /contact-enquiries
- Users filters hit the API: curl -s -b … 'https://admin.banjaramatch.com/api/admin/users?verified=1&blocked=0&platform=mobile&limit=5' | jq '[.data[] | {is_verified,is_block,last_login_platform}]' → all 1/0/mobile; password never present: `jq '.data[0] | has("password")'` → false; GET /api/admin/users/<id> | jq 'has("password")' → false and `.data.photos | length` > 0 for a user with photos
- Blog slug frozen: PUT /api/admin/blogs/<id> with a new title → `jq .data.slug` unchanged; curl -s -o /dev/null -w '%{http_code}' https://www.banjaramatch.com/blogs/<category>/<slug> → 200
- Security headers: curl -sI -b … https://admin.banjaramatch.com/dashboard | grep -iE 'content-security-policy|x-robots-tag|strict-transport|cache-control' → CSP with script-src 'self', X-Robots-Tag: noindex, HSTS, Cache-Control: no-store; curl -sI https://admin.banjaramatch.com/css/admin.css → Cache-Control public, max-age=604800 (not 1y immutable) and X-Content-Type-Options present
- Health: curl -s http://127.0.0.1:4001/health → {"ok":true,"release":"<sha>","api":true}; `ss -ltnp | grep 4001` shows 127.0.0.1:4001 only
- Unit smoke: cd apps/admin && npm test → routes.test.js passes (every nav route 302 without cookie, 200 with stubbed /me, 404 for *.html, 301 map entries)
- Raw-output lint: node scripts/check-admin-raw.js → exit 0 (no `<%-` except body/include/icon, no innerHTML with data in apps/admin/public/js)
- Accessibility: on the laptop run `npx lighthouse https://admin.banjaramatch.com/login --only-categories=accessibility --output=json --output-path=./login.json` and, with a logged-in Chrome profile, the same for /users and /settings (or `npx lighthouse … --extra-headers '{"Cookie":"admin_session=…"}'`) → accessibility score ≥ 95 on all three; alternatively `npx pa11y-ci` with the feribazaar config pointed at those three URLs → 0 errors
- Manual UX checklist (DevTools, 390px viewport): hamburger opens sidebar, overlay/Esc closes it; open any modal → Tab stays inside, Esc closes, focus returns to the opener; delete-user button disabled until the typed email matches; disconnect the API (`pm2 stop banjaramatch-api` on a staging box only) → tables show the error banner with Retry, page shell still renders, /dashboard shows the 503 page not a redirect loop
- URL contract unaffected: run deploy/check-urls.sh before and after each admin deploy → zero diffs (admin host is not in any sitemap; www/api untouched by this track except API JSON shapes listed in C4)

## needs_from_other_tracks
- Track A: move community-feedback list/update under /api/admin/community-feedback with adminAuth and add stats/getById/page-limit (authRoute.js:44-45); the admin page switches endpoint in the same deploy
- Track A: is_block enforcement in authenticate/adminAuth/login handlers/socket join (authMiddleware.js:13, adminAuth.js:30, AuthController.js:231/513, socket.js:46) so the admin Block action is truthful
- Track A: admin login hardening (authController.js:35-50 password-before-role, generic 401, API-side rate limit), header-first adminAuth (adminAuth.js:12), remove token/cookie logging (adminAuth.js:15, authController.js:115)
- Track A: JWT_SECRET rotation with fail-fast and algorithms:['HS256'] — must happen AFTER the C1 admin deploy (see C7); optional shorter admin JWT expiry (≤12h) matching the admin cookie TTL
- Track A: AdminAuditLog model + services/auditLog.js + GET /api/admin/audit-log (+ /actions) with the query contract in C3.8; call sites listed in C4.12
- Track A: delete public PUT /api/updateSettings and documentTypes/reportReasons mutations (settingsRoute.js:13-23); path-confine /api/download-apk; remove userRoutes.js:86-91 admin APIs (banner/add, fake-batch, mark-top)
- Track B: deploy/nginx/admin.conf per C1.9 (no try_files, static-only locations, client_max_body_size 150m, HSTS, headers repeated in location blocks), applied in the same deploy as the new server.js
- Track B: ecosystem.config.js entry for banjaramatch-admin (cwd apps/admin, script server.js, Node 22 interpreter, env from /var/www/banjaramatch-shared/env/admin.env), deploy.sh exporting RELEASE_SHA and health-checking http://127.0.0.1:4001/health
- Track B: root CI runs `npm test --workspace=apps/admin` and `node scripts/check-admin-raw.js`
- Web track: nothing required; blog slug freeze (C4.4) and regional slug read-only protect the URL contract that the web track verifies with check-urls.sh

## owner_actions
- Rotate the admin@banjaramatch.com password now (the default is in publicly served debug.html/ADMIN_CREDENTIALS.md); do it via the API or Mongo before C1, and again via the new Settings → Change password after C3.7
- Create /var/www/banjaramatch-shared/env/admin.env with PORT=4001, NODE_ENV=production, API_INTERNAL_URL=http://127.0.0.1:4002, API_PUBLIC_URL=https://api.banjaramatch.com, SESSION_TTL_HOURS=12 (no JWT_SECRET, no ADMIN_PASSWORD)
- Approve replacing /etc/nginx/sites-available/admin.banjaramatch.com with deploy/nginx/admin.conf (nginx -t + reload) in the C1 deploy window; log in once afterwards to confirm
- Run Lighthouse accessibility on /login, /users, /settings from the laptop (Chrome) after C3.1 and C3.7 and paste scores into the PR
- Read the current Setting document's apk.filePath (mongo shell, read-only) before relying on the APK manager page; if it is not /uploads/apk/<file>.apk, reset it via the new APK page after Track A's download-apk fix
- Decide whether Ads settings (isAdmobOn, adBannerAndroid, adInterstitialAndroid) should stay in the Settings page or be hidden (they exist in the schema; the plan keeps them in a collapsed 'Ads' card)
- No Flutter rebuild is required for this track; a future build may point the in-app update link at the same /api/download-apk URL, which is unchanged