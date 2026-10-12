# api-auth-security

## summary
I audited the API at /var/www/api.banjaramatch.com: index.js, db.js, every route file, all middleware, AuthController, the admin auth/settings/user controllers, models/User.js, and the IDOR-relevant parts of UserController.js and socket.js. I also ran read-only probes (ss, ufw, pm2 jlist, git ls-files and log, curl GET/HEAD). The API is in a critical state, and there are several independent ways to take over accounts or control of the system. (a) Login is effectively unauthenticated: /api/auth/verify-otp has its OTP check commented out, and firebase-login, firebase-email-login, firebase-google-login and complete-profile all issue a 7-day JWT given only a phone number or email plus an arbitrary firebaseUid. The Firebase token check is optional. Mongo operator injection ({"$ne":null}) is also unsanitized, so an attacker can log in as the first matching user, admin included, without knowing any identifier. (b) Almost every /api/* user endpoint has no auth middleware and trusts user_id/my_user_id from the request body. That lets anyone delete any account, edit any profile (email, phone, is_verified, membershipPlan, device_token), read any chat room's messages, and upload or delete photos for any user. (c) PUT /api/updateSettings is unauthenticated and does Object.assign(setting, req.body). An attacker can point apk.filePath at ../.env, and GET /api/download-apk then streams that file, which is an unauthenticated arbitrary file read that exposes JWT_SECRET and SMTP credentials. (d) POST /webhook has no signature check and runs `git reset --hard HEAD && git pull`. That would wipe the 20 uncommitted modified files on production, including the adminRoutes.js fix for fake auth, and the pm2 name it restarts (matrimony-api) does not exist. (e) Ports 4000, 4001 and 4002 listen on all interfaces and ufw is inactive; http://89.116.32.204:4000/4001/4002 answered directly, bypassing nginx and TLS. (f) Socket.io has no auth: a client can 'join' as any userId and send_message with any senderId. (g) Secrets are tracked in git: serviceAccountKey.json, cert/AuthKey_*.p8, socialmedia-sa.json.backup, config.json, plus 216 user photos under uploads/. .env has never been committed, but .gitignore only covers /node_modules, so a future `git add .` would commit it. The admin JWT middleware itself (middleware/adminAuth.js) is sound: it verifies the token, looks up the user, and checks role==='admin'. Every /api/admin route in routes/admin.js and the working-tree routes/adminRoutes.js uses it. The holes are the forgeable/bypassable login, the 'your_jwt_secret' fallback, and the unprotected admin-like endpoints outside /api/admin. There is no rate limiting or helmet anywhere, passwords are hashed with bcrypt (cost 10) but the hash is returned in login and profile responses, and over 4,550 full JWTs are logged in /root/.pm2/logs/banjaramatch-api-out.log.

## findings (26)

### [CRITICAL][security] OTP verification commented out: POST /api/auth/verify-otp logs in (or creates) any phone number with no OTP
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:750
- evidence: // Uncomment for actual OTP verification
    // if (!entry || entry.code !== otp || Date.now() > entry.expires) {
    //   return res.status(401)...
    // }
    console.log(`🔐 [verifyOtpAndLogin] OTP verified for ${phone}`) ;
    let user = await User.findOne({ phone })... return sendTokenResponse(res, user, ...)
- impact: Anyone can POST {"phone":"<victim phone>"} to /api/auth/verify-otp (routes/authRoute.js:24) and receive a valid 7-day JWT for that account, which is a full account takeover. Combined with NoSQL operator injection ({"phone":{"$ne":null}}), no phone number is needed at all.
- fix: Restore the OTP check, or better, delete the legacy request-otp/verify-otp endpoints. Require a server-verified Firebase ID token (verifyIdToken, then compare decoded.phone_number) for every phone login.

### [CRITICAL][security] Firebase login endpoints trust a client-supplied firebaseUid; token verification is optional
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:68
- evidence: // Optionally verify Firebase token for extra security
    if (firebaseToken) { ... }
    let user = await User.findOne({ email })  // line 81
...
exports.firebaseLogin: const { phone, firebaseUid } = req.body; ... let user = await User.findOne({ phone }) ... return sendTokenResponse(...)  // lines 441-468
- impact: POST /api/auth/firebase-email-login {email:victim, firebaseUid:'x'} (no firebaseToken) returns a JWT for the victim, including the admin account (admin JWTs carry the same _id and adminAuth only checks the DB role). The same applies to firebase-google-login (l.231), firebase-login (phone, l.439), firebase-register/firebase-email-register (these also OVERWRITE the victim's full_name/phone/firebase_uid, l.175-180, 513-514), and complete-profile (l.674, phone+name only).
- fix: Make firebaseToken mandatory, verify it with admin.auth().verifyIdToken, and derive email/phone/uid from the decoded token only, never from req.body. Remove completeProfile's login path, or gate it on a short-lived server-issued verification ticket.

### [CRITICAL][security] Unauthenticated settings mass-assignment plus APK download gives arbitrary file read (.env and JWT secret)
- where: /var/www/api.banjaramatch.com/routes/settingsRoute.js:13
- evidence: router.put('/updateSettings', settingsController.updateSettings);   // no auth
// controllers/settingsController.js:98  Object.assign(setting, req.body); await setting.save();
// settingsRoute.js:37  const filePath = path.join(__dirname, '..', settings.apk.filePath); ... fs.createReadStream(filePath).pipe(res);
- impact: Attacker sends PUT /api/updateSettings {"apk":{"filePath":"/.env","fileName":"x","fileSize":2000}}, then GET /api/download-apk streams /var/www/api.banjaramatch.com/.env (JWT_SECRET, SMTP_PASS, GROQ_API_KEY); '../../../etc/passwd' also works. A leaked JWT_SECRET lets them forge admin tokens. The same unauthenticated router also exposes POST/PUT/DELETE /api/documentTypes and /api/reportReasons (lines 16-23).
- fix: Put adminAuth on every mutating route in settingsRoute.js, or delete them (routes/admin.js already has /api/admin/settings). Whitelist the fields updateSettings accepts. In download-apk, resolve the path and assert it starts with path.resolve('uploads/apk').

### [CRITICAL][security] Unauthenticated, unsigned POST /webhook runs git reset --hard on production
- where: /var/www/api.banjaramatch.com/index.js:106
- evidence: app.post('/webhook', (req, res) => {
      const cmd = `cd /var/www/api.banjaramatch.com && git reset --hard HEAD && git pull origin main && pm2 restart matrimony-api`;
      exec(cmd, ...)
- impact: Anyone can POST to https://api.banjaramatch.com/webhook. git status shows 20 uncommitted modified files on production (index.js, routes/admin.js, routes/adminRoutes.js, models/User.js, socket.js, etc.), and a single request wipes them all. HEAD's routes/adminRoutes.js holds the old fake adminAuth ('just check if request has authorization header'), so the reset reopens /api/admin/castes|gotras|professions|... writes to any Bearer string. The pm2 process is 'banjaramatch-api', not 'matrimony-api', so the restart fails and the running code diverges from disk. Repeated calls also allow DoS through git operations.
- fix: Remove this route. Commit the current working tree first. Deploy through a separate hook with HMAC (X-Hub-Signature-256) verification, or a GitHub Actions SSH deploy that runs git fetch, checkout of a commit, npm ci, and pm2 reload banjaramatch-api.

### [CRITICAL][security] App ports 4000/4001/4002 bound to 0.0.0.0 with firewall inactive, reachable directly from the internet
- where: /var/www/api.banjaramatch.com/index.js:121
- evidence: ss: LISTEN *:4002 (node /var/www/a...), *:4000, *:4001; ufw status: inactive; curl -sI http://89.116.32.204:4000/ -> HTTP/1.1 200 OK; :4001 -> 200 OK; :4002 -> 404 (Express)
- impact: All three apps are reachable over plain HTTP on the public IP, which bypasses nginx TLS, any nginx-level restrictions (admin try_files/IP rules), and future rate limits. Credentials and JWTs sent to these ports travel in cleartext.
- fix: Call server.listen(config.port, '127.0.0.1') in all three apps (web, admin, api). Enable ufw allowing only 22/80/443, or set iptables rules. Note that Docker's 172.17.0.1 bridge exists, so check the DOCKER-USER chain too.

### [CRITICAL][security] Nearly all user endpoints lack auth and trust user_id from the body (IDOR): delete any account, edit any profile, grant verification and premium
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:13
- evidence: router.post('/editProfile',  upload.uploadProfileImages, UserController.editProfile);
router.post('/deleteUser',  UserController.deleteUser);
// UserController.js:1750 const { user_id } = req.body; ... await user.deleteOne(); return res.json({..., data: user})
// UserController.js:276 if (membership) user.membershipPlan = membership;
// UserController.js:335 if (is_verified !== undefined) user.is_verified = Boolean(is_verified);
// UserController.js:262 user.phone = ...req.body.phone; 265 user.email = ...
- impact: Unauthenticated callers can: delete any user, admin included (/api/deleteUser), and get the full deleted document with password hash back; change any user's email/phone/device_token, which hijacks push notifications and account recovery; self-grant a premium membershipPlan and the verified badge (business-logic or revenue loss); flip privacy settings (/api/updateContactPrivacy, UserController.js:52); and block, unblock, report or shortlist as any user. Only /api/fetchProfile (l.15) and /api/assignMembership (l.33) have middleware.
- fix: Apply router.use(authenticate) to userRoutes, except public lookup lists. In every controller, replace user_id/my_user_id from the body with req.user._id. Strip is_verified, membership, block_user_ids and device_token from editProfile; only admins may set the first three.

### [CRITICAL][security] Private chat messages readable by anyone with a roomId; chat rooms deletable by anyone
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3285
- evidence: exports.fetchMessages = async (req, res) => {
      const { roomId, page = 1, limit = 20 } = req.body;
      const messages = await Message.find({ room: roomId })
- impact: POST /api/fetchMessages (userRoutes.js:62, no auth) returns any conversation. Room ids leak through fetchProfile's chatRoom object and other responses. POST /api/deleteRoom (l.5486) with any two user ids deletes a whole conversation and its messages.
- fix: Require authenticate and verify that req.user._id is in room.participants before reading or deleting.

### [CRITICAL][security] Socket.io has no authentication: a client can join as any userId and send messages as anyone
- where: /var/www/api.banjaramatch.com/socket.js:46
- evidence: socket.on('join', async (userId) => {
            onlineUsers.set(userId, socket.id);
            socket.userId = userId;
...
socket.on('send_message', async (data) => {
    const { senderId, receiverId, content, type = 'text' } = data;
- impact: An attacker connects (index.js:77 cors origin '*') and emits join(victimId). All real-time messages, call invites and profile-visit events for the victim are then routed to the attacker's socket, and send_message with an arbitrary senderId impersonates anyone.
- fix: Add io.use() middleware that verifies the JWT from socket.handshake.auth.token and sets socket.userId from it. Ignore client-supplied userId/senderId. Restrict cors.origin to the site origins.

### [HIGH][security] Password hashes and private contact fields returned in API responses
- where: /var/www/api.banjaramatch.com/models/User.js:77
- evidence: password: {
    type: String,
    required: false
  },
// AuthController.js:23 const userData = user.toObject?.() || user; ... res.json({ ..., token, data: userData })
// UserController.js:894 return res.json({ status: true, message: "Random profile found", data: randomUser })
- impact: Every login response, plus fetchRandomProfile (unauthenticated, only needs my_user_id), blockUser/unblockUser (l.1650/1692 return the other user's full doc), and deleteUser all include bcrypt hashes, phone, email, device_token and firebase_uid of other users. That bypasses the emailVisibility/mobileVisibility privacy settings.
- fix: Set select:false on password (and consider device_token and firebase_uid). Add a toJSON transform that deletes them. Return explicit projections for other users' profiles and apply applyPrivacySettings everywhere.

### [HIGH][security] NoSQL operator injection in login lookups (no sanitizeFilter)
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:81
- evidence: let user = await User.findOne({ email })   // email comes straight from JSON req.body
// same pattern: l.425, 448, 487, 685, 759 (phone), admin/authController.js:24 User.findOne({ email })
- impact: With bodyParser.json, email or phone can be an object like {"$ne":null}. Combined with the optional Firebase token, POST /api/auth/firebase-email-login {"email":{"$ne":null},"firebaseUid":"x"} logs in as the first user with an email, with no identifier knowledge needed. /api/auth/check-user also becomes an oracle.
- fix: Call mongoose.set('sanitizeFilter', true) globally, or add express-mongo-sanitize. Validate that email and phone are strings (zod/joi) at the route layer.

### [HIGH][security] Image upload trusts client MIME type and keeps the original extension; stored XSS on api domain can steal the JS-readable session cookie
- where: /var/www/api.banjaramatch.com/middleware/upload.js:24
- evidence: const ext = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + ext);
...
  if (file.mimetype.startsWith("image/")) {   // client-controlled header
// index.js:68 app.use('/uploads', express.static('uploads'));
// AuthController.js:34 httpOnly: false, ... domain: '.banjaramatch.com'
- impact: An unauthenticated attacker uploads evil.html or .svg with Content-Type image/png through /api/uploadUserPhotos (no auth, any user_id). express.static then serves it as text/html from https://api.banjaramatch.com/uploads/profile_images/..., where JS can read document.cookie 'token', which is shared across *.banjaramatch.com, including admin's. All profile photos are also publicly fetchable by URL (live check: 200 on uploads/profile_images/photos-1751349990507-96169065.png).
- fix: Generate the extension from detected magic bytes (file-type is already a dependency) and allow only jpg/png/webp. Re-encode with sharp. Serve /uploads with Content-Disposition and nosniff headers, or from a separate cookieless domain. Set the auth cookie httpOnly:true.

### [HIGH][security] Unprotected 'admin' endpoints in user router: banner creation, fake-user batch, mark top/highlighted
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:88
- evidence: // Admin APIs
router.post('/banner/add',  UserController.addBanner);
router.post('/user/fake-batch', UserController.createFakeBatch);
router.post('/user/mark-top', UserController.maekusertop);
router.post('/user/unmark-top', UserController.unmarkTopUser);
- impact: Anyone can inject banners (new Banner(req.body), UserController.js:4184), which means phishing content in the app. They can create 30 fake 'Test User' accounts per call, and promote any profile to highlighted/top listing for free, which is a paid-placement business loophole.
- fix: Add adminAuth to these routes or delete them (routes/admin.js already provides /api/admin/banners). Remove createFakeBatch from production.

### [HIGH][security] Community feedback admin endpoints unauthenticated, leaking submitter PII (confirmed live)
- where: /var/www/api.banjaramatch.com/routes/authRoute.js:44
- evidence: router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only
router.put('/community-feedback/:feedbackId', CommunityFeedbackController.updateFeedbackStatus); // Admin only
# curl https://api.banjaramatch.com/api/auth/community-feedback?limit=1 -> {"status":true,"data":[{"name":...,"email":...}],"pagination":{"total":5,...}}
- impact: Anyone can list every feedback submitter's name, email and phone and modify their status or admin notes.
- fix: Add adminAuth to both routes and move them under /api/admin.

### [HIGH][security] JWT secret has a hardcoded fallback, is short, logout does not invalidate, and the token cookie is JS-readable
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:4
- evidence: const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
// same fallback: middleware/authMiddleware.js:3, controllers/AuthController.js:7, controllers/admin/authController.js:5
// .env JWT_SECRET length: 15
// AuthController.js:858 exports.logout = (req, res) => { res.clearCookie('token'); ... }  (no domain, no denylist)
// admin/authController.js:61 { expiresIn: '7d' }, 68 httpOnly: false
- impact: If dotenv fails to load (it was only added to index.js in the uncommitted diff, so the reset webhook removes it), every token is signed with 'your_jwt_secret' and anyone can forge an admin JWT. A 15-char secret may be brute-forceable offline from any captured JWT. Logout clears the cookie without domain '.banjaramatch.com', so user logout does not even remove the cross-domain cookie, and stolen tokens stay valid for 7 days. jwt.verify is called without an algorithms whitelist (jsonwebtoken defaults are safe for HS256, but be explicit).
- fix: Fail fast at boot if JWT_SECRET is missing or shorter than 32 random bytes, then rotate it. Pass {algorithms:['HS256']}. Use httpOnly cookies. Give admin tokens a shorter expiry (e.g. 8h) and include a tokenVersion field on User that is checked in middleware, so logout and password reset can revoke tokens.

### [HIGH][security] Firebase service-account key, APNs .p8 key and config tracked in git; .env not ignored
- where: /var/www/api.banjaramatch.com/.gitignore:1
- evidence: .gitignore contents: '# Dependency directories\n/node_modules'
git ls-files: cert/AuthKey_8####.p8, config.json, serviceAccountKey.json, socialmedia-sa.json.backup, uploads/... (216 files incl. user photos and an APK)
git log --diff-filter=A: cert/AuthKey_8####.p8, serviceAccountKey.json (no .env ever added)
remote: git@github.com:adinayak10/matrimony-api.git
- impact: Anyone with repo access (and anyone who gets it later, e.g. after a leak or if it is made public) has a Firebase Admin credential, which allows creating and deleting users and minting tokens, plus an APNs push key. User profile photos are stored in source control. .env is untracked and unignored, so one `git add .` publishes SMTP, Groq and JWT secrets.
- fix: Rotate the Firebase service account and APNs key. Purge them from history (git filter-repo) and move them to env or files outside the repo. Add .env, *.p8, serviceAccount*.json, *.backup, config.json and uploads/ to .gitignore and git rm --cached them.

### [HIGH][business-logic] Blocked users (is_block=1) can still log in; adminAuth also ignores is_block
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:838
- evidence: grep -c is_block controllers/AuthController.js -> 0
const isMatch = await bcrypt.compare(password, user.password); ... return sendTokenResponse(res, user, 'Login successful', ...)
- impact: Admin 'block user' (admin userController.toggleBlockUser) only hides the user from some listings. The blocked user keeps logging in, messaging over the socket, and calling all endpoints, so moderation is ineffective.
- fix: Reject login when user.is_block===1, and check is_block in authenticate, adminAuth and the socket middleware (one DB lookup, or embed the block state in the token and use tokenVersion to revoke).

### [HIGH][security] Photo upload/delete for arbitrary users
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:4489
- evidence: const userId = req.body.user_id;   // uploadUserPhotos, no auth
...
// deleteUserPhoto l.4625: const { user_id, image_id } = req.body; ... const image = await UserPhoto.findOne({ _id: image_id, userId: user_id }); ... fs.unlinkSync(filePath)
- impact: Anyone can add photos, including explicit content, to any victim's gallery, which also triggers push notifications to that victim's visitors. They can also delete or reorder anyone's photos and change their main profile image (setMainProfileImage l.4581). Both owner ids are supplied by the attacker, so the userId match gives no protection.
- fix: Use req.user._id from authenticate, and require photo ownership against the token identity.

### [MEDIUM][security] No rate limiting anywhere; OTPs logged; Math.random OTP; in-memory OTP store
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:741
- evidence: console.log(`📲 OTP for ${phone}: ${otp}`);   // also l.570 `OTP sent via Firebase for ${phone}: ${otp}`
const otp = Math.floor(100000 + Math.random() * 900000).toString();
// grep rateLimit|helmet across project (excluding node_modules) -> no matches
- impact: Admin login (/api/admin/auth/login), loginWithEmail, check-user (phone enumeration), contact/beta-tester/community-feedback forms and AI /api/about/generate can all be brute-forced or spammed without limit. OTPs end up in world-readable pm2 logs. The in-memory otpStore breaks if pm2 runs in cluster mode and is lost on restart.
- fix: Add express-rate-limit (with app.set('trust proxy',1)) globally and stricter limits on /api/auth/* and /api/admin/auth/login, and captcha on public forms. Remove OTP logging. Use crypto.randomInt. Keep OTPs in Mongo with a TTL index or in Redis.

### [MEDIUM][security] Tokens and cookies logged on every admin request and every /me call
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:15
- evidence: console.log('🔐 [adminAuth] Cookies:', req.cookies);
// AuthController.js:871 console.log('🍪 [getMe] Token:', token);
// grep -c "[getMe] Token: ey" /root/.pm2/logs/banjaramatch-api-out.log -> 4550 (file mode -rw-r--r--, 6.9MB)
- impact: Anyone who can read the pm2 logs (backups, log shipping, another compromised app on this multi-tenant box) gets thousands of valid session JWTs, including admin ones.
- fix: Remove the token and cookie logging, use a leveled logger (pino) with redaction, then rotate the JWT secret and truncate the existing logs.

### [MEDIUM][perf] 150MB JSON/urlencoded body limit and nginx client_max_body_size 150M on every route
- where: /var/www/api.banjaramatch.com/index.js:64
- evidence: app.use(bodyParser.json({ limit: '150mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '150mb' }));
app.use(express.json({ limit: '150mb' }));
// nginx api.banjaramatch.com: client_max_body_size 150M;
- impact: A few concurrent 150MB JSON bodies parse synchronously and exhaust memory or CPU on a box shared with about 14 other pm2 apps (DoS). The parsers are also registered twice (bodyParser.json plus express.json, and again in userRoutes.js:5-6 and settingsRoute.js:6-7).
- fix: Use a global JSON limit of about 1mb and keep large limits only on multer upload routes (APK 100MB). Register the parsers once. Set nginx client_max_body_size per location.

### [MEDIUM][security] Public blog search compiles user input into RegExp (ReDoS)
- where: /var/www/api.banjaramatch.com/controllers/blogController.js:28
- evidence: { tags: { $in: [new RegExp(search, 'i')] } }
// also unescaped $regex: search in blogController.js:26-27, UserController.js:3573/3596/3677, admin/userController.js:33-35
- impact: An unauthenticated GET /api/blogs?search=(a+)+$ can pin the Node event loop or Mongo CPU. Invalid patterns throw 500s.
- fix: Escape input (search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')), cap its length, or use a Mongo $text index.

### [MEDIUM][business-logic] Hardcoded per-user data patch runs on every boot
- where: /var/www/api.banjaramatch.com/index.js:102
- evidence: await  User.updateOne({ phone: '8087439035' }, { $set: { gender: 'Male' } });    // Vijaya rathod
- impact: A real user's phone number and name (PII) sit in source and git. Their gender is force-reset to Male on every restart, overriding any edit they or an admin make. If this user is female (the name suggests so), they are matched against the wrong gender pool on every restart.
- fix: Remove the line. Fix the record once via the admin panel or a one-off migration script that is not committed with PII.

### [MEDIUM][security] Call history and Agora token minting trust body/query user ids
- where: /var/www/api.banjaramatch.com/routes/callRoutes.js:5
- evidence: router.post('/token', CallController.generateCallToken);
router.get('/history', CallController.getCallHistory);
// CallController.js:68 const { my_user_id } = req.query; ... CallLog.find({ $or: [{ caller: my_user_id }, { callee: my_user_id }] })
- impact: Anyone can read who any user has called (metadata leak) and mint RTC publisher tokens for any accepted pair's channel to eavesdrop, once Agora is configured.
- fix: Add authenticate, set my_user_id = req.user._id, and bind channelName to the room id server-side.

### [LOW][security] CORS allows localhost/LAN origins with credentials in production; preflight uses permissive cors(); socket cors '*'
- where: /var/www/api.banjaramatch.com/index.js:33
- evidence: 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:4000', 'http://192.168.1.13:3000', 'http://localhost:8080', 'http://localhost:8081', ...
    if (!origin || allowed.includes(origin)) return callback(null, true);
  credentials: true,
...
app.options('*', cors());
const io = socketIO(server, { cors: { origin: '*' } });
- impact: Any page served on a visitor's localhost dev port can make credentialed requests. The socket accepts connections from any website. This matters less while the cookie is also exposed through other paths, but it widens the attack surface.
- fix: Load origins from env per environment, use the same cors options for app.options, and restrict socket.io cors to the production origins.

### [LOW][dead-code] GET / serves a missing admin-panel.html; root route returns 404
- where: /var/www/api.banjaramatch.com/index.js:97
- evidence: app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin-panel.html')); });
# ls public -> only images/; curl -sI https://api.banjaramatch.com/ -> HTTP/2 404; /admin-panel.html -> 404
- impact: There is no exposure today (the file is absent), but express.static(public) at the API root would publish anything dropped into public/. The root returns an error page instead of a health response.
- fix: Replace it with GET /health returning {ok:true}, and serve only public/images explicitly.

### [LOW][security] Admin user detail returns password hash; admin updateUser mass-assigns any field
- where: /var/www/api.banjaramatch.com/controllers/admin/userController.js:88
- evidence: const user = await User.findById(id)
      .populate(...)
      .lean();   // no .select('-password')
...
// l.136 const updates = req.body; delete updates.password; delete updates.role; ... { $set: updates }
- impact: Admin-only, but any XSS in the admin panel, or the forged admin tokens above, exposes hashes. Admins can set arbitrary fields such as firebase_uid and email, which enables account linking abuse.
- fix: Add .select('-password -device_token') and whitelist editable fields in updateUser.

## inventory
- API entry: /var/www/api.banjaramatch.com/index.js, pm2 'banjaramatch-api', config.port 4002 bound to * (not 127.0.0.1), Mongo mongodb://localhost:27017/aasd (db.js:38-39, bound 127.0.0.1)
- Mount order (index.js:82-94): /api settingsRoute, /api userRoutes, /api/auth authRoute, /api aboutRoutes, /api/blogs, /api/city-pages, /api/state-pages, /api/contact, /api/beta-tester, /api/compatibility, /api/calls, /api/admin routes/admin.js, /api/admin routes/adminRoutes.js; /uploads static (l.68), public static (l.69), GET / (l.97), POST /webhook (l.106)
- UNAUTH mutating: /api/updateSettings PUT, /api/documentTypes POST/PUT/DELETE, /api/reportReasons POST/PUT/DELETE (settingsRoute.js:13-23)
- UNAUTH mutating (userRoutes.js): editProfile, deleteUser, UserBlockedByUser, UserUnblockedByUser, toggleShortlist, sendInterestRequest, acceptInterestRequest, rejectInterestRequest, cancelInterestRequest, removeConnection, reportUser, updateContactPrivacy, profilePicRequest, fetchOrGenerateRoom, markNotificationsRead, uploadUserPhotos, reorderUserPhotos, deleteUserPhoto, setMainProfileImage, deleteRoom, banner/add, user/fake-batch, user/mark-top, user/unmark-top
- UNAUTH read of private data (userRoutes.js): fetchMessages, fetchUserRooms, fetchPendingRooms, fetchBlockedUserList, fetchUserNotification, getProfileVisitorSummary, getShortListedUsers, getUserPhotos, fetchRandomProfile, fetchUsersList, searchProfiles
- Authenticated user routes: only POST /api/fetchProfile (authenticate) and POST /api/assignMembership (adminAuth)
- UNAUTH auth endpoints issuing JWT without proof: /api/auth/verify-otp, /firebase-login, /firebase-register, /firebase-email-login, /firebase-email-register, /firebase-google-login, /complete-profile
- UNAUTH 'admin only' endpoints: GET/PUT /api/auth/community-feedback (authRoute.js:44-45); /api/calls/token, /api/calls/history
- Public-by-design: /api/contact/submit, /api/beta-tester/submit, /api/blogs/*, POST /api/blogs/:slug/like (no dedupe), /api/city-pages/*, /api/state-pages/*, /api/about/options, /api/about/generate, /api/compatibility/guna-milan, /api/download-apk, list lookups (countries/states/cities/gotra/caste/etc.)
- Admin routes properly guarded by adminAuth: all of routes/admin.js except /auth/login, /auth/logout, /auth/me (self-verifying); all of working-tree routes/adminRoutes.js (/blogs*, /apk/*); city-pages /admin/*, state-pages /admin/*, contact admin, beta-tester admin
- Shadowing: working tree adminRoutes.js no longer duplicates admin.js; git HEAD version of adminRoutes.js still has fake adminAuth plus /castes,/gotras,/professions,/qualifications,/income-ranges,/interests CRUD, /stats/overview and unauthenticated GET /banners, so a reset re-exposes them
- JWT: HS256 via jsonwebtoken, secret process.env.JWT_SECRET (15 chars) with fallback 'your_jwt_secret' in 4 files, expiry 7d, cookie 'token' domain .banjaramatch.com httpOnly:false secure:true sameSite Lax; also read from Authorization: Bearer; no revocation
- Admin identity: User.role==='admin' in same users collection; adminAuth.js loads user by decoded._id and checks role
- Password hashing: bcryptjs cost 10 (AuthController.js:798, admin/userController.js:467)
- .env keys: JWT_SECRET, SMTP_SERVICE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM_NAME, NODE_ENV, GROQ_API_KEY, GROQ_MODEL (AGORA_APP_ID/AGORA_APP_CERTIFICATE referenced but absent)
- config.json keys: port, db.live.{host,user,password,database}, db.dev.{...}, encryptionKey, storageUrl, pushNotification.databaseURL, voipNotification.{key,keyId,teamId,bundleId,production}, sslCertificatePath.{isSsl,key,cert}
- Tracked secrets in git: serviceAccountKey.json, cert/AuthKey_*.p8, socialmedia-sa.json.backup, config.json, 216 files under uploads/ (user photos, APK); remote git@github.com:adinayak10/matrimony-api.git; commit messages are gibberish ('alkdjs')
- Working tree has 20 uncommitted modified files on prod (git status) incl. security fix to routes/adminRoutes.js, index.js dotenv load, socket.js, models
- pm2 apps on box: banjaramatch-web (/var/www/banjaramatch.com), banjaramatch-api, banjaramatch-admin, plus emivault-*, devicedb, feribazaar-*, softcoderz-ads, android-emm-backend, nanomdm-platform, gsmarena-scraper; webhook targets nonexistent 'matrimony-api'
- Public IP 89.116.32.204; ports 4000/4001/4002 answer directly over HTTP; ufw inactive; docker bridge 172.17.0.1 present
- nginx api vhost: /etc/nginx/sites-available/api.banjaramatch.com proxies / to localhost:4002 with websocket upgrade, client_max_body_size 150M, no security headers, no rate limiting
- Uploads: middleware/upload.js -> uploads/profile_images (5MB, mimetype startsWith image/, original extension kept); middleware/apkUpload.js -> uploads/apk (100MB); blog images via controllers/admin/blogController.js upload; all served publicly at /uploads
- pm2 log /root/.pm2/logs/banjaramatch-api-out.log 6.9MB contains 4550 full JWTs from getMe logging
- External services: Firebase Admin (firebase.js with serviceAccountKey.json), Firebase Web API key hardcoded AuthController.js:1166, Gmail SMTP via services/emailService.js, Groq via services/groqClanSuggestionService.js (admin-only), Agora (unconfigured)

## reusable
- /var/www/api.banjaramatch.com/middleware/adminAuth.js: correct JWT+DB role check pattern; reuse and extend with is_block + tokenVersion
- /var/www/api.banjaramatch.com/middleware/authMiddleware.js: authenticate() exists but is used on one route only; apply router-wide and switch controllers to req.user._id
- /var/www/api.banjaramatch.com/routes/admin.js: well-organized admin route map (dashboard, users, reports, photos, banners, constants, settings, broadcast-email) for the monorepo API package
- /var/www/api.banjaramatch.com/controllers/admin/*: admin controllers (user, report, photoModeration, constants, banner, blog, dashboard, aiGotra) ready to move into apps/api
- /var/www/api.banjaramatch.com/services/emailService.js: centralized nodemailer service reading SMTP_* from env
- /var/www/api.banjaramatch.com/controllers/CallController.js generateCallToken: good pattern of server-side mutual-connection gate (ChatRoom status 'accepted'); just needs req.user identity
- UserController.applyPrivacySettings (controllers/UserController.js:29): privacy filter helper to apply consistently to all profile responses
- file-type package already in package.json; use it for magic-byte upload validation
- /root/feribazaar-autodeploy (pm2 'feribazaar-deploy-hook'): an existing separate deploy-hook process on this box, worth inspecting as a template for a signed GitHub webhook deployer

## open_questions
- Is github.com/adinayak10/matrimony-api private? If it was ever public or shared, the Firebase service account and APNs key must be treated as leaked and rotated immediately.
- Should the 20 uncommitted production changes (git status) be committed to main before any CI/CD is introduced? Any reset-based deploy will destroy them.
- Which login flows do the live Flutter app and website actually use? If they use firebase-google-login and firebase-email-login, the client must send firebaseToken before the server can make it mandatory, so older app versions need a forced update (settings.apk.isMandatoryUpdate).
- Does the Flutter app rely on sending user_id/my_user_id in the body instead of a Bearer token for the /api/* user routes? Moving to authenticate + req.user._id needs a compatibility window.
- Is AGORA calling meant to ship? If not, should /api/calls be unmounted?
- Should profile photos stay world-readable by URL, or should they move behind signed URLs or auth because of the profilePicVisibility setting?
- Can mongod/MongoDB auth be enabled? It is bound to localhost but has no credentials, and the box hosts about 14 other apps that could reach it.
