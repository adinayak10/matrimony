# gap:web-unread-pages-and-assets

## summary
I read every file on the list in full: the 14 EJS pages, 5 partials, biodata-builder.html, custom.js, mail.js, gallery.js, models/Contact.js, optimize-images.sh, jsconfig.json and the .env key names. I also read app.js, the relevant parts of routes/index.js, and the API routes and controllers the public forms call. All link and metadata checks below were confirmed with curl GET requests against production. The web app opens no Mongo connection: there is no mongoose dependency and models/Contact.js is never required, so it is dead code. The five most serious findings are: (1) the API .env sets JWT_SECRET to the public placeholder 'your_jwt_secret', and the web app falls back to the same literal, so anyone can forge user or admin tokens. (2) The community-feedback API has no auth on GET or PUT, so anyone can read submitters' emails and messages and change a feedback's status. Combined with the public page putting contributor.name into innerHTML unescaped, and the login token cookie being readable by JavaScript, this allows stored XSS on www. (3) The Child Safety (CSAE) report form posts to /api/feedback/submit, which does not exist in the API. (4) Any non-whitelisted Origin header gets HTTP 500, because the cors callback throws and there is no error handler; Google Translate proxy origins and admin.banjaramatch.com are affected (confirmed with curl). (5) Registration conversions are counted 2-3 times in Google Ads and GA4. The legal pages Play Store reviewers read have a placeholder phone number (+91-9876-543-210), a Grievance Officer listed as '[To be appointed]', five different contact emails, references to 'Only Premium' settings and 'without refund' on a site sold as 100% free, and deletion timelines that contradict each other. analytics.ejs ignores REQUIRE_COOKIE_CONSENT and ANONYMIZE_IP, and ENABLE_ANALYTICS cannot switch tracking off in production. There is no cookie banner, and 16 templates (including the 4 legal pages and the 404 page) have no analytics. SEO problems: /account-deletion is titled 'Wedding Matrimony' with no description or canonical; H1s on the Lambadi and Gormati pages do not contain the target 'X matrimony' phrase; several titles run 67-87 characters; blog cards on 3 landing pages render no image and an empty '...' excerpt; unknown /blogs/:category URLs return 200 with a self-canonical (soft 404); robots.txt Disallow: /*.html stops Google from following the legacy 301s. optimize-images.sh has only been partly applied (14 webp files vs 137 jpg/png); it calls sudo apt-get and overwrites the originals.

## findings (31)

### [CRITICAL][security] API uses the public default JWT secret 'your_jwt_secret'; web also falls back to it
- where: /var/www/banjaramatch.com/routes/index.js:7
- evidence: routes/index.js:7 `const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';` ; web .env keys are only GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT (no JWT_SECRET) ; `grep -cx 'JWT_SECRET=your_jwt_secret...' /var/www/api.banjaramatch.com/.env` -> 1 ; api middleware/adminAuth.js:4 `const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';`
- impact: The secret is shown in the source code. Anyone can sign a JWT for any userId, or an admin token (adminAuth uses the same secret), and take over accounts or the admin API. Signing tokens is the only step needed.
- fix: Generate a random 64-byte secret, set it in the API .env and the web .env, and remove the `|| 'your_jwt_secret'` fallbacks so the apps refuse to start without it. Rotating the secret logs everyone out, which is acceptable. Prefer separate secrets for user tokens and admin tokens.

### [CRITICAL][security] Community feedback API has no auth on GET/PUT (marked 'Admin only') and leaks PII; public page renders names unescaped (stored XSS)
- where: /var/www/banjaramatch.com/views/pages/community-feedback.ejs:589
- evidence: api routes/authRoute.js:44-45 `router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only` / `router.put('/community-feedback/:feedbackId', ...updateFeedbackStatus); // Admin only` ; unauthenticated GET ?limit=2 returned status true with keys [category, createdAt, email, followUp, message, name, priority, status, subject...] ; community-feedback.ejs:589-590 `title="${contributor.name}">\n ${contributor.name}` injected via contributorsGrid.append(html) ; register.ejs:308 `document.cookie = `token=${data.token}; path=/; ... domain=.banjaramatch.com; SameSite=Lax`` (not HttpOnly)
- impact: Anyone can download every feedback submitter's name, email and message. An attacker can submit feedback with name `<img src=x onerror=...>`, then call the unauthenticated PUT to set status=completed. The payload then runs for every visitor of www.banjaramatch.com/community-feedback and can read the JS-readable `token` cookie, giving account takeover.
- fix: Add the adminAuth middleware to GET and PUT. Add a separate public endpoint that returns only first name and category for completed items. On the page, build the cards with textContent instead of innerHTML. Issue the token as an HttpOnly, Secure cookie from the server.

### [CRITICAL][compliance] Child Safety (CSAE) report form posts to an API route that does not exist
- where: /var/www/banjaramatch.com/views/pages/child-safety-policy.ejs:512
- evidence: child-safety-policy.ejs:512 `url: 'https://api.banjaramatch.com/api/feedback/submit',` ; api index.js mounts only /api/contact, /api/beta-tester, /api/auth, ... (no /api/feedback) ; `grep -rln feedback` in api -> only routes/authRoute.js, CommunityFeedbackController.js, CommunityFeedback.js
- impact: Every CSAE/CSAM report a user submits fails (404) and the user sees 'Failed to submit report'. Google Play's Child Safety Standards policy requires a working in-app or web reporting mechanism, so this is a Play Store compliance risk, and real child-safety reports are being lost.
- fix: Point the form at an existing endpoint (POST /api/auth/community-feedback with category 'child_safety') or create /api/feedback/submit. Add an email alert to the safety contact, and add an automated check that POSTs a test report after each deploy.

### [HIGH][infra] Any non-whitelisted Origin header causes HTTP 500 on every route (no error handler)
- where: /var/www/banjaramatch.com/app.js:49
- evidence: app.js:45-49 `if (!origin || allowedOrigins.includes(origin)) { return callback(null, true); } else { ... return callback(new Error('CORS not allowed from this origin: ' + origin), false);` ; only handler app.js:181 `app.use((req, res) => { res.status(404)...` ; curl -H 'Origin: https://evil.example' / -> 500 'Internal Server Error'; Origin https://www-banjaramatch-com.translate.goog /faq -> 500; Origin https://admin.banjaramatch.com -> HTTP/2 500; /css/style.css with foreign Origin -> 500
- impact: Pages and assets return 500 for Google Translate users (common for Telugu and Hindi readers), for crossorigin font/script requests from other hosts, and for the admin subdomain. This hurts availability and fills the logs with errors. allowedOrigins also lists www twice and leaves out admin.
- fix: For page/static routes, call callback(null, false) instead of passing an Error, or apply cors() only to /api/*. Add a final error-handling middleware `(err, req, res, next)` that renders a branded 500 page. Add admin.banjaramatch.com to the allowed list if it is needed.

### [HIGH][compliance] Legal pages show placeholder phone numbers, no named Grievance Officer, and five different contact emails
- where: /var/www/banjaramatch.com/views/pages/privacy-policy.ejs:340
- evidence: privacy-policy.ejs:340 `<strong>Phone:</strong> +91-9876-543-210<br>` ; :352 `Name: [To be appointed]<br>` ; :339 privacy@ ; :353 grievance@ ; :362 dpo@ ; terms-conditions.ejs:485 `Phone: +91-9876-543-210<br>` ; :312 help@ ; :483 support@ ; child-safety-policy.ejs:187,409 info@ ; account-deletion.ejs:45 support@ ; biodata-builder.html:483 `+91 1234567890` ; footer.ejs:7 info@
- impact: Play Store reviewers and users see placeholder contact details. The IT (Intermediary Guidelines) Rules 2021 require a named Grievance Officer. Users do not know which email reaches the company, and unmonitored aliases (dpo@, grievance@, privacy@) may bounce, which undermines trust and the Play listing's support contact.
- fix: Choose one real support email and one child-safety/grievance contact. Name the Grievance Officer, state the legal entity name and address, and remove placeholder numbers or replace them with a real one. Put these in a single shared partial (e.g. partials/legal-contact.ejs) so all legal pages stay consistent.

### [HIGH][compliance] Legal text contradicts the 'free' product and the deletion process
- where: /var/www/banjaramatch.com/views/pages/terms-conditions.ejs:327
- evidence: terms:121 `immediately terminate your membership without refund` ; terms:327 `deactivate all duplicate profiles without any refund of subscription fees` ; privacy:162 `Everyone, Only Premium, Only Accepted Connections, or Nobody` ; privacy:244 `Most personal information will be deleted within 30 days` vs account-deletion.ejs:47 `We will process your request within 7 business days` ; privacy:277 `Delete your account from account settings` but views/pages/user-setting.ejs contains no delete-account UI (grep 'delete.*account' -> no match); account-deletion.ejs:45 deletion only via email
- impact: Play Data-safety and deletion-policy review checks that the policy matches what the app actually does. Mentions of subscriptions, refunds and 'Premium' contradict the 'free forever' marketing. Users are told to delete from settings, but no such option exists on the web.
- fix: Rewrite the terms and privacy policy for a free service and remove refund/premium wording. Use one deletion SLA everywhere. Either build self-service deletion in settings (web and app) or remove the claim. Link the /account-deletion URL from the footer.

### [HIGH][compliance] Privacy policy omits precise GPS location and Google Ads tracking; no cookie consent
- where: /var/www/banjaramatch.com/views/pages/privacy-policy.ejs:88
- evidence: privacy:88 `<strong>Location Data:</strong> City, state, country of residence` vs features.ejs:438 `BanjaraMatch uses real GPS coordinates stored on each profile` ; analytics.ejs:42 `gtag('config', 'AW-357336842', {'allow_enhanced_conversions': true` ; analytics.ejs:50 `'user_id': '<%= user._id %>'` ; grep for cookie-consent/cookieConsent in views & custom.js -> no matches
- impact: Data collection is under-disclosed (precise location, ad conversion tracking, user_id sent to Google). This creates Play Data-safety mismatch risk and DPDP Act exposure. Advertising cookies are set without consent, even though privacy:256 says '(with consent)'.
- fix: List precise location, Firebase Auth, GA4 and Google Ads in the policy. Add a consent banner that gates analytics.ejs (gtag consent mode default 'denied') and actually read REQUIRE_COOKIE_CONSENT.

### [HIGH][business-logic] Registration conversions fire 2-3 times (inflates Google Ads and GA4, distorts bidding spend)
- where: /var/www/banjaramatch.com/views/pages/thank-you.ejs:41
- evidence: register.ejs:311-312 `window.trackRegistrationConversion();` (fires AW-.../3N9aCIbm68obEIqOsqoB and AW-.../q-YJCIvsq8obEIqOsqoB without transaction_id + generate_lead + sign_up) ; register.ejs:317 another `gtag('event', 'sign_up'` ; then :327 `window.location.href = '/thank-you'` where thank-you.ejs:41-67 fires both AW conversions again + sign_up + generate_lead ; login.ejs:620-623 same pattern ; routes/index.js:498-508 `if (!req.session) { req.session = {}; }` (no session middleware in app.js/package.json, so the server-side once-only guard never persists)
- impact: Each signup is reported as 2 Ads conversions and 3 sign_up / 2 generate_lead events. Smart Bidding over-values clicks and overspends the budget, and funnel reports are wrong. Any logged-in user who opens /thank-you in a new tab fires the conversions again.
- fix: Fire conversions in one place only (thank-you.ejs, with transaction_id = userId on every event). Remove the trackRegistrationConversion and extra sign_up calls in register/login. Enforce show-once with a server-side flag on the user (e.g. thankYouShownAt) rather than a fake req.session.

### [HIGH][security] ensureAuth writes full JWTs and user profile responses to pm2 logs
- where: /var/www/banjaramatch.com/routes/index.js:151
- evidence: routes/index.js:151 `console.log('[ensureAuth] Token from cookie:', token);` ; :160 `console.log('[ensureAuth] JWT decoded:', decoded);` ; :166 `console.log('[ensureAuth] /me response:', data);`
- impact: Every authenticated page view writes a valid bearer token (7-day life) and the user's PII to ~/.pm2/logs. Anyone with log access, or any log shipping, can replay those sessions.
- fix: Remove these logs or log only the userId behind a DEBUG flag, then rotate or purge the existing pm2 logs.

### [MEDIUM][security] Unauthenticated POST /api/regenerate-sitemap on the public website
- where: /var/www/banjaramatch.com/routes/index.js:1209
- evidence: routes/index.js:1209 `router.post('/api/regenerate-sitemap', async (req, res) => {` ; nginx sites-available/banjaramatch.com only has `location / { proxy_pass http://localhost:4000;` ; error branch returns `error: error.message`
- impact: Anyone on the internet can trigger repeated sitemap regeneration, which fans out to many API calls and file writes (cheap DoS). Error messages are also leaked.
- fix: Require a shared secret header (the API already calls it via SITEMAP_REGEN_URL/FRONTEND_URL), or bind it to localhost only. Block /api/regenerate-sitemap in nginx.

### [MEDIUM][business-logic] Public forms have no captcha, honeypot or rate limit; beta form promises an email that is never sent
- where: /var/www/banjaramatch.com/views/pages/beta-tester.ejs:396
- evidence: contact.ejs:245 POST `${API_URL}/api/contact/submit` (client checks: emailRegex, 10-digit phone) ; community-feedback.ejs:433 POST `https://api.banjaramatch.com/api/auth/community-feedback` (HTML required only) ; beta-tester.ejs:545 POST `/api/beta-tester/submit` ; `grep rateLimit|express-rate-limit api index.js package.json` -> no matches ; beta-tester.ejs:396-397 `Download Link Sent! ... we've sent you the direct download link` but api BetaTesterController.submitApplication (lines 6-75) saves only and sends no email ; beta-tester.ejs:500 GET /api/beta-tester/stats is `router.get('/stats', adminAuth, ...)` -> public returns 'Access denied' so the 15-slot cap never applies
- impact: Bots can flood the contact/feedback/beta collections and admin inboxes. Beta applicants are told to check their email for a link that never arrives. The 'slots available' badge always shows 'Limited', and the cap is enforced neither on the client nor on the server.
- fix: Add express-rate-limit on the public POST routes, plus a honeypot field and Turnstile/reCAPTCHA. Either send the APK link email (or show the link directly) or change the copy. Expose a public read-only count endpoint and enforce the cap on the server.

### [MEDIUM][seo] /account-deletion has template title 'Wedding Matrimony', empty description, no canonical, no analytics
- where: /var/www/banjaramatch.com/views/pages/account-deletion.ejs:11
- evidence: account-deletion.ejs:11 `<title>Wedding Matrimony</title>` ; :17 `<meta name="description" content="">` ; no rel=canonical (live curl canon=empty) ; :71 `<script src="js/jquery.min.js"></script>` (relative) ; route passes title 'Account & Data Deletion Request - Banjara Match' which the view ignores
- impact: This is the URL submitted to Play Console as the data-deletion page. It looks unprofessional in search results and on review, and leftover theme branding is visible.
- fix: Use the shared head partial with the route-supplied title and description, add a canonical, and switch to absolute /js paths.

### [MEDIUM][seo] Target keywords missing from H1s; several titles too long; route titles ignored
- where: /var/www/banjaramatch.com/views/pages/lambadi-matrimony.ejs:217
- evidence: Live H1s: /lambadi-matrimony 'Find Your Lambadi Life Partner From Telangana, AP...' ; /gormati-matrimony 'Find Your Gormati Life Partner From Maharashtra...' ; /features 'Every Feature. Always Free. Smarter Than Any Other Matrimony Site.' ; /faq 'Frequently Asked Questions'. Titles: features 80 chars, banjara-community-history 87, community-feedback 76, child-safety 69, biodata-builder 69. features.ejs:4 hard-codes the title while routes/index.js:326 passes a different one
- impact: The pages ranking for 'lambadi/gormati/banjara matrimony' lack the exact phrase in the H1, and long titles get truncated in SERPs. Titles are duplicated between route and view, so edits in one place do nothing.
- fix: H1s: 'Lambadi Matrimony – Find Lambadi Brides & Grooms', 'Gormati Matrimony – ...', 'Banjara Matrimony Features'. Keep titles at 60 characters or fewer and render `<title><%= title %></title>` from the route through one shared head partial.

### [MEDIUM][ui] Blog cards on the Lambadi, Gormati and History pages show no image and an empty '...' excerpt (wrong field names)
- where: /var/www/banjaramatch.com/views/pages/lambadi-matrimony.ejs:489
- evidence: lambadi:489 `<% if (blog.image) { %>` and :495 `<%= (blog.excerpt || '').substring(0, 100) %>...` ; same in gormati-matrimony.ejs:348,352 and banjara-community-history.ejs:725,729 ; API /api/blogs/featured returns `featuredImage` and `description` ; live: images/blog/blog- count = 0 and empty '...</p>' x3 on all three pages vs faq.ejs:212 uses blog.featuredImage (3 images rendered)
- impact: The related-article sections on the top-ranking landing pages look broken and pass no image or description signals.
- fix: Use the existing partials/blog-section.ejs (already mapped to featuredImage and description), or a shared blog-card partial, on every page.

### [MEDIUM][data-integrity] Contradictory or unverifiable marketing claims across pages
- where: /var/www/banjaramatch.com/views/pages/features.ejs:258
- evidence: features:258 `10,000+` 'Verified Profiles' vs lambadi:229 / gormati:185 `5000+` 'Registered Members' ; faq:66 JSON-LD 'free mobile app for Android and iOS' vs features:576 'iOS version is coming soon' and no play.google.com link in any view (app page links api.banjaramatch.com/api/download-apk) ; features:417 'Our real-time messaging is end-to-end' ; child-safety:242 'Government ID verification for profile activation', :276 'PhotoDNA hash matching', :285 '24/7 moderation team' ; lambadi:246 '1 crore' vs history:69 '3 crore'
- impact: Conflicting numbers and features that do not exist (an iOS app, E2E encryption, PhotoDNA, mandatory ID checks) are misleading-advertising and Play policy risks. FAQ structured data asserts a false iOS claim.
- fix: Audit every claim against what is actually built. Use one source of truth for stats, e.g. a live count from the API or a constants file rendered in a partial.

### [MEDIUM][seo] Banjara Community History has likely factual errors about named public figures
- where: /var/www/banjaramatch.com/views/pages/banjara-community-history.ejs:591
- evidence: history:591-603 lists 'Seethakka (Danasari Anasuya)' MLA, 'Bandaru Dattatreya' and 'Sushilkumar Shinde' as 'Famous Banjara Personalities' ; :372 same in timeline ; :391 'States with ST Status ... Maharashtra · MP · Rajasthan · Gujarat'
- impact: These people are widely documented as belonging to other communities, and Banjara are not ST in Maharashtra. Errors on a YMYL-adjacent cultural page undermine E-E-A-T and community trust, and the page is in Article and FAQ schema.
- fix: Have a community expert fact-check the page, cite sources, remove unverifiable people, and add an author byline.

### [MEDIUM][seo] Unknown /blogs/:category URLs return 200 with a self-canonical (soft 404); canonical contains a raw space
- where: /var/www/banjaramatch.com/routes/index.js:566
- evidence: curl /blogs/nonexistentcat -> 200, `<title>Nonexistentcat Articles - BanjaraMatch Blog</title>` `<link rel="canonical" href="https://www.banjaramatch.com/blogs/nonexistentcat">` ; /blogs/success%20stories canonical `href="https://www.banjaramatch.com/blogs/success stories"`
- impact: Infinitely many indexable thin pages, plus a spam vector (arbitrary text in the title). The invalid canonical URL is ignored by Google.
- fix: Whitelist categories from the API and return 404 otherwise. Slugify categories (success-stories) and keep 301s from the old URLs.

### [MEDIUM][seo] robots.txt blocks the .html URLs that 301 to clean URLs
- where: /var/www/banjaramatch.com/robots.txt:42
- evidence: robots.txt (Googlebot group) `Disallow: /*.html` ; app.js:67-111 htmlRedirectMap 301s every legacy .html
- impact: Google cannot crawl the legacy URLs to see the 301s, so old indexed .html URLs keep their equity and linger as 'Indexed, though blocked by robots.txt'.
- fix: Remove Disallow: /*.html (the 301s already prevent duplicates). Also make the Bingbot and Yandex groups consistent; they block /register while Googlebot allows it.

### [MEDIUM][perf] Full-screen white preloader hides content until jQuery and custom.js run, plus a 350 ms delay and fade
- where: /var/www/banjaramatch.com/views/partials/header.ejs:2
- evidence: header.ejs:2 `<div id="preloader">` ; style.min.css `#preloader{position:fixed;inset:0px;background-color:#fff;z-index:99999}` ; custom.js:135 `$('#preloader').delay(350).fadeOut('slow');` ; faq/lambadi/gormati load custom.min.js with `defer`
- impact: FCP/LCP are pushed back by roughly 1 s or more on every page, and the page stays blank forever if a JS file fails. Core Web Vitals and ranking suffer.
- fix: Remove the preloader, or hide it with a CSS animation that does not depend on JS.

### [MEDIUM][perf] ~484 KB of render-blocking CSS with chained @import Google Fonts (broken &amp; in the URLs)
- where: /var/www/banjaramatch.com/public/css/style.min.css:1
- evidence: sizes: bootstrap.css 232926B (unminified), style.min.css 148204B, animate.min.css 71750B, font-awesome.min.css 31024B ; style.min.css `@import url(https://fonts.googleapis.com/css2?family=Poppins:wght@300;...&amp;display=swap` (5 @import font families)
- impact: Serial CSS then font requests block render. Because of the literal '&amp;' in the URLs, display=swap is likely not applied, so text stays invisible while fonts load. This hurts the mobile PageSpeed score.
- fix: Use bootstrap.min.css, drop animate.css where it is unused, move fonts to `<link rel=preconnect>` and a single `<link>` in the head with &display=swap, and inline critical CSS.

### [MEDIUM][perf] Multi-MB PNG blog images served on the homepage and blog list
- where: /var/www/banjaramatch.com/public/images/blog/blog-1777096703562-415490148.png:1
- evidence: 3203129 ./blog/blog-1777096703562-415490148.png, 2305804 ./blog/blog-1777097283767-58754147.png (both referenced in live / and /blogs HTML) ; 22 images > 300 KB ; webp=14 vs jpg/png=137
- impact: Pages are slow on rural mobile connections, and LCP fails when these are above the fold.
- fix: Resize and convert blog uploads to WebP on the server at upload time (sharp) and serve them with srcset.

### [MEDIUM][perf] biodata-builder.html: render-blocking 906 KB html2pdf in head, legacy .html links, own header/footer with a fake phone, no analytics
- where: /var/www/banjaramatch.com/public/biodata-builder.html:43
- evidence: :43 `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>` (906 KB uncompressed, no SRI, no defer) ; :61-63,98,101,104,107,129,471-474 links to about.html/plans.html/contact.html/all-profiles.html/login.html (each 301 hop) ; :62 'Membership' -> plans.html -> /features ; :483 `+91 1234567890` ; :36-40 relative css paths ; canonical OK (:17) ; title 69 chars ; no analytics include
- impact: A popular tool page is slow, its links waste crawl budget through redirect chains, branding is inconsistent and a fake contact number is shown, and tool usage is not tracked.
- fix: Convert it to an EJS page using the shared header, footer and analytics partials. Load html2pdf only when the user clicks Download (dynamic import), with SRI. Use clean URLs.

### [MEDIUM][filter] Analytics partial ignores REQUIRE_COOKIE_CONSENT and ANONYMIZE_IP; ENABLE_ANALYTICS cannot disable tracking in production; 16 templates untracked
- where: /var/www/banjaramatch.com/views/partials/analytics.ejs:11
- evidence: analytics.ejs:11 `const ENABLE_ANALYTICS = process.env.NODE_ENV === 'production' || process.env.ENABLE_ANALYTICS === 'true';` ; :25 hard-coded `'anonymize_ip': true` ; no reference to REQUIRE_COOKIE_CONSENT/ANONYMIZE_IP/DATA_RETENTION_MONTHS (keys in .env.example.analytics:59-65) ; templates without analytics: 404, account-deletion, blocked-users, child-safety-policy, ice-breaker-game, notifications, onboarding, profile-details, profile-visitors, shortlisted, terms-conditions, update-profile, user-chat, user-interests, user-plan, user-setting (+ privacy-policy, live gtag count 0)
- impact: Documented environment flags do nothing. 404s are not tracked (trackError is unused), and logged-in engagement pages (chat, interests, profile views) and the legal pages report no data.
- fix: Move analytics into a shared head partial included by every layout. Honour the consent flag with consent mode, and fire a 404 event from the 404 page.

### [MEDIUM][ui] Child Safety page links to two 404 pages; FA5 icon used with FA4
- where: /var/www/banjaramatch.com/views/pages/child-safety-policy.ejs:441
- evidence: :441 `<a href="/safety-tips"` -> 404 ; :449 `<a href="/community-guidelines"` -> 404 ; :272 `<i class="fa fa-robot"` (0 matches in font-awesome.min.css)
- impact: Broken links on a page Play reviewers inspect, and an empty icon box.
- fix: Create /safety-tips and /community-guidelines (both are useful for SEO and compliance) or remove the cards. Use fa-cogs instead.

### [MEDIUM][seo] Gormati FAQPage JSON-LD does not match the visible FAQ
- where: /var/www/banjaramatch.com/views/pages/gormati-matrimony.ejs:59
- evidence: JSON-LD :59-84 questions: 'What is Gormati matrimony?', 'Is BanjaraMatch free for Gormati matrimony?', 'What is the difference between Gormati, Banjara, and Lambani?' ; visible :309-321: 'What is Gormati matrimony?', 'What is the difference between Gormati and Banjara?', 'Does BanjaraMatch have Gormati profiles from Nanded...', 'How are gotra rules handled...'
- impact: Structured data that does not match visible content violates Google's guidelines and can trigger a manual action. FAQ rich results are also limited to gov and health sites since 2023.
- fix: Generate the JSON-LD and the visible accordion from one array, and use one shared FAQ partial (four copies exist: fqToggle, lfaq, gfaq, bhfaq).

### [LOW][ui] Community feedback page: 'Load More' throws ReferenceError, og:image 404, H2 before H1, duplicate keywords meta
- where: /var/www/banjaramatch.com/views/pages/community-feedback.ejs:255
- evidence: :255 `onclick="loadMoreContributors()"` but the function is defined at :621 inside `$(document).ready(function() {` (not global) ; :26 og:image community-feedback-banner.jpg -> 404 ; :112 `<h2>Community Feedback & Suggestions</h2>` precedes :133 `<h1 ...>We Listen, We Learn, We Evolve</h1>` ; :16 and :19 two `<meta name="keywords"`
- impact: Users with more than 50 contributors cannot page through them, social shares show no image, and the heading hierarchy is wrong.
- fix: Assign window.loadMoreContributors, fix the og image, and make the hero title the H1.

### [LOW][ui] Sitemap page: FAQ link points to a homepage anchor, relative CSS/JS paths, 5 x col-lg-3 grid
- where: /var/www/banjaramatch.com/views/pages/sitemap.ejs:143
- evidence: :143 `<a href="/#faq-section"` (the /faq page is not linked) ; :21-23 `href="css/bootstrap.css"` ; :243-245 `src="js/jquery.min.js"` ; five `col-lg-3` sections at :53,:74,:93,:113,:133
- impact: The HTML sitemap misses the FAQ hub, and the 5th column wraps alone.
- fix: Link /faq and /biodata-builder, use absolute asset paths, and use col-lg-4 or a CSS grid.

### [LOW][ui] Lambadi hero chip unstyled (class mismatch); 'Narikurava' listed as Lambadi name
- where: /var/www/banjaramatch.com/views/pages/lambadi-matrimony.ejs:216
- evidence: :216 `<div class="lm-chip">` but CSS :135 defines `.lm-hero .chip` ; :262 `<span class="lm-name-pill">Narikurava</span>`
- impact: Visual inconsistency, plus a factually wrong community name that may offend users.
- fix: Rename the class to lm-chip in the CSS and remove Narikurava.

### [LOW][seo] Duplicate BreadcrumbList on pages using both their own JSON-LD and breadcrumb.ejs
- where: /var/www/banjaramatch.com/views/partials/breadcrumb.ejs:45
- evidence: breadcrumb.ejs:14 microdata `itemtype="https://schema.org/BreadcrumbList"` + :45 JSON-LD ; live count '"BreadcrumbList"' = 2 on /privacy-policy, /terms-conditions, /beta-tester
- impact: Duplicate or conflicting breadcrumb entities.
- fix: Let breadcrumb.ejs be the only emitter and remove the page-level copies and the microdata.

### [LOW][dead-code] Dead or legacy code: Contact.js unused, blog-sidebar.ejs unused with fake follower counts, custom.js template leftovers
- where: /var/www/banjaramatch.com/models/Contact.js:13
- evidence: Contact.js never required (grep require.*models -> none; no mongoose in package.json) ; blog-sidebar.ejs not included anywhere, :8-15 `<b>3k</b> Facebook ... <b>100K</b> Youtube` with href="#!" ; custom.js:75 `$(".fvali").validate();` (jquery.validate not loaded on .cform pages contact/community-feedback -> TypeError) ; custom.js:131 `$('#cry').text("2023");` ; public/css/style.min.css.bak-pre-scope-fix and biodata-builder.css.backup served with 200
- impact: Confusion during the monorepo move, console errors, and backup files publicly served.
- fix: Delete Contact.js, blog-sidebar.ejs, the backup CSS files and the legacy public/*.html files (the redirects stay in app.js). Remove the .validate() and #cry lines.

### [LOW][infra] optimize-images.sh only partly applied; uses sudo apt-get and overwrites originals
- where: /var/www/banjaramatch.com/optimize-images.sh:18
- evidence: :18 `sudo apt-get update && sudo apt-get install -y jpegoptim` (also :25, :32) ; :43 `jpegoptim --max=85 --strip-all --preserve --quiet {}` (in place, despite :56 comment 'backup originals') ; webp files: 14 (9 gallery/*.webp dated 2025-12-30, 3 dated 2026-03-25) vs 80 jpg + 57 png ; views reference 'webp' 8 times
- impact: Running it in CI or a deploy hook would hang or fail on sudo and lossily overwrite the source images. WebP is mostly not generated or used.
- fix: Replace it with a sharp-based Node build step that writes to a separate output directory, with no sudo, and serve `<picture>` with WebP sources.

## inventory
- Web routes for the audited pages (routes/index.js): /account-deletion L37, /banjara-matrimony-app L48, /lambadi-matrimony L60, /gormati-matrimony L80, /banjara-gotra-list L100, /banjara-community-history L129, /faq L297, /features L324, /beta-tester L336, /biodata-builder L347 (sendFile public/biodata-builder.html), /child-safety-policy L351, /community-feedback L362, /contact L373, /sitemap L401, /thank-you L489 (ensureAuth), /terms-conditions L1065, /privacy-policy L1073, catch-all /:slug banjara-matrimony-* L1138, POST /api/regenerate-sitemap L1209, POST /api/proxy/cities L1232
- 301 redirects: /terms-condition, /plans, /banjara-matrimony-bangalore->karnataka, /banjara-matrimony-pune->maharashtra (routes L228-231); htmlRedirectMap app.js L67-111 plus generic .html stripping
- Live status: all audited pages 200; /safety-tips 404; /community-guidelines 404; /images/community-feedback-banner.jpg 404; auth pages 302 -> /login; /blogs/<anything> 200 (soft 404)
- Form endpoints: contact -> POST https://api.banjaramatch.com/api/contact/submit (server validates email/10-digit phone); community-feedback -> POST /api/auth/community-feedback (no auth on GET/PUT); beta-tester -> POST /api/beta-tester/submit (+ GET /api/beta-tester/stats, which is adminAuth); child-safety -> POST /api/feedback/submit (route does not exist)
- No rate limiter, captcha or honeypot on any public form (grep rateLimit in api index.js/package.json -> none)
- Web .env key names: GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT (no JWT_SECRET, API_URL, AUTH_SERVER_URL)
- API .env JWT_SECRET equals the literal 'your_jwt_secret'
- .env.example.analytics keys: GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, REQUIRE_COOKIE_CONSENT, ANONYMIZE_IP, DATA_RETENTION_MONTHS, DEBUG_ANALYTICS, TEST_MODE (+ commented GTM_CONTAINER_ID, ENABLE_GTM, HOTJAR_ID, CLARITY_ID, FACEBOOK_PIXEL_ID, LINKEDIN_PARTNER_ID)
- Google Ads account AW-357336842, conversion labels 3N9aCIbm68obEIqOsqoB and q-YJCIvsq8obEIqOsqoB (analytics.ejs, thank-you.ejs)
- Templates with no analytics: 404, account-deletion, blocked-users, child-safety-policy, ice-breaker-game, notifications, onboarding, profile-details, profile-visitors, shortlisted, terms-conditions, update-profile, user-chat, user-interests, user-plan, user-setting, plus privacy-policy (live gtag=0)
- Web package.json deps: axios, compression, cookie-parser, cors, dotenv, ejs, express ^5.1.0, helmet, jsonwebtoken; no mongoose, no express-session
- Contact emails in use: info@ (footer, child-safety, biodata), support@ (account-deletion, terms, privacy), help@ (contact, terms), privacy@, grievance@, dpo@ (privacy); placeholder phones +91-9876-543-210 (privacy, terms), +91 1234567890 (biodata)
- Live SEO metadata: faq title 47 / desc 150; features 80/150; sitemap 48/126; gormati 67/145; lambadi 67/142; history 87/146; child-safety 69/220; privacy 54/64; terms 58/85; community-feedback 76/138; beta-tester 60/142; account-deletion 17/0 (no canonical); biodata 69/137
- JSON-LD types: faq WebPage+FAQPage; features SoftwareApplication (+Breadcrumb from partial); lambadi/gormati WebPage+FAQPage; history Article+BreadcrumbList+FAQPage; community-feedback ContactPage+BreadcrumbList; privacy/terms/beta BreadcrumbList x2; child-safety, account-deletion, 404, biodata: none
- Sitemap-main.xml includes all audited public pages, including /account-deletion and /biodata-builder
- Front-end weight: bootstrap.css 233 KB unminified, style.min.css 148 KB with 5 @import Google Fonts, animate.min.css 72 KB, html2pdf bundle 906 KB (biodata head), Chart.js 443 KB unminified (dashboard); public/images 31 MB, 14 webp vs 137 jpg/png
- App distribution: no play.google.com link in any view; /banjara-matrimony-app links https://api.banjaramatch.com/api/download-apk; public/downloads/banjaramatch.apk exists
- jQuery 3.6.0, Bootstrap 4 JS, Chosen 1.8.7 (select-opt.js), slick; custom.js is the RN53 'Wedding Matrimony HTML5 Template' theme script
- API callers of www /api/regenerate-sitemap: api services/sitemapService.js:14, controllers/admin/aiGotraController.js:5, constantsController.js:17 (SITEMAP_REGEN_URL default http://localhost:4000)
- pm2 banjaramatch-web cwd /var/www/banjaramatch.com; nginx www has a single `location / { proxy_pass http://localhost:4000; }`

## reusable
- /var/www/banjaramatch.com/views/partials/blog-section.ejs: correctly maps featuredImage/description/author.name; reuse it as the blog-card component on lambadi, gormati, history and faq instead of the four inline copies
- /var/www/banjaramatch.com/views/partials/breadcrumb.ejs: already emits BreadcrumbList JSON-LD; make it the single breadcrumb source and remove page-level copies and microdata
- /var/www/banjaramatch.com/views/partials/analytics.ejs: trackEvent/trackCTA/trackFormSubmit/trackError helpers are reusable; wrap them with consent mode and include from one shared head partial
- /var/www/banjaramatch.com/app.js L67-111 htmlRedirectMap plus generic .html stripping: keep as-is in the monorepo to preserve production slugs
- /var/www/banjaramatch.com/utils/generateAllSitemaps.js and generateSitemap/BlogSitemap/RegionalSitemap/SitemapIndex.js: existing sitemap pipeline (secure its trigger endpoint)
- FAQ accordion pattern duplicated as fqToggle (faq.ejs), lfaq (lambadi), gfaq (gormati), bhfaq (history): extract into partials/faq-accordion.ejs that renders both the visible accordion and the FAQPage JSON-LD from one array
- Landing page section CSS (.lm-*/.gm-*/.bh-*/.fq-*) are near-identical palettes: consolidate into one design-token CSS file (hero, section, card, cta-banner, state-chip) for the shared base UI
- views/partials/footer.ejs: already has the regional state links and legal links; add /account-deletion and use it in biodata-builder (convert to EJS)
- contact.ejs L227-239 client validation (email regex, 10-digit phone) mirrors api ContactController.submitContact L18-34: reusable validation rules for a shared form helper
- helmet + compression setup in app.js L17-57 and static cache headers L114-140: keep in the monorepo web app

## open_questions
- Is the Android app on Google Play yet? The site distributes an APK through /api/download-apk while the beta page says 'Coming to Play Store soon' and the FAQ schema claims an iOS app. Which store URLs should the site use?
- Which single official support email, child-safety contact, Grievance Officer name, registered business entity and address should appear on the legal pages?
- Rotating the API JWT_SECRET away from 'your_jwt_secret' will log out all web and app users and admins. Is that acceptable, and does the Flutter app cache tokens that need a migration path?
- Are 'manual verification before visibility', 'PhotoDNA', '24/7 moderation', 'Government ID verification for activation' and 'end-to-end' chat actually implemented? If not, which claims should be removed?
- Does the API apply global auth middleware before /api/deleteUser and the other userRoutes? This was not verified here. Is self-service account deletion planned for the web settings page?
- Should a cookie-consent banner and Consent Mode v2 be added (DPDP Act / Google Ads EU requirements), given that Google Ads enhanced conversions are active?
- The unauthenticated /api/auth/community-feedback GET returned submitter emails and messages; I stopped short of counting how many records are exposed (that query was blocked). Has this data been scraped, and does it need a breach assessment?
- Which community figures and population numbers on /banjara-community-history are verified? The site owner should confirm with a community expert before the next SEO push.
