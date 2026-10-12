# gap:infra-runtime-evidence

## summary
I checked the infrastructure claims read-only. There was one side effect: my `curl -I` on /api/download-apk ran its GET handler (Express routes HEAD to GET), so it added 1 to settings.apk.downloadCount.

(1) `git status --porcelain` in the api repo shows 172 entries: 19 modified, 1 deleted, 152 untracked. index.js (the dotenv line) and routes/adminRoutes.js are modified, but middleware/adminAuth.js is not. `git ls-files uploads` gives 216 and cert/ has 1 tracked file, an Apple .p8 key. The admin directory is not a git repo at all.

(2) pm2 runs the API on Node 18.19.1, not the v22 in the shell, with 0 restarts in 135.9h. The error log has 0 UnhandledPromiseRejection, 699 CastErrors (all from the userId value "0", which is caught and logged) and 5 E11000 errors (all on users, none on chatrooms). The socket `send_message` handler has no try/catch and there is no unhandledRejection handler, so the crash risk is real but never seen in this window. The claim is a latent risk, not observed crashes.

(3) `db.chatrooms.getIndexes()` returns only `_id_` (11 docs). The `{participants:1,isGroup:1}` unique partial index never built because it uses `$exists:false`, which partial indexes don't support. So it does not block second 1:1 rooms, and there is no duplicate-room protection either.

(4) The admin docs and scripts use the pm2 name 'admin-panel' and port 3002 (setup.sh says 3001). The live setup is 'banjaramatch-admin', .env PORT=4001, and nginx proxies to 4001. The repo nginx.conf proxies to 3002 and has HSTS and http2, which the live one lacks. ADMIN_CREDENTIALS.md line 10 holds a plaintext password, but it returns 404 over HTTPS.

(5) There is no backup of any kind for Mongo 'aasd' or uploads: no root crontab, no mongodump anywhere, nothing in /var/backups. uploads is 290M (apk 73M, blog_images 4.0K, profile_images 218M).

(6) banjaraamatch.com does not exist in DNS (NXDOMAIN, .com SOA only). banjaramatch.com, www, api and admin all resolve to 89.116.32.204 (NS dns-parking.com).

(7) nginx has nothing extra for banjaramatch beyond the three site files. There are no rate-limit zones, no proxy_read_timeout or socket.io block, and no assetlinks location (it 404s). gzip is on with default types only, and the www block does not forward X-Forwarded-For/Proto.

(8) Views link to api /api/download-apk, which serves BanjaraMatch_vapp_1774386805517.apk (76,224,484 bytes). public/downloads/banjaramatch.apk (67,836,521 bytes, Dec 15 2025) is linked by no view or route, but it is still publicly served at /downloads/banjaramatch.apk.

## findings (15)

### [CRITICAL][data-integrity] No backups of Mongo 'aasd' or the uploads directory
- where: /etc/cron.d/:0
- evidence: `crontab -l` -> "no crontab for root"; /etc/cron.d contains only certbot, docker-*-prune, e2scrub_all, sysstat; `grep -rl mongodump /etc/cron* /root/*.sh /opt /usr/local/bin` -> no hits; /var/backups has only alternatives.tar.0. systemd timers show no backup jobs. du: profile_images 218M, apk 73M, blog_images 4.0K
- impact: If the disk fails, someone deletes data by mistake, or a bad deploy runs, every user profile, chat and the 218M of profile photos are lost for good. 152 of those photos are untracked in git, so git is not a backup either.
- fix: Add a nightly `mongodump --db aasd --gzip --archive` plus an rsync/rclone of uploads/ to off-server storage, with retention and a tested restore. Put it in a cron or systemd timer that is checked into the monorepo.

### [HIGH][data-integrity] ChatRoom unique index never built, so there is no protection against duplicate 1:1 rooms
- where: /var/www/api.banjaramatch.com/models/ChatRoom.js:18
- evidence: partialFilterExpression: { isGroup: false, 'participants.2': { $exists: false } },  -- mongosh `db.chatrooms.getIndexes()` returns only [{ key: { _id: 1 }, name: '_id_' }] (count 11)
- impact: MongoDB 6.0.23 rejects `$exists:false` in partial indexes, and mongoose autoIndex fails silently (no log line). So the index does NOT block second rooms. The flip side: concurrent send_message (socket.js:159-169) and accept-interest (UserController.js:2710-2722) can each findOne miss and create duplicate rooms, which splits conversations. If someone 'fixed' the filter, a unique multikey index on participants would allow each user in only ONE 1:1 room overall.
- fix: Drop the schema index. Store a deterministic `pairKey` (sorted ids joined) with a unique index, and use findOneAndUpdate({pairKey},{$setOnInsert},{upsert:true}).

### [HIGH][infra] Socket handlers have no try/catch and there is no unhandledRejection handler (latent crash risk)
- where: /var/www/api.banjaramatch.com/socket.js:146
- evidence: socket.on('send_message', async (data) => {  ... let room = await ChatRoom.findOne({  (no try); index.js:125 only `process.on('warning', ...)`; socket.js has 18 socket.on vs 10 `try {`
- impact: On Node 18.19.1 (pm2 node_version), a rejected await in this handler (e.g. senderId '0' causing a CastError, which the logs show clients sending 699 times on HTTP routes) becomes an unhandled rejection and kills banjaramatch-api. There is no observed crash yet: pm2 shows restarts 0 over 135.9h and the error log has 0 'UnhandledPromiseRejection'. So the claim is plausible, not proven.
- fix: Wrap each async socket handler (or use a wrapper) in try/catch and validate ObjectIds. Add process.on('unhandledRejection') logging.

### [HIGH][security] Plaintext admin password stored in ADMIN_CREDENTIALS.md
- where: /var/www/admin.banjaramatch.com/ADMIN_CREDENTIALS.md:10
- evidence: **Email:** admin@banjaramatch.com  /  **Password:<REDACTED>
- impact: Anyone with shell or file access (or anyone who copies this directory into the planned monorepo or git) gets admin credentials. It is not web-exposed: https://admin.banjaramatch.com/ADMIN_CREDENTIALS.md returns 404.
- fix: Rotate the admin password and delete the file. Make sure it never enters the monorepo, and add it to .gitignore.

### [HIGH][security] API .env is untracked and not ignored; APNs .p8 key is committed to git
- where: /var/www/api.banjaramatch.com/.gitignore:2
- evidence: .gitignore contents: "# Dependency directories\n/node_modules"; `git check-ignore .env` -> ".env NOT ignored"; `git ls-files cert` -> cert/AuthKey_8####.p8
- impact: A careless `git add .` during the monorepo migration commits secrets. The Apple push key is already in git history.
- fix: Add .env, cert/ and uploads/ to .gitignore in the monorepo, rotate the APNs key, and keep secrets out of the repo.

### [MEDIUM][infra] Production api repo heavily diverged from git (19 M, 1 D, 152 ??)
- where: /var/www/api.banjaramatch.com/index.js:2
- evidence: +require('dotenv').config();  and +app.use('/api/compatibility' ... +app.use('/api/calls' ...; git diff --stat: 20 files changed, 746 insertions(+), 399 deletions(-); untracked controllers/CallController.js, routes/callRoutes.js, services/emailService.js etc.
- impact: Live code is not reproducible from git, so a git-based auto-deploy (git reset/pull) would wipe the calls/compatibility features, photo moderation, reports and the dotenv loader. middleware/adminAuth.js is NOT modified (last commit cd640e0).
- fix: Commit the live working tree to a branch as the monorepo baseline before any auto-deploy setup.

### [MEDIUM][business-logic] Public APK download counter increments on GET/HEAD from any client
- where: /var/www/api.banjaramatch.com/routes/settingsRoute.js:26
- evidence: router.get('/download-apk', async (req, res) => { ... settings.apk.downloadCount = (settings.apk.downloadCount || 0) + 1; await settings.save();
- impact: Crawlers, link previewers and HEAD requests inflate the count. This audit's own `curl -I` incremented it by 1. A 76MB stream with no rate limit also enables bandwidth abuse.
- fix: Count only on GET with a non-bot UA, or count via a redirect to a static file served by nginx. Add rate limiting.

### [MEDIUM][infra] Stale APK still publicly served from web public/downloads
- where: /var/www/banjaramatch.com/public/downloads/banjaramatch.apk:0
- evidence: -rw-r--r-- 67836521 Dec 15 2025 banjaramatch.apk; curl -I https://www.banjaramatch.com/downloads/banjaramatch.apk -> HTTP/2 200 content-length: 67836521; views link only https://api.banjaramatch.com/api/download-apk (index.ejs:688 etc.) which serves BanjaraMatch_vapp_1774386805517.apk, 76224484 bytes
- impact: Old app builds can still be downloaded (search engines and old links). No view or route references the file.
- fix: Remove the file or 301 /downloads/banjaramatch.apk to the canonical download URL.

### [MEDIUM][infra] Admin deploy docs/scripts reference wrong pm2 name and port
- where: /var/www/admin.banjaramatch.com/deploy.sh:30
- evidence: pm2 start server.js --name admin-panel ; nginx.conf:44 proxy_pass http://localhost:3002; server.js: const PORT = process.env.PORT || 3002; setup.sh:49 PORT=3001; live: .env PORT=4001, pm2 'banjaramatch-admin', /etc/nginx/sites-available/admin.banjaramatch.com proxy_pass http://localhost:4001
- impact: Running deploy.sh/setup.sh would start a second 'admin-panel' process on 3002. setup.sh line 99 does `pm2 delete admin-panel`. Copying the repo nginx.conf would point nginx at a dead port and cause an admin outage.
- fix: Delete or replace these docs with a single ecosystem.config.js in the monorepo (names banjaramatch-web/api/admin, ports 4000/4002/4001).

### [MEDIUM][security] Live admin nginx lacks HSTS and http2 that repo copy has; no rate limiting anywhere
- where: /etc/nginx/sites-available/admin.banjaramatch.com:55
- evidence: listen 443 ssl; # managed by Certbot (repo nginx.conf: listen 443 ssl http2; add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;); nginx -T: no limit_req_zone/limit_conn_zone in any banjaramatch block
- impact: There is no brute-force throttling at the edge for /api/admin login or the API.
- fix: Add limit_req zones for login and auth endpoints. Add HSTS and http2 to the admin and api blocks.

### [MEDIUM][perf] No socket.io-specific nginx config; www block omits forwarded headers; gzip limited to text/html
- where: /etc/nginx/sites-available/banjaramatch.com:30
- evidence: location / { proxy_pass http://localhost:4000; ... proxy_set_header Host $host; proxy_cache_bypass $http_upgrade; } (no X-Forwarded-For/Proto); nginx.conf: gzip on; # gzip_types ... commented
- impact: The web app sees 127.0.0.1 as the client IP and http as the scheme, which breaks rate limiting and logs. CSS, JS and JSON are not gzipped by nginx, which hurts PageSpeed. Socket.io relies on the default 60s proxy_read_timeout (it works with pingInterval 25s, but is fragile).
- fix: Add X-Real-IP/X-Forwarded-For/Proto headers, enable gzip_types (or brotli), and add a /socket.io/ location with a longer proxy_read_timeout.

### [MEDIUM][seo] /.well-known/assetlinks.json missing for Android App Links
- where: /etc/nginx/sites-available/banjaramatch.com:0
- evidence: curl -I https://www.banjaramatch.com/.well-known/assetlinks.json -> HTTP/2 404 content-type: text/html
- impact: Android app deep links cannot be verified, so links open in the browser instead of the app.
- fix: Serve assetlinks.json with the app package name and SHA256 signing cert (pattern exists in the feribazaar.com nginx block).

### [LOW][dead-code] API '/' serves a non-existent admin-panel.html (582 ENOENT errors)
- where: /var/www/api.banjaramatch.com/index.js:98
- evidence: res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));  -- error log: 582 x "Error: ENOENT: no such file or directory, stat '/var/www/api.banjaramatch.com/public/admin-panel.html'"
- impact: https://api.banjaramatch.com/ returns an error and the logs fill with noise.
- fix: Return a JSON health response at '/'.

### [LOW][business-logic] Clients send userId "0" causing 699 CastErrors
- where: /root/.pm2/logs/banjaramatch-api-error.log:0
- evidence: Marriage Intent Error: CastError: Cast to ObjectId failed for value "0" (type string) at path "_id" for model "User" (185 User, 172 ActivityLog, 171 RecentVisitor, 171 UserPhoto)
- impact: Endpoints are called before login state is set (the app sends a placeholder id), which wastes DB calls and hides real errors.
- fix: Validate ObjectId in middleware and return 400. Fix the Flutter app so it does not call these endpoints before auth.

### [LOW][data-integrity] Firebase email register hits duplicate key on firebase_uid/phone
- where: /root/.pm2/logs/banjaramatch-api-error.log:0
- evidence: Firebase email register error: E11000 duplicate key error collection: aasd.users index: firebase_uid_1 dup key: <redacted> (3x); index: phone_1 (2x)
- impact: Re-registration and account linking fails with a generic error instead of logging the user into the existing account.
- fix: Upsert or look up by firebase_uid/phone before insert, and return a friendly 'account exists' response.

## inventory
- api git: 172 porcelain entries = 19 M + 1 D + 152 ?? (untracked-files=all also 152)
- api modified: config.json, controllers/UserController.js, controllers/admin/constantsController.js, controllers/admin/userController.js, controllers/cityRegionalPageController.js, index.js, models/Gotra.js, models/User.js, models/UserPhoto.js, models/UserReport.js, package-lock.json, package.json, routes/admin.js, routes/adminRoutes.js, routes/betaTesterRoutes.js, routes/cityPageRoutes.js, routes/contactRoutes.js, routes/userRoutes.js, socket.js
- api deleted: uploads/apk/BanjaraMatch_vapp_1768409111561.apk
- api untracked top-level: .env, controllers/{CallController,CompatibilityController}.js, controllers/admin/{aiGotraController,photoModerationController,reportController}.js, models/{CallLog,Clan,SurnameTitle}.js, routes/{callRoutes,compatibilityRoutes}.js, scripts/{demoteBanothTuriToGotras,enrichClanSurnames,enrichGotraClanAssignments,seedClans,seedSurnameTitles}.js, services/{emailService,groqClanSuggestionService}.js, utils/gunaMilanTable.js, uploads/apk/BanjaraMatch_vapp_1774386805517.apk, 132 uploads/profile_images/*
- middleware/adminAuth.js NOT modified (last commit cd640e0); routes/adminRoutes.js modified (-277 lines); index.js modified (+require('dotenv').config() at line 2, + /api/compatibility and /api/calls mounts)
- git ls-files uploads | wc -l = 216; git ls-files cert = 1 (cert/AuthKey_*.p8)
- api git log head: 1c1ea6e 'alkdjs' (meaningless commit messages)
- admin dir /var/www/admin.banjaramatch.com is NOT a git repository
- pm2: banjaramatch-web pid 1621, banjaramatch-api pid 1622, banjaramatch-admin pid 1624; all node 18.19.1, restarts 0, uptime 135.9h (started Tue Oct 6 19:13:05 2026); shell node is v22.23.2
- api source mtimes (index.js/socket.js Aug 5 2026) predate process start, so running code = disk code
- API error log: 21700 lines; UnhandledPromiseRejection 0; CastError 699; E11000 5 (users: firebase_uid_1 x3, phone_1 x2); MongoServerError 0; chatrooms 0; ENOENT admin-panel.html 582; FCM NotRegistered 60; MulterError File too large 17; mongoose duplicate schema index warnings on slug/city
- api out log contains 50 'Server running on *:4002' lines over log lifetime (deploy restarts)
- MongoDB 6.0.23 local, db 'aasd' at mongodb://localhost:27017/ (db.js); chatrooms indexes: only _id_; chatrooms count 11
- admin: .env PORT=4001; server.js default 3002; docs use pm2 'admin-panel' port 3002; setup.sh PORT=3001; QUICK_START references pm2 'matrimony-api'
- admin repo nginx.conf: proxy_pass localhost:3002, http2, HSTS; live sites-available/admin.banjaramatch.com: proxy_pass localhost:4001, no http2/HSTS, certbot-managed
- ADMIN_CREDENTIALS.md contains admin email + plaintext password (line 10); HTTPS GET of it returns 404
- cron: no root crontab; /etc/cron.d = certbot, docker-builder-prune, docker-image-prune, e2scrub_all, sysstat; no mongodump anywhere; /root/feribazaar-backups exists but nothing for banjaramatch
- uploads sizes: total 290M; apk 73M; blog_images 4.0K; profile_images 218M; disk / 96G, 47G used (49%)
- DNS: banjaraamatch.com NXDOMAIN (no A/NS); banjaramatch.com, www, api, admin -> 89.116.32.204 (server IP); NS orbit/horizon.dns-parking.com
- nginx -T: banjaramatch only in sites-enabled/{banjaramatch.com, api.banjaramatch.com, admin.banjaramatch.com}; api client_max_body_size 150M; no limit_req_zone, no proxy_read_timeout, no /socket.io location, no assetlinks for banjaramatch; global gzip on with gzip_types commented out
- web nginx: http + non-www -> 301 https://www.banjaramatch.com; www -> localhost:4000
- socket.io: index.js:77 socketIO(server, { cors: { origin: '*' } })
- /api/download-apk (routes/settingsRoute.js:26) serves BanjaraMatch_vapp_1774386805517.apk, 76224484 bytes, from Setting.apk.filePath
- /var/www/banjaramatch.com/public/downloads/banjaramatch.apk 67836521 bytes Dec 15 2025, publicly 200 but unreferenced; views link api download-apk at index.ejs:688, user-dashboard.ejs:89, regional-page-state.ejs:573, regional-page-city.ejs:583, ai-matrimony-app.ejs:484,1117; also services/emailService.js:83
- https://www.banjaramatch.com/.well-known/assetlinks.json -> 404

## reusable
- /etc/nginx/sites-enabled/feribazaar.com line ~1006: existing `location = /.well-known/assetlinks.json` pattern to copy for banjaramatch
- /etc/nginx/sites-enabled/softcoderz-new.conf lines ~1263-1276: tuned gzip_types/proxy timeouts block to reuse
- /root/feribazaar-autodeploy/listener.js (pm2 feribazaar-deploy-hook): existing push-to-deploy webhook listener pattern on this server
- /etc/nginx/sites-available/admin.banjaramatch.com: correct live proxy target 4001 (base for monorepo /admin path)
- /var/www/api.banjaramatch.com/routes/settingsRoute.js:26 download-apk route (canonical APK URL already used by all views)

## open_questions
- The user named 'banjaraamatch.com' but it has no DNS (NXDOMAIN). Is it a typo for banjaramatch.com, or a domain they intend to register and redirect?
- For the monorepo, should the API stay on the api.banjaramatch.com host (the Flutter app and email links hardcode https://api.banjaramatch.com/api/...), or be proxied under www.banjaramatch.com/api with the old host kept as an alias?
- Is the password in ADMIN_CREDENTIALS.md still the live admin password (it cannot be verified without a POST login)? It should be rotated either way.
- Should the 152 untracked uploads and the .env be excluded from the monorepo (recommended), with uploads moved to a persistent shared dir outside the git checkout?
- Was the mongoose autoIndex failure for ChatRoom ever noticed? Duplicate chatrooms may already exist; a read-only aggregation on participants pairs would confirm before adding a unique pairKey.
