# api-chat-social-notify

## summary
I read every file in scope in full: socket.js, gamesocket.js, the chat/call/notification models, CallController and its routes, sendNotification, firebase.js, the scheduler, all six services, the public and admin feature controllers, and the legacy schemas. I also read the UserController chat, notification, report and shortlist handlers they depend on, and the web chat view and regenerate-sitemap route. All of this code trusts whatever user ID the client sends. A socket picks its identity by emitting 'join' with any userId. The handshake token the web client sends is ignored. The chat HTTP endpoints (fetchMessages, fetchOrGenerateRoom, deleteRoom) and call endpoints take user and room IDs from the request body with no auth. So anyone can read, send as, delete or accept any conversation, get past the 'accepted room' call gate, and send stored XSS to any user, because chat content goes into the page as raw HTML. Two problems can take production down. First, the GitHub webhook has no auth and runs `git reset --hard`; the API tree has 20 uncommitted files, including the adminAuth fixes and the dotenv loader, so one POST rolls them back. Second, several async socket handlers have no try/catch while the app runs on Node 18, so a rejected promise can crash it (not tested on prod). I confirmed with live GETs that community-feedback submissions (names, emails, messages) are public with no auth, and that every published regional page shows 0 members, because the stats query uses User fields that don't exist (isActive/isVerified). The node-cron scheduler is never required, so its jobs never run. ChatIntentMonitor is dead and would crash. The chat content filter silently drops normal messages such as 'I want to meet you tonight'. The admin blog editor regenerates the slug on every title save, which breaks live blog URLs, and unpublished regional pages are served publicly. Groq is only used admin-side and is low risk. mysql, mysql2, apn and several other packages are dead, while cors, body-parser and jsonwebtoken are used but not declared in package.json.

## findings (36)

### [CRITICAL][security] Unauthenticated GitHub webhook runs `git reset --hard` on prod and would roll back 20 uncommitted security fixes
- where: /var/www/api.banjaramatch.com/index.js:106
- evidence: app.post('/webhook', (req, res) => { ... const cmd = `cd /var/www/api.banjaramatch.com && git reset --hard HEAD && git pull origin main && pm2 restart matrimony-api`;  -- `git status` shows 20 modified files (index.js adds require('dotenv').config(); routes/contactRoutes.js & betaTesterRoutes.js add adminAuth; socket.js +98 lines). pm2 process is named banjaramatch-api, not matrimony-api.
- impact: Anyone on the internet can POST https://api.banjaramatch.com/webhook (nginx proxies all of / to :4002). On the next restart the reset removes dotenv loading, so JWT_SECRET falls back to 'your_jwt_secret' and admin JWTs can be forged. It also removes adminAuth from the contact and beta-tester admin routes (PII exposed) and drops the call/compat routes. The restart step targets a pm2 name that doesn't exist, so the API silently runs stale code until the next crash.
- fix: Remove the endpoint now, or verify the X-Hub-Signature-256 HMAC with a secret and run a deploy script that never uses reset --hard on a dirty tree. Commit the current working tree first. Replace this with the planned monorepo CI deploy (GitHub Actions over SSH, or a signed webhook running `git fetch && git checkout <sha>` then pm2 reload ecosystem).

### [CRITICAL][security] Socket identity is self-declared: any client can impersonate any user (send as them, read their notification counts, get their undelivered messages)
- where: /var/www/api.banjaramatch.com/socket.js:46
- evidence: socket.on('join', async (userId) => { ... onlineUsers.set(userId, socket.id); socket.userId = userId; ... const undeliveredMessages = await Message.find({ receiver: userId, status: 'sent' }); for (const msg of undeliveredMessages) { io.to(socket.id).emit('receive_message', msg);  ... and line 147: const { senderId, receiverId, content, type = 'text' } = data;
- impact: An attacker connects to wss://api.banjaramatch.com, emits join with a victim's ObjectId, and receives all of the victim's undelivered messages (which are then marked delivered). They also take over the victim's onlineUsers slot, so live messages, calls and nudges go to the attacker. send_message trusts data.senderId, so messages can be forged from anyone. The web client already sends auth.token in the handshake (user-chat.ejs:423-425), but the server never checks it.
- fix: Add io.use() middleware that verifies the JWT from socket.handshake.auth.token and sets socket.userId from the token. Ignore client-supplied userId/senderId/fromUserId in every event. Keep a Map<userId, Set<socketId>> or have sockets join a room named after userId (multi-device).

### [CRITICAL][security] Chat history of any two users is readable and deletable without auth (IDOR chain)
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3285
- evidence: routes/userRoutes.js:62-63,113 have no auth middleware: router.post('/fetchMessages', UserController.fetchMessages); router.post('/fetchOrGenerateRoom', ...); router.post('/deleteRoom', ...). fetchMessages: const { roomId, page = 1, limit = 20 } = req.body; ... Message.find({ room: roomId }) ... .limit(Number(limit)); fetchOrGenerateRoom (3324): const { userA_id, userB_id } = req.body; ... ChatRoom.findOne({ participants: { $all: [userA_id, userB_id] ... return res.json({ ... room }); deleteRoom (5487): const { my_user_id, user_id } = req.body; ... await Message.deleteMany({ room: room._id }); await ChatRoom.deleteOne(...)
- impact: Anyone who knows two user IDs (exposed throughout the public profile APIs) can call fetchOrGenerateRoom to get the roomId and then fetchMessages with limit=100000 to dump the whole private conversation. deleteRoom permanently deletes any couple's chat history (data loss). fetchUserRooms and fetchPendingRooms likewise list anyone's conversations with the other party's email.
- fix: Put authenticate on every user route and derive my_user_id from req.user. In fetchMessages, check that req.user._id is in room.participants. Cap limit (e.g. 50). Make deleteRoom a per-user soft delete (hiddenFor[]) instead of a hard delete of both sides.

### [CRITICAL][security] Stored XSS: chat message content and names are rendered as raw HTML in the web chat
- where: /var/www/banjaramatch.com/views/pages/user-chat.ejs:721
- evidence: <div class="message-bubble">
                    ${msg.content}   (also line 750 `${message.content}`, line 578 `<h5>${otherUser.full_name || 'Unknown User'}`, line 579 `<span>${lastMessage}</span>`; injected via $('#chatMessages').html(html)). Server side socket.js:148-181 stores content with no length/HTML validation; models/Message.js:7 content: { type: String, required: true } (no maxlength).
- impact: Because send_message is ungated and unauthenticated, an attacker can send any user `<img src=x onerror=...>`, which passes detectSensitiveContentAdvanced (no '@', '#' or digits). It runs on www.banjaramatch.com when the victim opens chats, so the attacker can steal their auth token or act as them.
- fix: Render with .text() or an escapeHtml() helper in user-chat.ejs, and do the same in the Flutter app if it renders HTML. On the server, trim content, enforce maxlength (e.g. 2000), and strip tags or reject '<' before persisting.

### [CRITICAL][infra] Async socket handlers without try/catch: a malformed ObjectId can cause an unhandled rejection and crash the API on Node 18 (not tested on prod)
- where: /var/www/api.banjaramatch.com/socket.js:146
- evidence: socket.on('send_message', async (data) => { const { senderId, receiverId, content, type = 'text' } = data; ... let room = await ChatRoom.findOne({ participants: { $all: sortedParticipants, $size: 2 }, ... (no try/catch); same for 'mark_seen' (228), 'accept_chat' (292), 'decline_chat' (321), 'disconnect' (536). index.js only has process.on('warning', ...). pm2 describe: node.js version 18.19.1
- impact: Emitting send_message with {senderId:'x', receiverId:'y', content:'hi'} makes ChatRoom.findOne throw a CastError inside an async listener that socket.io never awaits. On Node >=15 an unhandled rejection kills the process, so one websocket frame can take down the whole API (all apps and the web SSR that depend on it). The prod error log already has 699 CastError lines from HTTP routes, which shows bad IDs ('0') do reach the server.
- fix: Wrap every socket handler in a safe(fn) helper with try/catch. Validate IDs with mongoose.isValidObjectId before querying. Add process.on('unhandledRejection') logging as a safety net. Run under pm2 ecosystem with max_memory_restart and restart backoff.

### [CRITICAL][security] Community feedback submissions (name, email, phone, child-safety reports) are publicly listable and editable
- where: /var/www/api.banjaramatch.com/routes/authRoute.js:44
- evidence: router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only
router.put('/community-feedback/:feedbackId', CommunityFeedbackController.updateFeedbackStatus); // Admin only   -- live: curl https://api.banjaramatch.com/api/auth/community-feedback?limit=1 -> {"status":true,"data":[{"_id":"694fe304...","name":...,"email":...,"followUp":true,...
- impact: Anyone can download every feedback record with PII (?limit=0 returns everything, since Mongo treats limit 0 as no limit). They can also tamper with status, priority and adminNotes, including on 'child_safety' reports that are supposed to be escalated.
- fix: Add adminAuth to both routes, move them under /api/admin, cap limit, and add rate limiting plus a captcha on the public POST.

### [HIGH][business-logic] Chat gating is bypassable: anyone can message anyone (pending room auto-created), and any socket can accept any room, which then unlocks calls
- where: /var/www/api.banjaramatch.com/socket.js:164
- evidence: if (!room) { room = await ChatRoom.create({ participants: sortedParticipants, isGroup: false, status: 'pending' }); }  ... line 292-293: socket.on('accept_chat', async ({ roomId }) => { const room = await ChatRoom.findByIdAndUpdate(roomId, { status: 'accepted' }, { new: true });
- impact: No check for an accepted interest (FriendShipRequest), a Block between the users, is_block on the sender, or premium plan. A stranger or blocked user can keep messaging a user, and the message shows in the victim's pending inbox (fetchPendingRooms). The attacker can then emit accept_chat for that roomId themselves (no participant or recipient check). The room becomes 'accepted', which passes the call gate in call_invite (447) and /api/calls/token. A declined user can also re-accept.
- fix: In send_message: require an accepted FriendShipRequest or an accepted ChatRoom, reject if a Block exists in either direction or the sender has is_block=1, and rate-limit per sender. In accept_chat/decline_chat: require socket.userId in room.participants, the user to be the receiver of the request, and status==='pending'.

### [HIGH][security] Call token endpoint and call-control events trust client IDs; tokens are not bound to the CallLog channel
- where: /var/www/api.banjaramatch.com/controllers/CallController.js:22
- evidence: const { my_user_id, user_id, channelName } = req.body; ... ChatRoom.findOne({ participants: { $all: [my_user_id, user_id] }, status: 'accepted' }) ... RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, uid, role, expireTs);  routes/callRoutes.js:5-6 have no auth; getCallHistory (68): const { my_user_id } = req.query; CallLog.find({ $or: [{ caller: my_user_id }, { callee: my_user_id }] }).populate('caller', 'full_name profile')
- impact: Anyone can mint an Agora PUBLISHER token for an arbitrary channelName by naming any accepted pair, or their own pair after the accept_chat bypass, which allows joining or eavesdropping on other channels. /api/calls/history?my_user_id=X returns anyone's call log with names and photos (verified to respond with no auth). Socket call_accept/call_reject/call_end (488-533) don't check that socket.userId is the caller or callee, so anyone with a callId can end other people's calls. Calls are currently unconfigured (.env has no AGORA_APP_ID/AGORA_APP_CERTIFICATE), so tokens return 503 today.
- fix: Authenticate. Mint tokens only for a CallLog the requester belongs to, with status ringing/accepted, using CallLog.channelName rather than the client value. Use per-user numeric UIDs, and check participant membership in every call_* event.

### [HIGH][business-logic] Contact-info filter silently drops ordinary messages (substring matches on 'wa', 'ig', 'fb')
- where: /var/www/api.banjaramatch.com/socket.js:591
- evidence: const obfuscatedLink = /(insta|fb|tme|wa|dotme|linkdin|snap)(dot|\.|\s)?(com)?/.test(original); if (obfuscatedLink) score += 3; ... const keywords = [ ..., "ig", "fb", ...]; keywords.forEach(kw => { if (original.includes(kw)) score += 3; }); ... return score >= 5;  and line 151: if(detectSensitiveContentAdvanced(content)){ return }
- impact: 'I want to meet you tonight' matches 'wa' (want, +3) and 'ig' (tonight, +3), scores 6 and is dropped with no ACK or error. The sender sees the message hang and the receiver never gets it. Messages with words like 'always', 'wait', 'right', 'night' or 'big' are likely affected, which hurts the core chat experience. The filter is also easy to bypass with spaced digits plus words.
- fix: Use word-boundary regexes (\bwa\.me\b, \big\b), score only real phone, email or URL patterns, and emit 'message_blocked' with a reason to the sender instead of silently returning. Log blocked attempts for moderation.

### [HIGH][privacy] Presence and profile data broadcast to every connected socket, including blocked users
- where: /var/www/api.banjaramatch.com/socket.js:75
- evidence: socket.broadcast.emit('user_online', { userId }); ... line 544: socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() }); ... lines 116-131 emit 'high_match_online' with { userId, name: currentUser.full_name, score, distance, profile: currentUser.profile }; typing (281-289) forwards to any toUserId.
- impact: Any connected client, even unauthenticated or blocked, can track every user's online and offline times. The 'join' loop pushes a stranger's name, photo and distance (within 50 km) to other users with no block or privacy check, and gender-equality checks are inverted only as a +20 score. Typing events can be sent to anyone. On a matrimony site this is a stalking risk.
- fix: Emit presence only to accepted connections that are not blocked, respect a privacy setting (show online status), and gate typing on an accepted room.

### [HIGH][performance] Socket 'join' runs O(N) DB queries with three populates per online user on every connect
- where: /var/www/api.banjaramatch.com/socket.js:101
- evidence: for (let [otherUserId, otherSocketId] of onlineUsers.entries()) { if (otherUserId === userId) continue; const otherUser = await User.findById(otherUserId).populate('location.city').populate('location.state').populate('location.country');
- impact: With N users online, each reconnect costs N sequential findById calls plus 3N populates. Mobile apps reconnect often, so this grows as N² load on Mongo and the event loop. Join also writes an ActivityLog row on every connect, and send_message/mark_seen loop over every accepted room calling Message.exists (205-219, 257-271).
- fix: Drop or precompute high_match_online (geo query with $near on coordinates for online user IDs, batched), cache the user doc on the socket, and replace the per-room unread loops with a single aggregate on {receiver, status} grouped by room.

### [HIGH][security] Email templates inject user-controlled names as raw HTML; shortlist toggle allows unlimited emails
- where: /var/www/api.banjaramatch.com/services/emailService.js:103
- evidence: const subject = `💌 ${sender.full_name} has shown interest in your profile`; ... <div class="name">💛 ${sender.full_name}</div>  (same in 132-140, 161-168, 190-198). UserController.js:2366-2372 toggleShortlist: shortlist.status = !shortlist.status; ... if (shortlist.status) { sendShortlistEmail(targetUser, user) ...  (routes/userRoutes.js:29 no auth)
- impact: An attacker sets full_name to `<a href="https://evil">Verify your account</a>` and triggers interest, profile-view or shortlist emails. A phishing email then arrives from the official Banjara Match Gmail account. Calling toggleShortlist twice per cycle sends an email every second cycle with no throttle, so any user can be email-bombed and the Gmail App-Password quota (~500/day) used up, after which all transactional mail stops. emailService line 17 also sets tls.rejectUnauthorized: false.
- fix: HTML-escape every interpolated value, use a pooled transporter with a transactional ESP (SES, Brevo), throttle per (sender, recipient, type) e.g. one per 24h, add List-Unsubscribe, and remove rejectUnauthorized:false.

### [HIGH][seo] Editing a blog regenerates its slug from the title, which changes live URLs (404s, lost rankings)
- where: /var/www/api.banjaramatch.com/controllers/admin/blogController.js:273
- evidence: if (title) {
      blog.title = title;
      // Regenerate slug if title changes
      blog.slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
- impact: The admin edit form sends title on every save, so any title tweak (even a typo fix) changes /blog/<slug>. Indexed URLs and backlinks break and there is no redirect table. A title in Hindi or Telugu produces an empty slug, and a collision on update throws an E11000 500 because there's no uniqueness pre-check like createBlog has.
- fix: Never change the slug of a published post automatically. Only set it on create, or on explicit admin request with a 301 redirect record (old_slug -> new_slug) served by the web app. Transliterate non-ASCII titles and make slugs unique with a -2 suffix.

### [HIGH][seo] Unpublished (draft) regional pages are served publicly by slug
- where: /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js:426
- evidence: const page = await CityRegionalPage.findOne({ slug, isActive: true })  (stateRegionalPageController.js:396 same); models default isActive: true, isPublished: false (CityRegionalPage.js:254-255); web routes/index.js:1152 renders whatever /api/city-pages/:slug returns.
- impact: Draft or unfinished city and state pages (thin, templated content) render at https://www.banjaramatch.com/banjara-matrimony-<city> and can be crawled and indexed even though they're excluded from the sitemap. Thin-content risk for the 'banjara matrimony' ranking. Each view also increments views and makes 3 API calls with no caching.
- fix: Add isPublished: true to the public slug queries (admins preview through the /admin/:id endpoints), and add short TTL caching on the web side.

### [HIGH][data-integrity] Regional page stats are always 0: query uses User fields that don't exist (isActive, isVerified)
- where: /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js:519
- evidence: const totalMembers = await User.countDocuments({ 'location.city': cityId, isActive: true }); ... isVerified: true ...  (User.js only defines is_verified/is_block; grep isActive|isVerified models/User.js -> no match). Also aggregates at 38-67 match 'location.city': cityId (string, aggregate does not cast). Live: GET /api/city-pages -> every page "totalMembers":0 (16 city pages, 8 state pages).
- impact: Public regional pages, which carry the 'banjara matrimony <city>' SEO, show '0 members, 0 brides' or a placeholder meta description, and the communityInsights lists are empty. Bad for trust and conversion. successStories is invented anyway (line 528: Math.floor(totalMembers * 0.15)).
- fix: Use { 'location.city': new ObjectId(cityId), is_block: 0 } and is_verified: 1, cast IDs in aggregates, and recompute stats with a nightly job. Remove the fabricated successStories estimate.

### [HIGH][business-logic] Fabricated claims on state pages (verification with Aadhaar, success counts, member counts)
- where: /var/www/api.banjaramatch.com/controllers/stateRegionalPageController.js:505
- evidence: verificationNote: 'We verify all Maharashtra profiles with Aadhaar, educational certificates, and family background checks', ... successMetric: 'Over 500 successful matches have been facilitated across Maharashtra in the past year.', memberCount: '10,000+'  (similar for Karnataka/Telangana/AP lines 538-575)
- impact: Prefill content states verification processes and success numbers the platform doesn't have (live stats are 0, and there is no Aadhaar flow). This is a consumer-protection and legal risk and erodes E-E-A-T for SEO if it was published.
- fix: Strip unverifiable claims from the prefill and replace them with real computed numbers or neutral copy. Audit already-published state pages for these strings.

### [HIGH][security] Unauthenticated admin-style user routes: add banners, create fake users, mark users as top
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:88
- evidence: // Admin APIs
router.post('/banner/add',  UserController.addBanner);
router.post('/user/fake-batch', UserController.createFakeBatch);
router.post('/user/mark-top', UserController.maekusertop);
router.post('/user/unmark-top', UserController.unmarkTopUser);   (UserController.js:4184 const banner = new Banner(req.body);)
- impact: Anyone can insert in-app banners with arbitrary links (phishing), create batches of 30 fake users (createFakeBatch has hardcoded emails, so repeat calls fail on the unique index, but the first call pollutes production), and promote or demote any profile's highlighted status.
- fix: Remove fake-batch from production, and move banner/top-marking behind adminAuth under /api/admin (bannerController already exists there).

### [HIGH][business-logic] Icebreaker game: spoofable userId, identity leaked before reveal, no block/gender filtering
- where: /var/www/api.banjaramatch.com/gamesocket.js:475
- evidence: const user = await User.findById(data.userId); ... const player = { userId: data.userId, ... }  and 506-516: io.to(player1SocketId).emit('game_found', { gameId: game.id, partnerId: matchedPlayer.userId, questions: game.questions });  findIcebreakerMatch (372): if (true) { icebreakerQueue.splice(i, 1); return waitingPlayer; }
- impact: The 'anonymous' game sends the partner's real user ID at match time, so the anonymity and the 60% reveal threshold are pointless (a client can fetch the profile directly). It matches anyone with anyone: same gender, blocked users, is_block users. A client can queue as another user. The queue is in-memory and only survives a single instance.
- fix: Use socket.userId (from the verified JWT) instead of data.userId, send an opaque per-game partner alias until reveal, and filter by opposite gender, no Block, and not is_block. Add a duplicate-queue check.

### [MEDIUM][dead-code] Scheduler never loaded: interest-monitor and second-chance cron jobs never run; ChatIntentMonitor is dead and broken
- where: /var/www/api.banjaramatch.com/schedular/schedular.js:6
- evidence: cron.schedule('*/15 * * * *', async () => { ... await runInterestMonitor();  and cron.schedule('*/30 * * * *', ... emitSecondChanceSuggestions  -- grep "schedular" across repo: only self-references; index.js never requires it; no pm2 process for it. services/ChatIntentMonitor.js:4 const { getIO, getOnlineUsers } = require('../socket'); (socket.js exports only setupSocket,getIO,onlineUsers)
- impact: 'interest_detected' and 'second_chance_suggestion' features are silently off. If someone enables them, detectInterestMonitor.js:9 loads the entire RecentVisitor collection with populate every 15 minutes, and ChatIntentMonitor throws 'getOnlineUsers is not a function'. If enabled in-process under pm2 cluster mode, jobs would double-run with no lock.
- fix: Decide whether to keep them. If yes, run them as a separate pm2 fork process (instances: 1) or with a Mongo-based lock, add an updatedAt >= now-2d filter plus pagination, make them idempotent, and fix the ChatIntentMonitor import. Otherwise delete them.

### [MEDIUM][security] Sitemap regeneration endpoint is public and unauthenticated; the 'internal' header is never checked
- where: /var/www/banjaramatch.com/routes/index.js:1209
- evidence: router.post('/api/regenerate-sitemap', async (req, res) => { ... const success = await generateAllSitemaps();  vs api services/sitemapService.js:14-18 axios.post(`${FRONTEND_URL}/api/regenerate-sitemap`, {}, { headers: { 'X-Internal-Request': 'true' } })  and constantsController.js:17 uses 'http://localhost:4000/api/regenerate-sitemap'
- impact: Anyone can POST https://www.banjaramatch.com/api/regenerate-sitemap in a loop to force repeated full sitemap generation (many API calls plus disk writes), which is cheap DoS. The two callers also use different URLs (public vs localhost), so behaviour depends on env.
- fix: Require a shared secret header (env SITEMAP_TOKEN) or allow only 127.0.0.1. Call it via localhost from a single helper in the monorepo, and debounce regenerations (bulk-create currently fires one per page).

### [MEDIUM][security] Public contact/beta/feedback forms: no rate limit, no captcha, spoofable IP logging, 150 MB body limit
- where: /var/www/api.banjaramatch.com/controllers/ContactController.js:37
- evidence: const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;  (no rate limiting; nginx has no limit_req; index.js:64 app.use(bodyParser.json({ limit: '150mb' })); no message length check)
- impact: Bots can flood Contact, BetaTester and CommunityFeedback collections with huge payloads (up to 150 MB JSON each), filling Mongo and the admin queues. The logged IP is attacker-controlled.
- fix: Add express-rate-limit per IP (trust proxy 1), Cloudflare Turnstile or hCaptcha, a 100kb JSON limit globally (raise it only on upload routes), field maxlengths, and nginx limit_req for /api/*/submit.

### [MEDIUM][security] Public blog endpoints: unescaped regex search (ReDoS), unbounded limit, arbitrary sortBy, unlimited likes/views
- where: /var/www/api.banjaramatch.com/controllers/blogController.js:24
- evidence: if (search) { query.$or = [ { title: { $regex: search, $options: 'i' } }, ... { tags: { $in: [new RegExp(search, 'i')] } } ]; } ... const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };  likeBlog (208): Blog.findOneAndUpdate({ slug, status: 'published' }, { $inc: { likes: 1 } }
- impact: ?search=(a+)+$ can pin the CPU, and an invalid regex returns a 500 with error.message leaked. ?limit=100000 dumps all blog content. Likes and views can be inflated without limit, which skews 'trending'.
- fix: Escape the regex (or use a $text index), clamp limit to 50, whitelist sortBy, rate-limit likes per IP, and drop error.message from responses.

### [MEDIUM][business-logic] Photo moderation is opt-in: uploads default to approved and are visible immediately
- where: /var/www/api.banjaramatch.com/models/UserPhoto.js:16
- evidence: moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },  (photoModerationController.js:5 'not required for new uploads to go live'); UserController.js:4565 UserPhoto.find({ userId, moderationStatus: { $ne: 'rejected' } })
- impact: Explicit or fake photos are public until an admin happens to reject them, and the 'pending' queue is always empty. Main profile picture (User.profile) changes bypass UserPhoto moderation entirely.
- fix: Default new uploads to 'pending', show them only to the owner until approved, optionally add automatic NSFW screening, and apply the same flow to profile picture changes.

### [MEDIUM][business-logic] User reports: no auth, no dedupe, self-report allowed, no auto-action threshold
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:5218
- evidence: const { my_user_id, user_id, reason, desc } = req.body; ... const report = new UserReport({ reportedBy: my_user_id, reportedUser: user_id, reason, desc }); await report.save();
- impact: Anyone can file unlimited reports as any user, including against themselves, which floods the admin queue. Harassers face no automatic consequence (no threshold-based hide or ban, and no Block is created for the reporter).
- fix: Require auth, add a unique index on (reportedBy, reportedUser), reject self-reports, auto-block the reported user for the reporter, auto-hide the profile pending review once N distinct reporters report within 7 days, and notify admins.

### [MEDIUM][data-integrity] Blog createdBy/updatedBy always undefined (adminAuth sets req.user, not req.admin)
- where: /var/www/api.banjaramatch.com/controllers/admin/blogController.js:194
- evidence: createdBy: req.admin?._id,
      updatedBy: req.admin?._id   vs middleware/adminAuth.js:48-49 req.user = user; req.userId = user._id;
- impact: There is no audit trail for who created or edited blog posts.
- fix: Use req.user._id. Add a shared audit-log helper for all admin mutations.

### [MEDIUM][seo] City/state slugs share one namespace; collisions resolve silently to the city page; duplicate city names break creation
- where: /var/www/api.banjaramatch.com/models/CityRegionalPage.js:281
- evidence: this.slug = `banjara-matrimony-${city.name.toLowerCase().replace(/\s+/g, '-')}`;  (StateRegionalPage.js:316 identical pattern); web routes/index.js:1150-1160 tries city first then state; update handlers spread req.body with strict:false (cityRegionalPageController.js:327,349)
- impact: A city named like its state (e.g. Delhi) makes the state page unreachable. Same-name cities in different states (e.g. Aurangabad) get an E11000 on create. Slugs can be changed through the update body or keep punctuation such as '(' and '.'. None of this collides today (verified 16 city and 8 state slugs), but it's latent. Public URLs must never change.
- fix: Freeze existing slugs: make slug immutable after the first publish (strip slug from update bodies), add a cross-collection uniqueness check, sanitize to [a-z0-9-], and append the state on collision for new pages only.

### [MEDIUM][performance] Dashboard engagement stats use the wrong field and full-collection aggregates
- where: /var/www/api.banjaramatch.com/controllers/admin/dashboardController.js:175
- evidence: const activeRequesters = await FriendshipRequest.distinct('from', { createdAt: { $gte: sevenDaysAgo } });  (model field is 'requester', FriendShipRequest.js:3) ... Message.aggregate([{ $group: { _id: '$sender', messageCount: { $sum: 1 } } }, ...])
- impact: activeRequesters is always 0. averageMessagesPerUser scans the whole messages collection on every dashboard load, which gets slower as chat grows. getDashboardStats runs 10+ counts and 2 full User aggregates per load with no cache.
- fix: Use 'requester', add a createdAt match before the group, add indexes (Message {createdAt}, FriendShipRequest {createdAt}), and cache stats for 5 minutes.

### [MEDIUM][business-logic] Unread-count events broken: wrong field name and socket room never joined
- where: /var/www/api.banjaramatch.com/socket.js:379
- evidence: { $match: { receiver: userId, status: 'sent' } },
          { $group: { _id: "$roomId" } }   (field is 'room'; aggregate doesn't cast string userId)  and UserController.js:4781 io.to(my_user_id).emit('notification_count', { total: 0 }); (sockets never join a room named userId)
- impact: get_unread_chat_count always returns 0, and the notification badge doesn't reset in real time after markNotificationsRead.
- fix: Use '$room' and new ObjectId(userId), have each socket join(userId) after authentication, and emit to that room everywhere.

### [MEDIUM][data-integrity] Message model lacks 'type' field; socket-sent message types are silently dropped
- where: /var/www/api.banjaramatch.com/models/Message.js:8
- evidence: msgType: { type: String, required: false , default: 'TEXT',},  vs socket.js:178 type,  and UserController.js:3153 type: lastMessage.type,
- impact: Image or other non-text messages are stored as TEXT, so clients can't render them correctly, and lastMessage.type is always undefined.
- fix: Unify on one field (type enum ['text','image',...]), migrate msgType, add maxlength on content, and add indexes {room:1, createdAt:-1} and {receiver:1, status:1}.

### [MEDIUM][data-integrity] Production boot mutates a real user's record (hardcoded phone)
- where: /var/www/api.banjaramatch.com/index.js:102
- evidence: await  User.updateOne({ phone: '8087439035' }, { $set: { gender: 'Male' } });    // Vijaya rathod
- impact: Every restart overwrites this user's gender regardless of what they set. It also puts PII in source code.
- fix: Remove it. Fix the data once with a one-off migration script.

### [MEDIUM][security] adminAuth logs raw cookies (JWTs) on every admin request; insecure JWT secret fallback
- where: /var/www/api.banjaramatch.com/middleware/adminAuth.js:15
- evidence: console.log('🔐 [adminAuth] Cookies:', req.cookies);  and line 4: const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
- impact: Admin session tokens are written to ~/.pm2/logs/banjaramatch-api-out.log (169k lines), so anyone with log access can replay them. If .env fails to load (see the webhook finding), tokens become forgeable with a public default secret.
- fix: Remove the cookie logging and rotate JWT_SECRET. Fail fast at boot if JWT_SECRET is missing.

### [MEDIUM][business-logic] FCM push: no handling of invalid tokens, no per-user notification preferences, no dedupe
- where: /var/www/api.banjaramatch.com/util/sendNotification.js:44
- evidence: try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
  }
- impact: Stale or unregistered device tokens are retried forever. One token can be shared across accounts on the same device, so notifications leak between accounts after logout because login only overwrites the token and nothing clears it. is_push_notifications (User.js:163) is never checked, so users can't opt out.
- fix: On messaging/registration-token-not-registered, $unset device_token. Clear the token on logout and when another account claims it. Check is_push_notifications. Collapse repeated nudges using a collapseKey.

### [LOW][dead-code] Unused or legacy dependencies and code; undeclared runtime deps
- where: /var/www/api.banjaramatch.com/package.json:7
- evidence: "apn": "^1.6.2", ... "mysql": "^2.18.1", "mysql2": "^3.3.1",  (grep require: mysql, mysql2, apn, connect-mongo, crypto-js, express-formidable, file-type, ip -> no usages); cors, body-parser, jsonwebtoken are required (index.js:8,12; middleware/*.js:2) but absent from package.json. schemas/*.js never required and broken (schemas/gifthistory.js:1 `new Schema(` with Schema undefined). models/Room.js only referenced by settingsController/deleteUsers.
- impact: A clean `npm ci` in the new monorepo could break auth and CORS because jsonwebtoken, cors and body-parser only exist as transitive or hoisted dependencies. The dead packages add attack surface (apn and ip have known advisories).
- fix: Remove the dead packages, declare cors, body-parser and jsonwebtoken explicitly, and delete the schemas/ folder and the unused Room/RoomUser paths after confirming with a DB check.

### [LOW][infra] Secrets tracked in git and broken .gitignore
- where: /var/www/api.banjaramatch.com/.gitignore:2
- evidence: /node_modulescert/AuthKey_8####.p8   (two entries merged on one line); `git ls-files` includes config.json and serviceAccountKey.json; .env is untracked but not ignored
- impact: The Firebase service-account private key is in git history. The APNs key and node_modules are not actually ignored, so one `git add .` would commit .env too.
- fix: Fix .gitignore (node_modules, cert/, .env, serviceAccountKey.json, uploads/), rotate the Firebase key, and purge it from history before creating the monorepo.

### [LOW][infra] GET / on API serves a missing file, spamming the error log
- where: /var/www/api.banjaramatch.com/index.js:97
- evidence: app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'admin-panel.html')); });  -- error log tail: Error: ENOENT: no such file or directory, stat '/var/www/api.banjaramatch.com/public/admin-panel.html'
- impact: Every hit on https://api.banjaramatch.com/ (bots, uptime checks) logs an ENOENT stack, which buries real errors.
- fix: Return a JSON health response, e.g. {status:'ok'}.

### [LOW][perf] Groq call has no timeout or retry; chunks run sequentially
- where: /var/www/api.banjaramatch.com/services/groqClanSuggestionService.js:22
- evidence: const response = await fetch(`${GROQ_BASE}/chat/completions`, { method: 'POST', ... max_tokens: 4000, }),  model default (aiGotraController.js:38) process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
- impact: A slow Groq response hangs the admin request indefinitely, and a 429 aborts the whole batch, losing earlier chunk results. It's admin-only and never writes to the DB, so the impact is limited.
- fix: Add AbortSignal.timeout(30000), retry with backoff on 429/5xx, and return partial results.

## inventory
- SOCKET server: socket.io v4 on api :4002, CORS origin '*' (index.js:77). Identity = client-emitted 'join'(userId); handshake auth.token ignored. onlineUsers = in-memory Map<userId, socketId> (1 socket per user, last wins).
- SOCKET client->server events (socket.js): join(userId), send_message{senderId,receiverId,content,type}, mark_seen{roomId,receiverId}, typing{toUserId,fromUserId}, stop_typing{toUserId,fromUserId}, accept_chat{roomId}, decline_chat{roomId}, get_notification_count(userId), get_match_request_count(userId), get_unread_chat_count(userId), get_unread_chatroom_count(userId), get_icebreaker_stats, call_invite{toUserId,roomId,callType}, call_accept{callId}, call_reject{callId}, call_end{callId}, disconnect
- SOCKET client->server events (gamesocket.js, mounted via setupIcebreakerSocket in socket.js:142): join_icebreaker_queue{userId,preferences}, submit_answer{gameId,questionId,answer}, reveal_identity{gameId}, leave_icebreaker_queue, disconnect
- SOCKET server->client events (socket.js): notification_count, user_online (broadcast all), user_offline (broadcast all), receive_message, message_sent, message_delivered, message_seen, unread_chatroom_count_update, high_match_online, user_typing, user_stop_typing, chat_accepted, chat_declined, new_match_request, chat_update, icebreaker_stats, call_failed, call_incoming, call_accepted, call_rejected, call_end
- SOCKET server->client events (gamesocket.js): error, game_found, game_started, next_question, partner_answered, partner_revealed, game_results, queue_joined, queue_left, partner_disconnected
- SOCKET server->client events from HTTP controllers/services: profile_visited (UserController:1160), intent_fluctuation (1145), notification_count (2508,2774,4746,4781), new_match_request (2515,2840), profile_searched_ping (5008), interest_detected (detectInterestMonitor:46, NOT running), second_chance_suggestion (secondChange:35, NOT running), silent_interest_detected (ChatIntentMonitor:53, dead)
- SCHEDULED: socket.js:29 setInterval cleanupAbandonedGames every 300000ms (in-process, runs). gamesocket per-question setTimeout 30s, 2s between questions, 3s start delay, 5-min post-game cleanup.
- SCHEDULED (NOT LOADED): schedular/schedular.js node-cron '*/15 * * * *' runInterestMonitor; '*/30 * * * *' emitSecondChanceSuggestions. Never required by index.js; no pm2 process.
- DEAD: services/ChatIntentMonitor.js (imports non-existent getOnlineUsers), schemas/{gifthistory,livebattle,livecallhistory,setting,user}.js (never required, broken), models/Room.js & RoomUser (only settingsController/deleteUsers)
- pm2: banjaramatch-api fork_mode single instance, node 18.19.1, script /var/www/api.banjaramatch.com/index.js, logs /root/.pm2/logs/banjaramatch-api-{out,error}.log (169k/21k lines). Webhook restarts non-existent 'matrimony-api'.
- API git: /var/www/api.banjaramatch.com is a git repo with 20 modified + 10 untracked files (CallController, callRoutes, CallLog, CompatibilityController, aiGotraController, photoModerationController, reportController, Clan, SurnameTitle, .env). Last commits have meaningless messages ('alkdjs').
- .env keys present: JWT_SECRET SMTP_SERVICE SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS EMAIL_FROM_NAME NODE_ENV GROQ_API_KEY GROQ_MODEL. MISSING: AGORA_APP_ID, AGORA_APP_CERTIFICATE (calls return 503), FRONTEND_URL, SITEMAP_REGEN_URL (defaults used).
- Call HTTP endpoints (no auth): POST /api/calls/token {my_user_id,user_id,channelName}; GET /api/calls/history?my_user_id= (verified live returns 200).
- Chat HTTP endpoints (no auth, routes/userRoutes.js): POST /api/fetchUserRooms, /api/fetchPendingRooms, /api/fetchMessages, /api/fetchOrGenerateRoom, /api/deleteRoom, /api/fetchUserNotification, /api/markNotificationsRead
- Public form endpoints: POST /api/contact/submit, POST /api/beta-tester/submit, POST /api/auth/community-feedback (+ unauth GET/PUT /api/auth/community-feedback — confirmed PII leak live)
- Unauth admin-like endpoints: POST /api/banner/add, /api/user/fake-batch, /api/user/mark-top, /api/user/unmark-top
- Public blog API: GET /api/blogs, /api/blogs/all-published, /featured, /trending, /categories, /:slug; POST /api/blogs/:slug/like
- Regional pages public API: GET /api/city-pages, /api/city-pages/state/:stateId, /api/city-pages/:slug, GET /api/state-pages, /api/state-pages/:slug. Web route routes/index.js:1140-1206 resolves /banjara-matrimony-* city first then state.
- Live regional slugs: 16 city pages (e.g. banjara-matrimony-hyderabad, banjara-matrimony-warangal), 8 state pages (e.g. banjara-matrimony-delhi, banjara-matrimony-madhya-pradesh); no city/state collisions today; all stats totalMembers=0.
- Slug rules: city/state = 'banjara-matrimony-' + name.toLowerCase().replace(/\s+/g,'-') generated once in pre('save') only if empty (CityRegionalPage.js:281, StateRegionalPage.js:316); canonical https://www.banjaramatch.com/<slug>. Blog slug = title.toLowerCase().replace(/[^a-z0-9]+/g,'-') (admin/blogController.js:168, regenerated on update at 276).
- Sitemap regeneration: web POST /api/regenerate-sitemap (routes/index.js:1209, no auth). Callers: services/sitemapService.js (https://www.banjaramatch.com/...), constantsController.js & aiGotraController.js (http://localhost:4000/...).
- Email: nodemailer Gmail App Password (SMTP_USER), new transporter per mail, tls.rejectUnauthorized=false. Triggers: interest request (UserController:2482), interest accepted (2747), profile view (1168, 2h cooldown), shortlist (2370/2392, no cooldown), profile verified (admin/userController), admin broadcast (routes/admin.js:142-225, sequential, no unsubscribe).
- Groq: services/groqClanSuggestionService.js, base https://api.groq.com/openai/v1, model env GROQ_MODEL default llama-3.3-70b-versatile, chunk 30, temp 0.1, max_tokens 4000, admin-only routes POST /api/admin/gotras/ai-suggest and /ai-apply.
- Firebase: firebase.js and util/sendNotification.js both init firebase-admin from serviceAccountKey.json (tracked in git). Android channelId 'chatter'.
- Photo moderation: UserPhoto.moderationStatus default 'approved'; admin routes GET /api/admin/photos, POST /photos/:id/approve|reject.
- Reports: POST /api/reportUser (no auth/dedupe); admin GET /api/admin/reports, /reports/stats, /reports/:id, PATCH /reports/:id/status, POST /reports/:id/block-user. No auto-ban threshold anywhere.
- Unused deps in api package.json: mysql, mysql2, apn, connect-mongo, crypto-js, express-formidable, file-type, ip. Used but undeclared: cors, body-parser, jsonwebtoken. agora-access-token used only by CallController.
- nginx: banjaramatch.com location / -> localhost:4000; api.banjaramatch.com location / -> localhost:4002; no limit_req zones anywhere.

## reusable
- /var/www/api.banjaramatch.com/middleware/adminAuth.js — admin JWT + role check (sets req.user/req.userId); reuse after removing cookie logging
- /var/www/api.banjaramatch.com/middleware/authMiddleware.js — authenticate() JWT verifier; basis for socket io.use() auth and for protecting all /api user routes (derive my_user_id from req.user)
- /var/www/api.banjaramatch.com/services/emailService.js — sendMail + baseWrapper template; keep, add escaping, pooling and throttle
- /var/www/api.banjaramatch.com/util/sendNotification.js — FCM sender; extend with token cleanup and preference check
- /var/www/api.banjaramatch.com/services/sitemapService.js — single triggerSitemapRegeneration helper; consolidate constantsController/aiGotraController copies into it
- /var/www/api.banjaramatch.com/controllers/admin/constantsController.js — generic getAllItems/createItem/updateItem/deleteItem CRUD factory, a good pattern for a shared admin CRUD module
- /var/www/api.banjaramatch.com/utils/placeholderProcessor.js — regional page placeholder engine (processObjectPlaceholders, prepareCityDataContext)
- /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js buildCityPrefillData — shared prefill used by single and bulk create
- /var/www/api.banjaramatch.com/socket.js call_invite accepted-ChatRoom gate (lines 442-451) — correct intent; reuse once socket auth exists
- /var/www/api.banjaramatch.com/controllers/admin/reportController.js blockReportedUser — one-step block+resolve flow reusable for auto-threshold action
- /var/www/api.banjaramatch.com/deleteUsers.js and controllers/admin/userController.js:357-390 — list of all user-linked collections for cascade delete

## open_questions
- ChatRoom has a unique multikey index on {participants:1,isGroup:1} (models/ChatRoom.js:14-20). Taken literally, each user could be in only one 1:1 room. Did the index fail to build in db 'aasd' (check db.chatrooms.getIndexes())? I didn't run mongosh because it isn't on the allowed-command list.
- Does the Flutter app (banjaramatch_app) render chat content as HTML or rich text? This sets the XSS blast radius outside the web chat.
- Should interest-monitor and second-chance (scheduler) be revived, or removed in the monorepo?
- Is chat meant to require an accepted interest (FriendShipRequest) or premium membership? acceptInterestRequest auto-creates an 'accepted' room, while socket send_message creates 'pending' rooms for anyone.
- Were the fabricated stateInfo claims (Aadhaar verification, '500 successful matches') published to live state pages? Needs a DB or page-content check of the 8 published state pages.
- Are the 20 uncommitted API changes intended for production? They have to be committed before any CI/monorepo move, or a reset will lose them.
- Should calls (Agora) launch? AGORA_APP_ID and AGORA_APP_CERTIFICATE are not set, so the feature is currently non-functional.
