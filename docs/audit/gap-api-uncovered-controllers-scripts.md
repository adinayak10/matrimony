# gap:api-uncovered-controllers-scripts

## summary
I read every file on the list in full, plus the code that calls them: routes/settingsRoute.js, the APK section of routes/adminRoutes.js, middleware/adminAuth.js, the index.js webhook, the UserController report and photo paths, the admin user-delete cascade, and the regional EJS templates. I only made HEAD/GET requests to api.banjaramatch.com, never /webhook. The most serious problem is that anyone can read any file on the server. PUT /api/updateSettings has no auth and copies the whole request body into the Setting document (`Object.assign(setting, req.body)`). GET /api/download-apk then streams `path.join(__dirname, '..', settings.apk.filePath)` with no checks at all. Setting filePath to '.env', 'serviceAccountKey.json' or '../../../etc/passwd' leaks that file. The same stored path is later passed to unlinkSync by the admin APK upload and delete routes, so this also gives arbitrary file deletion. The second critical problem is the public /webhook. It has no signature check, and nginx proxies everything on api.banjaramatch.com to it. It runs `git reset --hard HEAD && git pull`, which would throw away 20 uncommitted production edits. The committed versions do not call `require('dotenv').config()`, so JWT_SECRET would fall back to 'your_jwt_secret'. They also bring back the old adminAuth that only checks a token is present. It then restarts the pm2 name 'matrimony-api', which does not exist (the real process is banjaramatch-api). Nothing runs seed.js automatically: package.json has no "scripts" key at all, pm2 has no ecosystem file for banjaramatch, and neither the webhook nor any shell script or cron calls it. Run by hand, though, it is destructive. It deletes and re-creates Caste and Gotra, which breaks every User.gotra link, sets every ChatRoom to 'pending', and adds a second Setting document. scripts/seedClans.js is just as unsafe. Of the other scripts, three require models/RegionalPage, which no longer exists, and default to the wrong database ('matrimony'). Other findings: the community-feedback list and update endpoints have no auth (a HEAD request returned 200); AI bio generation lets anyone overwrite any user's bio; the regional templates print admin-entered content unescaped; fabricated stats and Aadhaar claims come from stateRegionalPageController and cityRegionalPageController (citySpecificData.js is imported but never called); the admin delete cascade and admin photo lookup use field names that don't exist on the models; and several config.json keys are unused but committed to git.

## findings (20)

### [CRITICAL][security] Unauthenticated arbitrary file read via /api/updateSettings + /api/download-apk
- where: /var/www/api.banjaramatch.com/routes/settingsRoute.js:37
- evidence: settingsRoute.js:13 `router.put('/updateSettings', settingsController.updateSettings);` (no auth middleware; mounted at index.js:82 `app.use('/api', require('./routes/settingsRoute'))`) -> controllers/settingsController.js:98 `Object.assign(setting, req.body);` -> settingsRoute.js:37 `const filePath = path.join(__dirname, '..', settings.apk.filePath);` then :57 `fs.createReadStream(filePath)`. The only check is fs.existsSync at :40. The models/settings.js schema declares apk.filePath (:39), apk.fileName and apk.fileSize, so all three are accepted.
- impact: Anyone can PUT {apk:{filePath:'.env',fileName:'x',fileSize:99999}} and then GET /api/download-apk to receive .env (JWT_SECRET, SMTP_PASS, GROQ_API_KEY), serviceAccountKey.json (Firebase admin key), config.json or '../../../etc/passwd'. Because path.join is used rather than resolve, '..' segments escape the app root. With JWT_SECRET they can forge admin tokens and take over the whole platform. The same request can also set isMandatoryUpdate/versionCode to force-update-loop every app user, or point termsUrl/privacyPolicyUrl/helpUrl at phishing sites.
- fix: Add adminAuth to /updateSettings and to the documentTypes/reportReasons CRUD (lines 16-23), or delete these routes, since routes/admin.js:131 already exposes an admin version. In both updateSettings handlers, whitelist the fields that can be updated and never accept apk.* from the body. In download-apk, build the path as path.resolve(APK_DIR, path.basename(fileName)) and check that it starts with APK_DIR.

### [CRITICAL][security] Attacker-set apk.filePath gets unlinked when an admin uploads or deletes the APK (arbitrary file delete)
- where: /var/www/api.banjaramatch.com/routes/adminRoutes.js:81
- evidence: adminRoutes.js:81 `const oldFilePath = path.join(__dirname, '..', settings.apk.filePath);` ... :84 `fs.unlinkSync(oldFilePath);` and :226 `const filePath = path.join(__dirname, '..', settings.apk.filePath);` ... :229 `fs.unlinkSync(filePath);`
- impact: Combined with the unauthenticated updateSettings, an attacker plants filePath='index.js' or '.env'. The next time an admin uploads a new APK, the server deletes that file, and the API goes down at its next restart.
- fix: Only unlink files inside uploads/apk, after resolve and a prefix check, and save filePath only from the multer result.

### [CRITICAL][infra] Public, unsigned /webhook runs git reset --hard and would undo the security fixes on disk
- where: /var/www/api.banjaramatch.com/index.js:109
- evidence: index.js:106 `app.post('/webhook', (req, res) => {` :109 `const cmd = `cd /var/www/api.banjaramatch.com && git reset --hard HEAD && git pull origin main && pm2 restart matrimony-api`;`. nginx api vhost: `location / { proxy_pass http://localhost:4002;` (no restriction). `git status` shows 20 modified tracked files. The committed HEAD index.js has no `require('dotenv').config()`, and pm2 env has no JWT_SECRET. HEAD routes/adminRoutes.js:18 is `const adminAuth = (req, res, next) => { // For now, just check if request has authorization header`.
- impact: Anyone can POST /webhook. That wipes the uncommitted production edits (real adminAuth, dotenv loading, photo moderation, and so on) and pulls whatever is on origin main. At the next restart (crash or reboot), JWT_SECRET falls back to 'your_jwt_secret' (middleware/adminAuth.js:4), so anyone can mint an admin JWT. APK upload/delete also go back to accepting any bearer token. The pm2 name 'matrimony-api' does not exist, so even the restart step fails.
- fix: Remove this endpoint. Commit the current working tree first. Replace this with a GitHub Actions SSH deploy, or verify the X-Hub-Signature-256 HMAC, run a deploy script that does a ff-only pull, npm ci, and pm2 reload of the correct app names, and never use reset --hard on a dirty tree.

### [CRITICAL][data-integrity] seed.js wipes Caste/Gotra (orphaning every user's gotra) and resets all chat rooms to pending
- where: /var/www/api.banjaramatch.com/seed.js:457
- evidence: seed.js:457 `await Caste.deleteMany({});` :458 `await Gotra.deleteMany({});` then re-creates them with new ObjectIds (:480 `await new Gotra({ name: gotraName }).save();`). seed.js:223 `const result = await ChatRoom.updateMany({}, { $set: { status: 'pending' } });` is called unconditionally at :699. Also :58 Interest.deleteMany, :100 Qualification, :114 Profession, :134 IncomeRange, :153 ReportReason, :213 AboutOption. models/User.js:275-277 has `gotra: { ref: 'Gotra'`.
- impact: One `node seed.js` on production orphans every User.gotra and partner-preference gotra[] reference, deletes all clan assignments and alternateNames added by the scripts, puts every accepted chat back to 'pending', and inserts a second Setting document (:37-48 `new Setting({...}).save()` with no existence check), which makes Setting.findOne() nondeterministic. It is NOT run automatically: package.json has no scripts, there is no pm2 ecosystem, and neither the webhook nor cron calls it.
- fix: Move seed.js and the one-off scripts into a tools/ folder that is not deployed. Add a guard that refuses to run when NODE_ENV=production or the database is 'aasd' unless --force is passed. Switch to upsert-by-name instead of deleteMany. Remove updateChatRoomStatus from the default run.

### [HIGH][data-integrity] scripts/seedClans.js drops all clans and unsets clan on every gotra, and re-creates Banoth/Turi
- where: /var/www/api.banjaramatch.com/scripts/seedClans.js:503
- evidence: seedClans.js:503 `const deleted = await Clan.deleteMany({});` :507 `await Gotra.updateMany({}, { $unset: { clan: 1, alternateNames: 1, statePresence: 1 } });` and the CLANS list includes `name: 'Banoth'` (:180) and `name: 'Turi'` (:217). Hardcoded `const MONGO_URI = 'mongodb://localhost:27017/aasd';` (:11)
- impact: Re-running it undoes demoteBanothTuriToGotras.js and enrichGotraClanAssignments.js and the admin's AI-applied clan assignments. Clan ObjectIds change, so the public banjara-gotra-list content and the sitemap change. It points straight at the production database with no confirmation.
- fix: Delete it or make it idempotent (upsert by name, never $unset without a filter). Read MONGO_URI from env and require an explicit --confirm flag.

### [HIGH][security] Community feedback list and update endpoints have no auth (marked 'Admin only')
- where: /var/www/api.banjaramatch.com/routes/authRoute.js:44
- evidence: authRoute.js:44 `router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only` :45 `router.put('/community-feedback/:feedbackId', CommunityFeedbackController.updateFeedbackStatus); // Admin only`. Live check: `curl -I https://api.banjaramatch.com/api/auth/community-feedback?limit=1` -> 200 application/json
- impact: Anyone can download every feedback record, including child-safety reports with the reporter's name, email and phone, and can change their status/priority/adminNotes to hide critical reports.
- fix: Add adminAuth to both routes and add rate limiting to POST.

### [HIGH][security] AI bio generation lets anyone overwrite any user's bio (IDOR, no auth)
- where: /var/www/api.banjaramatch.com/controllers/AboutController.js:62
- evidence: routes/aboutRoutes.js `router.post('/about/generate', AboutController.generateAbout);` (no auth); AboutController.js:29 `const { my_user_id, tone, traits = [], hobbies = [] } = req.body;` ... :62 `user.bio = generatedText;` :71 `await user.save();`. The prompt is built from raw tone/traits text (:43-48).
- impact: Anyone who knows a user's _id (exposed in many API responses) can replace that user's bio with prompt-injected or offensive text.
- fix: Require user auth and take the user id from the JWT, not the body. Restrict tone/traits/hobbies to the AboutOption values.

### [HIGH][business-logic] User reports can be spoofed and flooded, and app 'reportStatus' reports never reach the admin queue
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:5218
- evidence: routes/userRoutes.js:43 `router.post('/reportUser', UserController.reportUser);` (no auth); UserController.js:5218 `const { my_user_id, user_id, reason, desc } = req.body;` with no duplicate check before `new UserReport({ reportedBy: my_user_id, ...})`. The separate `exports.reportStatus` (:670) writes to ReportStatus with field `reporter`, which admin/reportController.js never queries.
- impact: Anyone can file reports as any user against anyone, as often as they like, and use admin/reportController.blockReportedUser to get rivals blocked. Reports sent through the reportStatus flow are invisible to admins.
- fix: Require auth and take reportedBy from the token. Add a unique index on (reportedBy, reportedUser) and rate limits. Either move ReportStatus reports into UserReport or show both in the admin queue.

### [MEDIUM][data-integrity] Admin user-delete cascade uses wrong field names for ReportStatus, and admin user detail queries the wrong UserPhoto field
- where: /var/www/api.banjaramatch.com/controllers/admin/userController.js:383
- evidence: userController.js:383 `ReportStatus.deleteMany({ $or: [{ reportedBy: id }, { reportedUser: id }] })` but models/ReportStatus.js:3 defines `reporter:`; userController.js:100 `const photos = await UserPhoto.find({ user: id });` but models/UserPhoto.js:5 defines `userId:`. The cascade also skips IceBreakerGame (player1/player2).
- impact: Reports filed by a deleted user stay behind, pointing at missing users. The admin user-detail page always shows zero photos. Deleted users' IceBreakerGame records are never removed.
- fix: Use {reporter: id} and {userId: id}, and add IceBreakerGame to the cascade via mongoose.model('IceBreakerGame').

### [MEDIUM][business-logic] Photo moderation can be bypassed: a rejected photo can still be set as the main profile picture, and rejecting does not clear User.profile
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:4591
- evidence: UserController.js:4591 `const image = await UserPhoto.findOne({ _id: image_id, userId: user_id });` (no moderationStatus filter) ... :4606 `await User.findByIdAndUpdate(user_id, { profile: image.imageUrl });`. photoModerationController.js:51-55 only sets `moderationStatus: 'rejected'`. The only filter on rejected photos is getUserPhotos at :4565.
- impact: After an admin rejects a photo it still appears everywhere User.profile is used (search, profile cards), and the user can set it as their main picture again. It also stays reachable through /uploads static URLs.
- fix: In rejectPhoto, if the photo is the profile photo, clear User.profile and isProfile. In setMainProfile, block photos where moderationStatus is 'rejected'.

### [MEDIUM][security] Regional page templates print admin-entered content unescaped after placeholder substitution
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:178
- evidence: regional-page-city.ejs:178 `<%- heroTitle %>` :185 `<%- heroSubtitle %>` :465 `<%- introContent.replace(/\n/g, '<br>') %>` :499 `<%- page.aboutSection.content %>` :761 `<%- page.communityInsights.description %>` (the state template has the same at :162/169/455/489/751). Values come from utils/placeholderProcessor.js:16-18 `template.replace(/\$\{([^}]+)\}/g, ...)` which does no escaping.
- impact: Any admin, or anyone holding a stolen or forged admin token, can store script tags that run on the public SEO pages for every visitor. Placeholder values themselves (City/State names, numbers) are not writable through the API, so the risk comes from the admin-entered content.
- fix: Use <%= %>, or run admin HTML through an allow-list sanitizer such as sanitize-html when saving.

### [MEDIUM][seo] processObjectPlaceholders turns Date (and other class) fields into {} on lean docs
- where: /var/www/api.banjaramatch.com/utils/placeholderProcessor.js:49
- evidence: placeholderProcessor.js:49 `if (obj && typeof obj === 'object') { const processed = {}; for (const key in obj) { if (obj.hasOwnProperty(key)) {` applied to the whole lean page at cityRegionalPageController.js:458 `processObjectPlaceholders(page, context)` and stateRegionalPageController.js:426
- impact: createdAt/updatedAt/lastStatsUpdate become empty objects in the processed page, which breaks dateModified/lastmod-style metadata and any date rendering on the regional pages.
- fix: Skip Date, ObjectId and Buffer (check instanceof, or only recurse into plain objects).

### [MEDIUM][seo] Fabricated success stats and false Aadhaar-verification claims come from the state/city controllers (citySpecificData.js is dead)
- where: /var/www/api.banjaramatch.com/controllers/stateRegionalPageController.js:505
- evidence: stateRegionalPageController.js:505 `verificationNote: 'We verify all Maharashtra profiles with Aadhaar, educational certificates, and family background checks'` (also :538, :571); :494 `memberCount: '10,000+'`; :476 `successStories: Math.floor(totalMembers * 0.05) || 0`; cityRegionalPageController.js:528 `successStories: Math.floor(totalMembers * 0.15), // Estimate 15% success rate`. placeholderProcessor.js:196 `highlight: '100% verification in ${city}'`. utils/citySpecificData.js (fake testimonials, '92%' satisfaction, '50,000+' families) is imported at cityRegionalPageController.js:10 but getCityEnhancedData/generateUniqueIntro are never called.
- impact: Claims about Aadhaar verification and marriages that are not backed by any verification code. This is a misleading-advertising and Google helpful-content/YMYL risk on the pages that rank for 'banjara matrimony'. The admin state-pages.html prefills these strings (state-pages.html:723,734).
- fix: Remove the Aadhaar and '100% verification' wording and the invented success numbers. Show only real counts (or hide counts below a threshold). Delete citySpecificData.js and its unused import.

### [MEDIUM][security] Secrets committed to git; config.json crypto/push keys are unused
- where: /var/www/api.banjaramatch.com/config.json:17
- evidence: config.json:17 `"encryptionKey":"<redacted>"`, :18 `"storageUrl":""`, :19 `"pushNotification":{`, :22 `"voipNotification":{ "key": ...`. `git ls-files` lists config.json, serviceAccountKey.json, socialmedia-sa.json.backup. .gitignore contains only `/node_modules`. A grep of the API and web code finds encryptionKey, storageUrl, pushNotification and voipNotification only in config.json. The only consumers of config.json are index.js:21-24 (sslCertificatePath) and :121 (port). pushNotification matches in the Flutter app are unrelated UI strings and an endpoint name.
- impact: The Firebase service account and DB credentials sit in the GitHub repo adinayak10/matrimony-api history. .env is untracked but not ignored, so one `git add .` would commit JWT_SECRET/SMTP/GROQ keys.
- fix: Rotate the Firebase SA key and DB password. Remove the secrets from history (git filter-repo) and add .env, config.json, *.json keys and uploads/ to .gitignore. Drop the unused encryptionKey/storageUrl/pushNotification/voipNotification keys.

### [MEDIUM][security] createAdmin.js hardcodes admin123 and promotes whichever account owns admin@banjaramatch.com
- where: /var/www/api.banjaramatch.com/createAdmin.js:22
- evidence: createAdmin.js:12 `const existingAdmin = await User.findOne({ email: 'admin@banjaramatch.com' });` :16 `existingAdmin.role = 'admin';` (no password reset) ; :22 `const hashedPassword = await bcrypt.hash('admin123', 10);` :38 `console.log('🔑 Password: admin123');`
- impact: It does not reset an existing admin's password. But on a fresh DB it creates an admin with the password admin123. If someone registers admin@banjaramatch.com through public signup first, running the script gives that stranger's account the admin role.
- fix: Take the email and a strong password from argv/env, refuse to promote an existing non-admin account without confirmation, and do not deploy the script to production.

### [MEDIUM][business-logic] ai-apply bulk-sets Gotra.clan with no validation and can overwrite gotras that already have a clan
- where: /var/www/api.banjaramatch.com/controllers/admin/aiGotraController.js:69
- evidence: aiGotraController.js:66 `.filter((a) => a.gotraId && a.clanId)` :69 `filter: { _id: a.gotraId },` :70 `update: { $set: { clan: a.clanId } },` :78 `await Gotra.bulkWrite(ops);`
- impact: It is admin-only (routes/admin.js:85 uses adminAuth) and changes only Gotra.clan, not user data. The /ai-suggest call is the read-only dry run. But apply does not check that clanId exists, does not limit itself to gotras with no clan, and keeps no audit log. A stale or tampered payload can silently reassign gotras that are already assigned, and a single invalid ObjectId fails the whole ordered bulkWrite.
- fix: Add `clan: null` (or an explicit overwrite flag) to the filter, validate that the clanIds exist, use ordered:false, and log every change (who, old value, new value).

### [MEDIUM][seo] Legacy regional-page scripts would rewrite production slugs and insert fake stats; they currently crash
- where: /var/www/api.banjaramatch.com/scripts/updateRegionalPageSlugs.js:62
- evidence: updateRegionalPageSlugs.js:8 `const RegionalPage = require('../models/RegionalPage');` (models/RegionalPage.js does not exist) :11 `|| 'mongodb://127.0.0.1:27017/matrimony'` :62 `page.slug = newSlug;`. seedRegionalPages.js:14 `{ cityName: 'Hyderabad', ... totalMembers: 1200, ... couplesMatched: 320 }`. migrateRegionalPages.js:11 has the same missing require.
- impact: Today they fail at require. If someone restores the model and points MONGODB_URI at production, the slug rewrite would break indexed URLs that are already ranking, and the seed would publish invented member counts.
- fix: Delete these three dead scripts and bc.js (0 bytes, tracked).

### [LOW][security] APK upload filter trusts the client MIME type/extension and saves into a statically served folder
- where: /var/www/api.banjaramatch.com/middleware/apkUpload.js:39
- evidence: apkUpload.js:39 `if (allowedMimeTypes.includes(file.mimetype) || ext === '.apk')` with 'application/octet-stream' allowed; :20 `const ext = path.extname(file.originalname);` used in the saved filename; index.js:68 `app.use('/uploads', express.static('uploads'));`
- impact: An admin or a forged-token holder can upload x.html as octet-stream, and it is then served from api.banjaramatch.com/uploads/apk/ as same-origin HTML (stored XSS). The relative uploadDir also depends on the process cwd.
- fix: Require the .apk extension AND check the magic bytes (PK zip), force the .apk extension, and serve with Content-Disposition: attachment.

### [LOW][business-logic] fetchSetting crashes when no Setting doc exists; About options crash on an unknown category
- where: /var/www/api.banjaramatch.com/controllers/settingsController.js:34
- evidence: settingsController.js:34 `total_member: { $ne: settings.setRoomUsersLimit },` (settings may be null; :44 already guards with `settings || {}`); AboutController.js:14 `options.forEach((item) => grouped[item.category].push(item.value));`
- impact: The app's settings bootstrap returns 500 on a fresh DB, and the about-options endpoint returns 500 if an admin adds an AboutOption with a new category. fetchSetting also makes one countDocuments call per interest (N+1).
- fix: Use settings?.setRoomUsersLimit, replace the per-interest loop with a single $group aggregate, and guard grouped[item.category].

### [LOW][dead-code] IceBreakerGame.js overwrites module.exports three times; boot-time hardcoded user mutation
- where: /var/www/api.banjaramatch.com/models/IceBreakerGame.js:356
- evidence: IceBreakerGame.js:53 `module.exports = mongoose.model('IceBreakerGame', ...)`, :100 `module.exports = mongoose.model('IceBreakerQuestion', ...)`, :165, :356 `module.exports = { IceBreakerQuestionManager, IceBreakerStatsManager };`. :277 `(stats.averageMatchScore * (stats.gamesCompleted - 1)) + matchScore` divides by gamesCompleted, which can be 0. index.js:102 `await  User.updateOne({ phone: '8087439035' }, { $set: { gender: 'Male' } });`
- impact: require() returns the managers, not the model, which is confusing and was already worked around in deleteUsers.js:235. The stats can become NaN or Infinity. A real user's record is rewritten on every API boot.
- fix: Split the file into three model files, guard the division, and remove the boot-time updateOne.

## inventory
- package.json (API) has NO "scripts" key at all. Only name/version/description/dependencies. No postinstall, no seed, no start entry. git diff shows only the dotenv and nodemailer deps were added.
- pm2: banjaramatch-api runs /var/www/api.banjaramatch.com/index.js (cwd same). There is no ecosystem.config.js for banjaramatch (only emivault/emm/feribazaar/mdm have one). pm2 env has no JWT_SECRET; it is loaded from .env via dotenv only in the uncommitted index.js:2.
- Webhook: POST /webhook (index.js:106) is public through nginx api vhost `location / { proxy_pass http://localhost:4002;` and restarts the non-existent pm2 app 'matrimony-api'.
- Git remote: git@github.com:adinayak10/matrimony-api.git; HEAD 1c1ea6e 'alkdjs'; 20 modified tracked files; untracked: .env, aiGotraController, photoModerationController, reportController, CallController, CompatibilityController, Clan/SurnameTitle/CallLog models, 5 scripts, emailService, groqClanSuggestionService.
- Tracked secrets: config.json, serviceAccountKey.json, socialmedia-sa.json.backup. .gitignore = '/node_modules' only.
- Unauthenticated settings routes (routes/settingsRoute.js mounted at /api): POST /fetchSetting, PUT /updateSettings, POST/PUT/DELETE /documentTypes[/:id], POST/PUT/DELETE /reportReasons[/:id], GET /download-apk.
- Admin-protected (adminAuth with JWT + role==='admin'): /api/admin/reports*, /photos*, /banners*, /constants/*, /gotras/ai-suggest, /gotras/ai-apply, /settings, /broadcast-email/*, /apk/* (adminRoutes.js), /api/beta-tester/{all,stats,:id/*}, /api/contact/{all,stats,:id,...}.
- Unauthenticated user-data writes found: /api/auth/community-feedback GET/PUT (authRoute.js:44-45), /api/about/generate, /api/reportUser, reportStatus.
- Path build in download-apk and admin APK delete/upload: path.join(__dirname, '..', settings.apk.filePath) with no sanitising (settingsRoute.js:37, adminRoutes.js:81, :226). Legit uploads store filePath as `/uploads/apk/${req.file.filename}` (adminRoutes.js:97).
- Scripts hardcoding prod DB 'mongodb://localhost:27017/aasd': demoteBanothTuriToGotras.js, enrichClanSurnames.js, enrichGotraClanAssignments.js, seedClans.js, seedSurnameTitles.js. Scripts defaulting to the wrong DB 'matrimony' and requiring the missing models/RegionalPage: migrateRegionalPages.js, updateRegionalPageSlugs.js, seedRegionalPages.js.
- Script safety: destructive = seed.js (deleteMany x8 + ChatRoom.updateMany({})) and seedClans.js (Clan.deleteMany({}), Gotra.updateMany({}, $unset)). Safe to re-run = demoteBanothTuriToGotras (guarded), enrichClanSurnames ($addToSet), enrichGotraClanAssignments (exists checks/$addToSet), seedSurnameTitles (upsert). fix-phone-index.js drops/recreates the phone_1 index (safe-ish, one-off).
- Model field names: UserReport{reportedBy,reportedUser,reason,desc,status[pending|resolved|dismissed],resolvedBy,resolvedAt,resolutionNote}; ReportStatus{reporter,reportedUser,status:Boolean}; UserPhoto{userId,imageUrl,isProfile,order,moderationStatus default 'approved',moderatedBy,moderatedAt,rejectionReason}; ProfilePicRequest{requester,requestedUser,status}; Follow model name 'FollowingList'{my_user_id,user_id}; SavedNotification{my_user_id,user_id,type,message}; ChatIntentLog{userId,targetUser}; SecondChanceQueue{userId,profileId,rejectedAt,reminded}; Setting{...,apk{versionName,versionCode,fileName,filePath,fileSize,releaseNotes,isMandatoryUpdate,downloadCount,lastUpdated}}; DocumentType{title unique}.
- Sitemap regen: services/sitemapService.js POSTs to `${FRONTEND_URL}/api/regenerate-sitemap` with header 'X-Internal-Request: true'. constantsController/aiGotraController POST to http://localhost:4000/api/regenerate-sitemap.
- Live probes: HEAD /api/auth/community-feedback -> 200; HEAD /api/admin/reports -> 401; /config.json and /serviceAccountKey.json over HTTP -> 404 (not statically served, but readable via the download-apk chain).
- Regional EJS unescaped outputs: regional-page-city.ejs lines 178,185,465,497,499,761; regional-page-state.ejs lines 162,169,455,487,489,751.
- bc.js is 0 bytes and tracked in git.

## reusable
- /var/www/api.banjaramatch.com/middleware/adminAuth.js: a working JWT + role==='admin' guard that sets req.userId. Reuse it on every admin route, including community-feedback and settingsRoute.
- /var/www/api.banjaramatch.com/routes/admin.js: the organized admin router. A good pattern for a single admin API surface in the monorepo (apps/api/routes/admin).
- /var/www/api.banjaramatch.com/controllers/admin/constantsController.js: generic CRUD factory (getAllItems/createItem/updateItem/deleteItem) with an optional sitemap-regen hook. Reuse it, adding field whitelists and referential checks before delete.
- /var/www/api.banjaramatch.com/controllers/admin/aiGotraController.js: suggest (read-only) then apply flow. A good review-before-write pattern; add a clan:null filter and an audit log.
- /var/www/api.banjaramatch.com/utils/placeholderProcessor.js: ${city}/${state}/${stats.*} templating for regional pages. Keep it, but add HTML escaping and skip Date/ObjectId.
- /var/www/api.banjaramatch.com/scripts/seedSurnameTitles.js and enrichGotraClanAssignments.js: idempotent upsert/$addToSet patterns to copy for any future seed or migration.
- /var/www/api.banjaramatch.com/deleteUsers.js: the more complete user-cascade list (includes IceBreakerGame via mongoose.model). Use it to fix the admin delete cascade.
- /var/www/api.banjaramatch.com/services/sitemapService.js: a single place for sitemap regeneration triggers (consolidate the duplicated triggerSitemapRegeneration in constantsController/aiGotraController).

## open_questions
- Is there a document with email admin@banjaramatch.com in the 'aasd' users collection, and was createAdmin.js ever run in production (meaning admin123 might be live)? It cannot be checked read-only without running node or mongo.
- Has /api/updateSettings already been abused? Check the current Setting doc's apk.filePath and look for more than one Setting document (seed.js inserts duplicates). Both need a read-only mongo query.
- Has the GitHub webhook ever fired? Uncommitted edits suggest it has not since the fixes. Is a GitHub webhook still configured on adinayak10/matrimony-api?
- Does the web app's /api/regenerate-sitemap (banjaramatch.com app.js) require auth, or can anyone trigger it via the 'X-Internal-Request' header? This belongs to the web-app audit.
- Are the Aadhaar/verification claims and memberCount strings currently stored in published StateRegionalPage documents (copied from the admin prefill), or only offered as prefill? It needs a DB read to confirm what is live.
