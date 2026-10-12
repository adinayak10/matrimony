# banjaramatch

Monorepo for banjaramatch.com: the public website, the API, the admin panel,
the Flutter app and the deploy tooling. One `git push origin main` deploys
the three Node apps to the VPS; the app is built on a laptop.

| Path | What | Host / port |
|---|---|---|
| `apps/web` | Express 5 + EJS website (`@banjaramatch/web`) | `www.banjaramatch.com` -> `127.0.0.1:4000` |
| `apps/api` | Express 4 + mongoose + socket.io API (`@banjaramatch/api`) | `api.banjaramatch.com` -> `127.0.0.1:4002` |
| `apps/admin` | Admin panel server (`@banjaramatch/admin`) | `admin.banjaramatch.com` -> `127.0.0.1:4001` |
| `apps/mobile` | Flutter app, built on the laptop only ([README](apps/mobile/README.md)) | Play / APK via admin APK manager |
| `packages/shared` | `@banjaramatch/shared`, code shared by the three Node apps (empty until Phase 7) | |
| `deploy/` | webhook listener, `deploy.sh`, nginx confs, backup/uptime scripts, URL-contract check | hook on `127.0.0.1:4003` |
| `docs/` | plans, audit reports, legacy docs ([index](docs/README.md)) | |

Node `22.23.2` (`.nvmrc`), npm 10, npm workspaces with one root lockfile.

## Local run

```sh
nvm use                      # reads .nvmrc
npm ci                       # one install for every workspace
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
# edit the .env files: MONGODB_URI, JWT_SECRET (same value in web + api), FIREBASE_SERVICE_ACCOUNT_PATH
npm run dev                  # web 4000, api 4002, admin 4001 via nodemon
```

Single app: `npm run dev -w apps/api`. Loopback URLs must be `127.0.0.1`,
never `localhost` (Node 22 resolves `localhost` to `::1` first).

Checks (the same ones CI runs):

```sh
npm run lint                 # eslint (flat config, Node code only)
npm run check:env -- --examples   # every key the code reads is in .env.example
npm test                     # node:test boot tests in apps/*/test/
npm run check:urls -- out.jsonl   # public URL contract (deploy/url-contract.txt)
```

Each app answers `GET /health` with
`{ok, app, db (api only), release, uptime}` and `Cache-Control: no-store`;
the API returns 503 while Mongo is not connected.

## Deploy flow (production)

1. `git push origin main`.
2. GitHub sends the push webhook to `https://www.banjaramatch.com/deploy-webhook`
   (nginx -> `deploy/webhook-listener.js` on `127.0.0.1:4003`), which verifies
   `X-Hub-Signature-256`, accepts `refs/heads/main` only and runs `deploy/deploy.sh <sha>`.
3. `deploy.sh`: lock -> fetch -> `git reset --hard <sha>` -> relink shared runtime
   files -> `npm ci` (only when the lockfile changed) -> `npm run build` ->
   install nginx confs (`nginx -t`, previous conf restored on failure) ->
   `pm2 startOrReload ecosystem.config.js --update-env` -> wait for `/health`
   to report the new `release` sha on 4002/4000/4001 -> URL-contract check ->
   `pm2 save` -> Telegram/email notify.
4. Any failed step rolls back to the previous sha and notifies.

CI (`.github/workflows/ci.yml`) runs lint, env-example check, tests and
gitleaks on pull requests and pushes; it never deploys.

pm2 names: `banjaramatch-web`, `banjaramatch-api`, `banjaramatch-admin`,
`banjaramatch-deploy-hook` (`ecosystem.config.js`, cluster mode, one
instance, `wait_ready`, absolute Node 22 interpreter path).

## Runtime files outside git

Everything that must survive `git reset --hard` lives in
`/var/www/banjaramatch-shared/` and is symlinked into the checkout by
`deploy.sh link_shared`:

| Shared path | Linked to |
|---|---|
| `env/{web,api,admin,deploy}.env` (mode 600) | `apps/*/.env`, `deploy/.env` |
| `secrets/` (Firebase service account, APNs key, Android keystore + `key.properties`) | read by path from env; never linked into the tree |
| `uploads/` (`profile_images`, `apk`, `blog_images`) | `apps/api/uploads` |
| `downloads/` (APK served as `/downloads/banjaramatch.apk`) | `apps/web/public/downloads` |
| `blog-images/` | `apps/web/public/images/blog` (API writes here via `BLOG_IMAGE_DIR`) |
| `sitemaps/` | `apps/web/public/sitemap*.xml` |
| `logs/` | pm2 out/err logs, `deploy.log`, `backup.log`, `uptime.log` |
| `backups/{mongo,uploads,config}` | nightly `deploy/backup.sh`, 14-day retention |

Never commit anything under those paths; `.gitignore` lists them and CI runs
gitleaks on every commit.

## Public URL contract

Indexed URLs never change (301s allowed, 404s not). `deploy/url-contract.txt`
lists them, `deploy/check-urls.sh` captures status/final URL/canonical/title
per entry, and `deploy.sh` rolls back when a contract URL 404s after a deploy.

## Plans

`docs/plans/00-master-plan.md` is the executable summary; the per-track
designs and the integrator's conflict resolutions sit beside it.
