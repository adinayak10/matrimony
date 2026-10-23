# Premium Marriage Biodata Maker — rebuild, feature expansion, SEO

## Context

The site had a biodata builder at `/biodata-builder`: one long form, 4 CSS-only templates, a screenshot PDF via html2pdf from a CDN, no persistence, no backend. It was removed on 2026-10-12 (commit d3dfdc0; the URL now 301s to `/`) and "Biodata PDF" was listed as deferred in docs/plans/01-feature-expansion.md. The owner now wants it rebuilt as a premium, independently marketable product with real document generation, drafts, a template library, admin management and an SEO landing page.

Decisions confirmed with the owner (2026-10-22):
- **PDF**: server-side Chromium (`puppeteer-core`, Chromium installed by the owner via apt) rendering the *same* HTML as the live preview; browser print-to-PDF is the fallback and the Print button.
- **Access**: guests build, preview and download without an account (browser autosave); login unlocks cloud drafts, multiple biodatas, version history, duplicate, private share links.
- **URL**: new `/biodata-maker` family; `/biodata-builder` and the four `biodata-builder*.html` URLs 301 to it.
- **Hindi**: bilingual labels (en / hi / both) with a self-hosted Noto Sans Devanagari subset embedded in preview and PDF. No machine translation of user text.
- All templates free (paid plans are out of scope per project docs).

Pre-condition: the working tree holds an uncommitted ice-breaker removal (apps/api, apps/web, apps/mobile). Commit or stash it first (owner's call); this work must not revert those edits. Several files touched here (`routes/index.js`, `pageMeta.js`, `robots.txt`, `responsive.css`) are in that diff.

---

## Architecture (one source of truth)

```
packages/shared/biodata/           the "kit": schema, labels, formatters, palettes, fonts, ornaments,
                                   template registry, archetypes, 15 templates, paginator, renderer
      ├─ required by apps/api      -> PDF (puppeteer) + server-side validation (K.schema)
      ├─ required by apps/web      -> SSR gallery/landing, dev kit route
      └─ bundled by web build.js   -> /build/js/biodata-kit.<hash>.js for the browser preview
apps/api                           models, owner/guest/admin endpoints, private photo storage, PDF service
apps/web                           landing, gallery, builder app, my-biodatas, share view, guide pages, SEO
apps/admin                         template metadata, SEO pages, settings fieldset
```

The kit uses the "namespace IIFE" pattern (`(function(K){...})(typeof module==='object'&&module.exports ? require('../_ns') : (window.BiodataKit=window.BiodataKit||{}))`), ES2017 only, no bundler, no modules. `bundle-order.js` lists files once; `index.js` (Node) and `build.js` (browser) both consume it. `node_modules/@banjaramatch/shared` already symlinks to `packages/shared` (verified), so no deploy change is needed to require it.

### Rendering contract
`K.renderBiodataParts({data, templateId, design, photoUrl, mode:'preview'|'pdf'|'thumbnail', fontUrl, now}) -> {css, body, warnings}` and `K.renderBiodataHtml(...)` (full standalone document with fonts + paginator script). Every user string passes `K.esc`/`K.attr`; `photoUrl` is allow-listed to `data:image/(jpeg|png|webp);base64,...` or a same-origin `/api/biodata/...` path.

### Pagination (honest A4, same in preview and PDF)
Renderer emits `<template id="bd-shell-first">`, `<template id="bd-shell-cont">`, a hidden `#bd-flow` of atomic blocks (section title, label/value row, paragraph) and an empty `#bd-pages`. An in-document paginator (`K.paginateSource`, ES5 function serialised into the HTML) fills explicit `.bd-page` boxes (210×297 mm, `overflow:hidden`) well by well, carries orphan section titles, supports multi-well pages (band archetype's two columns), marks a block taller than a well with `.bd-overflow` (never loops), removes an empty trailing page, sets `window.__bdPaginated`. Runs after `document.fonts.ready` in the preview iframe and in Chromium before `page.pdf({format:'A4', preferCSSPageSize:true, printBackground:true, margin:0})`. `@page{size:A4;margin:0}`; `.bd-page{page-break-after:always}` in pdf/print mode. Chromium never makes a break decision, so per-page chrome (frames, rails, bands) repeats correctly.

### Archetypes → 15 templates
| Archetype | Layout | Templates |
|---|---|---|
| classic | single column, centred header, label:value rows | Premium Traditional Indian, Classic Family-Oriented, Hindu Classic, Regional-Adaptable (labelLanguage 'both' default, regional palettes), Printer-friendly B&W (`printSafe`, no backgrounds) |
| sidebar | 64 mm rail (photo, key facts, contact) + main column | Contemporary Professional, Clean Minimalist, Elegant Modern Minimal, Christian Classic |
| band | full-width header band + two-column grid | Luxury Maroon & Gold, Muslim Classic, Sikh Classic |
| frame | ornamental border on every page | Royal Heritage, Elegant Floral |
| hero | large photo block with name overlay on page 1 | Premium Photo-Focused |

Template file = `id, slug, name{en,hi}, tagline, tags/categories, culture, archetype, palettes[], fonts[], photoPlacements[], defaults{palette,font,scale,spacing,photoPlacement,labelLanguage,invocation,sectionOrder,hiddenSections}, ornaments{}, css(theme), thumbnail`. Culture only prefills the optional, editable `invocation` line (e.g. "श्री गणेशाय नमः", "بسم الله الرحمن الرحيم", "ੴ") and default palette; culture-specific *fields* are driven by `data.religion.religion` via schema `when` rules, never by template. Adding a template = one file + one bundle-order line + thumbnail.

### Fonts (all SIL OFL, vendored woff2 in `packages/shared/biodata/fonts/`, ~400 KB)
Poppins 400/500/600 (copy), Playfair Display variable (copy), Cormorant Garamond 600/600i, Lora variable, DM Sans variable, Noto Sans Devanagari 400/600. Fetched once by `packages/shared/scripts/fetch-biodata-fonts.js` (from @fontsource packages into a temp dir; no runtime dependency) with `LICENSES.md`. Preview: web serves `/fonts/biodata/*` (static mount). PDF and thumbnails: `apps/api/services/biodataFonts.js` embeds the same files as base64 `data:` URIs inside the HTML (no network, no apt fonts needed). `font-display:block`. Devanagari face included when `labelLanguage!=='en'` or any string matches `[\u0900-\u097F]`; Hindi labels wrapped `<span lang="hi">`. The one optional Arabic invocation line uses `dir="auto"` (apt `fonts-noto-core` recommended as glyph safety net).

### Data contract (`K.schema.emptyData()`; stored as Mixed, validated by the shared schema)
```
invocation, hiddenFields[],
personal{fullName,gender,dob,ageOverride,birthTime,birthPlace,heightCm,weightKg,complexion,bloodGroup,maritalStatus,childrenDetails,motherTongue,languages[],nationality,about}
family{fatherName,fatherOccupation,motherName,motherOccupation,siblings[{relation,maritalStatus,details}],familyType,familyStatus,familyValues,nativePlace,familyAbout}
education{highest,degrees[{degree,institution,year}],details}
profession{occupation,employer,designation,workLocation,details}
income{amount,period,currency,text,familyIncomeText}
religion{religion,caste,subCaste,gotra,motherGotra,clan,tanda,raasi,nakshatra,manglik,sect,denomination,church,amritdhari,note}
lifestyle{diet,smoking,drinking,hobbies[],interests[]}
partner{ageMin,ageMax,heightMinCm,heightMaxCm,education,profession,location,maritalStatus,religionCaste,other}
contact{contactPerson,relation,phone,altPhone,whatsapp,email,address,city,state,country,bestTime}
additional{horoscopeNote,expectations,note}
custom{<section>:[{id,label{en,hi},value}]}   sectionTitles{<section>:{en,hi}}
```
`K.schema.FIELDS` carries type, max length, enum options, `when` conditions, `step`; `K.schema.clean(data) -> {data, errors}` drops unknown keys, trims to max, checks enums/dates/email/phone, caps custom fields (6/section, 20 total). The API uses it; the builder uses it for forms and inline validation. Formatters: `computeAge` (calendar years, override wins), `formatDate` (en/hi month names), ft/in ↔ cm, income (Lakh/Crore, Indian grouping without Intl), ranges, `labelValue`.

`design` keys (allowlisted; unknown → 400): `palette, font, scale (0.85–1.15), spacing, photoPlacement, photoShape, sectionOrder, hiddenSections, labelLanguage ('en'|'hi'|'both'), footerText, shareContact (bool, default false)`.

---

## Phase 1 — Shared kit (`packages/shared`)
New: `biodata/{_ns,index,bundle-order}.js`, `biodata/core/{escape,labels,schema,format,palettes,fonts,ornaments,registry,sample,paginate,render}.js`, `biodata/archetypes/{classic,sidebar,band,frame,hero}.js`, `biodata/templates/*.js` (15), `biodata/fonts/*.woff2 + LICENSES.md`, `scripts/fetch-biodata-fonts.js`, `test/biodata-{render,format,registry}.test.js`, package.json `"test": "node --test test/"`.
`K.sampleData` is fictional ("Aarav Rathod", explicit sample note) for thumbnails, tests and a "Load sample" builder button.
Tests: hostile payload (`<img src=x onerror=...>`) never appears unescaped in any template; hidden sections absent; order respected; `both` emits `lang="hi"`; `javascript:` photo dropped; ids unique; every template has a thumbnail file; bundle-order covers every file.

## Phase 2 — API (`apps/api`)
**Models** (new): `BiodataDocument` {user, title≤80, templateId, design, data(Mixed, ≤64 KB serialized), photo{file (basename only),width,height,size}, status draft|completed, version, lastRenderedAt, shareToken (48 lowercase hex = 192 bit; lowercase because web `canonicalUrl` lowercases paths), shareExpiresAt, shareViews; indexes {user,updatedAt}, unique partial on shareToken; MAX_PER_USER 10}. `BiodataDocumentVersion` {document, user, version, title, templateId, design, data, reason save|restore|duplicate; cap 20 per doc, pruned; written only when content changed}. `BiodataTemplateMeta` {templateId unique, isActive, isFeatured, order, displayName, description, category, tags≤10, thumbnailUrl (own-host /images/... only), updatedBy}. `BiodataPage` {slug unique, kind landing|guide|category, metaTitle≤70, metaDescription≤170, canonicalOverride, ogImage, h1, intro (sanitizeRich), contentBlocks[≤20: richText|steps|checklist|table|callout|cta], faqs[≤15 plain], ctaConfig, relatedLinks[≤8 internal], isPublished, publishedAt, contentWords (sanitize.contentWords), createdBy/updatedBy}. Settings: `biodata{enabled, guestDownloads, maxPerUser 1..50, languages ⊇ ['en'], shareDefaultDays 1..365}` added to the ALLOWED map in `controllers/admin/settingsController.js` (new `langs` coerce).

**Photos are private**: `middleware/biodataUpload.js` (multer → `PRIVATE_UPLOADS_DIR/biodata`, mkdir 0700 on first use like `privateUpload.js`, 5 MB, jpeg/png/webp; guest render uses `PRIVATE_UPLOADS_DIR/biodata_tmp`, unlinked in `finally`) then `validateImages.processImageFile` (sharp re-encode ≤1600 px, EXIF stripped). Never under `uploads/`, so no change to `UPLOAD_PATH_RE`, nginx or server-setup folders. Served only by owner-stream and share-token routes (`private, no-store`, `nosniff`, `X-Robots-Tag: noindex`). PDF reads the file from disk → sharp (≤1200 px, q82) → data URI.

**Services** (new): `biodataRegistry.js` (registry ⨝ meta, 60 s cache, `listPublic/listAdmin/isActive/categories/invalidate`), `biodataService.js` (readers using `K.schema.clean`, design allowlist, photo helpers with basename-only resolution, `newShareToken`, `snapshot+prune`, `enforceCap`), `biodataFonts.js` (data-URI cache), `biodataPhoto.js`, `biodataPdf.js`, `jobs/biodataSharePrune.js` (daily, nulls expired tokens; add to `schedular` JOBS).

**`services/biodataPdf.js`** (side-effect free at require): `puppeteer-core` (add to api dependencies), `CHROMIUM_PATH` env (missing/invalid → `status()==='unavailable'`), `BIODATA_PDF_DISABLED=1` kill switch; single lazily launched browser; in-house queue concurrency 1, max 4 waiting, 8 s max wait, 20 s render timeout (worst case 28 s < web proxy 30 s); idle close 60 s (`unref`); `/proc/meminfo MemAvailable ≥ 350 MB` guard; relaunch on `disconnected`, one retry on `Target closed`, SIGKILL on hung close; `shutdown()` on SIGTERM/SIGINT in `index.js`. Launch args: `--no-sandbox --disable-setuid-sandbox` (runs as root under pm2), `--disable-dev-shm-usage --disable-gpu --no-zygote --renderer-process-limit=1 --font-render-hinting=none --js-flags=--max-old-space-size=96` plus the usual disable-* flags; **not** `--single-process`. Viewport 794×1123, `setContent` + `waitForFunction(window.__bdPaginated)`, returns `{buffer, pages}`. Errors: `PdfError` codes `PDF_UNAVAILABLE` (503), `PDF_BUSY` (503 + `Retry-After: 5`). `/health` gains `pdf: 'ready'|'unavailable'` (does not affect `ok`).

**Routes** `routes/biodataRoutes.js` → `app.use('/api/biodata', …)`; `routes/adminBiodataRoutes.js` → `app.use('/api/admin', …)` (separate files per the app.js:126 convention). Envelope `{status, data}` / `{status:false, code, message}`. Owner routes: `authenticate`, `findOne({_id, user: req.userId})`, non-owner → 404. Limiters via `rateLimits.make`: guest render 20/h per IP (60/h per user), owner pdf 60/h, writes 120/15 min, photo 30/day, share views 120/15 min.

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/config` | public | flags, limits, languages; `max-age=60` |
| GET | `/templates` | public | merged active registry rows + `categories`; `max-age=300` |
| GET | `/pages`, `/pages/:slug` | public | published only (sitemap + SSR) |
| POST | `/render` | optionalAuth | **multipart**: `payload` JSON string (≤256 KB: `{title,templateId,design,data}`) + optional `photo` file → `application/pdf`, `Content-Disposition: attachment; filename="<safe>-biodata.pdf"`, `X-Biodata-Pages`, `no-store`. 403 `GUEST_DOWNLOADS_OFF`, 400 `VALIDATION_ERROR|UNKNOWN_TEMPLATE|UNKNOWN_DESIGN_KEY|TOO_MANY_CUSTOM_FIELDS|INVALID_IMAGE`, 503 `PDF_UNAVAILABLE|PDF_BUSY|FEATURE_DISABLED`. Nothing stored. |
| GET/POST | `/documents` | user | list (summaries only) / create (409 `LIMIT_REACHED`) |
| GET/PUT/DELETE | `/documents/:id` | user | PUT accepts `ifVersion` → 409 `VERSION_CONFLICT`; version++ and snapshot on content change |
| POST | `/documents/:id/duplicate` | user | copies data/design/photo file, share off |
| GET | `/documents/:id/versions`, `/versions/:v` ; POST `/versions/:v/restore` | user | |
| POST/DELETE/GET | `/documents/:id/photo` | user | upload / remove / stream |
| GET | `/documents/:id/pdf` | user | same PDF headers |
| POST | `/documents/:id/share` `{enabled, days 7|30|90}`, `/share/rotate` | user | returns `shareUrl` `https://www.banjaramatch.com/biodata-maker/s/<token>` |
| GET | `/shared/:token`, `/shared/:token/photo`, `/shared/:token/pdf` | public | format-checked, unexpired; `{title, templateId, design, html, css}`; contact section omitted unless `design.shareContact`; `X-Robots-Tag: noindex, nofollow`, `no-store`; one 404 message for bad/unknown/expired |
| admin | `/admin/biodata/stats`, `/admin/biodata/templates` (GET, PUT /:id, POST /reorder, DELETE /:id/overrides), `/admin/biodata/pages` (GET, POST, GET/PUT/DELETE /:id, POST /:id/publish) | adminAuth | every write → `audit(req,'biodataTemplate.*'|'biodataPage.*')`; publish → `triggerSitemapRegeneration()`; published slug frozen (`SLUG_FROZEN`); landing undeletable; no admin access to member documents (counts only) |

Export `router.PUBLIC_PATHS` / `router.MEMBER_PATHS` for tests. Logs never include payloads or tokens.

**Cascade**: `services/userCascade.js` ops + COUNTERS gain `biodataVersions`, `biodataDocuments`, and private photo unlink via `biodataService.removePhoto`.

**Seed**: `tools/seedBiodataPages.js` + `tools/content/biodataPages.js` (idempotent upsert by slug; `--apply --yes-i-know [--prod] [--force] [--publish]`, same guard as `applyCityPageContent.js`). Content written by the implementer, original and ≥600 words per guide, ≥5 FAQs:
- landing `biodata-maker` (hero copy, how-it-works, features, 6 FAQs, CTA config);
- `/marriage-biodata-format` — structural reference (section order, field table, 1 vs 2 pages, photo rules, mistakes checklist); links to the existing Tips blog post for writing advice instead of duplicating it;
- `/marriage-biodata-in-hindi` — bilingual format + full en→hi label glossary table;
- `/banjara-biodata-gotra-and-clan` — community fields reference (gotra, mother's gotra, clan, tanda), links `/banjara-gotra-list`, `/lambadi-matrimony`, `/gormati-matrimony` and both existing biodata blog posts.

**Env/deploy**: `apps/api/.env.example` += `CHROMIUM_PATH=/usr/bin/chromium`, `BIODATA_PDF_DISABLED=` (check-env `--examples` requires it); `deploy/check-env.js` warns (not fails) when `CHROMIUM_PATH` is set but missing; `deploy/server-setup.sh` step 2b: on Debian `apt-get install -y chromium fonts-liberation fonts-noto-core`, on Ubuntu print instructions for google-chrome-stable (snap chromium cannot run headless under pm2); `deploy/deploy.sh:148` also creates `private-uploads/{biodata,biodata_tmp}` (0700); `ecosystem.config.js` comment that Chromium is a child outside `max_memory_restart`; `deploy/backup.sh` covers `private-uploads` if not already.

**Tests** (`apps/api/test/biodata.test.js`, `biodata-admin.test.js`, `biodata-render.test.js`; harness + factory; `PRIVATE_UPLOADS_DIR` = mkdtemp): 401 on every member path; owner isolation (user B → 404, no data leak); validation codes; HTML stripped from names, newlines kept in textareas; cap from settings; 25 saves → 20 versions; restore; duplicate copies the photo file; photo upload/replace/delete/stream, non-image → 400 and no file left; guest render → 503 `PDF_UNAVAILABLE` without Chromium, 403 when guestDownloads off, temp dir empty afterwards; share on/rotate/off/expired/malformed → 404, noindex headers, contact hidden by default; cascade removes rows + files; forced 500 log contains neither token nor data; admin CRUD + audit + sitemap trigger + settings clamping; queue unit tests (5th waiter → `PDF_BUSY`); real-render parity test (`%PDF-` header, `/Type /Page` count == `X-Biodata-Pages`) skipped unless `CHROMIUM_PATH` resolves (run locally with Chrome at `C:\Program Files\Google\Chrome\Application\chrome.exe`).

## Phase 3 — Web (`apps/web`)
**Build**: `build/build.js` gains `SHARED_BUNDLES` (`js/biodata-kit.js` from `packages/shared/biodata` in bundle order, minified, hashed), `EXTRA_JS` += `js/biodata-builder.js`, `js/biodata-cropper.js`, `EXTRA_CSS` += `css/biodata-builder.css`, `css/biodata-pages.css`; `inputsFingerprint()` walks `packages/shared/biodata`. Dev fallback route `GET /js/biodata-kit.js` concatenates at request time (`no-store`). `app.js`: static mount `/fonts/biodata` → shared fonts dir (30 d cache); `htmlRedirectMap` biodata entries → `/biodata-maker`. `routes/index.js:315` → `res.redirect(301, '/biodata-maker')`.

**Router** `routes/biodata.js` mounted after `member` and before `indexRoutes` (before the `/:slug` catch-all):
| Route | Middleware | View | Meta / robots | Sitemap |
|---|---|---|---|---|
| `/biodata-maker` | optionalUser | `biodata-landing.ejs` | `biodataMaker`: WebApplication JSON-LD (price 0 INR, provider `@id` org), FAQPage appended by the route only when page FAQs render; index | 0.8 weekly |
| `/biodata-maker/templates` | optionalUser | `biodata-templates.ejs` | `biodataTemplates`; `?category=` 301s to the sub-path (unknown → bare URL) | 0.7 weekly |
| `/biodata-maker/templates/:category` | optionalUser | same view | canonical self; index only when a published `category` page has ≥300 words, else `noindex, follow` | dynamic |
| `/biodata-maker/create` | optionalUser | `biodata-maker-create.ejs` | `biodataBuilder`: `noindex, follow`, canonical `/biodata-maker/create`; `?template=` `?doc=` read server-side; boot payload via `safeJson` (`user`, `document` fetched with `forwardAuth` when `doc` is valid and owned, `pdfAvailable` from API `/health` via SWR, templates summary) | no |
| `/biodata-maker/my` | **ensureAuth only** (no profile-completion gate: the tool does not need gender/gotra) | `biodata-my.ejs` | `noindex, nofollow`; member-nav item "My biodatas" | no; robots Disallow |
| `/biodata-maker/s/:token` | token `^[a-f0-9]{48}$` else 404 | `biodata-shared.ejs` | `noindex, nofollow` meta + `X-Robots-Tag`; `apiGet` uncached | no; robots Disallow `/biodata-maker/s/` |
| `/(marriage|banjara)-biodata-[a-z0-9-]{2,60}` (RegExp) | optionalUser | `biodata-guide.ejs` | from `BiodataPage`: title (`brandSuffix:false`), description, canonical, Article + FAQPage JSON-LD, robots by ≥300-word rule | dynamic (published + ≥300 words) |

**Pages** (all include `partials/head` + `partials/scripts`, no `<script src>`, inline `<style>` with page-scoped tokens like the Ahmedabad page): landing (hero with real template thumbnails and a scaled live kit preview of sample data, template gallery with category filter, features, how-it-works, categories, sample previews from `K.sampleData`, benefits, FAQ `<details>`, final CTA; no fake testimonials/ratings), templates gallery (cards → `/biodata-maker/create?template=<id>`, desktop/mobile preview toggle), builder, my biodatas (list, duplicate/delete/share controls, empty state), share view (injects kit output with a `raw-ok:` comment, Download/Print buttons), guide (renders every block type, escaped).

**Builder** (`public/js/biodata-builder.js`, `biodata-cropper.js`, `css/biodata-builder.css`), one IIFE with `store/modal/persist/forms/sections/photo/preview/exporter/stepper`:
- state `{doc{templateId,design,data}, photo{dataUrl,uploaded}, ui{step,mobileTab,zoom,saving,errors}, meta{documentId}}`; `store.set(path,v)` with structural sharing; undo/redo = previous-`doc` references, cap 50, Ctrl+Z / Ctrl+Shift+Z outside text fields.
- 12 steps: Personal, Photo, Family, Education, Profession, Income, Religion & Community, Lifestyle, Partner Preferences, Contact, Additional, Design & Export. `role=tablist` stepper + progress + completion dots (`schema.stepStatus`), section navigator, quick jump.
- forms generated from `K.schema.FIELDS` via DOM construction (no innerHTML): text/textarea (counter)/select/chips/date (+live age, override)/height (ft-in ↔ cm)/income/phone/email/repeatable lists; conditional `when` fields; inline `aria-live` errors; per-field "hide on biodata" toggles for dob, birthTime, phone, address; custom fields per section with en/hi labels; "Load sample" button.
- sections panel: hide/show, rename (en/hi), reorder via pointer drag + up/down buttons with `aria-live` announcements.
- photo: in-house canvas cropper (pan, wheel/pinch zoom, rotate, aspect per template), output JPEG ≤1600 px; guests keep the data URL, owners also upload multipart.
- preview: same-origin `<iframe>` shell written once (fonts via `/fonts/biodata`), `#bd-css` textContent + `#bd-root` innerHTML (single `raw-ok:` sink) swapped per change (150 ms debounce, rAF), `__bdRepaginate()`, zoom −/+/100%/fit, "Page x of n", Print = `iframe.contentWindow.print()`. Desktop split (sticky preview); mobile Edit|Preview tabs + floating "Preview · n pages" pill (iframe stays laid out off-tab so measurement works).
- persistence: guest `localStorage['bm:biodata:v1']` (photo dropped first on quota), restore prompt; owner: create on first change, debounced PUT with `ifVersion`, status Saved/Saving…/Unsaved/Failed-retry with backoff, `beforeunload` guard, 401 → degrade to local mode; reset/duplicate via custom confirm modals.
- export: progress modal → multipart `POST /api/biodata/render` (guest) or `POST /api/biodata/documents/:id/pdf` after `persist.flush()` (owner) → blob download; 503/network → modal offering Print ("Save as PDF gives the identical document"); `PDF_BUSY` → retry; button label pre-switches when `pdfAvailable` is false.
- a11y: real buttons, roving tabindex, focus-trapped modals, iframe title, keyboard reorder, `prefers-reduced-motion`.

**Thumbnails**: `apps/web/scripts/biodata-thumbnails.js` renders every template with `K.sampleData` through `biodataPdf.renderPng` (local Chrome) → committed `public/images/biodata/<id>.webp` (+@2x) plus `og-biodata-maker.jpg`. The landing never needs Chromium at runtime; registry test fails if a thumbnail is missing.

**SEO plumbing**: `config/pageMeta.js` entries `biodataMaker, biodataTemplates, biodataBuilder, biodataMy, biodataShared, biodataGuide` (no Organization/BreadcrumbList/aggregateRating/telephone inside; FAQPage only from routes with visible FAQs); `faq` FAQPage + `faq.ejs` static block gain one biodata Q/A; `utils/generateSitemap.js` static entries + `fetchBiodataPages()` (published guides at top level, categories under `/biodata-maker/templates/`, ≥300 words; keep-previous-file guard like categories); `robots.txt` += `Disallow: /biodata-maker/my`, `Disallow: /biodata-maker/s/`; footer Quick Links "Biodata Maker", header mobile quick links, `/sitemap` page, member-nav; fix `regional-city-ahmedabad.ejs:492` and `docs/content/regional/banjara-matrimony-ahmedabad.json:100` links; delete dead `.biodata-builder-section` rules in `responsive.css`; `deploy/url-contract.txt` += `/biodata-maker 200`, `/biodata-maker/templates 200`, `/biodata-maker/create 200`, `/biodata-maker/templates?category=traditional 301`, `/biodata-maker/my 302`, `/biodata-maker/s/<48 zeros> 404`, three guide URLs 200 (after seeding); keep existing 301 lines.

**Tests** (`apps/web/test/biodata.test.js` + edits to `seo.test.js:203-210`, `feature-expansion.test.js`): pageMeta invariants and robots per page; each view renders with stub locals (landing with/without page → exactly one/zero FAQPage; gallery hrefs; builder shell `data-doc=""` for guests; my-biodatas escapes titles; share view noindex meta; guide renders every block type escaped); `categoryRedirect()` and guide regex units (rejects `banjara-matrimony-*`); sitemap includes `biodata-maker` + templates, excludes create/my, `mapBiodataRows` rules, `biodata-builder` still absent; robots Disallow lines; url-contract contains the new 200s; app.js redirect targets.

## Phase 4 — Admin (`apps/admin`)
`config/nav.js` Content group += `item('biodata-templates','Biodata templates','layout')`, `item('biodata-pages','Biodata pages','file-text')` (icons exist). `routes/pages.js` += `/biodata-pages/new`, `/biodata-pages/:id/edit` (blog-form pattern). Views + ES-module page scripts following `faqs.js`/`blog-form.js` (`api()`, `html` tag, `setHtml`, `delegate`, `toast`, `openModal`, `field()`, no inline handlers/localStorage/alert):
- **biodata-templates**: stats strip, table (thumbnail, name with registry name, category, tags, usage count, active/featured badges, Up/Down, Edit, Reset overrides), edit modal, "Open in builder" link to web.
- **biodata-pages**: kind/published filters, table with word count + "<300 words: noindex" badge, publish/unpublish/delete/open actions; **biodata-page-form**: kind (frozen on edit), slug (frozen when published, regex help), h1, intro, content blocks editor (add/remove/reorder by type), FAQs repeater, CTA, related links, search appearance (title/description counters, canonical, og image), publish switch with live word count, dirty guard.
- **settings.ejs**: "Biodata maker" fieldset (`biodata.enabled`, `biodata.guestDownloads`, `biodata.maxPerUser`, `biodata.shareDefaultDays`, `biodata.languages` comma text) + DEFAULTS in settings.js.
All calls are under `/api/admin/biodata/...` (already allowlisted by the proxy); member `/api/biodata/*` stays off the allowlist on purpose. Tests in `test/routes.test.js`: nav items in Content, allowlist positive/negative, page contracts (ids/names/data-action), bad id → 404, settings names; the static scans run automatically.

## Phase 5 — Ops docs & verification
- `docs/runbooks/biodata-maker-go-live.md`: owner steps (apt Chromium + fonts, `CHROMIUM_PATH` in api.env, deploy all three apps together, run the seed, publish pages in admin, set settings, add CTA links in the two biodata blog posts, `check-urls.sh` + refresh baseline, Search Console requests). Update `docs/plans/01-feature-expansion.md` (biodata no longer deferred).
- Commits: one per phase step (project convention), with the required attribution trailer.

## Verification (run, do not claim)
1. `npm run lint` (eslint + `check-ejs-raw-web.js` + `check-admin-raw.js`).
2. `npm test` at the root (shared, api with mongodb-memory-server, web, admin). Also `CHROMIUM_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe" npm test -w apps/api` for the real parity test.
3. `npm run build -w apps/web --force` → manifest has `js/biodata-kit.js`, builder/cropper JS, builder CSS; site.css budget unchanged.
4. `node apps/web/scripts/biodata-thumbnails.js --chromium "<chrome path>"` → 15 WebPs committed.
5. `npm run dev`, then in the browser (Chrome): `/biodata-maker` (metadata, canonical, JSON-LD blocks, gallery links), `/biodata-maker/create` end to end as guest (fill, conditional fields, Hindi labels + Devanagari values, photo crop, reorder/hide/rename sections, undo/redo, template switch keeps data, zoom/fit, page count, localStorage restore after reload, Download PDF with local Chromium → open PDF: text selectable, fonts embedded, Hindi correct, page count equals preview; Print dialog), then logged in (`/biodata-maker/my`, autosave states, duplicate, versions restore, share link in a private window shows noindex and no contact, rotate invalidates), mobile viewport (Edit/Preview tabs, pill, cropper pinch), admin pages (edit template meta → public gallery changes; create/publish guide → appears at its URL and in `sitemap-main.xml` after regeneration).
6. `curl -I` checks: `/biodata-builder` → 301 `/biodata-maker`; `/biodata-maker/s/<junk>` → 404 with `X-Robots-Tag`; `/biodata-maker/my` → 302 logged out.
7. Validate JSON-LD of landing and a guide with the existing `scripts/validate-jsonld.js` (if present) or the Rich Results test.

## Known limitations / blockers to report
- PDF needs Chromium on the VPS (owner's apt step); until then downloads answer 503 and the UI offers Print, which produces the same document.
- Memory: a render costs roughly 250–300 MB for ≤60 s; the 350 MB free-memory guard and kill switch protect the site, but on a very small VPS downloads may intermittently fall back to Print.
- DOCX/PNG exports are not in this release (PDF reliability first); the architecture (shared HTML + Chromium) makes PNG export a small follow-up.
- No AI writing feature (no placeholder either); suggested-wording examples are static schema hints.
