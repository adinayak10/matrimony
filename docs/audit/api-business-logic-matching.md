# api-business-logic-matching

## summary
I read all of /var/www/api.banjaramatch.com/controllers/UserController.js (5532 lines, in chunks), plus routes/userRoutes.js, models/User.js, the Interest/ShortList/Block/RecentVisitor/RemainingProfileImageView/MembershipPlan/UserPhoto/Gotra/Clan/SurnameTitle/SearchLog/settings/FriendShipRequest/Notification models, enum/enum.js, CompatibilityController, AboutController, services/secondChange.js and services/detectInterestMonitor.js. To cross-check I also read socket.js, the auth paths in AuthController.js, the auth middleware, index.js, schedular.js, deleteUsers.js, restoreUsers.js and fix-phone-index.js.

HOW MATCHING WORKS TODAY: Every endpoint in userRoutes.js except fetchProfile (and the admin-gated assignMembership) is public. The caller's identity comes from `my_user_id`/`user_id` in the request body, not from a JWT. The web server calls the API from its own server with no Authorization header. Match lists come from `fetchUsersListWithFilters` (/api/fetchUsersList), `searchProfiles`, `getTopDailyMatches`, `fetchNearbyMatches`, `fetchTrendingProfiles` and `fetchRandomProfile`. Each one loads the whole matching user collection into Node memory, filters it there, sorts it and then slices out a page. The opposite-gender rule is `gender $nin [myGender, null, '', 'Not specified']`, so a user whose own gender is 'Not specified' sees both men and women. The nearby endpoint has no gender filter at all. Two block stores exist: blockUser writes to the `Block` collection, but the main list, daily matches, nearby and trending all read the unused `User.blocked` array, so blocks are ignored there. 'Match my preference' is broken: it compares populated objects (or ObjectIds) with strings, so any caste, gotra, qualification or profession preference returns zero results. 'Match their preference' does nothing, because `preferences` is stripped from the query by `.select('-preferences')`. Same-gotra exclusion (Banjara gotra exogamy) is not built anywhere, even though the website says it is forbidden. Membership is never checked when sending interests, viewing photos, seeing contact details or chatting. Plans have no expiry. Any user can set `membershipPlan` and `is_verified` on any account through editProfile. The photo-view counters (RemainingProfileImageView) are never created or decremented. List responses return almost complete user documents: password hash, device_token, firebase_uid, exact coordinates and DOB. Phone and email are hidden only when the owner set them to private, and getTopDailyMatches does not even do that. In auth, `/api/auth/verify-otp` has its OTP check commented out, and `/firebase-login` and `/complete-profile` issue a JWT for any phone number without verifying anything. That means login as any user is possible. The socket server trusts any userId sent to `join` or `send_message`. Background jobs (detectInterestMonitor, secondChance) are never started, because schedular.js is not required anywhere. The log tables (SearchLog, RecentVisitor, ActivityLog, Notification) have no TTL or cleanup.

## findings (33)

### [CRITICAL][security] OTP verification disabled: anyone can log in as any phone number
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:750
- evidence: // Uncomment for actual OTP verification
    // if (!entry || entry.code !== otp || Date.now() > entry.expires) {
    //   return res.status(401)...
...
    return sendTokenResponse(res, user, 'Logged in successfully', isMobile(req));  (route: router.post('/verify-otp', AuthController.verifyOtpAndLogin))
- impact: POST /api/auth/verify-otp with {phone:'<victim>'} returns a valid 7-day JWT and cookie for the victim, which is a full account takeover. If the phone is not registered, a new account is created for it.
- fix: Re-enable OTP verification or remove the legacy route. Require a verified Firebase ID token (admin.auth().verifyIdToken) whose phone_number matches, as verifyFirebaseOtp already does at line ~998.

### [CRITICAL][security] firebase-login, firebase-register and complete-profile issue JWTs without verifying a Firebase token
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:441
- evidence: const { phone, firebaseUid } = req.body; ... let user = await User.findOne({ phone }) ... return sendTokenResponse(res, user, 'Login successful', ...);  // also completeProfile L676-724: const { phone, full_name } ... user.full_name = full_name; ... sendTokenResponse
- impact: Anyone who knows a member's phone number gets their session. /complete-profile also overwrites the victim's full_name, and /firebase-register overwrites firebase_uid.
- fix: Accept only firebaseToken, verify it server-side, and derive phone and uid from the decoded token. Delete or guard the routes that trust a body phone.

### [CRITICAL][security] Identity taken from request body on nearly all user routes (IDOR)
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:13
- evidence: router.post('/editProfile',  upload.uploadProfileImages, UserController.editProfile);
router.post('/deleteUser',  UserController.deleteUser);
router.post('/fetchUsersList',  UserController.fetchUsersListWithFilters);
router.post('/sendInterestRequest',  UserController.sendInterestRequest);  (only fetchProfile uses authenticate)
- impact: Any anonymous caller can act as any user. They can edit profiles, send or accept interests, block or unblock, read notifications, visitors, rooms and messages, and upload or delete photos, just by putting the victim's ObjectId in my_user_id or user_id.
- fix: Apply authenticate to the router and replace my_user_id/user_id with req.user._id. The web server's server-side axios calls must forward the user's Bearer token. The Flutter web_service.dart already sends Authorization.

### [CRITICAL][business-logic] editProfile lets anyone grant premium, verification, or change phone/email/gender on any account
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:276
- evidence: if (membership) user.membershipPlan = membership;   (L276)
if (is_verified !== undefined) user.is_verified = Boolean(is_verified);  (L335)
user.phone = req.body.phone === '' ? null : req.body.phone;  (L263)
if (gender) user.gender = gender;  (L273)
user.settings = { ...user.settings, ...settings };  (L232-235)
- impact: Free users can give themselves Gold or Platinum and a verified badge. An attacker can also change a victim's phone or email, which are the login identifiers, and so take over the account, or switch the victim's gender to move them between match pools.
- fix: Use a whitelist of user-editable fields only. Remove membership, is_verified, block_user_ids, phone and email from editProfile (phone and email need a verified-change flow). Validate settings keys against the enums.

### [CRITICAL][security] Any chat readable by roomId; socket identity is spoofable
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3295
- evidence: const { roomId, page = 1, limit = 20 } = req.body; ... const messages = await Message.find({ room: roomId })   // socket.js L46-52: socket.on('join', async (userId) => { onlineUsers.set(userId, socket.id); ... // L146: const { senderId, receiverId, content } = data;
- impact: Room ids leak through fetchProfile.chatRoom and fetchOrGenerateRoom, so any caller can read a private conversation. A socket can 'join' as any user, receive that user's undelivered messages (marking them delivered) and send messages as anyone. send_message never checks blocks, accepted interest, or the allowMessages setting.
- fix: Authenticate sockets with the JWT in the handshake (io.use) and use socket.userId only. In fetchMessages, check that req.user is a participant. In send_message, require an accepted connection and no Block in either direction.

### [CRITICAL][data-integrity] Matching endpoints return full user documents: password hash, device tokens, coordinates, phone/email
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3972
- evidence: const allUsers = await User.find({ _id: { $ne: userId }, is_block: 0, gender: { $ne: currentUser.gender } }).populate('caste gotra membershipPlan interests').lean(); ... data: sorted.map(match => ({ ...match.user, matchScore ...}))   // also L1940 User.find(baseQuery).select('-preferences'); L863 fetchRandomProfile; L3910 fetchNearbyMatches; L982 fetchProfile
- impact: An unauthenticated POST to /api/getTopDailyMatches dumps every opposite-gender member's phone, email, bcrypt password hash, FCM device_token, firebase_uid, exact GPS coordinates and DOB. applyPrivacySettings is not applied here at all. In the other list endpoints it only nulls phone and email.
- fix: Define one public-profile projection (e.g. PUBLIC_PROFILE_FIELDS) and use it in every list and detail query. Never select password, device_token, firebase_uid, coordinates, phone or email except for self or premium contact-unlock.

### [CRITICAL][data-integrity] Unauthenticated hard delete of any user
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1750
- evidence: const { user_id } = req.body; ... await user.deleteOne(); ... return res.json({ status: true, message: "User deleted successfully", data: user });
- impact: POST /api/deleteUser {user_id} permanently deletes any account. It also leaves orphaned interests, messages, rooms, shortlists and visitors behind, and echoes the full document (including the password hash) in the response.
- fix: Require auth with self-only or admin access. Use soft delete (deletedAt/is_deleted) and exclude soft-deleted users from all queries. Run cascade cleanup in one service shared with admin delete and deleteUsers.js.

### [CRITICAL][infra] Unauthenticated deploy webhook runs git reset --hard and restarts the wrong pm2 name
- where: /var/www/api.banjaramatch.com/index.js:109
- evidence: app.post('/webhook', (req, res) => { ... const cmd = `cd /var/www/api.banjaramatch.com && git reset --hard HEAD && git pull origin main && pm2 restart matrimony-api`;
- impact: Anyone can trigger repeated hard resets and pulls on production, which is a DoS and wipes hotfixes. The pm2 process is actually named 'banjaramatch-api', so the restart step fails and the new code never goes live.
- fix: Verify the GitHub X-Hub-Signature-256 HMAC, deploy through a script with a lock, and use the correct pm2 ecosystem name. The planned monorepo CI/CD should replace this.

### [CRITICAL][security] Admin-only actions exposed on the public user router
- where: /var/www/api.banjaramatch.com/routes/userRoutes.js:88
- evidence: router.post('/banner/add',  UserController.addBanner);
router.post('/user/fake-batch', UserController.createFakeBatch);
router.post('/user/mark-top', UserController.maekusertop);
router.post('/user/unmark-top', UserController.unmarkTopUser);
- impact: Anyone can create banners from an arbitrary req.body (L4184 new Banner(req.body)), insert 30 fake users, or mark themselves as highlighted or top-listed.
- fix: Move these routes under /api/admin with adminAuth, or delete createFakeBatch.

### [HIGH][filter] Blocks are ignored in the main list, daily matches, nearby and trending (wrong block store)
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1891
- evidence: const blockedIds = currentUser.blocked || [];   // but blockUser writes only: const block = new Block({ blocker: my_user_id, blocked: user_id }); (L1633)
- impact: After A blocks B, B still appears in A's /fetchUsersList, getTopDailyMatches (no block filter at all, L3972), fetchNearbyMatches (L3908) and trending (L3715), and vice versa. fetchProfile, sendInterestRequest, visitors and the socket chat have no block check either. Only searchProfiles (L4831) uses the Block collection.
- fix: Write a helper getBlockedIds(userId) that returns Block rows in either direction (blocker=me or blocked=me) and apply it in every list, profile, interest, visitor, notification and chat path. Retire the User.blocked array.

### [HIGH][business-logic] The blocked user can lift a block placed on them
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1640
- evidence: const reverseBlock = new Block({ blocker: user_id, blocked: my_user_id }); ... (unblock L1678) Block.findOneAndDelete({ blocker: my_user_id, blocked: user_id }); ... Block.findOneAndDelete({ blocker: user_id, blocked: my_user_id });
- impact: blockUser writes rows in both directions, so the harasser has their own 'blocker' row and can call /UserUnblockedByUser, which deletes both rows and undoes the victim's block. The harasser also sees the victim listed as 'blocked by me' in fetchBlockedUserList.
- fix: Store a single directional Block row and allow unblock only by the original blocker. Apply exclusion symmetrically at query time instead of inserting reverse rows.

### [HIGH][filter] Opposite-gender rule fails for 'Not specified' users and is missing in nearby matches
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1897
- evidence: gender: { $nin: [myUserGender, null, '', 'Not specified'] }   // getTopDailyMatches L3975: gender: { $ne: currentUser.gender }  // fetchNearbyMatches L3918-3922 query has no gender at all
- impact: Gender defaults to 'Not specified' (User.js L116). Those users get both men and women in lists, and getTopDailyMatches returns the 'Not specified' profiles to everyone. fetchNearbyMatches returns same-gender users. Any user can also switch gender at any time through editProfile.
- fix: Make gender required at onboarding and block list access until it is set. Use an explicit opposite value (Male→Female) and lock gender after the first set, allowing changes only by admin.

### [HIGH][filter] 'Match my preference' returns zero results whenever caste/gotra/qualification/profession prefs are set
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1991
- evidence: if (!myPrefs.caste.includes(otherUser.caste?.toString())) return false;   // otherUser.caste is populated (L1953 populate('... caste gotra profession qualification ...')) so toString() is '[object Object]'; myPrefs.caste holds ObjectIds (lean) so .includes(string) is always false
- impact: Any user who saved partner preferences and turns on matchMyPreference sees an empty list. The same bug affects gotra (L1995), qualification (L2010) and profession (L2014).
- fix: Normalise both sides to string ids (String(x?._id ?? x)), or better, move these filters into the Mongo query ($in with ObjectIds).

### [HIGH][filter] 'Match their preference' is a no-op because preferences are excluded from the query
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1940
- evidence: let query = User.find(baseQuery).select('-preferences');  ...  (L2030) const theirPrefs = user.preferences || {};
- impact: The two-way matching filter has no effect, so users are shown people whose preferences exclude them.
- fix: Select preferences internally for filtering, then strip them from the response.

### [HIGH][filter] Income filters compare a field that does not exist
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1975
- evidence: if (filters.income && user.income !== filters.income) return false;   (also L2017 myPrefs.income, L2057 currentUser.income !== theirPrefs.incomeRange.toString(), L4934)
- impact: The schema only has incomeRange (ObjectId), so any income filter removes every profile.
- fix: Filter on incomeRange ids, or on an ordinal from IncomeRange.sortOrder for 'at least X' semantics.

### [HIGH][business-logic] No same-gotra exclusion (gotra exogamy) anywhere server-side
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:4004
- evidence: if (user.preferences?.gotra?.length && user.preferences.gotra.includes(currentUser.gotra?._id?.toString())) { score += 10; reasons.push("gotra match"); }   // website: banjara-gotra-list.ejs:50 "Same-gotra marriage is strictly forbidden"
- impact: Lists, search and daily matches show same-gotra profiles, and daily matches score them higher. The schema has no mother's gotra field, so maternal-gotra exclusion cannot be done either. This contradicts the site's own published rule.
- fix: Add a gotra $ne myGotra rule to every match query, with an optional user toggle and admin config. Add family.motherGotra (and optionally dadi/nani gotra) to the schema and onboarding, and exclude those as well.

### [HIGH][business-logic] Membership gating and expiry are not implemented
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3006
- evidence: const expiryDate = new Date(); expiryDate.setDate(startDate.getDate() + plan.duration_days); user.membershipPlan = plan._id; await user.save();  // Free plan features: ['Limited profile views', 'Cannot send interest', 'Cannot view contact'] (L3052) but sendInterestRequest has no plan check
- impact: Plans never expire: no membershipExpiresAt is stored and nothing checks one. Free users can send unlimited interests, see contact details whenever the owner marked them public, and chat. The privacyLockedOnly masking (L2161) only applies when the client asks for it.
- fix: Add membership {plan, startedAt, expiresAt} to User. Write a requirePlan(feature) helper and use it in sendInterest, contact reveal and chat start, plus a daily interest quota.

### [HIGH][business-logic] Photo-view counters and privacy settings are never enforced
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1207
- evidence: profile.remainingProfileImageView = remainingViews || { remainingViews: 0, restrictionStatus: false };   // grep: no create/decrement of RemainingProfileImageView anywhere; no reads of profilePicVisibility/allowConnections/allowMessages/showIncome/showLocation
- impact: Settings such as profilePicVisibility 'onlyPremium' or 'nobody' (User.js L394-409) do nothing. Photos are returned in every list (profile field) and through /getUserPhotos {user_id} with no auth. Any limit is purely cosmetic in the client.
- fix: Enforce these settings on the server in one serializer (serializeProfileFor(viewer, profile)), or drop the dead model and settings.

### [HIGH][business-logic] sendInterestRequest: no self, block, banned-target or rate checks
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:2411
- evidence: const { my_user_id, user_id } = req.body; const user = await User.findById(my_user_id); const matchUser = await User.findById(user_id); ... const interestRequest = new FriendShipRequest({ requester: my_user_id, recipient: user_id, status: 'pending' });
- impact: A user can send an interest to themselves, to blocked users, to admin-banned (is_block=1) or same-gender users, without limit. Each one sends a push, an email and a Notification, so it can be used to spam.
- fix: Reject self, block in either direction, target.is_block, same gender, and allowConnections violations. Add a per-day quota by plan.

### [HIGH][business-logic] Admin-banned users (is_block=1) keep full access
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:982
- evidence: User.findOne({ _id: profileId })   // no is_block filter; AuthController has no is_block check (grep returned nothing)
- impact: Banned accounts can still log in, view profiles and chat. Their profiles also show through fetchProfile, interest lists, visitors and trending (fetchUsersByIds L3720 has no is_block filter).
- fix: Reject is_block users in authenticate/login and filter is_block:0 in every profile lookup.

### [MEDIUM][filter] Pagination: everything loaded into memory, limit uncapped, string limit breaks the slice, unstable sort
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:2101
- evidence: const start = (page - 1) * limit;
const result = users.slice(start, start + limit);   // limit from req.body not parsed; score sort L2093-2097 uses isOnline/now
- impact: If limit arrives as a string ('10'), start + limit becomes the string '1010' on page 2, which returns almost every remaining user. There is no maximum limit. The score depends on isOnline and the current time, so users shift between pages, causing duplicates or skipped profiles. Cost is O(all users) per request.
- fix: parseInt and clamp page and limit (max 50). Push filters into the Mongo query with a deterministic sort (score field, _id) and use skip/limit or cursor pagination.

### [MEDIUM][filter] Age and height filter inconsistencies
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:1849
- evidence: const getAge = (dob) => { if (!dob) return 0; ... Math.floor(ageDiff / (1000 * 60 * 60 * 24 * 365.25)); };  // L1971 user.height !== null && (...) passes null heights; searchProfiles L4931 user.heightInInches < min excludes null heights
- impact: Ages are off by one near birthdays. Users with no DOB have age 0 and vanish under any age filter. Users with no height pass the filter in /fetchUsersList but fail it in /searchProfiles. In searchProfiles, 'heightInInches' actually holds cm. There is no minimum-age (18/21) rule on DOB, and age_range min > max is accepted.
- fix: Use the existing calculateAge (L2216) or a $dateDiff query on dob. Handle missing values the same way everywhere. Validate DOB (legal age) and the range order in editProfile.

### [MEDIUM][business-logic] getTopDailyMatches scoring uses fields that do not exist
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3985
- evidence: if (currentUser.age && user.preferences?.age_range) {...}  /  user.preferences.qualification === currentUser.qualification  /  user.preferences?.occupation  /  user.preferences?.religion
- impact: age is not in the schema (editProfile's user.age at L272 is dropped by strict mode), qualification is an array compared with ===, and occupation and religion do not exist. So the 'AI' score is mostly shared interests plus same city. It also ignores blocks, own gotra and existing connections.
- fix: Rebuild it on the shared match-query builder with correct id comparisons.

### [MEDIUM][business-logic] Trending categories query non-existent fields
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:3814
- evidence: is_active: true,   (L3814, L3832, L3850)  lastLoginAt: { $gte: sinceDate }  (L3830)  is_featured: true  (L3848)
- impact: 'New Members', 'Active Users' and 'Featured' are always empty. 'Most Viewed' can be inflated by refreshing a profile, because every fetchProfile does $inc count (L1114).
- fix: Use createdAt, lastSeen and is_highlighted, and dedupe views per viewer per day.

### [MEDIUM][security] Regex injection / ReDoS in public lookup endpoints
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:5133
- evidence: const fuzzyPattern = normalized.split('').join('.*'); return new RegExp(fuzzyPattern, 'i');   // countries/states/cities: name: { $regex: search, $options: 'i' } (L3573, L3596, L3677)
- impact: A long crafted search string makes a pattern like a.*a.*a.*… that backtracks heavily and pins Mongo or Node CPU. Metacharacters also throw errors, which return 500.
- fix: Escape user input (escapeRegExp), cap its length (e.g. 40), and prefer prefix or text indexes.

### [MEDIUM][perf] Unbounded log/notification growth; SearchLog records impressions, not searches
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:4971
- evidence: await Promise.all( paginated.map(u => SearchLog.create({ searcher: userId, target: u._id })) );  ... if (count >= 3) { ... Notification.create({ type: 'profile_search_alert' ...
- impact: Every search page view logs one row per result and can push 'N people searched for your profile' to users who just appeared in a list. RecentVisitor, ActivityLog (socket.js L69, on every join), SearchLog and Notification have no TTL index. That explains 9333 searchlogs and 2609 notifications for 320 users.
- fix: Add TTL indexes (e.g. 90 days for SearchLog and ActivityLog, 180 days for read notifications) and unique (visitor, visited) on RecentVisitor. Log only explicit searches.

### [MEDIUM][perf] getMatchMomentum runs 4 queries per user in the database, unauthenticated
- where: /var/www/api.banjaramatch.com/controllers/UserController.js:4450
- evidence: const scores = await Promise.all(userIds.map(async (u) => { const [v, i, r, s] = await Promise.all([ RecentVisitor.countDocuments(...), FriendShipRequest.countDocuments(...), ...
- impact: One request makes 4×N database calls (about 1280 now). A few concurrent calls can saturate Mongo. Combined with the 150mb body limit (index.js L64-66) and no rate limiting, the API is easy to DoS.
- fix: Use a single aggregation with $group, cache it daily, add express-rate-limit, and reduce the body limit.

### [MEDIUM][dead-code] Background jobs never run; second-chance flow is broken
- where: /var/www/api.banjaramatch.com/schedular/schedular.js:6
- evidence: cron.schedule('*/15 * * * *', async () => { ... await runInterestMonitor();   // grep: schedular is not required by index.js and has no pm2 process; rejectFriendRequest (only SecondChanceQueue writer) is not routed and stores profileId: user_id where user_id is the request _id (UserController L1711, L1729)
- impact: The interest-monitor and second-chance features are dead. detectHighInterestSignal references an undefined user_id (L4740) and would throw if routed.
- fix: Either wire the scheduler into the API process (single instance) or delete it, and fix or remove the second-chance code.

### [MEDIUM][data-integrity] FriendshipRequest has no timestamps; updatedAt never changes on accept or reject
- where: /var/www/api.banjaramatch.com/models/FriendShipRequest.js:7
- evidence: updatedAt: { type: Date, default: Date.now },   // no { timestamps: true }; status enum ["pending","accepted","rejected"] while searchProfiles queries 'cancelled' (UserController L4834)
- impact: getInterestList is sorted by updatedAt (L2570) and the 'New Match' times (L1450) reflect creation, not acceptance. Two users sending each other interests at the same moment can create two reverse pending rows (the check-then-insert race at L2424-2469).
- fix: Turn on timestamps, and add a canonical pair key (sorted ids) with a unique index.

### [MEDIUM][security] Auth cookie readable by JS; JWT secret has a hard-coded fallback
- where: /var/www/api.banjaramatch.com/controllers/AuthController.js:34
- evidence: httpOnly: false, // Allow JavaScript access   ...   const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';  (L7, authMiddleware.js L3)
- impact: Any XSS on *.banjaramatch.com can steal sessions. If .env is missing, tokens can be forged with a public string (.env currently does define JWT_SECRET).
- fix: Set httpOnly:true and fail fast if JWT_SECRET is unset.

### [MEDIUM][data-integrity] PII and password hashes committed in git; boot-time data mutation hard-coded with a phone number
- where: /var/www/api.banjaramatch.com/restoreUsers.js:21
- evidence: email: 'e@gmail.com',
    password: '$2b$10$vpJuh.jTYwzTqCeV1Ut5weQqDUX3m9y//gj9MjedF2kBlErXPKAva',  ... phone: '9876543211',   // index.js L102: await  User.updateOne({ phone: '8087439035' }, { $set: { gender: 'Male' } });
- impact: restoreUsers.js, serviceAccountKey.json and socialmedia-sa.json.backup are tracked in git (pushed to github adinayak10/matrimony-api) and expose member PII, bcrypt hashes and Firebase admin credentials. Every API boot also rewrites one member's gender.
- fix: Remove these files from the repo and history, rotate the Firebase service account, and move one-off data fixes to migrations.

### [LOW][data-integrity] deleteUsers.js uses the wrong field names, leaving orphaned photos and search logs
- where: /var/www/api.banjaramatch.com/deleteUsers.js:80
- evidence: const userPhotosResult = await UserPhoto.deleteMany({ user: objectId });  ...  (L180) SearchLog.deleteMany({ userId: objectId });   // UserPhoto field is userId; SearchLog fields are searcher/target
- impact: Photos (and files on disk) and search logs of deleted users stay behind. The admin delete has the same issue with RemainingProfileImageView.deleteMany({ userId: id }) (admin/userController.js L391).
- fix: Use one shared cascadeDeleteUser(userId) service with the correct fields.

### [LOW][business-logic] accept_chat / decline_chat socket events have no authorization
- where: /var/www/api.banjaramatch.com/socket.js:293
- evidence: socket.on('accept_chat', async ({ roomId }) => { const room = await ChatRoom.findByIdAndUpdate(roomId, { status: 'accepted' }, { new: true });
- impact: Any socket can accept or decline any pending chat room by id.
- fix: Check that socket.userId is the room's non-initiating participant.

## inventory
- API mount: index.js L82-94; userRoutes mounted at /api (no global auth). Only /api/fetchProfile uses authenticate; /api/assignMembership uses adminAuth.
- Matching endpoints: POST /api/fetchUsersList (fetchUsersListWithFilters L1856), /api/searchProfiles (L4805), /api/getTopDailyMatches (L3959), /api/fetchNearbyMatches (L3892), /api/fetchTrendingProfiles (L3705), /api/fetchRandomProfile (L802), /api/fetchLiveActivity (L1318), /api/comparePreferencesFit (L5252), /api/compatibility/guna-milan
- Interest endpoints: /api/sendInterestRequest L2409, /acceptInterestRequest L2681, /rejectInterestRequest L2858, /cancelInterestRequest L2795, /removeConnection L2904, /getInterestList L2535 (model FriendshipRequest, collection friendshiprequests)
- Block endpoints: /api/UserBlockedByUser L1610, /UserUnblockedByUser L1661, /fetchBlockedUserList L1560 (Block collection); legacy User.blocked array read by list/daily/nearby/trending
- Visitor: RecentVisitor upsert in fetchProfile L1112; /api/getProfileVisitorSummary L3426
- Chat: /api/fetchMessages L3285 (no participant check), /fetchUserRooms L3100, /fetchOrGenerateRoom L3322, /deleteRoom L5486; socket events join/send_message/mark_seen/accept_chat/decline_chat in socket.js
- Unauthenticated admin-ish routes in userRoutes.js L88-91: /banner/add, /user/fake-batch, /user/mark-top, /user/unmark-top
- Auth routes (routes/authRoute.js): /api/auth/verify-otp (OTP check disabled), /firebase-login, /firebase-register, /complete-profile (no token verification), /verify-otp-with-name (verifies Firebase token, correct pattern)
- JWT: 7d, payload {_id,email}; cookie 'token' domain .banjaramatch.com httpOnly:false (AuthController L13-43)
- User schema fields: gender enum ['Male','Female','Not specified'] default 'Not specified'; dob Date optional; gotra ObjectId optional; no mother gotra; no membership expiry; is_block Number (admin ban); is_verified Number; preferences.{caste,gotra,qualification,profession}[] ObjectId; preferences.age_range/height_range numbers
- Membership plans: MembershipPlan names Free/Silver/Gold/Platinum, duration_days stored on the plan only; premium check = ['Silver','Gold','Platinum'].includes(plan.name)
- Unique indexes: User.email/phone/firebase_uid unique sparse; Shortlist (userId,shortlistedUserId); Block (blocker,blocked); FriendshipRequest (requester,recipient); no TTL indexes on RecentVisitor/SearchLog/ActivityLog/Notification
- Scheduler: schedular/schedular.js (node-cron) is not required anywhere and has no pm2 process, so it never runs
- pm2 names: banjaramatch-api (/var/www/api.banjaramatch.com/index.js), banjaramatch-web, banjaramatch-admin; webhook restarts the non-existent 'matrimony-api'
- Git: api repo remote git@github.com:adinayak10/matrimony-api.git; tracked sensitive files: restoreUsers.js, serviceAccountKey.json, socialmedia-sa.json.backup, config.json
- Web server calls API server-side with body my_user_id and no Authorization header (banjaramatch.com/routes/index.js L746-850); Flutter web_service.dart sends Authorization: Bearer
- Mongoose ^8.16.0, express ^4.17.1, socket.io ^4.1.2; no express-rate-limit/helmet; body limit 150mb
- Runtime errors seen in pm2 logs: CastError for user_id "0" in getUserOnlinePattern/getMatchMomentum/getMarriageIntent/getUserPhotos/editProfile (client sends '0' before login)

## reusable
- /var/www/api.banjaramatch.com/middleware/authMiddleware.js authenticate(): JWT from cookie or Bearer; apply router-wide and derive the user from req.user._id
- /var/www/api.banjaramatch.com/middleware/adminAuth.js adminAuth(): role check; reuse for banner/fake-batch/mark-top routes
- /var/www/api.banjaramatch.com/controllers/UserController.js L29 applyPrivacySettings(profile, viewerId): starting point for a single serializeProfileFor(viewer, profile)
- /var/www/api.banjaramatch.com/controllers/UserController.js L2216 calculateAge(dob): correct birthday-aware age (replace the 365.25 getAge copies at L1849 and L4890)
- /var/www/api.banjaramatch.com/controllers/UserController.js L4830-4846 searchProfiles exclusion set (Block + connections): pattern for a shared getExcludedIds(userId); extend to both block directions
- /var/www/api.banjaramatch.com/controllers/UserController.js L4871 searchProfiles projection: closest thing to a safe public-profile field list
- /var/www/api.banjaramatch.com/controllers/UserController.js L5286 checkArrayMatch: id comparison that handles populated and raw ObjectIds; reuse to fix the preference filters
- /var/www/api.banjaramatch.com/controllers/AuthController.js L986-1060 verifyFirebaseOtp / verifyFirebaseOtpWithName: correct verifyIdToken + phone match pattern to replace the unsafe login routes
- /var/www/api.banjaramatch.com/utils/gunaMilanTable.js computeGunaMilan: horoscope compatibility already isolated
- /var/www/api.banjaramatch.com/deleteUsers.js deleteUserCompletely(): skeleton of a cascade delete (fix field names, then share with admin/userController.js and /deleteUser)
- /var/www/api.banjaramatch.com/models/Gotra.js + Clan.js: gotra→clan mapping available for same-gotra and same-clan exclusion rules

## open_questions
- Gotra rule scope: exclude only the user's own (paternal) gotra, or also mother's / dadi's / nani's gotra? Should exclusion be mandatory or a user toggle? Should the same clan (Gor) also be excluded?
- Membership product rules: what exactly should Free vs Silver/Gold/Platinum gate (interests/day, contact reveal, photo views, chat initiation)? Is there any payment integration, or is the plan only admin-assigned via assignMembership?
- Should profiles with gender 'Not specified', no DOB, or no photo be hidden from matching until onboarding is complete? (Current completion logic is cosmetic only.)
- Delete semantics: should user deletion be soft delete (recoverable, hidden) or hard cascade? restoreUsers.js suggests past accidental deletions.
- Does the Flutter app version in production send the Bearer token on every /api/* call (web_service.dart suggests yes)? Adding authenticate needs coordinated web server-side token forwarding to avoid breaking production.
- Are /api/auth/verify-otp, /firebase-login and /complete-profile still used by the shipped app build? Removing or hardening them may need a forced app update (settings.apk.isMandatoryUpdate).
- Should the 'X people searched for your profile' and visitor notifications be kept? They are currently driven by list impressions, not real searches.
