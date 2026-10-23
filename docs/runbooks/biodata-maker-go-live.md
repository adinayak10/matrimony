# Go-live: biodata maker (`/biodata-maker`)

Owner steps, run as root on the VPS unless a step says "laptop". Plan: `docs/plans/02-biodata-maker.md`.
Steps 1 and 2 can be done before the code is merged; everything from step 3 changes the live site.

## 1. Chromium and fonts (one time, before the deploy)

The PDF is rendered by a headless Chromium that the API starts on demand. Without it, downloads answer 503
and the builder offers Print ("Save as PDF" gives the same document), so the site works either way.

```bash
. /etc/os-release; echo "$ID $VERSION_ID"; free -m
```

**Debian:**

```bash
apt-get update
apt-get install -y chromium fonts-liberation fonts-noto-core
/usr/bin/chromium --version
```

**Ubuntu:** apt's `chromium` is a snap there, and a snap cannot run headless under pm2. Install Google Chrome's .deb instead:

```bash
wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
apt-get install -y /tmp/chrome.deb fonts-liberation fonts-noto-core
rm /tmp/chrome.deb
/usr/bin/google-chrome-stable --version
```

The biodata fonts (including Devanagari) are embedded in every PDF, so these system fonts are only a safety net
(mainly for the optional Arabic invocation line).

## 2. Environment

Add to `/var/www/banjaramatch-shared/env/api.env` (use the path the `--version` command above printed):

```bash
cat >> /var/www/banjaramatch-shared/env/api.env <<'ENV'
CHROMIUM_PATH=/usr/bin/chromium
BIODATA_PDF_DISABLED=
ENV
node deploy/check-env.js       # warns if CHROMIUM_PATH is set but the file is missing
```

On Ubuntu use `CHROMIUM_PATH=/usr/bin/google-chrome-stable`.

**Kill switch:** `BIODATA_PDF_DISABLED=1` turns server-side PDFs off without a code change (downloads answer 503 and
the builder offers Print). Set it, then `bash deploy/deploy.sh --reload-only`. Clear it and reload again to switch back.

## 3. Deploy all three apps together

Web, API and admin ship as one release: the web pages call the new `/api/biodata` endpoints and the admin pages call
`/api/admin/biodata`. Merge to `main` and push (the webhook deploys everything), or follow the manual path:

```bash
cd /var/www/banjaramatch
git status --short                       # must be empty
export NVM_DIR=/root/.nvm; . $NVM_DIR/nvm.sh; nvm use 22.23.2
npm ci && npm run build --workspaces --if-present     # npm ci: puppeteer-core is a new API dependency (it downloads no browser)
bash deploy/deploy.sh --reload-only
ls -ld /var/www/banjaramatch-shared/private-uploads/biodata /var/www/banjaramatch-shared/private-uploads/biodata_tmp   # drwx------
```

### Checks

```bash
for p in 4002 4000 4001; do curl -fsS http://127.0.0.1:$p/health; echo; done        # API health shows "pdf":"ready"
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.banjaramatch.com/biodata-builder           # 301 .../biodata-maker
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.banjaramatch.com/biodata-builder.html      # 301 .../biodata-maker
curl -s -o /dev/null -w '%{http_code}\n' https://www.banjaramatch.com/biodata-maker                             # 200
curl -s -o /dev/null -w '%{http_code}\n' https://www.banjaramatch.com/biodata-maker/create                      # 200
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.banjaramatch.com/biodata-maker/my           # 302 to /login
curl -sI https://www.banjaramatch.com/biodata-maker/s/000000000000000000000000000000000000000000000000 | grep -iE '^HTTP|x-robots-tag'   # 404 + noindex
curl -s https://www.banjaramatch.com/robots.txt | grep biodata-maker                                            # Disallow /my and /s/
```

`"pdf":"unavailable"` means `CHROMIUM_PATH` is missing or wrong, or the kill switch is on.

**Real PDF test (browser):** open `/biodata-maker/create` in a private window, press "Load sample", then Download PDF.
Open the file: text is selectable, Hindi labels (Design → labels Both) are correct, and the page count matches the preview.
Then log in, save a biodata, turn on a share link, open it in another private window (no contact details shown by default)
and turn the link off again.

## 4. Seed and publish the content pages

```bash
cd /var/www/banjaramatch
node apps/api/tools/seedBiodataPages.js                                   # dry run: lists the 4 pages it would create
node apps/api/tools/seedBiodataPages.js --apply --yes-i-know --prod       # creates them unpublished (existing slugs are left alone without --force)
```

The copy lives in `packages/shared/biodata/content/pages.js`. Then in the admin panel:

- **Admin → Content → Biodata pages:** open each page (`biodata-maker`, `marriage-biodata-format`,
  `marriage-biodata-in-hindi`, `banjara-biodata-gotra-and-clan`), read it, edit anything you want worded differently,
  and Publish. Each guide shows its word count; under 300 words a page is served `noindex`. Publishing regenerates the
  sitemap. A published slug cannot be changed.
- **Admin → Settings → Biodata maker:** check `enabled` (on), `guestDownloads` (on), `maxPerUser` (10),
  `shareDefaultDays` (30), `languages` (`en, hi`). Save.
- **Admin → Content → Biodata templates:** order, featured flags, display names and descriptions of the 15 templates.
  "Reset overrides" puts a template back to its built-in values.

```bash
for u in marriage-biodata-format marriage-biodata-in-hindi banjara-biodata-gotra-and-clan; do
  curl -s -o /dev/null -w "%{http_code} $u\n" https://www.banjaramatch.com/$u; done                      # 200 each
curl -s https://www.banjaramatch.com/sitemap-main.xml | grep -c 'biodata'                                  # >= 5
```

## 5. Link the existing blog posts

**Admin → Content → Blogs**, edit the two biodata posts and add a short call to action linking to `/biodata-maker`:

- `/blogs/tips/how-to-write-a-banjara-marriage-biodata-that-gets-serious-responses`: also link `/marriage-biodata-format`.
- `/blogs/general/banjara-biodata-to-baraat-a-first-timer-s-guide-to-the-modern-matrimony-process`: also link
  `/banjara-biodata-gotra-and-clan`.

Keep the slugs unchanged (they are in the URL baseline).

## 6. URL contract and baseline

Run this only after step 4, because the three guide URLs are in `deploy/url-contract.txt` as 200.

```bash
bash deploy/check-urls.sh /var/www/banjaramatch-shared/baseline/urls-after.jsonl
diff <(jq -c 'del(.title)' deploy/url-contract.baseline.jsonl) <(jq -c 'del(.title)' /var/www/banjaramatch-shared/baseline/urls-after.jsonl)
```

Expected differences: `/biodata-builder` now 301 to `/biodata-maker` (it was 200), the four `biodata-builder*.html`
URLs now point at `/biodata-maker`, and the new `/biodata-maker` and guide URLs. Anything else is a regression.
When the diff is clean, refresh the committed baseline on the laptop (production must stay a clean checkout):
copy `urls-after.jsonl` down, run `jq -c 'del(.title)' urls-after.jsonl > deploy/url-contract.baseline.jsonl`,
commit and push.

## 7. Search Console

- Sitemaps: resubmit `https://www.banjaramatch.com/sitemap.xml`.
- URL Inspection → Request indexing: `/biodata-maker`, `/biodata-maker/templates` and the three guide URLs.
- Inspect `/biodata-builder` once so Google sees the 301.
- Rich Results Test on `/biodata-maker` and one guide (one FAQPage each, no rating markup).

## Memory and behaviour notes

- A PDF render uses roughly **250–300 MB** while Chromium is running. The browser closes after 60 s idle, so a burst
  of downloads holds that memory for up to about a minute after the last one.
- The API refuses to start a render when `MemAvailable` is below **350 MB** and answers 503; the builder then offers
  Print. Renders run one at a time with at most 4 waiting; a fifth request gets "busy, retry" (`PDF_BUSY`).
- Chromium is a child process outside pm2's `max_memory_restart`, so watch `free -m` for the first days. If the box
  runs short, set the kill switch (step 2): the maker keeps working through Print.
- Deploys need 600 MB free (the deploy memory gate); a running render can briefly push you under it. Retry after a minute.
- Member photos for biodatas live in `private-uploads/biodata` (0700, never served by nginx); guest photos are written
  to `private-uploads/biodata_tmp` only for the duration of one render and deleted afterwards.
- Expired share links are cleared daily by the scheduler (`CRON_ENABLED=true`, already set).

## Known gaps (not blockers)

- No DOCX or PNG export in this release; PDF and Print only.
- No AI writing help; field hints are static examples.
- Until Chromium is installed, downloads fall back to Print, which produces the same document.
