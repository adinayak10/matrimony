# web-perf-ui

## summary
I audited the public site at /var/www/banjaramatch.com. That covered app.js, routes/index.js (route list plus the regional /:slug, biodata and proxy routes), the header, footer, analytics and beta-banner partials, all of index.ejs (2738 lines), register.ejs, and the <head> sections plus grep scans of about, contact, regional-page-state, blog, blog-detail, banjara-gotra-list, login, ai-matrimony-app and ice-breaker-game. I also looked at public/css, public/js, public/fonts, public/images and public/downloads, and checked the live site with curl GET/HEAD. Compression works end to end: Express `compression` sends br/gzip through nginx, so the 192KB homepage arrives as about 30KB, and Cache-Control headers from app.js reach the browser. The real performance problems are images and blocking resources. The homepage pulls in about 6.2MB of uploaded blog images (PNGs up to 3.2MB, stored without resizing). Every page downloads about 750KB of decorative 'leaf' PNGs. Five Google Font families are loaded through serial `@import`, and a bug in the URL means font-display:swap never applies. A full-screen white preloader at z-index 99999 is only removed by deferred jQuery. Hero and LCP images are lazy-loaded on several pages. CSS/JS URLs carry no version string, so a deploy can leave users on the old files for up to 7 days. On UI quality, the site still shows template residue and invented content. A fake phone number (+91 9876 543 210) appears visibly and in JSON-LD on 3 pages. User counts, match counts and ratings contradict each other from page to page (10,000+ / 5000+ / 4000+ members; 3,500+ / 2000+ / 1,500+ weddings), and the app page has a schema AggregateRating of 4.8 from 2847 ratings with no reviews behind it. Several links are broken: /testimonials, /interests, /matches, the header avatar for every logged-in user, all images on /blogs/:category pages, jQuery on the ice-breaker game, and Bootstrap on /banjara-matrimony-app. Copyright years conflict (2026 in the footer, plus 2020-2025, 2024, and 2023 rewritten by JS). The mobile menu has a disabled 'Register for free' button, and the header search box does nothing. Every page has its own hand-written <head> with relative paths that differ page to page, and there are 464 inline style attributes on the homepage alone. That is why the UI is inconsistent: there is no shared layout or head partial. Legacy .html files in public/ are correctly 301-redirected by app.js, but robots.txt `Disallow: /*.html` stops crawlers from seeing those redirects. public/downloads holds a stale 67.8MB APK from Dec 2025 that is still publicly downloadable but linked nowhere; the live download link points to api.banjaramatch.com/api/download-apk, which serves a 76MB, newer build.

## findings (29)

### [HIGH][perf] Homepage and /blogs load multi-MB unresized blog PNG/JPG uploads
- where: /var/www/banjaramatch.com/views/pages/index.ejs:2256
- evidence: index.ejs:2256 `<img src="/<%= blog.featuredImage %>" alt="<%= blog.title %>" loading="lazy" width="400" height="250">`; live homepage renders /images/blog/blog-1777096703562-415490148.png (3,203,129 B), blog-1777097283767-58754147.png (2,305,804 B), blog-1784050276134-514793281.jpg (661,437 B). /blogs renders 11 images totalling ~10.6MB. The upload code /var/www/api.banjaramatch.com/controllers/admin/blogController.js:200 does `blogData.featuredImage = 'images/blog/' + req.file.filename;` with no resizing or format conversion.
- impact: A mobile visitor who scrolls the homepage downloads about 6.2MB of images shown in 400x250 cards; /blogs is about 10MB. This badly hurts LCP/TBT on 3G/4G in India and wastes bandwidth.
- fix: Resize on upload to 1200w plus 400w/800w variants and generate WebP/AVIF (sharp in the API upload handler). Render with <picture>/srcset. Batch-reconvert the existing 18 files in public/images/blog (three are byte-identical duplicates: md5 a52df7e0…).

### [HIGH][perf] Decorative leaf PNGs (~756KB) downloaded on every page via header pseudo-elements
- where: /var/www/banjaramatch.com/public/css/style.min.css:1
- evidence: .hom-top:before,.pg-soon:before{content:'';position:fixed;top:125px;left:0;width:188px;height:188px;background:url('../images/leaf/5.png') ...} .hom-top:after,.pg-soon:after{... background:url('../images/leaf/8.png') ...}  — leaf/5.png 1232x1345 379,484 B, leaf/8.png 346x883 377,198 B; displayed at 188px / 123x300px
- impact: .hom-top is the header partial included on 37 pages, so every first page view pays about 756KB for two corner ornaments. Other leaf assets are also huge: leaf/10.png is 4.3MB (1824x2736), and leaf/2,4,9,11 are 320-510KB each.
- fix: Export the ornaments at display size (≤300px wide) as WebP or SVG, aiming under 20KB each, or drop them on mobile with a media query. Re-encode the whole leaf/ folder.

### [HIGH][perf] Google Fonts loaded via 5 serial @imports with broken '&amp;' so font-display:swap is never applied
- where: /var/www/banjaramatch.com/public/css/style.min.css:1
- evidence: @import url(https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&amp;display=swap);@import url(...Playfair+Display...&amp;display=swap);@import url(...Kalam&amp;display=swap);@import url(...Cinzel+Decorative...&amp;display=swap);@import url(...Josefin+Sans:wght@600&amp;display=swap). Verified: the '&amp;display=swap' URL returns 0 'font-display: swap' rules; '&display=swap' returns 1.
- impact: The browser must download style.min.css (148KB) before it discovers the 5 font CSS files, then fetch them one after another. Text stays invisible (FOIT) until the fonts arrive, which slows FCP/LCP on every page. index.ejs:61 also preloads Poppins a second time.
- fix: Drop the @imports. Self-host the woff2 subsets (Poppins plus at most one display face) with @font-face{font-display:swap} and <link rel=preload as=font>. Remove Kalam, Cinzel and Playfair unless they are visually essential (2-7 uses each).

### [HIGH][perf] Full-screen white preloader blocks content until deferred jQuery runs
- where: /var/www/banjaramatch.com/views/partials/header.ejs:2
- evidence: header.ejs:2 `<div id="preloader">` + style.min.css `#preloader{position:fixed;inset:0px;background-color:#fff;z-index:99999}` + custom.js:135 `$('#preloader').delay(350).fadeOut('slow');` (inside $(document).ready, jQuery loaded with defer at index.ejs:2647)
- impact: Users see a blank white screen until jquery (89KB), popper, bootstrap (80KB), select-opt and slick have downloaded and run, then wait another 350ms plus a 600ms fade. LCP is delayed on every page. If any script fails before line 135, the page stays blank. The loader images inside it are also loading="lazy".
- fix: Remove the preloader entirely, or hide it with pure CSS (an animation that ends in under 300ms). Never gate content visibility on JS.

### [HIGH][business-logic] Fabricated phone number shown visibly and in structured data
- where: /var/www/banjaramatch.com/views/pages/index.ejs:1262
- evidence: index.ejs:1262 `<h4>Free Enquiry <em>+91 9876 543 210</em></h4>`; index.ejs:93 and :207 `"telephone": "+91-9876-543-210"`; terms-conditions.ejs:485 `Phone: +91-9876-543-210`; privacy-policy.ejs:340 `<strong>Phone:</strong> +91-9876-543-210`
- impact: Users who call the number reach a stranger. Google gets a fake LocalBusiness/Organization phone, which is a trust and policy problem, and the legal pages list a non-existent contact. The emails also disagree: index uses support@ while header and footer use info@.
- fix: Per the owner's rule, remove the phone lines (don't invent a replacement) in the visible block, both JSON-LD blocks, terms and privacy. Standardise on one confirmed support email.

### [HIGH][seo] Self-serving fabricated AggregateRating and contradictory stats across pages
- where: /var/www/banjaramatch.com/views/pages/ai-matrimony-app.ejs:83
- evidence: ai-matrimony-app.ejs:83-87 `"aggregateRating": {"@type": "AggregateRating","ratingValue": "4.8","ratingCount": "2847"}` (again at :110); index.ejs:728 `4.8 User Rating`, :739 `10K+ Downloads`, :1029 `3,500+ Successful Matches`, :1095 `Trusted by <strong>1,500+</strong> Banjara Couples`, :1359-1395 per-subcaste counts `2,800+ / 1,900+ / 1,500+ / 3,200+ / 600+ Profiles`; about.ejs:179 `2000+ weddings`, :277 `4000+ Registered users`; lambadi-matrimony.ejs:229 and gormati-matrimony.ejs:185 `5000+ Registered Members`
- impact: The numbers contradict each other from page to page. Self-serving review markup with no visible reviews breaks Google's structured-data policy and risks a manual action on the site that currently ranks for 'banjara matrimony'. It also makes the site look untrustworthy.
- fix: Remove the aggregateRating blocks and every hard-coded count. If counts are wanted, render them from a real API stat endpoint (e.g. total verified users) and otherwise omit them. Also remove the stock-photo testimonials (index.ejs:1103-1153) and the 'Recent Happy Couples' names (1980-2059) unless they are real, consented stories.

### [HIGH][ui] Header avatar always broken for logged-in users (wrong field name + missing default image)
- where: /var/www/banjaramatch.com/views/partials/header.ejs:162
- evidence: header.ejs:162 and :257 `<img src="<%= user.profilePhoto ? '/uploads/' + user.profilePhoto : '/images/profiles/default.jpg' %>"`; the API user schema (/var/www/api.banjaramatch.com/schemas/user.js:12) uses `image: { type: String, default: 'default.png' }`; live: `404 /images/profiles/default.jpg`, `404 /uploads/test.jpg` on www
- impact: Every logged-in user sees a broken image in the desktop header and the mobile account menu, on all pages.
- fix: Use user.image, pointed at https://api.banjaramatch.com/uploads/<image>, or at the same-origin /uploads path once the monorepo routes it. Fall back to the existing /images/default-user.jpg.

### [HIGH][ui] Blog category pages show broken images (relative src)
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:129
- evidence: blog.ejs:129 `<img src="<%= blog.featuredImage || '/images/couples/9.jpg' %>"` where featuredImage = 'images/blog/…' (no leading slash). Live: /blogs/culture renders `<img src="images/blog/blog-1777096703562-415490148.png"`, which resolves to `/blogs/images/blog/...` and returns 404. Same at blog.ejs:255.
- impact: Every /blogs/:category page (community, culture, decoration, events, general…) shows broken featured images. That hurts UX and image SEO on indexed category pages.
- fix: Prefix with '/' as blog-detail.ejs and blog-section.ejs already do, or store an absolute path in the DB.

### [HIGH][ui] Ice-breaker game and app landing page reference non-existent JS files
- where: /var/www/banjaramatch.com/views/pages/ice-breaker-game.ejs:279
- evidence: ice-breaker-game.ejs:279 `<script src="/js/jquery-3.6.0.min.js"></script>` (live 404) while the inline script uses jQuery 27 times, e.g. :316 `$('#opponentName').text(data.opponent.name);`; ai-matrimony-app.ejs:1158 `<script src="/js/bootstrap.bundle.min.js"></script>` (live 404)
- impact: The ice-breaker game throws 'ReferenceError: $ is not defined' and does not work. /banjara-matrimony-app, an SEO landing page in the sitemap, has no Bootstrap JS, so custom.js `.tooltip()` throws.
- fix: Point both at the existing /js/jquery.min.js (v3.6.0) and /js/bootstrap.min.js plus popper. A shared scripts partial would prevent this drift.

### [HIGH][business-logic] Homepage hero search and 'Browse Profiles' nav go to auth-only, robots-disallowed /all-profiles and lose filters
- where: /var/www/banjaramatch.com/views/pages/index.ejs:435
- evidence: index.ejs:435 `<form action="/all-profiles" method="GET">`; routes/index.js:981 `router.get('/all-profiles', ensureAuth, checkProfileCompletion,`; routes/index.js:155 `return res.redirect('/login');` (no returnTo); live `302 https://www.banjaramatch.com/login /all-profiles?gender=Male`; robots.txt `Disallow: /all-profiles`; index.ejs:145 WebSite SearchAction `urlTemplate: .../all-profiles?search={search_term_string}`
- impact: A guest's first action, searching, bounces to login and the chosen gender/age/city are discarded. The sitelinks SearchAction points at a URL Google cannot crawl. The city dropdown also has duplicate empty options (index.ejs:478-479).
- fix: Either send guest searches to /register?next=<encoded search>, or have ensureAuth store returnTo and redirect back after login. Remove the WebSite SearchAction or point it at a public search.

### [HIGH][security] Auth JWT set by client JS (not HttpOnly) and logged in plaintext
- where: /var/www/banjaramatch.com/views/pages/register.ejs:308
- evidence: register.ejs:308 `document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}; domain=.banjaramatch.com; SameSite=Lax`;` (also login.ejs:347, :579); routes/index.js:151 `console.log('[ensureAuth] Token from cookie:', token);`
- impact: Any XSS on any *.banjaramatch.com subdomain (admin panel included) can read a 7-day session token. Every authenticated page view also writes the full JWT into pm2 logs.
- fix: Have the API set the cookie with Set-Cookie HttpOnly; Secure; SameSite=Lax (single origin after the monorepo merge). Remove the token console.log lines.

### [HIGH][business-logic] Registration can orphan a Firebase account, leaving the user unable to retry
- where: /var/www/banjaramatch.com/views/pages/register.ejs:274
- evidence: register.ejs:274 `const userCredential = await auth.createUserWithEmailAndPassword(email, password);` then :290 backend `fetch('https://api.banjaramatch.com/api/auth/firebase-email-register'` ; on failure :329 `alert(data.message || 'Registration failed. Please try again.');` with no Firebase user cleanup; a retry hits :343 `auth/email-already-in-use` -> 'Please login instead.'
- impact: If the backend call fails (duplicate phone, API down, validation error), the Firebase user already exists but has no Mongo profile. Retrying registration says 'already registered', and login may also fail. Signups are lost.
- fix: On backend failure call firebaseUser.delete(), or make login detect a Firebase user without a Mongo profile and finish registration. Show inline errors instead of alert().

### [MEDIUM][security] Unauthenticated POST endpoint triggers sitemap regeneration
- where: /var/www/banjaramatch.com/routes/index.js:1209
- evidence: router.post('/api/regenerate-sitemap', async (req, res) => { ... const success = await generateAllSitemaps();
- impact: Anyone on the internet can repeatedly trigger API fan-out and sitemap file rewrites in public/. That is a cheap DoS/load vector, and a concurrent write could leave a truncated sitemap.
- fix: Require an internal shared secret header or allow only 127.0.0.1, and add a rate limit. The admin can call it server-to-server.

### [MEDIUM][infra] Stale 67.8MB APK publicly downloadable from web public/downloads (not linked)
- where: /var/www/banjaramatch.com/public/downloads/README.txt:10
- evidence: README.txt:10 `Location: /var/www/banjaramatch.com/public/downloads/banjaramatch.apk`; banjaramatch.apk 67,836,521 B dated Dec 15 2025; live `200 /downloads/banjaramatch.apk` and `200 /downloads/README.txt`; all site links use `https://api.banjaramatch.com/api/download-apk` (index.ejs:688), which serves `content-length: 76224484` `filename="BanjaraMatch_vapp_1774386805517.apk"`
- impact: An outdated build (possibly with old bugs or configs) is still installable by anyone who finds the URL. README.txt exposes a server path. The 65MB would bloat a git monorepo.
- fix: Delete public/downloads. Add a 301 from /downloads/banjaramatch.apk to /api/download-apk in case old links exist. Keep APKs outside git (API uploads dir or object storage) and add them to .gitignore.

### [MEDIUM][ui] Broken internal links on homepage (/testimonials, /interests, /matches)
- where: /var/www/banjaramatch.com/views/pages/index.ejs:1157
- evidence: index.ejs:1157 `<a href="testimonials" class="cta-dark">More customer reviews</a>`, :2542 `href="/testimonials"`, :2600 `href="/interests"`, :2606 `href="/matches"`; live: `404 /testimonials`, `404 /interests`, `404 /matches`
- impact: Four crawlable 404 links on the most important page waste crawl budget and break UX.
- fix: Remove the testimonials links (there is no testimonials page, and its content would be fabricated). Change /interests to /user-interests and /matches to /dashboard, or remove them from the guest view.

### [MEDIUM][perf] Hero/LCP images lazy-loaded; homepage preloads both webp and jpg hero
- where: /var/www/banjaramatch.com/views/pages/index.ejs:57
- evidence: index.ejs:57 `<link rel="preload" href="/images/ban-bg.webp" as="image" type="image/webp" fetchpriority="high">` and :58 `<link rel="preload" href="/images/ban-bg.jpg" as="image" fetchpriority="high">`; regional-page-state.ejs:260 `<img src="<%= banner.url %>" ... loading="lazy">`; blog-detail.ejs:118 `<img src="/<%= blog.featuredImage %>" alt="<%= blog.title %>" loading="lazy">`; header.ejs:134 logo `loading="lazy"` (logo-b.png is 2712x457, 84KB, shown at 200x60)
- impact: The homepage downloads the hero twice (209KB webp plus 315KB jpg) on modern browsers. Regional and blog-detail heroes are deferred, which pushes LCP out. There is no srcset, so phones get the 1920px image.
- fix: Preload only the webp with imagesrcset. Mark first-viewport images loading=eager fetchpriority=high. Add 640/1024/1920 srcset variants. Resize the logo to 400x67 WebP.

### [MEDIUM][perf] No asset versioning with 7-day CSS/JS cache
- where: /var/www/banjaramatch.com/app.js:122
- evidence: app.js:122-124 `if (['.css', '.js'].includes(extension)) { res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');`; grep of views: `versioned refs: 0`
- impact: After a push-to-deploy, returning visitors keep the old style.min.css/custom.min.js for up to 8 days. New HTML combined with old CSS can render broken layouts. This matters for the requested auto-deploy workflow.
- fix: Add content-hash or ?v=<git sha> to asset URLs through a res.locals.asset() helper, then raise max-age to 1y immutable.

### [MEDIUM][perf] Unneeded heavy libraries loaded site-wide (animate.css, chosen, popper, FA4 legacy)
- where: /var/www/banjaramatch.com/views/pages/index.ejs:72
- evidence: animate.min.css (71,750 B) referenced on 34 pages, but only ~22 elements use animate__ classes and the `wow fadeInUp` classes (index.ejs:559) do nothing (no WOW.js; animate v4 needs the animate__ prefix); select-opt.min.js (chosen, 28KB) on 25 pages; Font Awesome 4.7 CSS has no font-display; bootstrap.css 232KB (BS 5.3.0) plus style.min.css 148KB are both render-blocking
- impact: Roughly 90KB+ of CSS (br-compressed about 60KB) blocks first render on every page, mostly unused.
- fix: Build one purged and minified site.css (bootstrap utilities used plus the theme), loaded once from a shared head partial. Load chosen/slick only on pages that use them. Replace FA4 with an SVG sprite of the ~40 icons in use.

### [MEDIUM][perf] Render-blocking third-party scripts in <head> (Firebase, html2pdf)
- where: /var/www/banjaramatch.com/views/pages/register.ejs:35
- evidence: register.ejs:35-36 `<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js"></script>` `<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js"></script>` (also login.ejs:40-41); public/biodata-builder.html:43 `<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>`
- impact: The conversion pages (register, login) and the biodata builder stay blank until third-party CDNs respond.
- fix: Add defer, or load them dynamically on form focus or submit. Load html2pdf only when the user clicks Download.

### [MEDIUM][perf] Homepage HTML is 192KB, mostly whitespace, inline styles and dead comments
- where: /var/www/banjaramatch.com/views/pages/index.ejs:2068
- evidence: Live breakdown: leading-whitespace 58,042 B; inline style="…" attributes 40,352 B (464 occurrences in index.ejs); <script> 23,776 B (7 JSON-LD blocks); HTML comments 19,312 B incl. commented-out 'Meet Our Team' (index.ejs:2068-2138, placeholder names 'Ashley Jen', 'Emily Arrov') and gallery (2143-2236); /banjara-gotra-list is 180KB with 62KB whitespace
- impact: Over the wire it is only 30KB gzip/br, but the parse cost and DOM size grow, and the inline-style sprawl makes UI consistency impossible.
- fix: Move inline styles into classes in the shared stylesheet. Delete the commented-out template blocks. Enable EJS rmWhitespace or minify HTML at render time.

### [MEDIUM][seo] Duplicate FAQPage markup and malformed HTML on homepage
- where: /var/www/banjaramatch.com/views/pages/index.ejs:2319
- evidence: JSON-LD FAQPage at index.ejs:247-310 and microdata `<section id="faq-section" ... itemscope itemtype="https://schema.org/FAQPage">` at :2319; orphan closers at :2462-2463 `</div>\n    </section>` (section open 23 / close 24)
- impact: Google reports duplicate FAQPage entities. The unbalanced section can break the footer layout in some browsers.
- fix: Keep a single FAQPage (JSON-LD) and remove the microdata attributes. Fix the 'FIND YOUR MATCH BANNER' wrapper (add the missing <section><div>) or delete the orphan closers.

### [MEDIUM][seo] robots.txt blocks legacy .html URLs so their 301s are never seen
- where: /var/www/banjaramatch.com/robots.txt:1
- evidence: robots.txt (Googlebot group) `Disallow: /*.html` while app.js:99-108 301-redirects every *.html (e.g. live `301 https://www.banjaramatch.com/about /about.html`)
- impact: Old indexed or backlinked .html URLs cannot pass signals to the clean URLs, because crawlers are not allowed to fetch them and see the 301.
- fix: Remove `Disallow: /*.html` (the redirects already prevent duplicates). Bingbot also disallows /register, which is a sitemap URL, so align the groups.

### [MEDIUM][seo] og:image URLs 404 on several pages
- where: /var/www/banjaramatch.com/views/pages/register.ejs:19
- evidence: register.ejs:19 and login.ejs:22 `og:image ... /images/social-preview.jpg` -> 404; `/images/ai-app-banner.jpg` -> 404; `/images/community-feedback-banner.jpg` -> 404; ai-matrimony-app.ejs schema `screenshot: .../images/app-screenshots.jpg` -> 404
- impact: WhatsApp and Facebook shares of /register (the main share/ad target) show no preview image.
- fix: Point them at the existing /images/banjara-matrimony-cover.jpg or banjaramatch-preview.jpg (both 200), or remove them.

### [MEDIUM][ui] Contradictory/duplicate copyright blocks; custom.js rewrites year to 2023
- where: /var/www/banjaramatch.com/public/js/custom.js:131
- evidence: custom.js:131 `$('#cry').text("2023");`; footer.ejs:111 `Copyright © 2026 BanjaraMatch.com`; register.ejs:182 `<span id="cry">2020-2025</span>`; regional-page-state.ejs:1103 `<span id="cry">2024</span>`; index.ejs:2637 document.write year
- impact: Every page shows two copyright lines, and the second reads 2023 once JS runs. The site looks abandoned.
- fix: Delete the per-page 'cr' sections and the custom.js line. Keep the footer only, with the year rendered server-side (<%= new Date().getFullYear() %>).

### [MEDIUM][ui] Mobile menu CTA disabled and header search non-functional
- where: /var/www/banjaramatch.com/views/partials/header.ejs:244
- evidence: header.ejs:244 `<a href="#!" style="pointer-events: none; opacity: 0.6;" title="Coming soon">Register for free</a>`; header.ejs:24-26 `<form>\n <input type="text" placeholder="Search here...">\n </form>` (no action/name); index.ejs:1986 etc. seven `View more` links with `pointer-events: none` 'Coming soon'
- impact: Mobile users, likely the majority, see a greyed-out Register button in the menu. Typing in the search popup reloads the current page.
- fix: Link the mobile CTA to /register. Either give the search form action="/blogs" name="q" (or a real search) or remove the search icon. Remove the 'Coming soon' disabled links.

### [MEDIUM][ui] No shared layout: every page hand-rolls <head>, with relative asset paths and inconsistent CSS loading
- where: /var/www/banjaramatch.com/views/pages/contact.ejs:46
- evidence: contact.ejs:46 `<link rel="stylesheet" href="css/bootstrap.css" media="print" onload="this.media='all'">` (Bootstrap async → FOUC/CLS) vs about.ejs:59 blocking `href="css/bootstrap.css"` vs user-dashboard.ejs:30 `href="/css/style.css"` (234KB unminified, older source than style.min.css) ; relative `css/`/`js/` paths in 12 templates; pages without header/footer: ice-breaker-game, onboarding, thank-you, public/biodata-builder.html (sitemap URL)
- impact: Navigation, styles and analytics differ from page to page. Any page moved to a nested URL breaks, as already happened on /blogs/:category. analytics.ejs is missing on 15 templates, including terms-conditions, privacy-policy, child-safety-policy and 404, which are public and indexed.
- fix: Create views/layouts/base.ejs (or partials/head.ejs and scripts.ejs) with absolute versioned assets, a meta/OG/canonical block driven by locals, the analytics include, and header/footer. Migrate every page and the biodata-builder.html page into it.

### [LOW][ui] Wrong/misleading alt text and labels
- where: /var/www/banjaramatch.com/views/partials/header.ejs:134
- evidence: header.ejs:134 logo `alt="Profile image"`; :178,:181,:184,:197 icon imgs `alt="Profile image"`; register.ejs:125 `<label class="lb">Full Name:</label>` without for= (0 of 11 labels on register/login/contact use for=); footer.ejs:7 `<span>Free Support:</span>&nbsp;&nbsp;|&nbsp;&nbsp; <span>Email:</span>` (empty value)
- impact: Screen readers announce the logo as 'Profile image', form fields have no accessible names, and the footer shows an empty 'Free Support:' label.
- fix: Use alt="BanjaraMatch" for the logo and alt="" with aria-label on the buttons for icons. Add for/id pairs. Remove the dangling 'Free Support:' label.

### [LOW][ui] Self-promo block labelled 'Sponsored'
- where: /var/www/banjaramatch.com/views/pages/index.ejs:620
- evidence: index.ejs:620 `...text-transform: uppercase; line-height: 1;">Sponsored</span>` on a block linking to /register; :623 fixed `width: 728px` with `white-space: nowrap` text
- impact: The 'Sponsored' label is misleading, and the nowrap text overflows on small phones.
- fix: Remove the 'Sponsored' label and the AD SLOT placeholder, or turn it into a normal responsive CTA.

### [LOW][dead-code] Dead files served publicly from public/
- where: /var/www/banjaramatch.com/public/css/style.min.css.bak-pre-scope-fix:1
- evidence: live 200: /css/style.min.css.bak-pre-scope-fix, /css/biodata-builder.css.backup, /css/style.css; 32 legacy *.html (≈1.4MB) incl. biodata-builder-backup.html, biodata-builder-old-24templates.html; 0-byte images/leaf/long.html and images/icon/search.html referenced from style.min.css; images/banner/banjara_matrimony_banner1.png (2.7MB) byte-identical to blog/blog-1765979271719-684175185.png; images/profiles/profile-large.jpg (600KB) unreferenced; views/partials/blog-sidebar.ejs unused; fonts/*.svg/.eot/.ttf (775KB) legacy formats
- impact: Clutter that will be copied into the monorepo, and backup files exposed publicly.
- fix: Delete them during the monorepo migration. Keep the htmlRedirectMap in app.js so the old .html URLs keep 301-ing after the files are removed.

## inventory
- Asset dirs: public/images 31M (blog 12M, leaf 6.6M, couples 3.2M, banner 2.7M, profiles 2.0M, gallery 1.2M, about 1.1M), public/downloads 65M (banjaramatch.apk 67.8MB + README.txt), public/fonts 1.1M, public/css 908K, public/js 884K, 32 legacy .html ≈1.4MB
- Top files: downloads/banjaramatch.apk 67,836,521; images/leaf/10.png 4,341,265 (1824x2736); blog/blog-1777096703562-415490148.png 3,203,129; blog/blog-1765979271719-684175185.png 2,730,470; banner/banjara_matrimony_banner1.png 2,730,470 (dup); blog/blog-1777097283767-58754147.png 2,305,804; about/3.jpg 774,929; blog/blog-1784050276134-514793281.jpg 661,437; couples/11.jpg 626,114; profiles/profile-large.jpg 600,308; leaf/2.png 511,763; blog/blog-1784055212720-244853729.jpg 467,069; fonts/fontawesome-webfont3e6e.svg 444,379; js/Chart.js 443,106; leaf/4.png 407,019; leaf/5.png 379,484; leaf/8.png 377,198; leaf/11.png 371,049; 3x identical blog jpg 344,325; banner.jpg 333,238; css/style.css 234,039
- Images >300KB: 22; webp files: 14 vs 137 jpg/png; no avif; no srcset anywhere except <picture> on 3 homepage images
- CSS: bootstrap.css 232,926 (Bootstrap 5.3.0, minified content); style.min.css 148,204 (theme 'Wedding Matrimony HTML5 Template' by RN53, 5 Google Fonts @imports); style.css 234,039 (unminified, used only by user-dashboard); animate.min.css 71,750 (animate.css 4.1.1); font-awesome.min.css 31,024 (FA 4.7.0); biodata-builder.min.css 10,019
- JS: jquery.min.js 89,501 (jQuery 3.6.0); bootstrap.min.js 80,421 (BS 5.3.0); popper.min.js 21,004; select-opt.min.js 28,259 (chosen); slick.min.js 40,354 (is ~unminified, near same size as slick.js); custom.min.js 5,024; jquery.validate.min.js 24,368; Chart.js 443,106 (unminified, dashboard only); biodata-builder.min.js 14,147
- Fonts: self-hosted FontAwesome 4.7 (woff2 77KB + legacy eot/ttf/svg/woff); Google Fonts Poppins, Playfair Display, Kalam, Cinzel Decorative, Josefin Sans via CSS @import (display=swap broken by &amp;)
- Third-party: googletagmanager gtag G-GHZ33WVH9T + Google Ads AW-357336842 (analytics.ejs, 25 of 40 templates); Firebase JS 9.22.0 compat app+auth (login, register, forgot-password); cdn.socket.io 4.5.4 (user-chat, ice-breaker-game); Agora RTC N-4.20.0 (user-chat); jsdelivr slick-carousel 1.8.1 CSS (user-dashboard); cdnjs html2pdf.js 0.10.1 (biodata-builder.html); flaticon PNG hotlink (blog, blog-detail)
- Live headers: HTML br/gzip (192,878 B raw -> 30,116 B gzip), etag weak, no Cache-Control on HTML; CSS/JS: content-encoding br, cache-control public, max-age=604800, stale-while-revalidate=86400; images/fonts: max-age=2592000; vary: Origin on all static (from cors middleware); all static served by Node through nginx proxy_pass localhost:4000 (no nginx static/caching)
- Local TTFB (server->itself): / 40ms, /banjara-matrimony-telangana 99ms, /banjara-gotra-list 85ms, /blogs 65ms; HTML sizes: / 192,878; /banjara-gotra-list 181,006; /banjara-matrimony-app 89,210; /banjara-matrimony-telangana 73,220; /features 72,004; /blogs 64,806; /about 60,334; /login 56,941; /contact 48,088; /register 40,740
- Public routes (routes/index.js): /, /about, /faq, /features, /beta-tester, /biodata-builder (sendFile public/biodata-builder.html), /child-safety-policy, /community-feedback, /contact, /sitemap, /login, /register, /signup (canonical->/register), /forgot-password, /reset-password, /admin-email-register, /blogs, /blogs/:category, /blogs/:category/:slug, /blog/:slug, /blog/:category/:slug, /terms-conditions, /privacy-policy, /account-deletion, /banjara-matrimony-app, /lambadi-matrimony, /gormati-matrimony, /banjara-gotra-list, /banjara-community-history, /:slug (banjara-matrimony-* state/city via API), redirects /terms-condition, /plans, /banjara-matrimony-bangalore, /banjara-matrimony-pune
- Auth routes: /thank-you, /onboarding, /ice-breaker-game, /dashboard, /update-profile, /user-interests, /user-chat, /user-setting, /user-plan, /shortlisted, /blocked-users, /notifications, /profile-visitors, /all-profiles, /profile/:userId, /logout; POST /api/regenerate-sitemap (no auth), POST /api/proxy/cities
- Legacy .html: app.js htmlRedirectMap 301s 33 named files + generic .html stripping before express.static, so no duplicate content served; robots.txt still Disallow: /*.html
- Partials per page: header+footer on 37 templates; NOT on ice-breaker-game, onboarding, thank-you (and static biodata-builder.html); analytics.ejs on 25 (missing on 404, account-deletion, blocked-users, child-safety-policy, ice-breaker-game, notifications, onboarding, privacy-policy, profile-details, profile-visitors, shortlisted, terms-conditions, update-profile, user-chat, user-interests, user-plan, user-setting); breadcrumb on contact, about, blog, terms, sitemap, beta-tester, privacy, features, all-profiles; beta-tester-banner on index, about; social-share on blog-detail; blog-section on 2 pages; blog-sidebar unused
- Per-page asset counts (css links / script src / inline style attrs / imgs): index 8/8/464/50; about 4/6/5/6; contact 7/6/5/3; regional-page-state 7/6/159/17; blog 4/4/4/5; banjara-gotra-list 4/6/77/1; register 4/9/2/1; login 4/9/4/4; ai-matrimony-app 7/3/176/2; features 4/6/153/0; user-dashboard 9/9/118/9
- Broken URLs found live: /testimonials 404, /interests 404, /matches 404, /images/profiles/default.jpg 404, /js/jquery-3.6.0.min.js 404, /js/bootstrap.bundle.min.js 404, /images/social-preview.jpg 404, /images/ai-app-banner.jpg 404, /images/community-feedback-banner.jpg 404, /images/app-screenshots.jpg 404, /favicon.ico 404, /blogs/images/blog/* 404 (relative path on category pages)
- APK: live download link https://api.banjaramatch.com/api/download-apk -> 76,224,484 B BanjaraMatch_vapp_1774386805517.apk (API APK manager); web public/downloads/banjaramatch.apk is stale and unlinked
- Blog uploads cross-project write: /var/www/api.banjaramatch.com/controllers/admin/blogController.js:10 writes to ../../../banjaramatch.com/public/images/blog
- Flutter app dir /var/www/banjaramatch.com/banjaramatch_app 47M (outside public/); node_modules 17M
- pm2 banjaramatch-web cwd /var/www/banjaramatch.com, .env keys: GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT

## reusable
- /var/www/banjaramatch.com/views/partials/header.ejs + footer.ejs — already used on 37 pages; extend into a full layouts/base.ejs (head, header, footer, scripts) for the base UI design
- /var/www/banjaramatch.com/views/partials/analytics.ejs — GA4/Ads tracking helpers (trackEvent, trackRegistrationConversion); include once in a shared head partial
- /var/www/banjaramatch.com/views/partials/breadcrumb.ejs — breadcrumb UI (+ likely schema) already parameterised via include locals
- /var/www/banjaramatch.com/app.js htmlRedirectMap (lines 66-96) + generic .html stripper — keep verbatim in monorepo to preserve legacy URL 301s
- /var/www/banjaramatch.com/app.js static setHeaders cache policy (lines 111-135) — keep, add hashed filenames to allow 1y immutable
- /var/www/banjaramatch.com/utils/generateAllSitemaps.js (+ generateSitemap/Blog/Regional/Index) — sitemap pipeline; protect its POST trigger
- /var/www/banjaramatch.com/optimize-images.sh — jpegoptim/optipng/cwebp pipeline (cwebp and convert are installed); adapt for one-time re-encode of public/images
- /var/www/banjaramatch.com/package.json devDependencies clean-css-cli, html-minifier, uglify-js — existing minification tooling for a build step
- /var/www/banjaramatch.com/views/pages/index.ejs <picture> pattern lines 512-515 (webp source + jpg fallback with width/height) — template for responsive images
- /var/www/banjaramatch.com/views/partials/blog-section.ejs — correct absolute featuredImage usage ('/<%= blog.featuredImage %>') to copy into blog.ejs
- /var/www/banjaramatch.com/views/pages/contact.ejs showAlert() inline validation pattern (lines ~215-260) — reuse instead of alert() on register/login

## open_questions
- What are the real member/match counts? All hard-coded stats (10,000+, 5000+, 4000+, 3,500+, 2000+, 1,500+) contradict each other. Should they be removed, or driven from a live API count?
- Are the homepage testimonials (Ramesh Naik, Savita Rathod, ...) and 'Recent Happy Couples' real, consented members, or template content that should be removed?
- Do facebook.com/banjaramatch, instagram.com/banjaramatch, linkedin.com/company/banjaramatch and @BanjaraMatch on Twitter actually exist? They appear in sameAs and twitter:site.
- Which support email is canonical: info@, support@, help@ or privacy@? Is there a real support phone, or should the phone be omitted everywhere?
- Should /all-profiles get a public, indexable teaser (e.g. anonymised cards) for guest searches, or should guest searches go to /register?
- For the monorepo, should the APK and blog/user uploads live in object storage (S3/R2/Spaces) or in a git-ignored shared uploads/ dir served by nginx?
- Is the decorative 'leaf' artwork required in the new base UI design, or can it be dropped?
- Should the static public/biodata-builder.html (a sitemap URL) be converted to an EJS page with the shared header and footer?
