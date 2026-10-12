# web-routes-seo

## summary
I read all of app.js, routes/index.js (1244 lines), the header, footer and breadcrumb partials, blog.ejs, blog-detail.ejs, both regional templates, the head and body links of the gotra page, the whole head plus SEO sections of index.ejs, every utils/generate*.js, robots.txt, the four sitemap XMLs, nginx, and the public regional-page and blog controllers in the API. I also checked the behaviour against the live site with curl. Hosts are handled correctly: http and non-www go to https://www in one 301. Every legacy .html URL 301s through an explicit map or a generic strip, and the 404 handler returns a real 404. The main problems are that a short API outage would make every regional page and blog post return 404, and that the API serves unpublished regional pages. State pages have no links to their own city pages because the template reads a field the API never sends, so the 16 city pages are only linked from /sitemap. Category blog listings show broken images and link to posts through a 301. Some structured data is made up: a fake app rating (4.8 from 2847), a placeholder phone number, and fallback member counts. Sitemap lastmod is meaningless because every page view updates updatedAt. The home page targets 'banjara matrimony' well: it starts the title, opens the H1, and appears all through the body. Regional pages put it in the H1 and title, but about 60% of their text is the same template wording, which risks being treated as doorway pages. Outside SEO, I found one critical security issue: the API's .env sets JWT_SECRET to the public default 'your_jwt_secret', so anyone can forge login tokens for any user or admin.

## findings (28)

### [CRITICAL][security] JWT secret is the public default 'your_jwt_secret', so anyone can forge user or admin tokens
- where: /var/www/api.banjaramatch.com/.env:2
- evidence: grep -c '^JWT_SECRET=your_jwt_secret$' .env -> 1 ; controllers/admin/authController.js:5 `const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';` ; web routes/index.js:7 same fallback (web .env has no JWT_SECRET key)
- impact: Anyone can sign a JWT `{_id, role}` with the known secret, set it as the `token` cookie (.banjaramatch.com) and act as any user or admin on the API, admin panel and website. Full account takeover and data exposure.
- fix: Generate a random secret of at least 64 bytes and set it in a single shared env for api and web (monorepo root .env or pm2 ecosystem). Remove the `|| 'your_jwt_secret'` fallbacks and fail at startup if it is missing. Rotating the secret will log out all users, so plan for that.

### [HIGH][seo] Regional pages and blog posts return 404 when the API is down or slow, which can get them de-indexed
- where: /var/www/banjaramatch.com/routes/index.js:1165
- evidence: } catch (stateError) {
        // Not found in either collection
        return next();
 ... } catch (error) { console.error('Error fetching regional page:', error.message);
    return next(); // Pass to 404 handler  (also blog: 665-673 `res.status(404).render('pages/blog-detail'` on any axios error)
- impact: Any API timeout, 500 or restart while Googlebot crawls makes all 24 regional landing pages and every blog post return a hard 404. Repeated 404s drop them from the index. No axios timeout is set, so requests can also hang.
- fix: Treat only an upstream 404 as not-found. For network errors, 5xx or timeouts, return 503 with Retry-After, or serve a cached copy. Add an axios timeout and a short in-memory or Redis cache keyed by slug.

### [HIGH][seo] Unpublished (draft) regional pages are publicly served and indexable
- where: /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js:426
- evidence: const page = await CityRegionalPage.findOne({ slug, isActive: true })   (state: stateRegionalPageController.js:397 `StateRegionalPage.findOne({ slug, isActive: true })`; listing uses `{ isActive: true, isPublished: true }`; model default `isPublished: { type: Boolean, default: false }`)
- impact: Any draft page an admin creates is live at /banjara-matrimony-<slug> with `index, follow`, while the sitemap leaves it out. Half-finished or boilerplate pages leak into Google and add to doorway risk.
- fix: Add `isPublished: true` to the public slug queries. Admin previews can use an authenticated ?preview token, or render with noindex.

### [HIGH][internal-linking] State pages never link to their city pages, and city pages never link back to their state
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:968
- evidence: <% if (page.pageType === 'state' && page.interlinking && page.interlinking.relatedCityPages && ... %>  -- API returns `processedPage.relatedCityPages` (no `interlinking`, no `pageType`); city template line 153 `<% if (page.interlinking && page.interlinking.statePage) { %>` while model field is `statePage`; API's `sameStateCities` is never rendered. Live: /banjara-matrimony-telangana has 0 links to hyderabad/warangal/nizamabad/karimnagar.
- impact: All 16 city pages are effectively orphans, reachable only through /sitemap and the XML sitemap. The state pages pass no link equity to them, so city keywords like 'banjara matrimony hyderabad' are under-supported.
- fix: Render `page.relatedCityPages` as links on state pages. On city pages, link to the parent via `page.statePage.slug` and show `page.sameStateCities`. Add a /banjara-matrimony-by-state hub, or make /sitemap the hub, and link it from the home page.

### [HIGH][structured-data] Fabricated aggregateRating (4.8 from 2847 ratings) in app-page schema
- where: /var/www/banjaramatch.com/views/pages/ai-matrimony-app.ejs:83
- evidence: "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "2847"
    }, ... "operatingSystem": "Android, iOS"
- impact: Hardcoded review markup with no visible reviews breaks Google's structured-data spam policy and can trigger a manual action that affects the whole domain. It also claims iOS, which is not available.
- fix: Remove aggregateRating unless it is pulled from real Play Store data shown on the page. Merge the duplicate MobileApplication and SoftwareApplication blocks into one, with an accurate operatingSystem.

### [HIGH][seo] Blog category listings link to posts through a 301 and show broken images
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:158
- evidence: <a href="/blog/<%= blog.category.toLowerCase() %>/<%= blog.slug %>" class="fclick"></a>  and line 129 `<img src="<%= blog.featuredImage || ... %>"` -> live /blogs/tips renders `src="images/blog/blog-...jpg"`; curl /blogs/images/blog/blog-1777097283767-58754147.png -> 404
- impact: Every post link on /blogs and /blogs/:category goes through a redirect, which wastes crawl budget and dilutes link signals. On /blogs/:category every card image is a 404, which hurts UX, image SEO and CLS.
- fix: Link directly to `/blogs/<cat>/<slug>` and make image paths root-relative (`/` + featuredImage, normalised once in a helper).

### [HIGH][structured-data] Placeholder phone number +91-9876-543-210 in Organization/LocalBusiness schema and visible pages
- where: /var/www/banjaramatch.com/views/pages/index.ejs:93
- evidence: "telephone": "+91-9876-543-210",  (also index.ejs:207, index.ejs:1262 `Free Enquiry <em>+91 9876 543 210</em>`, terms-conditions.ejs:485, privacy-policy.ejs:340)
- impact: Fake contact data in entity markup and legal pages hurts E-E-A-T and trust signals, and users may call a stranger. The LocalBusiness block also has no street address, so it is invalid.
- fix: Use a real number or remove telephone. Replace LocalBusiness with Organization plus OnlineService/Service, and keep one canonical Organization block in a shared partial.

### [MEDIUM][seo] Soft-404: any /blogs/<anything> returns 200 with self-canonical and index
- where: /var/www/banjaramatch.com/routes/index.js:566
- evidence: router.get('/blogs/:category', ...) -> live /blogs/foo: 200, `<title>Foo Articles - BanjaraMatch Blog</title>`, `<link rel="canonical" href="https://www.banjaramatch.com/blogs/foo">`; /blogs/success%20stories -> 200 (linked from /sitemap)
- impact: There are infinitely many indexable, thin, empty category pages, and Search Console will report soft 404s.
- fix: Whitelist categories from the Blog enum (or GET /api/blogs/categories). Return 404 for unknown ones, and also when the page number is beyond the last page.

### [MEDIUM][seo] Paginated blog pages canonicalise to page 1
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:17
- evidence: <% if (category) { %>
    <link rel="canonical" href="https://www.banjaramatch.com/blogs/<%= category.toLowerCase() %>">  -> live /blogs?page=2 canonical = /blogs
- impact: Pages 2+ tell Google they duplicate page 1, so older posts lose their crawl path from the listing.
- fix: Use a self-referencing canonical that includes ?page=N for N>1, and make page titles unique (e.g. 'Page 2').

### [MEDIUM][sitemap] Sitemap lastmod is overwritten by page views, so lastmod is meaningless
- where: /var/www/api.banjaramatch.com/controllers/blogController.js:84
- evidence: await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });  (same in city/state getBySlug; models have `timestamps: true`) -> sitemap-regional.xml: all 24 `<lastmod>2026-10-12`
- impact: Each view, including Googlebot crawls and /blog/ legacy redirects, bumps updatedAt. lastmod and BlogPosting.dateModified always read 'today', so Google learns to ignore the site's lastmod.
- fix: Increment views with `{ timestamps: false }` or a separate counter collection. Add an explicit contentUpdatedAt field and use it for lastmod and dateModified.

### [MEDIUM][redirects] /banjara-matrimony-bangalore redirects to the Karnataka state page although a Bengaluru city page exists
- where: /var/www/banjaramatch.com/routes/index.js:230
- evidence: router.get('/banjara-matrimony-bangalore', (req, res) => res.redirect(301, '/banjara-matrimony-karnataka'));  -- sitemap-regional.xml contains https://www.banjaramatch.com/banjara-matrimony-bengaluru
- impact: Searches for 'Bangalore' land on the less relevant state page. about.ejs:214 also links to this redirect.
- fix: Point the 301 at /banjara-matrimony-bengaluru (keep it a 301) and update the about.ejs link.

### [MEDIUM][internal-linking] Broken internal links from home and about pages
- where: /var/www/banjaramatch.com/views/pages/index.ejs:2542
- evidence: <a href="/testimonials" ...> (404), index.ejs:2600 `<a href="/interests"` (404), index.ejs:2606 `<a href="/matches"` (404); about.ejs:214 `<a href="/banjara-matrimony-mumbai"` (404)
- impact: The home page, the strongest page for 'banjara matrimony', links to three 404s, and the about page links to a 404 regional slug. This wastes link equity and looks low-quality.
- fix: Change them to /user-interests, /dashboard and /blogs/stories, or remove them. Point Mumbai to /banjara-matrimony-maharashtra or create the page. Add a link checker to CI.

### [MEDIUM][structured-data] Breadcrumbs show duplicate 'Home' entries and escape JSON-LD values as HTML
- where: /var/www/banjaramatch.com/views/partials/breadcrumb.ejs:59
- evidence: "name": "<%= crumb.name %>",  ; partial always prepends Home while routes also pass it: routes/index.js:329 `{ name: 'Home', url: '/' }` (features, banjara-matrimony-app, child-safety-policy, community-feedback). Live /features BreadcrumbList names: Home, Home, Features
- impact: The BreadcrumbList is invalid or misleading. Names containing quotes or & show up as &#34; or &amp; in rich results.
- fix: Stop passing Home from routes. Build the JSON-LD with JSON.stringify, as blog.ejs:47 already does.

### [MEDIUM][structured-data] Regional pages lack BreadcrumbList/Service schema and their FAQ JSON-LD is HTML-escaped
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:124
- evidence: "name": "<%= faq.question %>", ... "text": "<%= faq.answer %>"  -> live telangana FAQPage contains '&#' entities; the breadcrumb (state 141-149, city 153-165) is plain HTML with no schema
- impact: FAQ text is garbled, and a newline or quote in CMS content breaks the JSON. There are no breadcrumb rich results for the main ranking pages.
- fix: Use JSON.stringify for every JSON-LD value. Include the shared breadcrumb partial with Home > State > City, and add a Service block with areaServed instead of per-city Organization/LocalBusiness.

### [MEDIUM][business-logic] Regional pages show fabricated stats (fallback '150+/500+' and successStories = 5% of members)
- where: /var/www/api.banjaramatch.com/controllers/stateRegionalPageController.js:470
- evidence: successStories: Math.floor(totalMembers * 0.05) || 0,  ; template regional-page-state.ejs:292 `<%= page.stats.successStories || '150+' %>` and :301 `<%= page.stats.totalMembers || '500+' %>` -> live Telangana shows 150+/500+/250+/250+
- impact: Made-up success-story and member counts are misleading claims (consumer-protection and trust risk). Identical numbers on every page also strengthen the doorway-page signal.
- fix: Show real counts only, or hide the counter block below a threshold. Remove the 0.05 multiplier.

### [MEDIUM][seo] Doorway/thin risk: regional pages are about 60% shared template text
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:180
- evidence: India's First <strong>Free</strong> <b>Banjara Matrimony</b> in <%= cityName %>  ... 5-word shingle Jaccard (city name normalised) hyderabad/jaipur = 0.61, hyderabad/karimnagar = 0.63
- impact: 24+ near-identical pages that differ mainly by place name match Google's doorway-page pattern. The site could be demoted, including for the head term.
- fix: Require unique intro/about/FAQ/testimonial content before isPublished=true. Show real local data such as gotra and profession distribution. Cut the repeated sub-community blurbs, and add links between neighbouring cities and to related blog posts.

### [MEDIUM][seo] /account-deletion is in the sitemap with title 'Wedding Matrimony', empty description and no canonical
- where: /var/www/banjaramatch.com/views/pages/account-deletion.ejs:11
- evidence: <title>Wedding Matrimony</title> ... <meta name="description" content="">  ; utils/generateSitemap.js:75 `loc: 'account-deletion'`
- impact: A low-quality page with a generic title is submitted for indexing.
- fix: Give it a proper title and description and either noindex it and drop it from the sitemap, or keep it with priority 0.1. Play Store needs the URL reachable, not indexed.

### [MEDIUM][robots] robots.txt blocks legacy .html redirects, blocks /register for Bing while the sitemap lists it, and blocks AI search bots
- where: /var/www/banjaramatch.com/robots.txt:42
- evidence: Disallow: /*.html   (Googlebot group) ; line 81 `Disallow: /register` (Bingbot, also Yandex 94, Baidu 106) ; line 252 `Disallow: /*?category=*` (*) ; lines 166-179 `User-agent: ChatGPT-User / GPTBot / Claude-Web ... Disallow: /`
- impact: Google cannot crawl the old .html URLs to see their 301s, so their backlink equity is not consolidated. Bing reports the main conversion URL as 'submitted but blocked'. Footer and home links use ?category=, which other bots cannot follow. The brand is invisible to ChatGPT and Claude answers about 'banjara matrimony'.
- fix: Remove `Disallow: /*.html` and the /register disallows. Switch internal links to /blogs/<cat>. Decide on AI bots deliberately (allow OAI-SearchBot, ChatGPT-User and PerplexityBot for visibility). Simplify to a single `User-agent: *` group plus explicit blocks.

### [MEDIUM][seo] Trailing-slash and uppercase variants return 200, and relative asset paths break on them
- where: /var/www/banjaramatch.com/views/pages/about.ejs:59
- evidence: <link rel="stylesheet" href="css/bootstrap.css">  -> live /about/ 200, /ABOUT 200, /about/css/bootstrap.css 404 (relative paths also in index, register, login, contact, sitemap, beta-tester, community-feedback ...)
- impact: There are duplicate URLs (canonical tags limit the damage), and /about/ or /register/ render without CSS for users who arrive via such links.
- fix: Add middleware that 301s a trailing slash (except /) and uppercase paths to lowercase without the slash, or set Express strict routing. Make every asset path root-relative in the shared head partial.

### [MEDIUM][security] Unauthenticated POST /api/regenerate-sitemap on the public site
- where: /var/www/banjaramatch.com/routes/index.js:1209
- evidence: router.post('/api/regenerate-sitemap', async (req, res) => { ... const success = await generateAllSitemaps();
- impact: Anyone can trigger repeated sitemap rebuilds. Each one fans out to API calls with retries and rewrites files in public/, which is cheap amplification for a DoS.
- fix: Protect it with a shared secret header or admin JWT, or move it into the API/admin internal network.

### [MEDIUM][sitemap] An empty API response overwrites the regional sitemap with zero URLs
- where: /var/www/banjaramatch.com/utils/generateRegionalSitemap.js:147
- evidence: if (pages.length === 0) {
      console.warn('⚠️ No regional pages found');
      // Create empty sitemap ... fs.writeFileSync(filePath, emptyXml, 'utf8');
- impact: A transient DB glitch that returns [] empties the sitemap of the main ranking pages until the next 6-hour run. Generated files also live in the git-tracked public/ folder with mixed owners (sitemap-main.xml owned by root).
- fix: Keep the previous file when the count is 0 or drops sharply. Write sitemaps to a runtime dir outside git, or serve them dynamically with caching.

### [MEDIUM][structured-data] Home page: duplicate FAQPage, a SearchAction pointing at a login-walled URL, and ItemList of SiteNavigationElement
- where: /var/www/banjaramatch.com/views/pages/index.ejs:145
- evidence: "urlTemplate": "https://www.banjaramatch.com/all-profiles?search={search_term_string}"  ; FAQPage both as JSON-LD (line 250) and microdata `itemscope itemtype="https://schema.org/FAQPage"` (line 2319)
- impact: Two FAQPage entities on one page and a SearchAction whose target 302s to /login are invalid or ignored markup. FAQ rich results are limited to gov/health sites anyway.
- fix: Keep one FAQ markup, remove the SearchAction and the SiteNavigationElement ItemList, and use a single Organization plus WebSite block from a shared partial.

### [MEDIUM][seo] Blog post page: share links use the legacy /blog/ URL, the breadcrumb links to ?category=, there is no BreadcrumbList, and the newsletter form is broken
- where: /var/www/banjaramatch.com/views/pages/blog-detail.ejs:123
- evidence: sharer.php?u=https://www.banjaramatch.com/blog/<%= blog.category.toLowerCase() %>/<%= blog.slug %>  ; line 99 `<a href="/blogs?category=<%= blog.category %>">` ; line 310 `fetch('/api/newsletter/subscribe'` (no such route in web app) ; lines 185-188 fake '10K Twitter / 100K Youtube' counts
- impact: Social shares and backlinks pile up on redirecting URLs. Breadcrumb links go to a duplicate URL that robots blocks for other bots. Newsletter signups silently fail.
- fix: Use the canonical URL (already passed as `shareUrl` by the route at line 660). Include the breadcrumb partial with /blogs/<cat>. Implement or remove the newsletter form, and remove the fake follower counts.

### [LOW][seo] /signup serves a duplicate of /register (200) instead of a 301
- where: /var/www/banjaramatch.com/routes/index.js:456
- evidence: router.get('/signup', redirectIfAuthenticated, (req, res) => {
  res.render('pages/register', {
- impact: Duplicate URL that relies on the canonical tag. /forgot-password and /reset-password are also indexable with no noindex.
- fix: 301 /signup to /register, and add noindex to forgot/reset-password.

### [LOW][maintainability] Titles passed from routes are ignored by most templates, so there are two sources of truth
- where: /var/www/banjaramatch.com/routes/index.js:255
- evidence: title: 'Banjara Match - Find Your Life Partner',  vs index.ejs:4 `<title>Banjara Matrimony - Free Matrimonial Site | Find Banjara Brides & Grooms</title>` (same for gormati, lambadi, about, contact, features)
- impact: SEO edits in routes have no effect, and templates drift (e.g. gotra template prints '0 Gotras' when the API fails, ignoring the route's fallback title).
- fix: Create one shared `partials/head.ejs` that takes {title, description, canonical, robots, og, jsonLd[]} from the route or a central SEO map, so every page renders the same tags.

### [LOW][seo] Gotra page returns 200 with '0 Gotras' title and empty list when the API fails
- where: /var/www/banjaramatch.com/views/pages/banjara-gotra-list.ejs:4
- evidence: <title>Banjara Gotra List – <%= gotras.length %> Lambadi Gotras & Clans | BanjaraMatch</title>  (routes/index.js:117-126 catch renders gotras: [])
- impact: A crawl during an API hiccup records a thin page titled '0 Lambadi Gotras'.
- fix: Cache the gotra and clan lists (they rarely change) and return 503 when there is no data.

### [LOW][security] Slug passed unencoded into the upstream API URL
- where: /var/www/banjaramatch.com/routes/index.js:1152
- evidence: axios.get(`${AUTH_SERVER_URL}/api/city-pages/${slug}`)  ; line 631 `axios.get(`${AUTH_SERVER_URL}/api/blogs/${slug}`)`
- impact: A decoded %2F or ../ in the slug can redirect the server-side GET to other public API paths (path injection / limited SSRF).
- fix: Use encodeURIComponent(slug) and validate it against /^[a-z0-9-]+$/.

### [LOW][ui] Hardcoded stale copyright years, duplicate copyright bars, and generic logo alt text
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:1103
- evidence: <p>Copyright © <span id="cry">2024</span> <a href="/" target="_blank">Banjaramatch.com</a>  ; blog.ejs:307 `2025`; footer.ejs:111 already prints 2026; header.ejs:134 logo `alt="Profile image"`
- impact: Looks stale and unprofessional. The logo link opens the home page in a new tab, and the alt text is wrong.
- fix: Render the year server-side in a single footer partial, remove the per-page cr sections, and use alt="BanjaraMatch – Banjara Matrimony".

## inventory
- HOST: nginx 80 (both hosts) -> 301 https://www.banjaramatch.com$request_uri; 443 banjaramatch.com -> 301 www; www -> proxy localhost:4000 (no nginx static or gzip; all static files go through Express, compression threshold 1024)
- EXPRESS DEFAULTS: case-insensitive and non-strict routing, so /about/, /ABOUT and /lambadi-matrimony/ all return 200 (canonical tags only)
- LEGACY .html 301 MAP (app.js:67-101): /index.html->/, /login.html->/login, /sign-up.html->/register, /about.html|/about-us.html->/about, /contact.html|/enquiry.html|/make-reservation.html->/contact, /all-profiles.html->/all-profiles, /user-profile.html|/user-dashboard.html|/user-my-matches.html|/profile-details.html->/dashboard, /user-profile-edit.html->/update-profile, /user-interests.html->/user-interests, /user-setting.html->/user-setting, /coming-soon.html|/photo-gallery-1.html|/photo-gallery.html|/wedding.html|/wedding-video.html|/404.html->/, /blog-detail.html|/blog.html->/blogs, /faq.html->/about, /plans.html|/services.html|/user-plan.html->/features, /biodata-builder(-v2|-old-24templates|-backup)?.html->/biodata-builder, /user-chat.html->/user-chat; any other *.html -> 301 to the same path without .html (runs before express.static)
- ROUTER 301s: /terms-condition->/terms-conditions; /plans->/features; /banjara-matrimony-bangalore->/banjara-matrimony-karnataka; /banjara-matrimony-pune->/banjara-matrimony-maharashtra; /blogs/:Category (uppercase)->lowercase (query kept); /blogs/:Cat/:slug uppercase->lowercase; /blogs/:wrongcat/:slug->/blogs/<actual cat>/:slug; /blog/:slug->/blogs/<cat>/:slug (API lookup, 404 if missing); /blog/:category/:slug->/blogs/:category/:slug (no lookup)
- INDEXABLE (200, index/canonical self, in sitemap-main): /, /register, /about, /contact, /blogs, /features, /terms-conditions, /privacy-policy, /account-deletion (no robots meta or canonical), /community-feedback, /beta-tester, /banjara-matrimony-app, /sitemap, /lambadi-matrimony, /gormati-matrimony, /banjara-gotra-list, /banjara-community-history, /child-safety-policy, /biodata-builder (sendFile public/biodata-builder.html), /faq
- INDEXABLE DYNAMIC: /blogs/:category (any value -> 200, e.g. wedding, relationship, culture, decoration, events, tradition, tips, stories, community, general); /blogs/:category/:slug (12 posts in sitemap-blogs); /blogs?category=X and ?page=N (canonical to /blogs/x and /blogs)
- REGIONAL CATCH-ALL router.get('/:slug') (routes/index.js:1138) — must stay LAST; only handles slugs starting 'banjara-matrimony-'. Tries GET api /api/city-pages/:slug, and on throw tries /api/state-pages/:slug; renders regional-page-city or regional-page-state; any failure -> next() -> 404. Explicit routes /banjara-matrimony-app, -bangalore and -pune are declared earlier and shadow it
- REGIONAL SLUGS LIVE (sitemap-regional, 8 states + 16 cities): states delhi, madhya-pradesh, maharashtra, telangana, andhra-pradesh, karnataka, rajasthan, gujarat; cities hyderabad, warangal, nizamabad, karimnagar, visakhapatnam, vijayawada, guntur, bengaluru, belagavi, kalaburagi, jaipur, jodhpur, udaipur, ahmedabad, surat, vadodara (all prefixed /banjara-matrimony-)
- NOINDEX: /login (meta noindex,follow + robots Disallow); 404 page (noindex,nofollow, status 404); dashboard-family templates carry noindex,nofollow
- INDEXABLE BUT NOT IN SITEMAP: /signup (renders register, canonical /register), /forgot-password, /reset-password (canonical self, no noindex), /admin-email-register (robots Disallow)
- AUTH-ONLY (302 -> /login via ensureAuth): /dashboard, /onboarding, /ice-breaker-game, /thank-you, /update-profile, /user-interests, /user-chat, /user-setting, /user-plan, /shortlisted, /blocked-users, /notifications, /profile-visitors, /all-profiles, /profile/:userId (most also run checkProfileCompletion -> /onboarding)
- OTHER ENDPOINTS: GET /logout (inline Firebase signout HTML), GET /robots.txt (sendFile root robots.txt, not public/), GET /ads.txt (inline), static /sitemap.xml /sitemap-main.xml /sitemap-blogs.xml /sitemap-regional.xml from public/, POST /api/regenerate-sitemap (no auth), POST /api/proxy/cities -> api /api/cities, static /css /js /images /fonts /downloads /profiles
- 404 HANDLER app.js:181 -> res.status(404).render('pages/404') — correct status. Soft-404s: /blogs/<anything>, and /blogs?page=999 returns 200 empty
- META SOURCE: almost every public template hardcodes <title>, description, canonical, OG, Twitter and JSON-LD in its own <head>; route `title` is used only by blog.ejs and the dashboard templates (`<%= title || ... %>`). Dynamic ones: blog-detail (blog.metaTitle/metaDescription/slug), regional (page.metaTitle/metaDescription/slug with defaults), gotra (gotras.length). No shared head partial exists
- JSON-LD BY PAGE: home = Organization, WebSite+SearchAction, ItemList(SiteNavigationElement), LocalBusiness, BreadcrumbList, FAQPage, Service; about = Organization, FAQPage, BreadcrumbList (plus breadcrumb partial); features = SoftwareApplication + BreadcrumbList (duplicate Home); app page = MobileApplication, SoftwareApplication (fake rating), BreadcrumbList, FAQPage; lambadi = WebPage, FAQPage; gormati and history = several blocks; gotra = Article, FAQPage, BreadcrumbList; faq = 2 blocks; blog list = WebPage; blog post = BlogPosting (no BreadcrumbList); state = Organization + FAQPage; city = LocalBusiness + FAQPage; no hreflang anywhere; html lang="en"
- BREADCRUMB PARTIAL (views/partials/breadcrumb.ejs) is included only by about, beta-tester, contact, features, all-profiles, blog, terms-conditions, privacy-policy and sitemap; it always prepends Home and emits microdata plus JSON-LD
- KEYWORD 'banjara matrimony' PLACEMENT: home title (index.ejs:4) 'Banjara Matrimony - Free Matrimonial Site | Find Banjara Brides & Grooms' (about 74 chars), H1 (index.ejs:431) '<b>Banjara Matrimony</b> – Find Verified Banjara Brides & Grooms Free', intro paragraph line 432, FAQ and keyword section 2318-2445; regional H1 'India's First Free Banjara Matrimony in <place>' and title from CMS metaTitle; competing titles: register 'Register Free on BanjaraMatch | #1 Banjara Matrimony Website', login (noindex) 'Banjara Matrimony | Find Your Perfect Life Partner', app page 'Banjara Matrimony App - ...'
- SITEMAP GENERATION: app.js runs generateAllSitemaps 5s after boot and every 6h; utils/generateSitemap.js writes 20 static URLs (lastmod = template file mtime); generateBlogSitemap.js calls GET https://api.banjaramatch.com/api/blogs/all-published (status:'published'), loc /blogs/<lowercase category>/<slug>, lastmod = updatedAt, includes image:image; generateRegionalSitemap.js calls GET /api/city-pages and /api/state-pages (isActive && isPublished), lastmod = updatedAt, priority state 0.8 / city 0.7, no thresholds on content or member count; generateSitemapIndex.js writes sitemap.xml listing 3 child sitemaps (lastmod = file mtime); robots.txt lists the index and all 3 children
- API PUBLIC ENDPOINTS USED BY WEB: GET /api/auth/me, /api/blogs/featured?limit=3, /api/blogs?page&limit&category&search, /api/blogs/trending, /api/blogs/:slug (increments views), /api/blogs/all-published, /api/city-pages, /api/city-pages/:slug (isActive only), /api/state-pages, /api/state-pages/:slug (isActive only), POST /api/fetchGotraList, GET /api/fetchClanList, POST /api/fetchUsersList, /api/getInterestList, /api/getProfileVisitorSummary, /api/getShortListedUsers, /api/getTopDailyMatches, /api/fetchProfile, /api/cities
- PORTS/PROCESSES: banjaramatch-web pm2 fork cwd /var/www/banjaramatch.com, PORT from .env (nginx expects 4000; app.js default 3000); web .env keys: GA4_MEASUREMENT_ID, ENABLE_ANALYTICS, NODE_ENV, PORT (no JWT_SECRET, no AUTH_SERVER_URL -> defaults to https://api.banjaramatch.com, so SSR goes over the public internet instead of localhost:4002)
- FOOTER HUB LINKS (all pages): 8 state pages + /sitemap 'View All'; /lambadi-matrimony, /gormati-matrimony, /banjara-gotra-list, /banjara-community-history, /banjara-matrimony-app, /blogs?category=Culture, /blogs?category=Tips. Only the HTML /sitemap links the 16 city pages

## reusable
- /var/www/banjaramatch.com/views/partials/breadcrumb.ejs — microdata + JSON-LD breadcrumb; reuse as the single breadcrumb after switching to JSON.stringify and dropping the duplicate Home
- /var/www/banjaramatch.com/views/pages/blog.ejs:47-48 and blog-detail.ejs:34-56 — the safe `<%- JSON.stringify(value) %>` JSON-LD pattern to apply everywhere
- /var/www/banjaramatch.com/app.js:67-111 — htmlRedirectMap + generic .html strip; port as-is into the monorepo web app (it is part of the URL contract)
- /var/www/banjaramatch.com/routes/index.js:228-231 and 621-711 — legacy and case-canonicalisation redirects for /blogs and /blog; keep them verbatim in the migration
- /var/www/banjaramatch.com/utils/generate*.js — sitemap pipeline (index + main + blogs + regional); reuse but move output out of git-tracked public/ and use a content-updated date for lastmod
- /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:4-14 — normalisation of flat and nested CMS fields (heroSection/introSection/faqSection); reuse in a single regional template
- /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js:420-475 and stateRegionalPageController.js:390-440 — already return relatedCityPages, sameStateCities, statePage and breadcrumbs arrays that the templates do not use yet; wire them up for interlinking
- /var/www/banjaramatch.com/views/partials/footer.ejs:76-92 — state hub link block; extend into a reusable 'regional links' partial
- /var/www/banjaramatch.com/views/partials/analytics.ejs — GA4 include already shared across pages
- /etc/nginx/sites-available/banjaramatch.com — working http->https and non-www->www 301s to keep in the monorepo nginx config

## open_questions
- Is the API .env JWT_SECRET really meant to be the default? Rotating it logs out all web, app and admin sessions, so it needs a planned window.
- Are the member, success-story and rating numbers ('10,000+ verified profiles', '1,500+ couples', 'Lakhs of Happy Marriages', 4.8 from 2847) backed by real data or a Play Store listing? If not, should they be removed or replaced with live counts?
- Is there a real support phone number to replace +91-9876-543-210, or should phone be dropped from schema and legal pages?
- Should AI crawlers (GPTBot, ChatGPT-User, OAI-SearchBot, PerplexityBot, Claude) be allowed for visibility in AI answers, or stay blocked?
- Should unpublished (isPublished=false) regional pages be served at all, perhaps only to admins with a preview token?
- Do you want Hindi/Telugu/Marathi/Kannada versions (which would need hreflang), or will the site stay English-only?
- In the monorepo, will admin and api move under paths of banjaramatch.com (e.g. /admin, /api) or stay on subdomains? The web app already owns /api/regenerate-sitemap and /api/proxy/cities, and robots.txt disallows /api/ and /admin, so path collisions need planning; the Flutter app also hardcodes api.banjaramatch.com, so that subdomain likely must keep working.
- Should generated sitemaps keep being written into the git-tracked public/ folder? With git-push deploys they will cause dirty trees and conflicts; serving them dynamically or from a runtime dir is safer.
- Should /banjara-matrimony-bangalore be retargeted to /banjara-matrimony-bengaluru, and should /banjara-matrimony-pune or -mumbai city pages be created, given they currently 301 or 404?
