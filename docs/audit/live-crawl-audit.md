# live-crawl-audit

## summary
I crawl-tested the live site read-only on 2026-10-12. The tools were curl and python urllib, GET/HEAD only, plus reading the web/api/admin source and nginx configs. Redirects are clean: http, https non-www and http www each reach https://www.banjaramatch.com/ in one 301. /index.html and *.html go to clean URLs with a 301, and junk paths return a real 404. Case and trailing-slash variants (/About, /ABOUT, /about/, /blogs/) return 200 with a canonical pointing at the clean URL. All 56 sitemap URLs (main 20, blogs 12, regional 24) return 200, are self-canonical and have exactly one H1. None is noindexed and there are no duplicate titles or descriptions. Googlebot and a normal browser get byte-identical HTML, so there is no cloaking. The home title and H1 both literally start with 'Banjara Matrimony'. The serious problems are: (1) a reflected XSS on /blogs/:category, where the URL is written unescaped into a JSON-LD block and there is no CSP; (2) public admin debug/test pages with the default admin email and password hardcoded; (3) unauthenticated destructive API routes (PUT /api/updateSettings, POST /api/deleteUser). On SEO/perf: any /blogs/<junk> returns 200 (soft 404); blog dateModified and the regional sitemap lastmod change on every page view because a view counter bumps updatedAt; there are broken internal links (/testimonials, /interests, /matches, /banjara-matrimony-mumbai, /safety-tips, /community-guidelines); 3.2MB and 2.3MB PNG blog thumbnails load on the home page; the hero image is preloaded twice (jpg and webp); all 5 Google Font @imports in style.min.css lose display=swap because of '&amp;'; pages using relative 'css/...' paths render unstyled on their trailing-slash variants; a full-screen preloader hides the page until jQuery runs plus about 1s; and any request carrying a foreign Origin header gets a 500. Both pm2 HTML responses and assets are brotli-compressed by the Express compression middleware. nginx passes the app's Cache-Control through unchanged (assets: css/js max-age=604800, images max-age=2592000; HTML has none). The API sends no compression, HSTS or nosniff on JSON. Admin has no HSTS, and its static-asset location block drops X-Frame-Options and nosniff. TTFB was measured from the server itself (dns about 1ms, TLS 23-31ms, TTFB 42-96ms, total 43-62ms), so it does not reflect real users' network latency. Raw HTML: home 192,878B (30,116B brotli), /about 60,334B (13,867B), /banjara-matrimony-hyderabad 70,898B (12,777B).

## findings (30)

### [CRITICAL][security] Reflected XSS via /blogs/:category breaking out of JSON-LD script (no CSP on www)
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:47
- evidence: Template: "name": <%- JSON.stringify(title) %>,  (title = `${category} Articles - BanjaraMatch Blog`, routes/index.js:566-595, category from req.params). Live: curl -s "https://www.banjaramatch.com/blogs/%3C%2Fscript%3E%3Cb%3Exsstest%3C%2Fb%3E" -> 200, line 296: "name": "</script><b>xsstest</b> Articles - BanjaraMatch Blog",  and app.js:18 contentSecurityPolicy: false
- impact: An attacker sends a victim a link like /blogs/</script><script>...</script>. Lowercase payloads skip the case-redirect at routes/index.js:572, so the script runs on www.banjaramatch.com. It can read localStorage tokens, act as the logged-in user (chat, profile data) or steal session data. The page is also indexable with a self-canonical.
- fix: In a <script> context never use <%- JSON.stringify(x) %>. Escape '<' as <, e.g. JSON.stringify(x).replace(/</g,'\\u003c'), or use a serialize-javascript helper. Do the same in blog-detail.ejs:34-56. Whitelist category against the known enum and return 404 otherwise. Add a CSP using nonces.

### [CRITICAL][security] Public admin debug/test pages contain hardcoded admin credentials
- where: /var/www/admin.banjaramatch.com/public/debug.html:49
- evidence: curl https://admin.banjaramatch.com/debug.html -> 200 (6166B, no auth) containing: email: 'admin@banjaramatch.com', password: 'admin123'. Same in public/test-auth.html:33 and public/flow-test.html:72 (both 200). api createAdmin.js:22 bcrypt.hash('admin123', 10)
- impact: Anyone can read the default admin login. If the password was never changed, an attacker can log in to the admin panel and get full control of users, settings and broadcast email. I did not POST to test whether the password still works.
- fix: Delete debug.html, test-auth.html, flow-test.html and test-dashboard.html from the admin public folder. Rotate the admin@banjaramatch.com password now. Remove the plaintext password from createAdmin.js. Put the admin host behind server-side auth (nginx auth_request, IP allowlist or basic auth) rather than client-side JS redirects.

### [CRITICAL][security] Unauthenticated API routes: updateSettings mass-assignment and deleteUser of any user_id
- where: /var/www/api.banjaramatch.com/routes/settingsRoute.js:13
- evidence: router.put('/updateSettings', settingsController.updateSettings);  -> controllers/settingsController.js:93-99 'Object.assign(setting, req.body); await setting.save();'  and routes/userRoutes.js:16 router.post('/deleteUser',  UserController.deleteUser); -> UserController.js:1750 'const { user_id } = req.body;' ... 1819 'await user.deleteOne();'  index.js mounts with no global auth: app.use('/api', require('./routes/settingsRoute'));
- impact: Anyone on the internet can overwrite global app settings or delete any member's account by posting a user_id. That means data loss and a production outage. Many other userRoutes (fetchUsersList, sendInterestRequest, fetchMessages, ...) also have no middleware, though their controllers may check req.user internally. I verified this from source only and did not POST.
- fix: Add authenticate to every user route and adminAuth to settings, documentTypes and reportReasons mutations. deleteUser must use req.user._id, not body.user_id, unless the caller is an admin. Whitelist the settings fields that can be updated.

### [HIGH][seo] Soft 404: any /blogs/<anything> returns 200 with self-canonical
- where: /var/www/banjaramatch.com/routes/index.js:566
- evidence: /blogs/zzzz-nonexistent 200 -> <title>Zzzz-nonexistent Articles - BanjaraMatch Blog  <link rel="canonical" href="https://www.banjaramatch.com/blogs/zzzz-nonexistent">; /blogs?category=zzzz 200
- impact: Infinite indexable thin URLs that waste crawl budget. Spammers can create indexable pages with arbitrary text in title, H1 and canonical. This combines with the XSS above.
- fix: Validate category against the Blog category enum (or the categories API) and return a 404 with noindex for unknown values.

### [HIGH][seo] Blog dateModified and regional sitemap lastmod change on every page view
- where: /var/www/banjaramatch.com/views/pages/blog-detail.ejs:38
- evidence: "dateModified": "<%= new Date(blog.updatedAt || ..." ; two consecutive GETs returned "2026-10-12T05:15:05.539Z" then "2026-10-12T05:15:10.561Z". Cause: api controllers/blogController.js:84 Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } }) with timestamps; stateRegionalPageController.js:435 and cityRegionalPageController.js:468 same; sitemap-regional.xml: 24 x <lastmod>2026-10-12; utils/generateRegionalSitemap.js:58 page.updatedAt
- impact: Google learns that lastmod and dateModified are unreliable and ignores them, which hurts how fast real updates get picked up. Every crawl also does a blocking DB write before the response (res is sent after await).
- fix: Increment views with {timestamps:false} (Mongoose option) or store views in a separate collection. Make the increment fire-and-forget. Use a contentUpdatedAt field for dateModified and lastmod.

### [HIGH][seo] Broken internal links (404) from home, about, contact, child-safety pages
- where: /var/www/banjaramatch.com/views/pages/index.ejs:2542
- evidence: Crawl of all 56 sitemap pages: 404 /testimonials, /interests, /matches (from /: index.ejs:2542,2600,2606); 404 /banjara-matrimony-mumbai (about.ejs:214, contact.ejs:97); 404 /safety-tips, /community-guidelines (child-safety-policy.ejs:441,449); 301 /banjara-matrimony-bangalore -> /banjara-matrimony-karnataka
- impact: Wasted link equity and crawl budget, a poor user experience, and Search Console reports 404s found through internal links.
- fix: Fix the hrefs: Bengaluru should point to /banjara-matrimony-bengaluru, and either create a Mumbai page or link Maharashtra. Remove or replace the dead links.

### [MEDIUM][seo] /blogs listing links to /blog/<cat>/<slug> which 301s; 2 blog posts are effectively orphaned
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:158
- evidence: <a href="/blog/<%= blog.category.toLowerCase() %>/<%= blog.slug %>" class="fclick"> ; crawl: 8 x '301 https://www.banjaramatch.com/blog/... -> /blogs/...'; orphan check: blogs/general/banjara-biodata-to-baraat..., blogs/stories/what-makes-a-banjara-love-story-different have no direct internal link from sitemap pages. Share buttons also use /blog/ URLs.
- impact: Every blog link goes through a redirect, which weakens internal linking. Shared links carry the non-canonical URL.
- fix: Link directly to /blogs/<cat>/<slug>, including in share buttons. Add related-post links to blog details and regional pages.

### [MEDIUM][perf] Multi-MB PNG blog thumbnails and oversized images on home page
- where: /var/www/banjaramatch.com/views/pages/index.ejs:?
- evidence: /images/blog/blog-1777096703562-415490148.png len=3203129; /images/blog/blog-1777097283767-58754147.png len=2305804; /images/blog/blog-1784050276134-514793281.jpg len=661437 (rendered width=400 height=250); images/couples/11.jpg len=626114; images/banner.jpg 333238; ban-bg.jpg 314927
- impact: About 7MB of images on the home page. They are lazy-loaded, but mobile users on 3G/4G scroll into them, burning data and hurting INP/LCP on scroll.
- fix: Generate 400w and 800w WebP/AVIF thumbnails when blogs are uploaded (sharp) and use srcset/sizes. Recompress couples and gallery JPGs to under 100KB.

### [MEDIUM][perf] Hero image preloaded twice (webp AND jpg) with fetchpriority=high
- where: /var/www/banjaramatch.com/views/pages/index.ejs:57
- evidence: <link rel="preload" href="/images/ban-bg.webp" as="image" type="image/webp" fetchpriority="high">
<link rel="preload" href="/images/ban-bg.jpg" as="image" fetchpriority="high">  (webp 208988B + jpg 314927B; <picture> uses webp)
- impact: Modern browsers download about 524KB for one LCP image, competing with CSS and slowing LCP.
- fix: Keep only the webp preload (type=image/webp). Better still, use a responsive imagesrcset preload with an 800w mobile variant.

### [MEDIUM][perf] Google Fonts @imports lose display=swap due to HTML-escaped '&amp;' in CSS; 5 chained render-blocking imports
- where: /var/www/banjaramatch.com/public/css/style.css:59
- evidence: @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&amp;display=swap'); (5 imports: Poppins, Playfair Display, Kalam, Cinzel Decorative, Josefin Sans). Test: ...family=Kalam&amp;display=swap -> 0 'font-display: swap'; ...&display=swap -> 1
- impact: Text stays invisible (FOIT) while 5 font families load through @import chains inside a render-blocking stylesheet. This hurts FCP and LCP on every page, and Poppins is also loaded twice on home.
- fix: Replace '&amp;' with '&'. Drop the @imports and use one combined <link> in <head> with preconnect, or self-host woff2 with preload. Remove font families that aren't used.

### [MEDIUM][perf] Full-screen preloader hides content until deferred jQuery runs + 350ms + slow fade
- where: /var/www/banjaramatch.com/public/js/custom.js:135
- evidence: $('#preloader').delay(350).fadeOut('slow');  CSS: #preloader{position:fixed;inset:0px;background-color:#fff;z-index:99999}  (present on all EJS pages via header)
- impact: FCP/LCP are pushed out by roughly the jQuery+bootstrap+slick download plus about 950ms. This is a direct Core Web Vitals penalty on mobile.
- fix: Remove the preloader overlay, or hide it in CSS after DOMContentLoaded with no delay.

### [MEDIUM][seo] Trailing-slash variants render unstyled (relative css/ js/ paths) while returning 200
- where: /var/www/banjaramatch.com/views/pages/about.ejs:59
- evidence: <link rel="stylesheet" href="css/bootstrap.css"> ; /about/css/bootstrap.css -> 404 text/html 22984B; /blogs/css/style.min.css -> 404. Pages with relative refs: / (57), /register (12), /about (14), /contact (17), /blogs (17), /account-deletion, /community-feedback, /beta-tester, /sitemap, /biodata-builder
- impact: /about/, /blogs/ and /faq/ return 200 but render broken. Each missing asset also returns a 22KB HTML 404 page. Canonical limits the SEO damage, but users and external links that hit slash URLs see a broken page.
- fix: Use root-relative /css/, /js/ and /images/ everywhere. Add middleware that 301s trailing slashes and uppercase paths to the lowercase non-slash URL.

### [MEDIUM][perf] Regional pages load bootstrap.css async (media=print) causing FOUC/CLS
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:93
- evidence: <link rel="stylesheet" href="/css/bootstrap.css" media="print" onload="this.media='all'">  while /css/style.min.css is blocking
- impact: The grid and layout CSS arrives after first paint, so the layout shifts (CLS) on all 24 regional pages, which are the main 'banjara matrimony <city>' ranking pages.
- fix: Load bootstrap and style.min blocking, or inline critical CSS. Only font-awesome and animate should be async. Long term: purge Bootstrap (233KB raw) and style.min (148KB raw).

### [MEDIUM][seo] City/state pages ~82-84% textually identical; LocalBusiness schema without address
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:107
- evidence: similarity warangal vs nizamabad=0.84, jaipur vs surat=0.82; JSON-LD: "@type": "LocalBusiness", "name": "BanjaraMatch - <%= cityName %>" ... "geo": {"@type": "GeoCoordinates", "addressLocality": "<%= cityName %>"} (no address, no lat/long). State template line 107 declares Organization 'BanjaraMatch - <state>'
- impact: Doorway or thin-content risk for 24 pages, and invalid structured data. Rich-result validation flags GeoCoordinates without latitude/longitude, and declaring LocalBusiness with no physical location breaks Google's guidelines. Many separate 'Organization' entities split the brand entity.
- fix: Replace LocalBusiness/Organization with WebPage, Service (provider = the single Organization @id) and BreadcrumbList, since the breadcrumbs already exist in the controller. Add unique local content per city: tandas, real member counts, local stories, Telugu/Kannada/Marathi sections.

### [MEDIUM][security] Any request with a non-whitelisted Origin header returns HTTP 500 on www and api
- where: /var/www/banjaramatch.com/app.js:44
- evidence: return callback(new Error('CORS not allowed from this origin: ' + origin), false);  curl -H 'Origin: https://evil.example.com' https://www.banjaramatch.com/ -> 500; /css/style.min.css -> 500; Origin translate.googleusercontent.com on /images/logo-b.png -> 500
- impact: Cross-origin font and image requests, Google Translate proxies, and some crawlers or preview tools get 500s on pages and assets. The logs also fill with errors.
- fix: Call callback(null, false) to omit CORS headers instead of throwing. Apply CORS only to /api routes, not to static or HTML responses.

### [MEDIUM][seo] Fabricated-looking AggregateRating and inconsistent social-proof numbers
- where: /var/www/banjaramatch.com/views/pages/ai-matrimony-app.ejs:86
- evidence: "ratingValue": "4.8", "ratingCount": "2847" (hardcoded, lines 86 and 115); index.ejs:1095 'Trusted by <strong>1,500+</strong> Banjara Couples' vs index.ejs:1377 '1,500+ Profiles'; /api/state-pages stats all 0 ('totalMembers':0)
- impact: Hardcoded, self-serving review markup can lead to a manual action or loss of rich results. Contradictory numbers also undermine E-E-A-T and user trust.
- fix: Remove AggregateRating unless it is fed from Play Store data. Use one consistent stat sourced from the DB.

### [MEDIUM][seo] /account-deletion in sitemap has title 'Wedding Matrimony', no canonical, no description, no OG
- where: /var/www/banjaramatch.com/views/pages/account-deletion.ejs:11
- evidence: <title>Wedding Matrimony</title> ; crawl: canon_ok=False robots=None FLAGS=CANON!=None,NODESC,NO_OGIMG
- impact: An off-brand, generic title for a sitemap URL. Also, /beta-tester, /sitemap and /child-safety-policy have no og:title/og:image/og:url.
- fix: Use the standard head partial (title, description, canonical, OG) on all pages.

### [MEDIUM][seo] Blog titles double the brand suffix ('| BanjaraMatch - BanjaraMatch') and exceed 60 chars
- where: /var/www/banjaramatch.com/views/pages/blog-detail.ejs:6
- evidence: <title><%= blog ? (blog.metaTitle || blog.title) : 'Blog Post' %> - BanjaraMatch</title>  live: 'Banjara Wedding Rituals: Complete Guide | BanjaraMatch - BanjaraMatch'; 10/12 blog titles >60 chars (max 93)
- impact: SERP titles get truncated, and the duplicated brand wastes title characters.
- fix: Append ' - BanjaraMatch' only if metaTitle doesn't already contain 'BanjaraMatch'. Cap at about 60 characters.

### [MEDIUM][seo] robots.txt blocks /register for Bing/Yandex/Baidu though it is in sitemap; /*.html disallow hides legacy 301s
- where: /var/www/banjaramatch.com/robots.txt:81
- evidence: Bingbot group: 'Disallow: /register' (line 81), 'Disallow: /*.html' (lines 42,83,95,107); sitemap-main.xml contains https://www.banjaramatch.com/register; /sign-up.html -> 301 /register
- impact: Bing reports a sitemap URL blocked by robots.txt. Googlebot cannot fetch old indexed .html URLs, so it never sees their 301s, and backlinks to .html pages don't consolidate.
- fix: Remove the /*.html disallow (redirects are cheap) and stop disallowing /register in the other bot groups. Simplify to one * group plus specific AI-bot rules.

### [MEDIUM][seo] AI search crawlers blocked (ChatGPT-User, GPTBot, Google-Extended, Claude-Web, anthropic-ai, CCBot)
- where: /var/www/banjaramatch.com/robots.txt:166
- evidence: User-agent: ChatGPT-User
Disallow: /  ... User-agent: Google-Extended
Disallow: /
- impact: BanjaraMatch can't be cited or linked in ChatGPT browsing or other AI answers for 'banjara matrimony' queries, a growing discovery channel. This is a business choice, so verify it is intended.
- fix: Allow at least ChatGPT-User, OAI-SearchBot and PerplexityBot (citation crawlers). Optionally keep training bots (GPTBot, CCBot) blocked.

### [MEDIUM][security] www has no CSP / Permissions-Policy; nginx version disclosed; API lacks HSTS/nosniff; admin lacks HSTS
- where: /etc/nginx/nginx.conf:21
- evidence: www: server: nginx/1.24.0 (Ubuntu), HSTS max-age=31536000; includeSubDomains, X-Frame DENY, nosniff, Referrer-Policy present; NO content-security-policy, NO permissions-policy. api /api/blogs/featured: only 'x-powered-by: Express' (no HSTS, nosniff). admin: x-frame SAMEORIGIN, nosniff, no HSTS. nginx.conf:21 '# server_tokens off;'
- impact: There is no defence in depth against the XSS above. The exposed version string and Express fingerprint help attackers.
- fix: Set server_tokens off. Add Permissions-Policy and a CSP (report-only first) on www. Use helmet on the API with app.disable('x-powered-by'), and add HSTS on api and admin.

### [MEDIUM][infra] Admin static-asset location drops security headers and caches unversioned JS for 1 year immutable
- where: /etc/nginx/sites-available/admin.banjaramatch.com:50
- evidence: location ~* \.(jpg|...|css|js|...)$ { expires 1y; add_header Cache-Control "public, immutable"; }  curl -I https://admin.banjaramatch.com/js/auth.js -> cache-control: max-age=31536000 / public, immutable; no x-frame-options, no x-content-type-options
- impact: Admin UI fixes to auth.js, or any CSS change, won't reach browsers for a year. That breaks the push-to-deploy goal and the shared UI redesign. Security headers are lost on assets because add_header inside a location overrides the server-level headers.
- fix: Version admin assets with a build hash, or use a short max-age for unhashed files. Repeat the security add_headers inside the location block or move them to an include snippet.

### [MEDIUM][perf] html2pdf bundle (906KB raw / 192KB compressed) render-blocking in head of /biodata-builder
- where: /var/www/banjaramatch.com/public/biodata-builder.html:43
- evidence: <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
- impact: An indexable sitemap page whose first paint is blocked by a 900KB third-party script that is only needed when the user clicks download.
- fix: Load it with defer, or lazy-import it on the 'Download PDF' click.

### [MEDIUM][security] API accepts 150MB JSON/urlencoded bodies; socket.io CORS '*'
- where: /var/www/api.banjaramatch.com/index.js:64
- evidence: app.use(bodyParser.json({ limit: '150mb' }));  ... const io = socketIO(server, { cors: { origin: '*' } });
- impact: A handful of large unauthenticated POSTs can exhaust memory or CPU on the single API process, causing an outage. Any site can open socket connections.
- fix: Set JSON/urlencoded limits to about 1MB and handle uploads through multer with per-route limits. Restrict socket.io origins to the allowed list.

### [LOW][seo] Case/trailing-slash/query duplicates return 200 (canonical-only, no 301); /signup duplicates /register
- where: /var/www/banjaramatch.com/app.js:104
- evidence: /About 200 canonical /about; /ABOUT 200; /about/ 200; /blogs/ 200; /lambadi-matrimony/ 200; /about?page=2 200; /signup 200 canonical /register; /admin-email-register 200 same register page. Regional slugs are case-sensitive: /Banjara-Matrimony-Hyderabad -> 404
- impact: Minor crawl waste. Inconsistent behaviour, where regional uppercase gives 404 but /About gives 200.
- fix: Add one normalisation middleware that 301s uppercase and trailing-slash paths. 301 /signup to /register.

### [LOW][seo] forgot-password / reset-password indexable; admin host has no robots.txt or noindex
- where: /var/www/banjaramatch.com/views/pages/forgot-password.ejs:?
- evidence: /forgot-password 200, no meta robots, <title>Forgot Password - Banjara Matrimony | BanjaraMatch.com, canonical self; /reset-password 200 no robots; admin.banjaramatch.com/robots.txt 404, admin login page no robots meta; api.banjaramatch.com/robots.txt 404 and /uploads/profile_images/* publicly 200
- impact: Utility pages compete for 'Banjara Matrimony' in titles. The admin login could be indexed. Member profile photos on the api host can be crawled if they are ever linked.
- fix: Add noindex to forgot/reset/login. Serve 'User-agent: *\nDisallow: /' plus X-Robots-Tag: noindex on the admin and api hosts. Gate profile_images behind privacy-aware routes.

### [LOW][seo] Keyword targeting gaps: lambadi/gormati H1s don't contain target phrase; /about H1 is 'About Us'; home title 72 chars
- where: /var/www/banjaramatch.com/views/pages/lambadi-matrimony.ejs:?
- evidence: /lambadi-matrimony h1: 'Find Your Lambadi Life Partner From Telangana, AP, Karnataka & Across India' (lambadi matrimony h1=0); /gormati-matrimony h1: 'Find Your Gormati Life PartnerFrom Maharashtra...' (missing space, gormati matrimony h1=0); /about h1 'About Us'; / title 'Banjara Matrimony - Free Matrimonial Site | Find Banjara Brides & Grooms' (72 chars); regional H1s 'Find Your Perfect Banjara Match in X' lack 'Matrimony'
- impact: Missed exact-match H1 signals for secondary keywords. The home title gets truncated in the SERP.
- fix: Use H1s like 'Lambadi Matrimony – Find Lambadi Brides & Grooms', 'Gormati Matrimony – ...' and 'Banjara Matrimony in Hyderabad'. Shorten the home title to 60 characters or fewer, e.g. 'Banjara Matrimony – Free Banjara Brides & Grooms | BanjaraMatch'.

### [LOW][perf] Header logo (84KB PNG, above the fold) lazy-loaded; wrong alt; 54/61 home imgs lack width/height
- where: /var/www/banjaramatch.com/views/partials/header.ejs:71
- evidence: <img src="/images/logo-b.png" alt="BanjaraMatch - Free Banjara Matrimony" loading="lazy" class="logo-brand-only">; line 134 alt="Profile image"; home: imgs total=61 missing_w/h=54
- impact: The logo pops in late, and the missing dimensions contribute to CLS. 'Profile image' is a misleading alt.
- fix: Use eager loading for the logo, convert it to a 5-10KB WebP/SVG and set width/height. Add dimensions to every img.

### [LOW][cleanup] Backup CSS files publicly served; root favicon/manifest missing; stale copyright year
- where: /var/www/banjaramatch.com/public/css/style.min.css.bak-pre-scope-fix:?
- evidence: /css/style.min.css.bak-pre-scope-fix 200 application/octet-stream 148084; /css/biodata-builder.css.backup 200; /favicon.ico 404, /apple-touch-icon.png 404, /manifest.json 404, /.well-known/assetlinks.json 404; custom.js:131 $('#cry').text("2023")
- impact: Clutter and information leakage. Browsers and Google request /favicon.ico and get 22KB 404 HTML pages. Without assetlinks.json, Android App Links for the Flutter app can't verify. The footer shows 2023.
- fix: Remove the *.bak and *.backup files. Serve /favicon.ico, /apple-touch-icon.png and a web manifest. Add .well-known/assetlinks.json for the Play app. Render the year server-side.

### [LOW][perf] API JSON responses uncompressed; APK download ignores Range
- where: /var/www/api.banjaramatch.com/index.js:64
- evidence: curl -H 'Accept-Encoding: gzip, br' https://api.banjaramatch.com/api/state-pages -> content-length: 2372, no content-encoding; GET /api/download-apk with -r 0-10 returned full 76224484 bytes
- impact: More bytes on every SSR call and in the Flutter app. A 76MB APK download can't resume on a flaky mobile connection.
- fix: Add the compression middleware to the API. Serve the APK as a static file through nginx (Range support) or from the Play Store link.

## inventory
- REDIRECTS: http://banjaramatch.com/ -> 301 -> https://www.banjaramatch.com/ (1 hop, 200); http://www. -> 1 hop; https://banjaramatch.com/ -> 1 hop; https://www. -> 200 0 hops
- VARIANTS: /About 200 (canon /about); /ABOUT 200; /about/ 200 (renders unstyled); /blogs/ 200 (unstyled); /index.html 301 -> /; /sign-up.html 301 -> /register; /doesnotexist-xyz 404 (real 404, noindex); /plans 301 -> /features; /signup 200 canon /register; /blog/<slug> 301 -> /blogs/<cat>/<slug>; /blogs/xyz/<slug> 301 -> correct category; /blogs/<junk> 200 SOFT-404; /pricing,/sign-up,/blog,/home,/index 404; private pages (/dashboard,/all-profiles,/profile/123,...) 302 -> /login (noindex,follow)
- SITEMAPS: /sitemap.xml (index, lastmod = file mtime) -> sitemap-main.xml (20 URLs), sitemap-blogs.xml (12), sitemap-regional.xml (24, all lastmod=today); total 56; all 200, no redirects, all self-canonical, none noindex, 0 duplicate titles/descriptions, all lang=en, no hreflang, all have viewport
- URL TABLE (path | status | ms | title | canon-ok | H1 | ld+json types):
- / | 200 | 24 | Banjara Matrimony - Free Matrimonial Site | Find Banjara Brides & Grooms (72ch) | ok | Banjara Matrimony – Find Verified Banjara Brides & Grooms Free | WebSite,Organization,LocalBusiness,FAQPage,BreadcrumbList,ItemList,Service,OfferCatalog,SiteNavigationElement
- /register | 200 | 8 | Register Free on BanjaraMatch | #1 Banjara Matrimony Website | ok | Register on BanjaraMatch | none (desc 181ch)
- /about | 200 | 28 | About BanjaraMatch - Free Banjara Matrimony Platform | Our Mission (66ch) | ok | About Us | Organization,FAQPage,BreadcrumbList
- /contact | 200 | 20 | Contact BanjaraMatch - Help & Support | ok | Contact us | ContactPage,BreadcrumbList
- /blogs | 200 | 38 | Blog & Articles - BanjaraMatch | ok | Blog & Articles | WebPage,Organization,BreadcrumbList
- /features | 200 | 10 | BanjaraMatch Features – India's First Free AI-Powered Banjara Matrimony Platform (80ch) | ok | Every Feature. Always Free.Smarter Than Any Other Matrimony Site. | SoftwareApplication,Organization,Offer,BreadcrumbList
- /terms-conditions | 200 | 6 | Terms & Conditions - BanjaraMatch | Free Banjara Matrimony | ok | Terms & Conditions | BreadcrumbList
- /privacy-policy | 200 | 6 | Privacy Policy - BanjaraMatch | Free Banjara Matrimony | ok | Privacy Policy | BreadcrumbList
- /account-deletion | 200 | 6 | Wedding Matrimony | NO CANONICAL | Account & Data Deletion Request | none (no desc, no OG)
- /community-feedback | 200 | 7 | Community Feedback & Feature Suggestions | BanjaraMatch - Your Voice Matters (76ch) | ok | We Listen, We Learn, We Evolve | ContactPage,Organization,BreadcrumbList
- /beta-tester | 200 | 7 | Join BanjaraMatch Beta Testing - Get Advanced Features First | ok | Join Beta Testing Program | BreadcrumbList (no OG)
- /banjara-matrimony-app | 200 | 6 | Banjara Matrimony App - Find Lambadi Brides & Grooms | Free Download (68ch) | ok | India's Most Trusted Banjara Matrimony App | MobileApplication,SoftwareApplication,AggregateRating,FAQPage,BreadcrumbList (desc 215ch)
- /sitemap | 200 | 32 | Site Map | BanjaraMatch – Free Banjara Matrimony | ok | Site Map | BreadcrumbList (no OG)
- /lambadi-matrimony | 200 | 19 | Lambadi Matrimony | Find Lambadi Brides & Grooms — BanjaraMatch (63ch) | ok | Find Your Lambadi Life Partner From Telangana, AP, Karnataka & Across India | WebSite,WebPage,FAQPage,BreadcrumbList
- /gormati-matrimony | 200 | 21 | Gormati Matrimony | Find Gormati Brides & Grooms — BanjaraMatch (63ch) | ok | Find Your Gormati Life PartnerFrom Maharashtra, Karnataka & All India | WebSite,WebPage,FAQPage,BreadcrumbList
- /banjara-gotra-list | 200 | 49 | Banjara Gotra List – 213 Lambadi Gotras & Clans | BanjaraMatch (62ch) | ok | Complete Banjara Gotra List — 213 Gotras & Clans | Article,WebPage,FAQPage,Organization,BreadcrumbList (181KB HTML)
- /banjara-community-history | 200 | 21 | Banjara Community History — Origin, Culture & Heritage of Banjara People | BanjaraMatch (87ch) | ok | History of the Banjara Community — Origins, Culture & Heritage | Article,WebPage,FAQPage,BreadcrumbList
- /child-safety-policy | 200 | 8 | Child Safety Policy & Standards | BanjaraMatch - CSAE/CSAM Prevention (69ch) | ok | Child Safety Policy & Standards | none (no OG, desc 220ch)
- /biodata-builder | 200 | 6 | Biodata Builder - BanjaraMatch | Create Professional Marriage Biodata (69ch) | ok | Marriage Biodata Builder | none
- /faq | 200 | 19 | FAQ - Frequently Asked Questions | BanjaraMatch | ok | Frequently Asked Questions | FAQPage,WebPage,WebSite,BreadcrumbList
- /blogs/general/banjara-biodata-to-baraat-... | 200 | 24 | Banjara Matrimony Process: Biodata to Baraat Guide - BanjaraMatch (65ch) | ok | Banjara Biodata to Baraat: A First-Timer's Guide... | BlogPosting,WebPage,Organization
- /blogs/stories/what-makes-a-banjara-love-story-different | 200 | 26 | What Makes a Banjara Love Story Different - BanjaraMatch | ok | (same as title) | BlogPosting,WebPage
- /blogs/decoration/traditional-banjara-wedding-d-cor-... | 200 | 26 | Banjara Wedding Décor & Mirror-Work Explained | BanjaraMatch - BanjaraMatch (75ch) | ok | Traditional Banjara Wedding Décor... | BlogPosting,WebPage
- /blogs/events/banjara-teej-and-community-festivals-... | 200 | 25 | Banjara Festivals and Matchmaking Tradition | BanjaraMatch - BanjaraMatch (73ch) | ok | Banjara Teej and Community Festivals... | BlogPosting,WebPage
- /blogs/tradition/understanding-tanda-life-... | 200 | 27 | Tanda Life and Banjara Marriage Customs | BanjaraMatch - BanjaraMatch (69ch) | ok | Understanding Tanda Life... | BlogPosting,WebPage
- /blogs/relationship/long-distance-love-... | 200 | 28 | Long-Distance Banjara Engagements: What Helps - BanjaraMatch | ok | Long-Distance Love... | BlogPosting,WebPage
- /blogs/wedding/banjara-wedding-rituals-and-traditions-... | 200 | 38 | Banjara Wedding Rituals: Complete Guide | BanjaraMatch - BanjaraMatch (69ch) | ok | Banjara Wedding Rituals and Traditions... | BlogPosting,WebPage
- /blogs/tips/red-flags-vs-deal-breakers-... | 200 | 38 | Red Flags vs Deal-Breakers: Banjara Match Meeting Guide - BanjaraMatch (70ch) | ok | Red Flags vs. Deal-Breakers... | BlogPosting,WebPage
- /blogs/tips/how-ai-match-suggestions-... | 200 | 24 | BanjaraMatch AI Match Suggestions Explained (2026) - BanjaraMatch (65ch) | ok | How AI Match Suggestions... | BlogPosting,WebPage
- /blogs/tips/how-to-write-a-banjara-marriage-biodata-... | 200 | 27 | Banjara Marriage Biodata Format — Complete Guide - BanjaraMatch (63ch) | ok | How to Write a Banjara Marriage Biodata... | BlogPosting,WebPage
- /blogs/culture/banjara-gotra-list-and-marriage-rules-... | 200 | 32 | Banjara Gotra List & Marriage Rules – Complete Guide 2026 - BanjaraMatch (72ch) | ok | Banjara Gotra List and Marriage Rules... | BlogPosting,WebPage
- /blogs/community/welcome-to-banjaramatch-com-... | 200 | 25 | Welcome to BanjaraMatch.com – AI Powered Matchmaking for the Banjara Community - BanjaraMatch (93ch) | ok | Welcome to BanjaraMatch.com – AI Powered... | BlogPosting,WebPage
- STATE pages (delhi, madhya-pradesh, maharashtra, telangana, andhra-pradesh, karnataka, rajasthan, gujarat) | 200 | 49-58ms | 'Banjara Matrimony in <State> | Lambadi/Lambani Brides & Grooms' (MP & AP 61ch) | ok | 'Find Your Perfect Banjara Match in <State>' (Delhi: 'Find Your Banjara Life Partner in Delhi — 100% Free') | Organization,State,FAQPage (no BreadcrumbList)
- CITY pages (hyderabad, warangal, nizamabad, karimnagar, visakhapatnam, vijayawada, guntur, bengaluru, belagavi, kalaburagi, jaipur, jodhpur, udaipur, ahmedabad, surat, vadodara) | 200 | 39-68ms | 'Banjara Matrimony in <City> | Lambadi/Lambani/Vanjara Brides & Grooms' | ok | 'Find Your Perfect Banjara Match in <City>' | LocalBusiness,City,GeoCoordinates,FAQPage (no BreadcrumbList)
- KEYWORDS 'banjara matrimony' (title/h1/h2/first200/alt/body): / 1/1/2/8/8/35; /about 1/0/1/7/1/11; /lambadi-matrimony 0/0/1/6/1/10; /gormati-matrimony 0/0/1/6/1/10; /banjara-gotra-list 0/0/0/6/1/8; /banjara-matrimony-hyderabad 1/0/1/7/2/10; /banjara-matrimony-telangana 1/0/1/7/2/10
- KEYWORDS other: 'lambadi matrimony' on /lambadi-matrimony title=1 h1=0 h2=4 first200=2 body=11; 'gormati matrimony' on /gormati-matrimony title=1 h1=0 h2=2 first200=2 body=10; 'banjara gotra' on /banjara-gotra-list title=1 h1=1 h2=1 first200=3 body=14; home word count 2500, 24 H2s
- PERF (from server): / dns=0.001 connect=0.001 tls=0.031 ttfb=0.052 total=0.053 plain=192878B br=30116B; /about ttfb=0.042 plain=60334 br=13867; /banjara-matrimony-hyderabad ttfb=0.062 plain=70898 br=12777
- HOME resources: 25 <script> (9 external), 4 render-blocking css (bootstrap.css 232926B raw/33128 br, style.min.css 148204/32209, font-awesome 31024/7010 async, animate 71750/5352 async), js deferred: jquery 89501/31907, bootstrap.min 80421/23984, popper 21004/7613, slick 40354/10149, select-opt 28259/6969, custom.min 5024/1495; 61 <img> (54 missing width/height, 54 lazy); html5shiv/respond.js only inside IE conditional comment (404 but harmless)
- CACHE: css/js 'public, max-age=604800, stale-while-revalidate=86400' (unversioned URLs); images 'public, max-age=2592000, stale-while-revalidate=86400'; HTML no cache-control, weak ETag; set by Express (nginx proxies unchanged, does not strip); compression by Express compression() (br), nginx gzip on but gzip_types commented
- SECURITY HEADERS www: HSTS max-age=31536000; includeSubDomains | X-Frame-Options DENY | nosniff | Referrer-Policy strict-origin-when-cross-origin | CORP same-origin | NO CSP | NO Permissions-Policy | server: nginx/1.24.0 (Ubuntu)
- SECURITY HEADERS api: x-powered-by Express, CSP default-src 'none' only on 404 pages, no HSTS, no X-Frame; admin: X-Frame SAMEORIGIN, nosniff, X-XSS-Protection, no HSTS, no CSP
- API host: / -> 404 (public/admin-panel.html no longer exists although index.js still routes '/' to it); /uploads/ -> 404 (no listing); /uploads/profile_images/<file> 200 public; public GETs: /api/state-pages, /api/city-pages, /api/blogs/*, /api/fetchClanList, /api/fetchSurnameTitleList, /api/getIcebreakerStats, /api/download-apk (76,224,484B APK); /api/settings 404
- ADMIN host without cookies: / 200 (login.html), /users.html 200 36835B full UI shell (client-side redirect only, users.html:783), /debug.html 200, /test-auth.html 200, /flow-test.html 200, /test-dashboard.html 200, /robots.txt 404
- ROBOTS: Sitemap directives present (4); Googlebot group allows all sitemap URLs; Bingbot/Yandex/Baidu disallow /register (in sitemap); Disallow /*.html in all groups; assets (/css,/js,/images) allowed; AI bots blocked; * group Crawl-delay 10
- MISC FILES: /ads.txt 200 (placeholder comment only), /favicon.ico 404 (icon at /images/fav.ico), /apple-touch-icon.png 404, /manifest.json 404, /site.webmanifest 404, /.well-known/assetlinks.json 404
- DUPLICATES: /blog/<slug> 301 -> /blogs/<cat>/<slug> (OK); /signup 200 canonical->/register; /plans 301 -> /features; /admin-email-register 200 = register page; blog category pages /blogs/{wedding,tips,culture,community,general,stories,decoration,events,tradition,relationship,regional} 200 self-canonical, not in sitemap; ?page=N canonicalises to page 1
- NO CLOAKING: Googlebot UA vs Chrome UA identical md5 for /, /about, /banjara-matrimony-hyderabad, /blogs, /register
- OG: home og:image /images/banjara-matrimony-cover.jpg 200 138878B; twitter:card summary_large_image on main pages; no og:url on /account-deletion, /beta-tester, /sitemap, /child-safety-policy
- Sitemap generators: /var/www/banjaramatch.com/utils/generateAllSitemaps.js, generateSitemapIndex.js, generateRegionalSitemap.js, generateSitemap.js; triggered at app.js:160-173 and routes/index.js:1213
- Regional SSR data comes from api /api/state-pages/:slug and /api/city-pages/:slug (controllers/stateRegionalPageController.js, cityRegionalPageController.js)

## reusable
- /var/www/banjaramatch.com/views/partials/header.ejs - shared header/logo partial; fix the logo here to cover all EJS pages
- /var/www/banjaramatch.com/views/partials/analytics.ejs - shared GA include already used by blog.ejs; the pattern to follow for a shared <head> SEO partial (title/desc/canonical/OG/JSON-LD)
- /var/www/banjaramatch.com/utils/generateAllSitemaps.js + generateRegionalSitemap.js + generateSitemapIndex.js - working sitemap pipeline; only the lastmod source needs fixing
- /var/www/banjaramatch.com/app.js lines 98-110 - existing legacy .html -> clean URL 301 map; extend for slash/case normalisation
- /var/www/banjaramatch.com/routes/index.js:566 /blogs/:category - already has the case-canonicalisation redirect; add a category whitelist here
- /var/www/banjaramatch.com/views/pages/regional-page-city.ejs / regional-page-state.ejs - single templates for all 24 regional pages; the controller already builds breadcrumbs (stateRegionalPageController.js:429) that can be emitted as BreadcrumbList
- Express compression + helmet already wired in /var/www/banjaramatch.com/app.js:7-21,57 - enable CSP/Permissions-Policy there
- /var/www/banjaramatch.com/views/pages/404.ejs - real 404 with noindex; reuse for unknown blog categories

## open_questions
- Is admin@banjaramatch.com still using the password 'admin123'? Testing it would need a POST, which this read-only run did not do. Rotate it regardless.
- Is blocking ChatGPT-User, GPTBot, Google-Extended and Claude-Web in robots.txt intended? It removes the site from AI-assistant citations.
- Do any controllers behind the unauthenticated userRoutes (fetchUsersList, fetchMessages, sendInterestRequest, ...) check req.user internally? Only deleteUser and updateSettings were verified as having no auth at all.
- Should /banjara-matrimony-mumbai and /banjara-matrimony-bangalore exist as pages, or should their links be changed to the Maharashtra and Bengaluru pages?
- Is the 2847-rating / 4.8 AggregateRating backed by real Play Store data?
- TTFB was measured from the server itself; a real-user test from India (PageSpeed Insights / CrUX) is still needed for field Core Web Vitals.
