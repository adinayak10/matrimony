# Biodata Maker: shared interface contract (binding for every track)

Plan: docs/plans/02-biodata-maker.md. This file fixes the names every track codes against.
If you must change something here, change this file in the same step and say so in your report.

## 1. Kit: `require('@banjaramatch/shared/biodata')` (Node) / `window.BiodataKit` (browser)

Files: packages/shared/biodata/{_ns.js,index.js,bundle-order.js}, core/*.js, archetypes/*.js, templates/*.js, fonts/*.woff2.
Every browser-bundled file is wrapped:
`(function (K) { 'use strict'; ... })(typeof module === 'object' && module.exports ? require('<rel>/_ns') : (window.BiodataKit = window.BiodataKit || {}));`
ES2017 max (no `?.`, `??`, class fields). No DOM access at load time.

Node-only extras on the exported object (set in index.js, not in the bundle):
- `K.fontsDir`: absolute path of packages/shared/biodata/fonts
- `K.bundleFiles`: absolute paths of the browser bundle, in order (build.js concatenates these)

### Escaping and labels
- `K.esc(s)`, `K.attr(s)`, `K.escMultiline(s)` (newline becomes `<br>`)
- `K.labels = { en: {sections, fields, values, months, misc}, hi: {...} }`
- `K.t(lang, group, key)`; `K.label(group, key, mode)` with mode `'en'|'hi'|'both'` returns escaped HTML (Hindi wrapped in `<span lang="hi">`)

### Schema `K.schema`
- `STEPS` = `['personal','photo','family','education','profession','income','religion','lifestyle','partner','contact','additional','design']` (12 builder steps)
- `SECTIONS` = `['personal','family','education','profession','income','religion','lifestyle','partner','contact','additional']` (data and render sections; also `DEFAULT_ORDER`)
- `FIELDS`: array of `{ id:'personal.fullName', section, key, type, max?, options?, required?, multiline?, when?(data)->bool, placeholder?, hint?, privacy?:bool, itemFields? }`
  - types: `text|textarea|select|multiselect|date|time|height|number|income|phone|email|list`
  - `list` is an array of objects described by `itemFields` (family.siblings, education.degrees)
- `emptyData()` returns a fresh data object (shape below)
- `clean(data)` returns `{ data, errors: [{path, code, message}] }`. It drops unknown keys, trims to max, checks enums, dates `YYYY-MM-DD`, email/phone format, custom-field caps. Codes: `VALIDATION_ERROR`, `TOO_MANY_CUSTOM_FIELDS`
- `validate(data)` returns `{ [path]: message }` (required + format; for inline UI)
- `stepStatus(data, stepId)` returns `'empty'|'partial'|'complete'`
- `DESIGN_KEYS` = `['palette','font','scale','spacing','photoPlacement','photoShape','sectionOrder','hiddenSections','labelLanguage','footerText','shareContact']`
- `cleanDesign(design, templateId)` returns `{ design, errors }` (unknown key gives code `UNKNOWN_DESIGN_KEY`)
- `LIMITS = { customPerSection: 6, customTotal: 20, maxDataBytes: 65536, titleMax: 80 }`

### Data shape (`emptyData()`)
```
{ invocation:'', hiddenFields:[],
  personal:{fullName,gender,dob,ageOverride,birthTime,birthPlace,heightCm,weightKg,complexion,bloodGroup,maritalStatus,childrenDetails,motherTongue,languages:[],nationality,about},
  family:{fatherName,fatherOccupation,motherName,motherOccupation,siblings:[{relation,maritalStatus,details}],familyType,familyStatus,familyValues,nativePlace,familyAbout},
  education:{highest,degrees:[{degree,institution,year}],details},
  profession:{occupation,employer,designation,workLocation,details},
  income:{amount,period,currency,text,familyIncomeText},
  religion:{religion,caste,subCaste,gotra,motherGotra,clan,tanda,raasi,nakshatra,manglik,sect,denomination,church,amritdhari,note},
  lifestyle:{diet,smoking,drinking,hobbies:[],interests:[]},
  partner:{ageMin,ageMax,heightMinCm,heightMaxCm,education,profession,location,maritalStatus,religionCaste,other},
  contact:{contactPerson,relation,phone,altPhone,whatsapp,email,address,city,state,country,bestTime},
  additional:{horoscopeNote,expectations,note},
  custom:{ <section>: [{ id, label:{en,hi}, value }] },
  sectionTitles:{ <section>: {en,hi} } }
```
- Scalars default to `''`. `heightCm`, `weightKg`, `ageMin` and similar are strings of digits or `''` (form-friendly).
- `hiddenFields` holds field ids like `'personal.dob'` that render must skip.
- Enum values are lowercase snake ids (`never_married`, `hindu`, `vegetarian`). Labels come from `K.labels[lang].values[key][id]`.

### Formatting `K.fmt`
`computeAge(dobIso, now)`, `displayAge(data, now)->{value,source}`, `formatDate(iso,{lang,style})`, `cmToFtIn(cm)->{ft,inch}`, `ftInToCm(ft,inch)`, `formatHeight(cm,'both'|'ft'|'cm')`, `formatIncome(income, lang)`, `formatRange(min,max,unit)`.

### Design and registry
- `K.palettes`: `{ id: { name, vars:{primary,accent,ink,muted,paper,rule,band,bandInk} } }`
- `K.fontPresets`: `{ id: { name, display, body, families:[] } }`; `K.fontFiles`: `{ family: [{file,weight,style}] }`
- `K.fontFaceCss(families, urlFor)`; `K.fontsFor(input)` returns the families needed (adds 'Noto Sans Devanagari' when labelLanguage is not 'en' or Devanagari text is present)
- `K.registry.register(def)`, `.get(id)`, `.list()`, `.summary()` (JSON-safe rows `{id,slug,name,tagline,categories,culture,archetype,palettes,fonts,photoPlacements,defaults,thumbnail}`), `.resolveDesign(def, design)`
- `K.registry.CATEGORIES` = `[{slug,name,description}]` with slugs `traditional, modern, minimal, premium, photo, community, regional, print-friendly`
- Template ids (stable; also thumbnail names `/images/biodata/<id>.webp`): `premium-traditional, elegant-modern, royal-heritage, classic-family, contemporary-professional, luxury-maroon-gold, elegant-floral, clean-minimal, photo-focused, hindu-classic, muslim-classic, sikh-classic, christian-classic, regional-adaptable, print-bw`
- `K.DEFAULT_TEMPLATE = 'premium-traditional'`
- `K.sampleData(gender?)` returns fresh fictional data (clearly sample; never real people)

### Rendering
- `K.renderBiodataParts({ data, templateId, design, photoUrl, mode, fontUrl, now })` returns `{ css, body, fontFamilies, warnings }`
  - mode is `'preview'|'pdf'|'thumbnail'`; an unknown template throws an Error with `code='UNKNOWN_TEMPLATE'`
  - `photoUrl` is accepted only if it is `data:image/(jpeg|png|webp);base64,…` or starts with `/api/biodata/`; otherwise it is dropped
- `K.renderBiodataHtml(input)` returns a full standalone HTML document. Fonts come from `input.fontUrl(file)`. The paginator runs after `document.fonts.ready` and sets `window.__bdPaginated = <pageCount>`.
- `K.previewShell({ fontUrl })` returns the HTML document string for the builder iframe. It contains `<style id="bd-fonts">`, `<style id="bd-css">`, `<div id="bd-root">`, and defines `window.__bdRepaginate()` (returns the page count and also sets `window.__bdPaginated`).
- `K.paginateSource`: the ES5 paginator function

### 1a. As implemented by the kit track (additions and clarifications; nothing above was removed)
- Field entries also carry `step`, `enumKey` (labels group for select values, e.g. `family.siblings.relation` uses `siblingRelation`), `prose` (rendered as paragraphs), `core`, `free` (multiselect accepts free text; options are suggestions), `maxItems`, `itemMax`, `min`, `maxValue`, `unit`. Helpers: `K.schema.field(id)`, `fieldsOf(section)`, `isApplicable(field, data)`, `OPTIONS`, `SPACINGS` (`compact|normal|relaxed`), `PHOTO_SHAPES` (`rounded|circle|square|arch`), `LABEL_LANGUAGES`, `DERIVED_IDS` (`personal.age, partner.age, partner.height, contact.location`, hideable like fields), `HIDEABLE`, `normaliseOrder(arr)`, `cleanText(v,max,multiline)`. `LIMITS` also has `sectionTitleMax 40, customLabelMax 40, customValueMax 200, invocationMax 60, footerMax 80, hiddenFieldsMax 80`.
- `clean()` never throws. Errors may carry `soft:true` (phone/email format: value kept). Hard errors drop the value. Unknown keys and invalid list items are dropped silently; over-long text is truncated silently. `when` rules do not delete data (render skips non-applicable fields). Gotra, mother's gotra, raasi, nakshatra and manglik apply to hindu/jain/sikh/buddhist **and while religion is unset**.
- `validate(data, now?)` and `stepStatus(data, stepId, now?)` take an optional `now`. `stepStatus('photo')` is always `'empty'` (the builder knows its own photo state); `'design'` is always `'complete'`.
- `cleanDesign` returns only the keys given (cleaned). Values that are invalid or not offered by the template are dropped silently (so a template switch falls back to the new defaults); only unknown keys produce errors. `registry.resolveDesign(def|id, design)` returns the full design.
- `registry.summary()` rows: `name` is the English string, plus `nameHi`, `description`, `tags`, `printSafe`; `palettes` and `fonts` are id arrays (look up `K.palettes` / `K.fontPresets` for swatches and names). `K.TEMPLATE_IDS` lists the 15 contract ids. `registry.register` throws `code:'INVALID_TEMPLATE'` on a bad def.
- Palettes: `maroon-gold, royal-blue-gold, emerald-gold, plum-gold, rose-marigold, saffron, peacock, teal-coral, navy-slate, charcoal-gold, sage, blush, indigo, ink, graphite`. Font presets: `playfair-poppins, cormorant-lora, cormorant-poppins, playfair-lora, lora-dmsans, playfair-dmsans, poppins, dmsans`. Ornaments: `lotus, diamond, bead, corner, mandala, star` (`K.ornament(key, cls)`).
- `renderBiodataParts` also returns `lang` (`'hi'` when labelLanguage is hi, else `'en'`). A missing `templateId` uses `DEFAULT_TEMPLATE`. Warning code: `PHOTO_REJECTED`. In `mode:'thumbnail'` an empty `data.invocation` is filled from the template default (thumbnails show the culture line); in other modes render uses only `data.invocation`, so the builder prefills it from `def.defaults.invocation` on template choice.
- Paginator/runtime: `window.__bdPaginated` is the page count, or `-1` if pagination threw (the PDF service should treat `< 1` as an error). Standalone documents set it only after fonts and photo decoding. Every (re)pagination also dispatches `window` event `bd:paginated` (`detail` = count); in the preview shell, late font loads trigger an automatic re-pagination, so the builder should listen to that event for the "Page x of n" display in addition to the `__bdRepaginate()` return value.
- Extra exports: `K.photoAllowed(url)`, `K.labelPair({en,hi}, mode)`, `K.hasDevanagari(v)`, `K.fmt.formatTime/formatAge/fieldText/parseIsoDate/groupIndian/groupWestern`, `K.sampleDataLong()`, `K.bootSource`, `K.makeRenderContext` (archetype authors), `K.archetypes` (see `packages/shared/biodata/archetypes/README.md`).
- `packages/shared` test script is `node --test "test/*.test.js"` (a bare directory argument does not work on Node 22).
- Added by templates track B: palettes `rose-sage, sage-rose, mauve-sage, midnight-gold, wine-gold, saffron-maroon, deccan-maroon, rajasthani-pink, punjabi-saffron, kerala-green, bengal-red`; ornaments `filigree, floral` (frame corners), `scroll, vine, paisley, marigold` (dividers), `bloom` (title motif); photo slots `top-center, top-right` (frame) and `hero` (hero; a full-bleed crop, photoShape ignored). Classic gains `titleStyle: 'ornate'`. In `labelLanguage:'both'` the Hindi row label sits beside the English when it fits, else on a tight second line (classic, frame, hero), so `K.sampleData()` stays at 2 pages. Thumbnails: `node apps/web/scripts/biodata-thumbnails.js --chromium <path> [--only id1,id2] [--no-og]`.

## 2. API (`/api/biodata`, `/api/admin/biodata`)
Envelope `{status:true,data}` / `{status:false,code,message}`. See the plan table. Key contracts used by web and admin:
- `GET /api/biodata/config` returns `{enabled,guestDownloads,maxPerUser,languages,shareDefaultDays,pdf:'ready'|'unavailable'}`
- `GET /api/biodata/templates` returns `{status, data:[{templateId,slug,name,tagline,description,categories,category,tags,culture,archetype,thumbnail,isFeatured,order}], categories:[{slug,name,description,count}]}`
- `GET /api/biodata/pages?published=1` returns rows `{slug,kind,metaTitle,updatedAt,contentWords}`; `GET /api/biodata/pages/:slug` returns the full published page
- `POST /api/biodata/render` (multipart): field `payload` (JSON string `{title,templateId,design,data}`) and optional file `photo`. Returns `application/pdf` with `X-Biodata-Pages`; errors are 400/403/503 with the codes in the plan.
- Owner routes:
  - `GET/POST /documents`, `GET/PUT/DELETE /documents/:id` (PUT body may include `ifVersion`)
  - `POST /documents/:id/duplicate`
  - `GET /documents/:id/versions`, `GET /documents/:id/versions/:v`, `POST /documents/:id/versions/:v/restore`
  - `POST|DELETE|GET /documents/:id/photo` (multipart field `photo`)
  - `GET /documents/:id/pdf`
  - `POST /documents/:id/share {enabled,days}`, `POST /documents/:id/share/rotate`
- Document view: `{_id,title,templateId,design,data,status,version,createdAt,updatedAt,lastRenderedAt, photo:{width,height,size,url}|null, share:{token,url,expiresAt,views}|null}`. List rows: `{_id,title,templateId,status,version,updatedAt,hasPhoto,shareActive,shareExpiresAt}` plus a top-level `max`.
- Shared:
  - `GET /api/biodata/shared/:token` returns `{title,templateId,design:{labelLanguage},expiresAt,html,css,fontFamilies}`. html/css come from renderBiodataParts in mode 'preview', with photo url `/api/biodata/shared/<token>/photo`.
  - `/shared/:token/photo`, `/shared/:token/pdf`
- Admin:
  - `/api/admin/biodata/stats`
  - `/templates`: GET; PUT `/:templateId`; POST `/reorder {templateIds}`; DELETE `/:templateId/overrides`
  - `/pages`: GET with `?kind&published`; POST; GET/PUT/DELETE `/:id`; POST `/:id/publish {published}`
- BiodataPage fields:
  - `slug`, `kind` ('landing'|'guide'|'category')
  - `metaTitle`, `metaDescription`, `canonicalOverride`, `ogImage`, `h1`, `intro` (html)
  - `contentBlocks`: `[{type:'richText'|'steps'|'checklist'|'table'|'callout'|'cta', heading, html, items[], rows[[...]], ctaLabel, ctaHref}]`
  - `faqs`: `[{question,answer}]`
  - `ctaConfig`: `{heading,text,primaryLabel,primaryHref,secondaryLabel,secondaryHref}`
  - `relatedLinks`: `[{label,href}]`
  - `isPublished`, `publishedAt`, `contentWords`, `updatedAt`
- Guide slug regex: `^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$`. The landing slug is `biodata-maker`. A category slug is the registry category slug.
- Settings keys: `biodata.enabled, biodata.guestDownloads, biodata.maxPerUser, biodata.languages, biodata.shareDefaultDays`

### 2a. As implemented by the API track (additions and clarifications)
- `/documents/:id/pdf` answers both **GET and POST** (same handler; the builder may POST after flushing autosave).
- `POST /documents/:id/share` and `/share/rotate` return `data: {share:{token,url,expiresAt,views}|null, shareUrl:string|null}`. `days` must be 7, 30 or 90 (omitted means `biodata.shareDefaultDays`). Enabling while a link is active keeps the token and only moves the expiry. Rotate needs an active link, otherwise 409 `SHARE_OFF`.
- Photo POST/DELETE return the full **document view** (`data.photo` = `{width,height,size,url}` or null). Photo POST/DELETE do not change `version`.
- PUT `/documents/:id`: body keys `title, templateId, design, data, status ('draft'|'completed'), ifVersion`, all optional. A 409 `VERSION_CONFLICT` carries the current `version` at the top level. Only a content change (title/templateId/design/data) bumps `version`.
- `GET /documents/:id/versions` returns `data:[{version,title,templateId,reason,createdAt}]` and `current`. `GET .../versions/:v` returns `{version,title,templateId,design,data,reason,createdAt}`. Restore returns the document view.
- POST `/documents` and duplicate return 201 + the document view; 409 `LIMIT_REACHED` carries `max`.
- Error codes beyond the plan: 413 `PAYLOAD_TOO_LARGE` (payload > 256 KB or photo > 5 MB), 400 `UPLOAD_ERROR` (unexpected multipart field), 400 `INVALID_IMAGE`, 500 `SERVER_ERROR`. `PDF_BUSY` sends `Retry-After: 5`.
- PDF responses also send `Access-Control-Expose-Headers: X-Biodata-Pages, Content-Disposition`.
- Validation: kit `clean` errors marked `soft` (phone/email format) are accepted and the value is kept; any other error is a 400 with the first error's code and `"<path>: <message>"`.
- `GET /api/biodata/shared/:token` 404s (bad, unknown or expired token) all share one message; every shared response sends `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`.
- Admin (`/api/admin/biodata`), shapes agreed with the admin track:
  - `GET /stats` returns `data:{documents:{total,last30Days,last7Days,users,withPhoto}, shares:{active}, templates:{active,total}, pages:{published,total}, byTemplate:[{templateId,count}], pdf}`.
  - `GET /templates` returns `{data:[row], categories:[{slug,name,description,count}]}`. Each row is `{templateId,slug,culture,archetype,categories,isActive,isFeatured,order,usageCount,hasOverrides,displayName,description,category,tags,thumbnailUrl,registry:{name,description,category,tags,thumbnail},updatedAt}`. The flat override fields are the RAW stored values (`''`/`[]` when unset). PUT, reset and reorder return the same row shape (reorder returns `[{templateId,order}]`).
  - Page list rows are `{_id,slug,kind,metaTitle,h1,isPublished,publishedAt,contentWords,createdAt,updatedAt}` with `pagination:{total,page,limit(50 default, max 100),pages}` (`?page&limit`).
  - Errors are `{status:false, code, message, field?}`. `field` names the offending input (`slug` on SLUG_TAKEN 409, SLUG_FROZEN 409 and slug-rule 400s).
  - Plain-text fields are tag-stripped and stored as typed (`&` stays `&`, never `&amp;`). `intro` and block `html` go through sanitizeRich. Links (`ctaHref`, `primaryHref`, `secondaryHref`, `relatedLinks[].href`) must be same-site paths starting with a single `/`. `ogImage` and `thumbnailUrl` must be `/images/...` (optionally `https://www.banjaramatch.com/images/...`). Table blocks hold at most 40 rows of 6 cells each, with `rows[0]` as the header.
- `settings.biodata.languages` accepts an array or a comma string; only `en` and `hi` are valid; `en` is always kept. `maxPerUser` is clamped to 1..50 and `shareDefaultDays` to 1..365.

## 2b. Seed content module (Node only, not in the browser bundle)
`require('@banjaramatch/shared/biodata/content/pages')` exports an array of BiodataPage-shaped objects
(`slug, kind, metaTitle, metaDescription, h1, intro, contentBlocks, faqs, ctaConfig, relatedLinks`) for:
`biodata-maker` (landing), `marriage-biodata-format`, `marriage-biodata-in-hindi`, `banjara-biodata-gotra-and-clan`.
Used by `apps/api/tools/seedBiodataPages.js` and as the web landing page's fallback copy when the API has no landing page.

## 3. Web locals for the builder view `views/pages/biodata-maker-create.ejs`
The route (owned by routes/biodata.js) renders with:
`{ meta: pageMeta('biodataBuilder'), user, breadcrumbs, boot: { user:{id,name}|null, document:<document view>|null, templateId, templates:<K.registry.summary() filtered to active>, categories, config:<config>, pdfAvailable:bool, loginUrl:'/login?returnTo=/biodata-maker/create' } }`
- The view emits `<script>window.BM_BIODATA_BOOT = <%- safeJson(boot) %>;</script>` and the shell markup.
- JS and CSS come from `meta.scripts = ['js/biodata-kit.js','js/biodata-cropper.js','js/biodata-builder.js']` and `meta.styles = ['css/biodata-builder.css']`.
- Fonts for the preview iframe: `/fonts/biodata/<file>` (static mount in web app.js).
- Kit in the browser: `asset('js/biodata-kit.js')` (built) or the dev route `GET /js/biodata-kit.js` (concatenation of `K.bundleFiles`, no-store).

## 4. Site UI style (landing, gallery, builder chrome, my-biodatas)
Owner preference: a modern, vibrant matrimonial look.
- Rose-red/pink wedding palette (e.g. primary #e11d48, deep #be123c, soft #fff1f2), with a marigold accent (#f59e0b) used sparingly.
- Clean sans-serif (Poppins, already self-hosted).
- White cards on cool light grey (#f4f5f8 / #eef0f5), generous radius (14-20px), soft shadows.
- **No cream/ivory/warm-white grounds, no serif display type, no muted "luxury heritage" palette in site chrome.**
- Biodata document templates may be traditional or serif: they are the user's document, not site chrome.
- Mandala and marigold accents are OK.

## 5. Ground rules for every track
- The tree has uncommitted work from another task (ice-breaker removal). Never run git commands that change state (no commit, stash, checkout, reset, restore, add). Edit files in place and keep existing modifications.
- Only touch files your track owns (listed in your brief). If you need a change elsewhere, note it in your final report instead.
- Follow repo lint rules: `npm run lint` (eslint + apps/web/scripts/check-ejs-raw-web.js + scripts/check-admin-raw.js).
- Only the API track edits package.json / package-lock.json.
