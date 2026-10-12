# infra-deploy

## summary
I checked the live infrastructure with read-only commands only: pm2 jlist/describe/dump, the nginx site files and nginx -T, certbot, cron, ss, ufw, git state, and curl GET/HEAD requests to the three hosts. I also read the feribazaar and emivault deploy references. BanjaraMatch runs as three pm2 fork-mode apps under root's pm2. They use system Node 18.19.1, which is end-of-life, and have no ecosystem file and no NODE_ENV. They have 0 restarts and 135h uptime. pm2 is saved (dump.pm2 has 15 apps, including all three banjaramatch apps) and pm2-root is enabled at boot. Only the API directory is a git repo (github adinayak10/matrimony-api). It is in poor shape. Production runs 19 modified and 152 untracked files that were never committed (last commit 2026-03-12). Secrets (config.json, serviceAccountKey.json, the APNs .p8 key), 215 user profile photos and an APK are tracked in git. The web and admin directories, and the Flutter app copy inside the web directory, have no .git. The Flutter copy holds the Android upload keystore and key.properties. On the infrastructure side: ufw is inactive and node ports 4000/4001/4002 listen on all interfaces. There is no Mongo backup of 'aasd' (537MB, auth disabled) and no pm2 log rotation (/root/.pm2/logs is 449MB). Anyone can POST to /webhook on the API without authentication; it runs git reset --hard and would wipe the uncommitted production code. The live feribazaar deploy is the simple in-place style: /root/feribazaar-autodeploy/listener.js on 127.0.0.1:4602, which GitHub reaches through nginx 'location /deploy-webhook' on api.feribazaar.com. That listener checks a signature, then deploy.sh runs fetch, reset --hard, npm ci, build, migrate, pm2 restart, a health poll and a rollback. The repo's /srv/feribazaar atomic-release design is not live (/srv/feribazaar does not exist), although the 'deploy' user exists. The shipped Flutter app, the admin JS and the web sitemap generators all hard-code https://api.banjaramatch.com. A monorepo must keep the api. and admin. hostnames working as aliases even if paths are merged under banjaramatch.com. The box has 2 vCPU and 7.9GB RAM with only 482MB free and 1.9GB of swap in use, so npm ci or a build during deploy must be light.

## findings (22)

### [CRITICAL][security] Unauthenticated POST /webhook on public API runs git reset --hard + git pull
- where: /var/www/api.banjaramatch.com/index.js:106
- evidence: app.post('/webhook', (req, res) => { ... const cmd = `cd /var/www/api.banjaramatch.com && git reset --hard HEAD && git pull origin main && pm2 restart matrimony-api`; exec(cmd, ...)
- impact: Anyone on the internet can POST https://api.banjaramatch.com/webhook. There is no signature check. The reset reverts the 19 modified tracked files that production depends on (index.js, socket.js, models/User.js, routes/*). The pm2 name 'matrimony-api' does not exist, so the restart fails and the damage stays hidden until the next restart or reboot. Then the API boots on stale code, or crashes because it requires untracked routes such as compatibilityRoutes and callRoutes. It is also a free trigger for repeated git/exec work.
- fix: Delete the route right away, as the first change. Rebuild auto-deploy on the feribazaar listener pattern: HMAC, bound to 127.0.0.1, behind nginx /deploy-webhook. First commit the current working tree so nothing is lost.

### [CRITICAL][security] Secrets committed to git (DB config, Firebase service account, APNs key)
- where: /var/www/api.banjaramatch.com/config.json:1
- evidence: git ls-files -> cert/AuthKey_8####.p8, config.json, serviceAccountKey.json; .gitignore contains only '/node_modules'
- impact: Anyone with read access to github.com/adinayak10/matrimony-api, or any future fork or CI log, gets the encryptionKey, the db credentials, the Firebase admin service account (push to every user, Firestore/Storage admin) and the Apple VoIP push key. These stay in git history even after deletion.
- fix: Move these files to shared/secrets/ outside the repo and git rm --cached them. Rotate the Firebase service-account key and the APNs key. Treat the history as leaked; rewriting it with filter-repo is optional because rotation matters more. Add gitleaks in CI, as feribazaar's ci.yml 'secrets' job does.

### [CRITICAL][data-integrity] Production API runs uncommitted code; any git reset --hard or fresh clone loses it
- where: /var/www/api.banjaramatch.com/index.js:91
- evidence: git status: 19 M, 1 D, 152 ??; untracked include controllers/CallController.js, controllers/CompatibilityController.js, routes/callRoutes.js, routes/compatibilityRoutes.js, models/CallLog.js, models/Clan.js, services/emailService.js; index.js:91 app.use('/api/compatibility', require('./routes/compatibilityRoutes'))
- impact: The monorepo import, or any autodeploy that does fetch plus reset --hard, would ship origin/main. That is March 2026 code with no call or compatibility routes, and its index.js differs from the running one. Features would vanish or the API would crash. The last 10 commits are named like 'alkdjs' or 'kladjsl', so nothing can be reviewed.
- fix: Snapshot the current tree before any monorepo work: tar it, then commit everything except uploads, secrets and .env. Seed the monorepo apps/api from that working tree, not from origin/main.

### [CRITICAL][data-integrity] No backups of Mongo 'aasd' or uploads
- where: /etc/cron.d/certbot:1
- evidence: crontab -l -> 'no crontab for root'; /etc/cron.d has only certbot, docker prunes, e2scrub, sysstat; grep mongodump only hits /var/www/feribazaar.com/deploy/*.sh and /root/fb-next; /var/lib/mongodb 537M; api/uploads 290M
- impact: A disk failure, a bad migration, an accidental deleteUsers.js run (there is one in the repo root) or ransomware would permanently lose every profile, chat and photo. mongodump is already installed at /usr/bin/mongodump.
- fix: Adapt /var/www/feribazaar.com/deploy/backup.sh: nightly mongodump --archive --gzip --db aasd plus a tar of uploads, encrypted with age, sent off-box with rclone, with retention and a size check. Schedule it from cron.

### [HIGH][infra] Firewall inactive; app ports 4000/4001/4002 bound to all interfaces
- where: /var/www/banjaramatch.com/app.js:187
- evidence: ufw: 'Status: inactive'; iptables '-P INPUT ACCEPT'; ss: '*:4000 node /var/www/b', '*:4001 node /var/www/a', '*:4002 node /var/www/a'; app.listen(PORT, ...) / server.listen(config.port, ...) (api index.js:121) / app.listen(PORT, ...) (admin server.js:113)
- impact: http://89.116.32.204:4002 reaches the API directly and bypasses nginx (TLS, body limits, logging). The same goes for 4000/4001, plus many other apps on the box (3001, 3003, 4010, 4500, 4501, 4600, 4601, 5000-5002, 7000, 8080, 8088, 9000). The /webhook issue and the 150MB body parser can be hit without TLS.
- fix: Bind every banjaramatch app to 127.0.0.1 (app.listen(PORT,'127.0.0.1')). Enable ufw allowing only 22, 80 and 443, after checking that the other tenants' ports really are proxied by nginx.

### [HIGH][security] User profile photos and APK committed to git
- where: /var/www/api.banjaramatch.com/uploads/apk/BanjaraMatch_vapp_1768409111561.apk:1
- evidence: git ls-files uploads | wc -l -> 216 (215 profile_images + 1 apk); git count-objects: size-pack 19.42 MiB, .git 101M
- impact: Users' personal photos sit in a GitHub repo, a privacy and DPDP risk. Every reset or pull also fights the runtime uploads directory: git status shows 'D uploads/apk/...1768409111561.apk' and an untracked new APK.
- fix: git rm -r --cached uploads, add it to .gitignore, and keep uploads in shared/uploads symlinked into the release. Consider purging the history.

### [HIGH][security] Android release keystore and passwords in an untracked plain copy; .gitignore does not exclude them
- where: /var/www/banjaramatch.com/banjaramatch_app/android/key.properties:1
- evidence: find -> android/key.properties (storePassword, keyPassword, keyAlias, storeFile), android/upload-keystore.jks, android/app/google-services.json, ios/Runner/GoogleService-Info.plist; 'orange' is a 2.5KB binary DER blob; grep for key|jks in banjaramatch_app/.gitignore returned nothing
- impact: If the Flutter directory is git-added into the monorepo as-is, the Play upload keystore and its passwords get pushed to GitHub. Whoever has them can sign app updates.
- fix: Add to the monorepo .gitignore before the first commit: **/key.properties, *.jks, *.keystore, orange. Keep the keystore offline or in GitHub Actions secrets. Review the 'orange' file, which is likely a keystore or cert.

### [HIGH][infra] No pm2 log rotation; logs grow unbounded
- where: /root/.pm2/logs/banjaramatch-web-out.log:1
- evidence: ls /root/.pm2/modules -> empty (no pm2-logrotate); du -sh /root/.pm2/logs 449M; banjaramatch-web-out.log 13190607, banjaramatch-api-out.log 6914125, pm2.log 7526011; /etc/logrotate.d has no pm2 entry
- impact: Disk use grows steadily. API and web stdout logs are about 20MB and keep growing; the dead banjara-api-*.log and banjaramatch-out.log files are leftovers.
- fix: pm2 install pm2-logrotate (max_size 20M, retain 14, compress), or add a logrotate.d stanza with copytruncate. Point each app at its own log dir through the ecosystem file.

### [HIGH][business-logic] API mutates a hard-coded user's gender on every boot
- where: /var/www/api.banjaramatch.com/index.js:102
- evidence: await  User.updateOne({ phone: '8087439035' }, { $set: { gender: 'Male' } });    // Vijaya rathod
- impact: Every restart, including every future auto-deploy, overwrites this user's gender. If the user changes it in the app, the change is reverted silently and matching filters show the wrong profile set.
- fix: Remove it. If a data fix is needed, run it once as a migration script.

### [MEDIUM][perf] Admin static assets cached 1 year as immutable with unversioned filenames and no gzip
- where: /etc/nginx/sites-available/admin.banjaramatch.com:50
- evidence: location ~* \.(jpg|...|css|js|...)$ { expires 1y; add_header Cache-Control "public, immutable"; } ; curl admin /js/api.js -> 'cache-control: max-age=31536000' + 'cache-control: public, immutable', no content-encoding; nginx.conf gzip_types commented out
- impact: After any push-to-main deploy, admins' browsers keep the old /js/api.js and /css for up to a year. Admin UI fixes will not show up, or old JS runs against new API shapes. Admin JS is also sent uncompressed.
- fix: Use content-hashed filenames, or ?v=<sha> query strings injected at deploy, or drop 'immutable' and use max-age=300 for unhashed files. Enable gzip_types/gzip_proxied/gzip_vary in nginx.conf.

### [MEDIUM][security] Debug and test pages publicly served on admin host
- where: /var/www/admin.banjaramatch.com/public/test-auth.html:1
- evidence: curl https://admin.banjaramatch.com/test-auth.html -> 200; debug.html 200; flow-test.html 200; test-dashboard.html 200
- impact: These expose internal auth flows and API endpoints to anyone. Also, admin deploy.sh:48 prints 'Default credentials: admin / admin123', and ADMIN_CREDENTIALS.md sits in the app root (not web-served; it returns 404).
- fix: Remove the files from public/ when moving to the monorepo, and move ADMIN_CREDENTIALS.md out of the tree.

### [MEDIUM][infra] No ecosystem file / NODE_ENV for banjaramatch apps; ports come from three different config mechanisms
- where: /var/www/api.banjaramatch.com/config.json:1
- evidence: pm2 dump: banjaramatch-web/api/admin 'PORT= undefined NODE_ENV= undefined', node env N/A; web PORT from .env (app.js:186 fallback 3000), api port from config.json (4002), admin PORT from .env (server.js:9 fallback 3002)
- impact: An autodeploy cannot reliably restart or reload these apps. A missing .env on a fresh release silently binds the wrong port: web to 3000 and admin to 3002, while nginx expects 4000/4001. NODE_ENV is unset in pm2 for the API and admin.
- fix: Add an ecosystem.config.js (feribazaar pattern) with explicit PORT 4000/4001/4002, NODE_ENV=production, max_memory_restart, kill_timeout and log paths, and keep the pm2 names banjaramatch-web/api/admin.

### [MEDIUM][infra] Banjaramatch apps on Node 18.19.1 (EOL); box has Node 22 only under root's nvm
- where: /root/.pm2/dump.pm2:1
- evidence: pm2 jlist: banjaramatch-* 'node':'18.19.1' (system /usr/bin/node v18.19.1); feribazaar-* 'node':'22.23.2' via /root/.nvm
- impact: Node 18 gets no security patches. A deploy script that sources nvm (as feribazaar's does with nvm use 22) would silently switch banjaramatch to Node 22 on restart without testing. The Express 5 web app should be checked on 22.
- fix: Pin the version in .nvmrc and set the interpreter explicitly in the ecosystem file. Upgrade to 22 as a deliberate, tested step.

### [MEDIUM][security] MongoDB has no authentication; API connects with no credentials
- where: /var/www/api.banjaramatch.com/db.js:38
- evidence: const uri = 'mongodb://localhost:27017/'; const dbName = 'aasd'; /etc/mongod.conf has net.bindIp 127.0.0.1 and no security: section
- impact: Any process on this multi-tenant box (about 15 pm2 apps, Docker, Tomcat) can read or write every BanjaraMatch user record. The DB name is hard-coded in source, not in env.
- fix: Enable authorization, create a user scoped to 'aasd', and move the connection string to MONGODB_URI in shared env.

### [MEDIUM][perf] Main site nginx: no X-Forwarded headers, no static offload, no client_max_body_size, server_tokens on
- where: /etc/nginx/sites-available/banjaramatch.com:33
- evidence: location / { proxy_pass http://localhost:4000; ... proxy_set_header Host $host; proxy_cache_bypass $http_upgrade; } (no X-Real-IP/X-Forwarded-For/Proto); nginx.conf:21 '# server_tokens off;'; response header 'server: nginx/1.24.0 (Ubuntu)'
- impact: Every static file and the 67MB /downloads/banjaramatch.apk go through Node, and the APK response even carries content-encoding gzip. The web app sees all clients as 127.0.0.1, which breaks any IP rate limit or geo logic. The server version is disclosed.
- fix: In the monorepo nginx config, serve /css, /js, /images, /fonts and /downloads with alias plus long cache. Add the X-Forwarded-* headers, server_tokens off, and http2 on admin/api. Enable brotli or gzip_types globally.

### [MEDIUM][security] API accepts 150MB JSON/urlencoded bodies; nginx allows 150M
- where: /var/www/api.banjaramatch.com/index.js:64
- evidence: app.use(bodyParser.json({ limit: '150mb' })); app.use(bodyParser.urlencoded({ extended: true, limit: '150mb' })); app.use(express.json({ limit: '150mb' })); nginx api 'client_max_body_size 150M'
- impact: A few concurrent 150MB JSON bodies can push a box with 482MB free RAM into swap or OOM, taking down all the tenants. Combined with ports open on 0.0.0.0, this needs no TLS at all.
- fix: Set JSON limits around 1-2MB, handle uploads with multer and per-route limits, and size client_max_body_size per location (APK upload route only).

### [MEDIUM][infra] Feribazaar live deploy pattern leaks WEBHOOK_SECRET into app process env
- where: /root/feribazaar-autodeploy/deploy.sh:17
- evidence: pm2 restart feribazaar-api feribazaar-web --update-env ; pm2 jlist feribazaar-api envNames include 'WEBHOOK_SECRET','WEBHOOK_PORT','feribazaar-deploy-hook'
- impact: If this script is copied as-is for banjaramatch, the listener's env (WEBHOOK_SECRET, NVM_*) is pushed into the API's env through --update-env. Any env dump or debug endpoint would then expose the deploy secret.
- fix: In the banjaramatch deploy script, use pm2 startOrReload ecosystem.config.js --only banjaramatch-web,banjaramatch-api,banjaramatch-admin with env -i or explicit env, so the ecosystem file supplies the env rather than the listener's shell.

### [MEDIUM][data-integrity] Runtime-generated sitemaps written into the web code tree, with mixed ownership
- where: /var/www/banjaramatch.com/app.js:163
- evidence: setTimeout(() => generateAllSitemaps()...,5000); setInterval(...,6h); public/sitemap.xml, sitemap-blogs.xml, sitemap-regional.xml (www-data) and sitemap-main.xml (root) all mtime Oct 12 07:13
- impact: In a git checkout, these files either show as dirty or untracked, or get overwritten by stale committed copies on reset, so crawlers briefly see old sitemaps. In an immutable-release layout they would be written into the release directory and lost on every deploy until regenerated.
- fix: Gitignore public/sitemap*.xml, or write them to shared/sitemaps and have nginx/express serve them from there. Keep the URLs /sitemap.xml etc. unchanged.

### [LOW][dead-code] Stale deploy scripts and pm2 names in tree
- where: /var/www/admin.banjaramatch.com/deploy.sh:25
- evidence: if pm2 list | grep -q "admin-panel"; then ... pm2 restart admin-panel ... pm2 start server.js --name admin-panel; API webhook uses 'pm2 restart matrimony-api'; stale logs banjara-api-*.log, banjaramatch-out.log
- impact: Running admin deploy.sh would start a second admin process named admin-panel on the same port, which would crash-loop with EADDRINUSE. It also does 'npm install' and 'npm install -g pm2'.
- fix: Delete these in the monorepo and replace them with one deploy/deploy.sh.

### [LOW][security] API and admin responses lack HSTS; API exposes x-powered-by; socket.io CORS '*'
- where: /var/www/api.banjaramatch.com/index.js:77
- evidence: curl -I api: 'x-powered-by: Express', no strict-transport-security; admin: no strict-transport-security; const io = socketIO(server, { cors: { origin: '*' } });
- impact: Weaker transport security, and fingerprinting of the stack. Any origin can open a socket, though auth still applies.
- fix: Use helmet on the API, add HSTS in the nginx include shared by all hosts, and restrict socket.io origins to the CORS allowlist.

### [LOW][infra] API root route serves a file that does not exist
- where: /var/www/api.banjaramatch.com/index.js:98
- evidence: res.sendFile(path.join(__dirname, 'public', 'admin-panel.html')); ls api/public -> only images/; curl -I https://api.banjaramatch.com/ -> HTTP/2 404
- impact: The API has no health endpoint for an autodeploy readiness check, and '/' returns 404.
- fix: Add GET /health/ready returning {release: RELEASE_SHA, db: ok} (feribazaar pattern), and do the same for web /healthz and admin.

### [LOW][infra] banjaramatch nginx has no IPv6 listeners while the default IPv6 server rejects TLS
- where: /etc/nginx/sites-available/banjaramatch.com:25
- evidence: 'listen 443 ssl http2;' only (no [::]:443); 00-default-reject 'listen [::]:443 ssl default_server; ... ssl_reject_handshake on;'; DNS AAAA for banjaramatch.com is currently empty
- impact: This is harmless today. If an AAAA record is ever added (the box has 2a02:4780:12:fb6::1), every IPv6 visitor to www gets a TLS handshake failure, and IPv6 port 80 lands on the EmiVault catch-all panel.
- fix: Add listen [::]:443 and [::]:80 in the new monorepo server blocks.

## inventory
- HOST: 89.116.32.204 (IPv6 2a02:4780:12:fb6::1, docker0 172.17.0.1); 2 vCPU; RAM 7940MB total, 482MB free, 2318MB available; swap 4095MB with 1933MB used; disk / 96G with 47G used (49%)
- NODE: shell node v22.23.2 at /root/.nvm/versions/node/v22.23.2/bin/node (file owned deploy:deploy); system /usr/bin/node v18.19.1; pm2 6.0.8 at /usr/local/bin/pm2 (root daemon); systemctl is-enabled pm2-root = enabled
- PM2 banjaramatch-web: cwd /var/www/banjaramatch.com, script app.js, interpreter node 18.19.1, fork_mode, 1 instance, restarts 0, uptime 135.4h, 78MB, user root, logs /root/.pm2/logs/banjaramatch-web-{out,error}.log, PORT/NODE_ENV not set in pm2 env (PORT comes from .env)
- PM2 banjaramatch-api: cwd /var/www/api.banjaramatch.com, script index.js, node 18.19.1, fork_mode, restarts 0, uptime 135.4h, 87MB, root, created 2026-07-08, port from config.json (4002)
- PM2 banjaramatch-admin: cwd /var/www/admin.banjaramatch.com, script server.js, node 18.19.1, fork_mode, restarts 0, uptime 135.4h, 35MB, root, PORT from .env
- PM2 env for all three: no app-specific vars, only inherited CLAUDE_*/COPILOT_* noise, so the apps were last (re)started from an agent shell. No max_memory_restart, no kill_timeout, no wait_ready
- PM2 save: /root/.pm2/dump.pm2 (Oct 8 22:39) has 15 apps including banjaramatch-web/api/admin. /root/.pm2/modules is empty, so pm2-logrotate is not installed. module_conf.json has banjaramatch:GA4_MEASUREMENT_ID=G-GHZ33WVH9T
- PORTS (ss): 4000 *:node web, 4001 *:node admin, 4002 *:node api (all interfaces); mongod 127.0.0.1:27017; redis 127.0.0.1:6379; feribazaar hook 127.0.0.1:4602; 4600/4601 * feribazaar api/web. Ports already taken on this box: 3001,3003,3010,4010,4500,4501,4600-4602,5000-5002,5432,6379,7000,8005,8080,8088,9000,3306,27017
- FIREWALL: ufw Status: inactive; iptables INPUT policy ACCEPT (only DOCKER chains)
- NGINX banjaramatch.com: :80 (IPv4 only) server_name banjaramatch.com www -> 301 https://www; 443 apex -> 301 https://www; 443 www -> proxy_pass http://localhost:4000 (Upgrade headers, no X-Forwarded-*); logs /var/log/nginx/banjaramatch.{access,error}.log; cert /etc/letsencrypt/live/banjaramatch.com
- NGINX api.banjaramatch.com: 443 ssl (no http2, IPv4 only) proxy_pass http://localhost:4002 with X-Real-IP/XFF/Proto + websocket upgrade; client_max_body_size 150M; :80 -> 301 https
- NGINX admin.banjaramatch.com: 443 ssl + [::]:443; root /var/www/admin.banjaramatch.com/public; try_files $uri $uri/ @nodejs -> localhost:4001; /api/ -> localhost:4001; static regex expires 1y + immutable; deny /\.; add_header XFO/XCTO/XXP
- NGINX global (/etc/nginx/nginx.conf): gzip on but gzip_types/gzip_proxied/gzip_vary commented out (lines 47-54); server_tokens commented (line 21); ssl_protocols line 33 includes TLSv1/1.1, but per-server options-ssl-nginx.conf overrides it; no brotli module
- NGINX defaults: 00-default-reject = 443 default_server ssl_reject_handshake + '*.softcoderz.com' :80 return 444; custom-panel-catchall = :80 default_server proxy to 127.0.0.1:5001 (EmiVault panel)
- CERTS: separate Let's Encrypt ECDSA certs, no wildcard: 'banjaramatch.com' covers banjaramatch.com + www (expires 2026-12-08), 'api.banjaramatch.com' (2026-12-10), 'admin.banjaramatch.com' (2026-12-27); authenticator=nginx installer=nginx (auto reload on renew); certbot.timer active; renewal-hooks/{pre,post,deploy} empty
- DNS: banjaramatch.com A 89.116.32.204, no AAAA; www CNAME banjaramatch.com; api and admin A 89.116.32.204; 'banjaraamatch.com' (double a) does not resolve
- CRON: root has no crontab; /etc/cron.d = certbot, docker-builder-prune, docker-image-prune, e2scrub_all, sysstat; no mongodump/backup job for 'aasd'; mongodump/mongorestore are installed in /usr/bin; rclone and age are not installed
- MONGO: mongod v6.0.23, mongosh 2.5.1, bindIp 127.0.0.1, no security/authorization; db 'aasd' hard-coded in api/db.js:39; /var/lib/mongodb 537M
- LOGROTATE: /etc/logrotate.d has nginx etc. but no pm2 entry; /root/.pm2/logs 449M; pm2.log 7.5MB
- GIT api: remote git@github.com:adinayak10/matrimony-api.git, branch main == origin/main @1c1ea6e 'alkdjs' (2026-03-12, author root); 336 tracked files; 216 tracked under uploads (215 profile_images + 1 apk); .git 101M (size-pack 19.42MiB, loose 79.64MiB); status 19 M, 1 D, 152 ?? (133 of them under uploads); .gitignore is only '/node_modules'
- GIT tracked secrets in api: config.json (keys: port, db.live/dev.{host,user,password,database}, encryptionKey, storageUrl, pushNotification.databaseURL, voipNotification.{key,keyId,teamId,bundleId,production}, sslCertificatePath.{isSsl,key,cert}), serviceAccountKey.json, cert/AuthKey_8####.p8
- NO GIT: /var/www/banjaramatch.com (owner www-data), /var/www/admin.banjaramatch.com (owner root), /var/www/banjaramatch.com/banjaramatch_app (owner root, plain copy, 47M, has its own .gitignore)
- OWNERSHIP: web and api dirs are www-data:www-data with some root-owned files (app.js, robots.txt, index.js, socket.js, api .env, sitemap-main.xml); admin is all root; pm2 runs everything as root
- ENV KEYS web (/var/www/banjaramatch.com/.env): GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT (=4000 as bound); there is also .env.example.analytics
- ENV KEYS api (/var/www/api.banjaramatch.com/.env, root-owned, untracked): JWT_SECRET, SMTP_SERVICE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM_NAME, NODE_ENV, GROQ_API_KEY, GROQ_MODEL (AGORA_APP_ID/AGORA_APP_CERTIFICATE are referenced in index.js:92 but missing)
- ENV KEYS admin (/var/www/admin.banjaramatch.com/.env): PORT (=4001 as bound), API_BASE_URL, JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
- RUNTIME FILES OUTSIDE GIT TO PRESERVE (move to shared/ and symlink): web/.env; api/.env; admin/.env; api/config.json; api/serviceAccountKey.json; api/cert/AuthKey_8####.p8; api/socialmedia-sa.json.backup; api/uploads/ (290M: profile_images 218M, apk 73M, blog_images) served at /uploads; web/public/downloads/ (65M: banjaramatch.apk 67,836,521 bytes + README.txt) served at /downloads/banjaramatch.apk; web/public/sitemap.xml, sitemap-main.xml, sitemap-blogs.xml, sitemap-regional.xml (regenerated at boot+5s and every 6h by utils/generateAllSitemaps.js); flutter android/key.properties, android/upload-keystore.jks, android/app/google-services.json, ios/Runner/GoogleService-Info.plist, banjaramatch_app/orange (binary DER); /etc/letsencrypt/live/{banjaramatch.com,api.banjaramatch.com,admin.banjaramatch.com}
- api/public/admin-panel.html does NOT exist (api/public holds only images/), so GET https://api.banjaramatch.com/ returns 404
- HARD-CODED HOSTS that must keep resolving after the monorepo move: Flutter lib/utilities/const.dart:5 'https://api.banjaramatch.com/', socketservice.dart:15, update_checker.dart:50 (APK download from api host), login/setting screens use api.banjaramatch.com/privacyPolicy and /termsOfUse; admin public/js/api.js:3 and auth.js:3,85; web routes/index.js:9 AUTH_SERVER_URL fallback; web utils/generateBlogSitemap.js:7 and generateRegionalSitemap.js:7
- LIVE HEADERS: www has helmet headers + HSTS max-age=31536000; includeSubDomains, gzip from node compression; api has x-powered-by Express and no HSTS; admin has no HSTS and serves JS without gzip, with a duplicate Cache-Control (max-age=31536000 + public, immutable)
- ADMIN public pages served with 200: test-auth.html, debug.html, flow-test.html, test-dashboard.html; admin server.js routes: /, /dashboard, /users, /contact-enquiries, /beta-testers, /user-detail, /settings, /banners, /reports, /photo-moderation, /constants, /community-data, /community-feedback, /regional-pages, /city-pages, /state-pages, /apk-manager, /broadcast-email, /api/admin/* (routes/adminAuth)
- API route mounts (index.js:82-94): /api (settingsRoute, userRoutes, aboutRoutes), /api/auth, /api/blogs, /api/city-pages, /api/state-pages, /api/contact, /api/beta-tester, /api/compatibility, /api/calls, /api/admin (admin + adminRoutes), /uploads static, socket.io on the same server, POST /webhook (dangerous)
- FERIBAZAAR LIVE deploy = /root/feribazaar-autodeploy: listener.js (Node built-ins only, HMAC sha256 X-Hub-Signature-256, POST /deploy-webhook, refs/heads/main only, spawns deploy.sh detached) on 127.0.0.1:4602 as pm2 'feribazaar-deploy-hook' (root, node 22). GitHub reaches it through nginx api.feribazaar.com 'location /deploy-webhook { proxy_pass http://127.0.0.1:4602; }'. .env keys: WEBHOOK_SECRET, WEBHOOK_PORT. deploy.sh: nvm use 22; git fetch; skip if same; git reset --hard origin/main; npm ci; npm run build; migrate-mongo up; pm2 restart --update-env; poll 127.0.0.1:4600/health/ready 40x3s; rollback on failure. deploy.log shows 45 deploys, last 'LIVE: 5e52e31'
- FERIBAZAAR REPO design (NOT live): /srv/feribazaar/<env>/{source,releases/<sha>,shared/{env,secrets,uploads,...,logs},current,.last-good,.deploy.lock} as non-root 'deploy' user; /srv/feribazaar does not exist although user 'deploy' (uid 1001) exists and /srv/agency is owned by deploy; ci.yml jobs node/admin-smoke/flutter/secrets(gitleaks)/deploy(staging only via trigger-deploy.js); release.yml = workflow_dispatch from the admin panel; root package.json workspaces [shared, backend, website, adminpanel], engines node >=22.19 <23
- EMIVAULT pattern: /var/www/emivault.com/{apps/{api,web,admin},ecosystem.config.js,logs/,FOLDER_STRUCTURE.md}; ecosystem uses absolute cwd per app, NODE_ENV production, max_memory_restart 300M/200M, per-app error_file/out_file under /var/www/emivault.com/logs

## reusable
- /root/feribazaar-autodeploy/listener.js - the live, proven dependency-free HMAC GitHub push listener (127.0.0.1, POST /deploy-webhook, main-only). Copy it as banjaramatch-deploy-hook on a new port such as 4603 or 4702 (check that it is free), and add the MAX_BODY_BYTES, timeouts and dedupe from /var/www/feribazaar.com/deploy/webhook-listener.js
- /root/feribazaar-autodeploy/deploy.sh - minimal in-place deploy: fetch, compare, reset --hard, npm ci, pm2 restart, health poll, rollback. Easiest fit for banjaramatch's root pm2. Fix the --update-env env leak, and only ever reset after runtime files are moved to shared/ and gitignored
- /var/www/feribazaar.com/deploy/deploy.sh - full atomic-release design (flock queue, ancestor-of-origin/main check, git archive into releases/<sha>, link_shared() for .env/uploads/downloads, cp -al node_modules when the lockfile is unchanged, ln -sfn current switch, pm2 startOrReload --only, readiness on release sha, .last-good rollback, prune to 5). Use it as the target design
- /var/www/feribazaar.com/ecosystem.config.js - ROOT=FB_ROOT symlink pattern, explicit interpreter, RELEASE_SHA env, wait_ready/kill_timeout/max_memory_restart, log paths under shared/logs
- /var/www/feribazaar.com/deploy/backup.sh + restore.sh - nightly mongodump --archive --gzip plus files tarball, age encryption, rclone, size floor, retention. Adapt for db 'aasd' and api uploads
- /var/www/feribazaar.com/deploy/server-setup.sh - pm2-logrotate settings (max_size 20M, retain 14, compress, daily), deploy key over an ssh host alias, read-only deploy key
- /var/www/feribazaar.com/.github/workflows/ci.yml - node/flutter/gitleaks job templates (flutter analyze + test in a subdir) for a monorepo CI
- nginx pattern in api.feribazaar.com: 'location /deploy-webhook { proxy_pass http://127.0.0.1:4602; }'. Reuse the same idea under api.banjaramatch.com or www.banjaramatch.com
- /var/www/emivault.com/ecosystem.config.js and FOLDER_STRUCTURE.md - simple apps/{api,web,admin} monorepo layout with a central logs/ dir
- /var/www/banjaramatch.com/app.js htmlRedirectMap (lines 67-111) - existing legacy .html to clean-URL 301 map that must be carried over unchanged to protect SEO slugs

## open_questions
- 'banjaraamatch.com' (double a) in the request does not resolve in DNS. Is it a typo for banjaramatch.com, or a separate domain to buy or redirect?
- 'Everything under banjaramatch.com': should api.banjaramatch.com and admin.banjaramatch.com keep serving as hostnames? The shipped Flutter APK/IPA hard-codes https://api.banjaramatch.com, so that host must stay, at least as an alias. Should admin move to www.banjaramatch.com/admin, or stay on its subdomain with only the code merged into one repo?
- Which GitHub repo becomes the monorepo: reuse adinayak10/matrimony-api (its history contains secrets and user photos) or create a new repo? Is rewriting history acceptable?
- Deploy style: the simple in-place root pm2 style (like the live feribazaar hook), or the atomic /srv/banjaramatch releases + shared/ layout under the non-root 'deploy' user (feribazaar's designed but not-yet-live model)?
- Is it OK to rotate the Firebase service-account key, the APNs .p8 key, JWT_SECRET and the encryptionKey, given they are committed to git? Rotating encryptionKey may make existing encrypted data unreadable. Which fields use it?
- Where should off-box backups go (Cloudflare R2, S3, Google Drive via rclone)? Is there a Telegram bot or email for deploy and backup alerts?
- Should the Flutter app be built in CI (GitHub Actions android release) or stay a manual laptop build, with the APK uploaded through the admin apk-manager into api/uploads/apk and web/public/downloads?
- Upgrade the banjaramatch apps from Node 18 to Node 22 as part of the move, or keep 18 for now?
- Enabling ufw affects the other tenants on this box (emivault, feribazaar, softcoderz, mdm, devicedb). Do any of them rely on direct public access to ports like 3001, 4500, 7000, 8080, 8088 or 9000?
