# gap:regional-and-blog-verification

## summary
I settled the explorers' disagreements (A) to (G) using the full templates, the full controllers and live curl output. (A) Both explorers were half right. The state API does return relatedCityPages: telangana returns hyderabad, warangal, nizamabad and karimnagar. But the state template only uses it to fill a <select><option> list (line 221), which crawlers can't follow. The crawlable "Major Cities" card section (line 968) is gated on page.pageType==='state' and page.interlinking.relatedCityPages. The state API returns neither field, so that section renders 0 times. City pages never link back to their state either: the breadcrumb at city line 153 needs page.interlinking.statePage, which no API sets, and the API's sameStateCities is never used by the template. The only /banjara-matrimony-* links on all four pages tested are the same 8 state links and 2 app links from footer.ejs:41-88. (B) Neither public by-slug lookup checks isPublished (state :396, city :426). All 8 states and 16 cities are published today, so this is a latent leak, not a live one. (C) The API returns stats as all zeros, because User has no isActive field and mongoose 8 does not strip unknown query filters (strictQuery defaults to false). Users therefore see the template's hardcoded fallbacks: 150+/500+/250+/250+ on every page, plus "1000+" (state) or "500+" (city) in the copy. The 5%/15% successStories formulas never show. (D) Measured on visible text, including header and footer: hyderabad vs warangal share 60-64% of 5-word shingles, rising to 74-79% with the place name masked. telangana vs karnataka share 52-53%, rising to 63-64% when masked. (E) The reflected XSS is confirmed. blog.ejs:47-48 uses <%- JSON.stringify(...) %>, which does not escape "</script>", and GET /blogs?category=test</script><b>x came back raw inside the JSON-LD (HTTP 200, CSP disabled in app.js). (F) The sitemap generator doesn't filter on isPublished itself; it relies on the list endpoints, which do. All 24 lastmod values are today's date because those endpoints don't select updatedAt. (G) Yes. Six admin-entered fields per template are output raw with <%- %>, so these are stored-XSS sinks available to anyone with admin access. Placeholder values come only from admin-managed State/City names. Side note: my GETs on the slug API endpoints bumped the pages' views counters (state :435, city :468).

## findings (12)

### [CRITICAL][security] Reflected XSS: blog category URL value breaks out of the JSON-LD <script> block
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:47
- evidence: blog.ejs:47-48 `"name": <%- JSON.stringify(title) %>,` / `"description": <%- JSON.stringify(blogPageDescription) %>,`; routes/index.js:578 `const category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();` then :593 `title: `${category} Articles - BanjaraMatch Blog``; routes/index.js:522-523 does the same for `req.query.category`. Live: `GET /blogs?category=test%3C%2Fscript%3E%3Cb%3Ex` -> status=200, line 296 `"name": "Test</script><b>x Articles - BanjaraMatch Blog",`; `GET /blogs/test%3C%2Fscript%3E` -> line 296 `"name": "Test</script> Articles - BanjaraMatch Blog",`. app.js:18 `contentSecurityPolicy: false`.
- impact: Anyone can send a victim a link such as /blogs?category=x</script><img src=x onerror=...> that runs script on www.banjaramatch.com. That allows stealing session or auth tokens available to JS and acting as the logged-in user. The value is lowercased, which barely hinders payloads, and no CSP is set.
- fix: Allowlist the category against the Blog enum and return 404 for anything else. Escape JSON-LD output by replacing < with < after JSON.stringify, using a shared helper. Add a CSP later.

### [HIGH][seo] State pages have no crawlable links to their city pages; cities exist only as <option> values
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:968
- evidence: Line 221 `<% if (page.relatedCityPages && page.relatedCityPages.length > 0) { %>` renders only `<option value="<%= cpName %>">` (line 225). Line 968 `<% if (page.pageType === 'state' && page.interlinking && page.interlinking.relatedCityPages && ...` is the only <a> city-card section. API telangana JSON: `pageType: None | interlinking: None`, `relatedCityPages: [banjara-matrimony-hyderabad, -warangal, -nizamabad, -karimnagar]`. Web route routes/index.js:1163 sets a local `pageType = 'state'` but never adds it to `page`. Live telangana: `grep -c 'Major Cities in\|city-card-link'` = 0; the only regional anchors are the footer's 8 states.
- impact: Google can't reach city pages from their state page; they are reachable only through the sitemap and the footer. That weakens internal PageRank flow into the 16 city pages that target local 'banjara matrimony <city>' queries.
- fix: Change line 968/984 to use page.relatedCityPages and drop the pageType check, since this template is state-only. Also delete the dead copy of this block in regional-page-city.ejs:978-1027.

### [HIGH][seo] City pages have no breadcrumb or link back to their state page, and sibling cities are not rendered
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:153
- evidence: `<% if (page.interlinking && page.interlinking.statePage) { %>`. cityRegionalPageController.js:434 `.populate('statePage')`, but the API returns `statePage: None` and `interlinking: None` for hyderabad. It does return `sameStateCities: ['banjara-matrimony-warangal','banjara-matrimony-nizamabad','banjara-matrimony-karimnagar']` (controller line 460) and `breadcrumbs` (line 461), but grep shows no use of sameStateCities or breadcrumbs in either template. Live hyderabad shows the `<!-- BREADCRUMB -->` comment with no section after it, and nearbyCities is None, so the 'Nearby Cities' block (line 1029) doesn't render.
- impact: City pages are leaf pages with no state breadcrumb, no BreadcrumbList, and no links to sibling cities, so the state/city silo is broken in both directions.
- fix: Render the breadcrumb from page.breadcrumbs, which the API already builds (state URL derived from the state name), and add BreadcrumbList JSON-LD. Render page.sameStateCities as <a> links. Separately, backfill CityRegionalPage.statePage.

### [HIGH][business-logic] Regional stats are always 0 (User has no isActive) and every page shows the same hardcoded fallback numbers
- where: /var/www/api.banjaramatch.com/controllers/cityRegionalPageController.js:519
- evidence: city :519 `User.countDocuments({ 'location.city': cityId, isActive: true })`, :522 `isVerified: true`; state :466-469 same pattern. User.js has `is_verified` (line 159) and no isActive; mongoose 8.16.0 with no strictQuery override, so the filter is sent to Mongo and matches nothing. API: `stats: {'totalMembers': 0, ... 'successStories': 0}` for telangana and hyderabad. Templates: state :292 `<%= page.stats.successStories || '150+' %>`, :301 `|| '500+'`, :310/:319 `|| '250+'`, :353/:657 `|| '1000+'`. Live (telangana, karnataka, hyderabad, warangal): `150+ Success Stories / 500+ Active Members / 250+ Verified Grooms / 250+ Verified Brides`; state copy `Join 1000+ verified`, city copy `Join 500+ verified`.
- impact: Users see invented numbers ('250+ Verified Brides', '150+ Success Stories') that are identical in every state and city, and the state page contradicts itself ('500+ Active Members' next to '1000+ Profiles'). This is a trust and consumer-claims risk, and adds more duplicate content. The 5%/15% successStories formulas (state :476, city :528) would also be fabricated if counts ever became non-zero.
- fix: Count real users with the correct fields (for example is_block:0 and is_verified, plus the actual profile/active status fields). Hide stat tiles when the count is low instead of inventing numbers. Remove the successStories multipliers and use a real SuccessStory count.

### [MEDIUM][seo] Regional pages are mostly the same template with the place name swapped
- where: /var/www/banjaramatch.com/views/pages/regional-page-city.ejs:648
- evidence: Fixed sections (Why Choose 413-450, App 550-602, Free 604-646, Heritage 648-675, Sub-communities 677-744) differ only by `<%= cityName %>`. Measured on live visible text (header and footer included), word tokens and 5-word shingles: `hyderabad vs warangal: unique words 386/370 shared 314 (Jaccard 71%) | 5-gram shingles 1000/940 shared 602 (of hyderabad: 60%, of warangal: 64%)`; `telangana vs karnataka: ... shingles 1136/1124 shared 601 (of telangana: 52%, of karnataka: 53%)`; with the place name masked, `hyderabad vs warangal: 74% / 79%`, `telangana vs karnataka: 63% / 64%`.
- impact: 60-79% of each city page's text phrases are shared with another city page, which risks thin or doorway-page treatment and canonical clustering for local 'banjara matrimony <city>' queries.
- fix: Move the generic blocks into a shortened shared partial. Render the city-specific data that already exists in the schema (stateInfo/cityInfo, communityInsights, real profile cards, localities, featured members) higher on the page.

### [MEDIUM][security] Stored XSS: admin-entered regional content is output unescaped
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:162
- evidence: state: :162 `<%- heroTitle %>`, :169 `<%- heroSubtitle %>`, :455 `<%- introContent.replace(/\n/g, '<br>') %>`, :487 `<%- page.aboutContent.replace(...) %>`, :489 `<%- page.aboutSection.content %>`, :751 `<%- page.communityInsights.description %>`; city: :178, :185, :465, :497, :499, :761, same fields. These come from admin PUT stateRegionalPageController.js:273-281 `findByIdAndUpdate(id, updateData, { ... strict: false })` with `updateData = { ...req.body }`. The placeholder values (placeholderProcessor.js:16-19, 69-107) are only State/City names, stats and slug; no City.create path exists in the controllers.
- impact: Any admin account, or a compromised admin token, can save <script> into a regional page and it runs for every visitor on the site's highest-ranking SEO pages. Also, strict:false lets arbitrary fields be written to the document.
- fix: Sanitize rich-text fields on save, for example with sanitize-html and an allowlist of p/br/strong/a. Use <%= %> for title and subtitle fields. Remove strict:false and whitelist the updatable fields.

### [MEDIUM][business-logic] Public slug endpoints serve unpublished pages (latent; all current pages are published)
- where: /var/www/api.banjaramatch.com/controllers/stateRegionalPageController.js:396
- evidence: state :396 `StateRegionalPage.findOne({ slug, isActive: true })`; city :426 `CityRegionalPage.findOne({ slug, isActive: true })`; models default `isPublished: { type: Boolean, default: false }` (StateRegionalPage.js:293, CityRegionalPage.js:255). The list endpoints do filter: state :449 and city :482 `{ isActive: true, isPublished: true }`. Live: /api/state-pages lists 8 slugs, /api/city-pages lists 16, and every footer state page returns `"isPublished":true`.
- impact: Draft pages, including bulk-created city pages (route POST /admin/bulk-create), can be viewed and indexed on www via the /:slug catch-all as soon as they exist, with robots 'index, follow' and placeholder or fallback content.
- fix: Add isPublished:true to both public findOne calls, and have the admin preview use the authenticated /admin/:id endpoint.

### [MEDIUM][seo] Regional sitemap lastmod is always the generation date
- where: /var/www/banjaramatch.com/utils/generateRegionalSitemap.js:58
- evidence: `const lastmod = page.updatedAt || page.createdAt || new Date();` but the source endpoints select only `'slug state stats'` (stateRegionalPageController.js:450) and `'slug city state stats'` (cityRegionalPageController.js:483). Live: `curl /sitemap-regional.xml` gives 24 <loc>, and `24 <lastmod>2026-10-12`. The API list contains 0 `"updatedAt"`.
- impact: Every regeneration marks all 24 URLs as modified today, so Google learns to ignore lastmod for this sitemap.
- fix: Add updatedAt to the .select() of both list endpoints. The generator itself needs no isPublished filter, because the endpoints already apply it.

### [MEDIUM][data-integrity] processObjectPlaceholders mangles ObjectIds and Dates in public API responses
- where: /var/www/api.banjaramatch.com/utils/placeholderProcessor.js:49
- evidence: `if (obj && typeof obj === 'object') { const processed = {}; for (const key in obj) {...` walks ObjectId and Date instances as plain objects. Live /api/state-pages/banjara-matrimony-telangana: `"_id":{"buffer":{"0":106,"1":86,...}}`, `"updatedAt":{}`, stats `'lastUpdated': {}`.
- impact: API consumers (web, Flutter app) get broken _id and date values, which prevents using updatedAt for dateModified/lastmod or id-based linking from this payload.
- fix: Return Date and ObjectId (and other non-plain objects) unchanged, for example: if (obj instanceof Date || obj?._bsontype) return obj.

### [LOW][seo] Arbitrary blog categories return 200 with a self-referencing canonical (soft 404)
- where: /var/www/banjaramatch.com/views/pages/blog.ejs:18
- evidence: `<link rel="canonical" href="https://www.banjaramatch.com/blogs/<%= category.toLowerCase() %>">`; live `GET /blogs/test%3C%2Fscript%3E` -> `status=200`, `<link rel="canonical" href="https://www.banjaramatch.com/blogs/test&lt;/script&gt;">`.
- impact: An unlimited number of indexable junk category URLs can exist, wasting crawl budget.
- fix: Return 404 for categories not in the enum (this also fixes the XSS above).

### [LOW][data-integrity] View counter increments on every public GET, including bots and the web server's own fetch
- where: /var/www/api.banjaramatch.com/controllers/stateRegionalPageController.js:435
- evidence: state :435 `await StateRegionalPage.findByIdAndUpdate(page._id, { $inc: { views: 1 } });`; city :468 the same. The web route routes/index.js:1152 always tries city-pages first, then state-pages.
- impact: Page view analytics are inflated by crawlers and API calls, and each page render adds a write.
- fix: Count views client-side through analytics, or filter bots and debounce.

### [LOW][seo] HTML-escaped entities inside state JSON-LD
- where: /var/www/banjaramatch.com/views/pages/regional-page-state.ejs:124
- evidence: `"name": "<%= faq.question %>"` and `"text": "<%= faq.answer %>"`, plus :102 `"description": "<%= page.metaDescription ... %>"`. Live telangana JSON-LD: Organization block contains `&amp;`, FAQPage block contains `&#39;`. All 8 blocks currently parse as valid JSON.
- impact: Rich-result text shows literal &amp; and &#39;. An answer containing a backslash or newline would make the JSON invalid.
- fix: Build the JSON-LD objects in JS and output them with a safe JSON serializer (< escaped) rather than splicing <%= %> into strings.

## inventory
- Web catch-all regional route: /var/www/banjaramatch.com/routes/index.js:1138-1206 (tries /api/city-pages/:slug, then /api/state-pages/:slug; pageType is a local variable, never set on page)
- State API: GET /api/state-pages and GET /api/state-pages/:slug -> stateRegionalPageController.getAllStatePages (:447) / getStatePageBySlug (:392); routes/statePageRoutes.js:35,38
- City API: GET /api/city-pages, /api/city-pages/state/:stateId, /api/city-pages/:slug -> cityRegionalPageController (:480, :498, :422); routes/cityPageRoutes.js:75,78,81
- Admin regional endpoints (adminAuth): /api/state-pages/admin/* and /api/city-pages/admin/* including POST /admin/bulk-create
- Live published regional pages: 8 states (delhi, madhya-pradesh, maharashtra, telangana, andhra-pradesh, karnataka, rajasthan, gujarat) + 16 cities = 24 sitemap URLs
- Telangana relatedCityPages (live): banjara-matrimony-hyderabad, -warangal, -nizamabad, -karimnagar
- Legacy 301s: /banjara-matrimony-bangalore -> -karnataka, /banjara-matrimony-pune -> -maharashtra (routes/index.js:230-231)
- Footer hardcoded state links: /var/www/banjaramatch.com/views/partials/footer.ejs:81-88
- Blog routes: /blogs (routes/index.js:517), /blogs/:category (:566), /blogs/:category/:slug (:622)
- Mongoose 8.16.0 in api, no strictQuery override; User model uses is_verified (User.js:159), is_block (:171), location.state/city ObjectIds (:177-181), no isActive
- Helmet with contentSecurityPolicy:false at /var/www/banjaramatch.com/app.js:18
- Sitemap regenerate endpoint: POST /api/regenerate-sitemap on web (routes/index.js:1209) has no auth check in the route itself

## reusable
- API already builds breadcrumbs for city pages (cityRegionalPageController.js:461-465) and state pages (stateRegionalPageController.js:429-432); render page.breadcrumbs instead of interlinking.statePage
- API already returns sameStateCities (city, :442-460) and relatedCityPages (state, :411-428), ready for crawlable link blocks
- The city-card link block at regional-page-state.ejs:983-1015 can be reused once its condition is fixed to page.relatedCityPages
- Breadcrumb partial /var/www/banjaramatch.com/views/partials/breadcrumb.ejs is already used by blog.ejs:87 and emits itemprop microdata; reuse it on regional pages
- getStateSpecificInfo (stateRegionalPageController.js:488-658) holds unique per-state copy for Maharashtra, Karnataka, Telangana and AP, useful for de-duplicating state pages
- The isActive+isPublished filter used by the list endpoints (state :449, city :482) can be copied into the by-slug lookups

## open_questions
- Which User fields mark an active, countable profile (is_block, a profile status, deleted flag)? This determines the correct stats query.
- Does any CityRegionalPage document have statePage set in Mongo? The API returned None for hyderabad, so backfill scope is unknown without a DB read.
- Should the 5%/15% successStories estimates be removed entirely, or replaced with a real SuccessStory collection count?
- Does /api/regenerate-sitemap on the web app have middleware or nginx protection outside routes/index.js? It was not checked here.
