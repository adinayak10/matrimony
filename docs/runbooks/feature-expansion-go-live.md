# Go-live: feature expansion (branch `feature/expansion`)

Owner steps, run as root on the VPS. Everything below the "Server" heading changes the live site.
The work was built in the worktree `/var/www/banjaramatch-feature`; production runs from `/var/www/banjaramatch`.

## 1. Server (API, admin, website)

```bash
cd /var/www/banjaramatch
git status --short                       # must be empty before merging
git merge --ff-only feature/expansion    # or push the branch to GitHub and merge there, then let the webhook deploy

# env: new keys in /var/www/banjaramatch-shared/env/api.env
install -d -m 700 /var/www/banjaramatch-shared/private-uploads
cat >> /var/www/banjaramatch-shared/env/api.env <<'ENV'
PRIVATE_UPLOADS_DIR=/var/www/banjaramatch-shared/private-uploads
CRON_ENABLED=true
VERIFICATION_FILE_RETENTION_DAYS=30
ENV
node deploy/check-env.js

export NVM_DIR=/root/.nvm; . $NVM_DIR/nvm.sh; nvm use 22.23.2
npm ci && npm run build --workspaces --if-present
bash deploy/deploy.sh --reload-only      # web needs the restart anyway: production caches compiled EJS

# one-off data steps (dry run first, then apply)
node apps/api/tools/backfill-profile-completion.js
node apps/api/tools/backfill-profile-completion.js --apply --yes-i-know --prod
```

Then in the admin panel: **Master data → Ice breaker → Seed default questions** (optional; the game falls back to built-in questions when fewer than 5 are active).

### Checks

```bash
for p in 4002 4000 4001; do curl -fsS http://127.0.0.1:$p/health; echo; done
curl -s -o /dev/null -w '%{http_code}\n' https://www.banjaramatch.com/success-stories     # 200 (empty state until a story is published)
curl -s https://www.banjaramatch.com/faq | grep -c '"@type":"FAQPage"'                   # 1
curl -s -X POST https://api.banjaramatch.com/api/fetchFAQs -H 'Content-Type: application/json' -d '{}' | head -c 200
bash deploy/check-urls.sh /var/www/banjaramatch-shared/baseline/urls-after.jsonl       # no violations; then refresh the baseline
```

### Behaviour changes to know about

- **Background jobs start** (`CRON_ENABLED=true`): profile-visit interest pushes every 15 min, saved-search alerts every 6 h, verification document purge daily. Set `CRON_ENABLED=false` and reload to stop them.
- **Guna Milan needs a login.** `POST /api/compatibility/guna-milan` returns 401 without a token. The website calls it through its own proxy, so it keeps working. It scores the two kootas the table supports, out of 8.
- **Calls** need real `AGORA_APP_ID` / `AGORA_APP_CERTIFICATE` in `api.env`; without them the token endpoint answers 503.
- **No sample content.** Success stories, FAQs and announcements are empty until you add them in the admin panel (the website FAQ keeps its built-in answers until the FAQ list has entries).

## 2. Mobile app 1.1.0+5 (laptop)

Follow `apps/mobile/README.md` ("1.1.0 laptop build checklist"): `flutter pub get`, `flutter analyze`, fix anything it reports, `flutter build apk --release` (and `pod install` + `flutter build ios` for iOS). Then upload the APK in **Admin → APK manager**. The code was written on a server without a Flutter toolchain, so `flutter analyze` is the first real compile check.

Older installed builds keep working against the new API (responses only gained fields).
