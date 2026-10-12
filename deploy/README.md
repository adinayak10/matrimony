# Deploying banjaramatch

Everything here runs on the VPS as root under root's pm2 daemon. Only the four
`banjaramatch-*` pm2 apps and the three `*banjaramatch.com` nginx sites are ever
named; the other tenants on the box are never touched.

## How a commit reaches the server

```
laptop                GitHub                         VPS (root)
------                ------                         ----------
git push origin main  -> push webhook (HMAC) ----->  webhook-listener.js  127.0.0.1:4003 (pm2 banjaramatch-deploy-hook)
                         https://www.banjaramatch.com/deploy-webhook      202 "deploying", then detached:
                                                     deploy.sh <sha>
                                                       flock, fetch, sha on origin/main?, memory gate
                                                       git reset --hard, link_shared, npm ci (lockfile changed only)
                                                       npm run build --workspaces, install_nginx (nginx -t, .prev)
                                                       pm2 startOrReload --update-env (cluster reload, no port gap)
                                                       wait_healthy: /health "release":"<sha>" on 4002, 4000, 4001
                                                       check-urls gate vs url-contract.baseline.jsonl
                                                       .last-good, pm2 save, notify.sh  ->  LIVE <sha>
                                                     any failure after reset -> rollback() -> ROLLED BACK <prev>
```

- Only `refs/heads/main` deploys; the listener answers 202 and ignores anything else.
  A sha that is not on `origin/main` is refused (exit 65), so a manual rollback is
  `bash deploy/deploy.sh <older-sha>` and nothing else can be deployed by hand either.
- Secrets never reach pm2: the listener reads `WEBHOOK_SECRET` into a local const and
  spawns `deploy.sh` with a minimal env; `deploy.sh` unsets it again before `--update-env`.
- Memory gate: when `MemAvailable` < 600 MB the deploy aborts before touching the tree
  (exit 71) and the running release stays live.
- The URL-contract gate rolls back only when a URL whose baseline status was not 404
  now 404s or redirects to a host outside banjaramatch.com; 5xx/unreachable only notify.
- Log: `SHARED/logs/deploy.log` (`tail -f` it after a push). Alerts: Telegram and/or
  email, see `.env.example`.

## Layout on the server

```
/var/www/banjaramatch/                     git checkout (this repo), deployed in place
  ecosystem.config.js                      pm2: web 4000 / api 4002 / admin 4001 (cluster, 1, wait_ready) + hook 4003 (fork)
  apps/{web,api,admin}/.env  ->  SHARED/env/<app>.env        (symlinks made by deploy.sh link_shared)
  deploy/.env                ->  SHARED/env/deploy.env
  apps/api/uploads           ->  SHARED/uploads
  apps/web/public/downloads  ->  SHARED/downloads
  apps/web/public/images/blog -> SHARED/blog-images
  apps/web/public/sitemap*.xml -> SHARED/sitemaps/sitemap*.xml (the four files individually)
/var/www/banjaramatch-shared/  (= SHARED)  outside git; git reset --hard can never destroy it
  env/ (700)   secrets/ (700)   uploads/   downloads/   blog-images/   sitemaps/
  logs/        deploy.log, backup.log, uptime.log, pm2 out/err (pm2-logrotate 20M/14/compress)
  backups/     mongo/ uploads/ config/ pre-migration/   (backup.sh, 14 days)
  baseline/    urls-before.jsonl, urls-after.jsonl, psi-*.json, autocannon-*.json
  .last-good   sha of the newest release that passed health + the URL gate
```

Node is pinned by `.nvmrc` (22.23.2) and used as an absolute interpreter path: the pm2
daemon itself runs Node 18. Every loopback URL in the env files is literal `127.0.0.1`
(Node 22 resolves `localhost` to `::1` first).

## Scripts

| script | purpose |
|---|---|
| `deploy.sh [sha] [--link-only] [--reload-only]` | the deploy; `--link-only` only (re)creates the symlinks; `--reload-only` reloads the current checkout after an env change |
| `webhook-listener.js` | GitHub push -> `deploy.sh` (HMAC, 2 MB cap, delivery dedupe, `ping` -> `pong`) |
| `server-setup.sh [--with-gitleaks]` | idempotent, root: SHARED tree, ACLs, pm2-logrotate, deploy key, cron files |
| `check-env.js [--examples]` | server: SHARED env vs `.env.example` + rules (ports, HOST, JWT_SECRET, loopback URLs); CI: every `process.env.X` is listed in `.env.example` |
| `check-urls.sh <out.jsonl>` + `url-contract.txt` | fetch every sitemap URL + contract entry; `url-contract.baseline.jsonl` is the committed baseline (title stripped) the deploy gate diffs against |
| `check-links.sh` | crawl sitemap pages, HEAD every same-host link, fail on 404 |
| `backup.sh [--check]` | nightly: mongodump, hard-linked uploads snapshot, env+secrets tarball, prune after success, optional rclone |
| `restore.md` | how to put any of it back |
| `uptime-check.sh` | 4 public probes every 5 min, alert on state change only |
| `notify.sh` / `notify-mail.js` | Telegram / email; never fail the caller |
| `loadtest.sh [label]` | autocannon -c 20 -d 20 on the three key local URLs -> `SHARED/baseline/` |
| `psi.sh [label]` | PageSpeed Insights for 4 pages (needs `PSI_API_KEY`) -> `SHARED/baseline/` |
| `cron/` | `/etc/cron.d/banjaramatch-backup` (21:00 UTC), `banjaramatch-uptime` (*/5) |
| `nginx/` | `www.conf`, `api.conf`, `admin.conf`, `snippets/*.conf`, `conf.d/*.conf` — installed by `deploy.sh install_nginx` as copies into `sites-available/<host>`, `snippets/banjaramatch/`, `conf.d/` |

## First-time and runbook commands

```bash
sudo bash deploy/server-setup.sh          # SHARED tree, ACLs, logrotate, deploy key, cron
# write SHARED/env/{web,api,admin,deploy}.env (600) from apps/*/.env.example + deploy/.env.example
bash deploy/deploy.sh --link-only         # symlinks; git status must stay clean
node deploy/check-env.js                  # must print check-env: OK
pm2 delete banjaramatch-web banjaramatch-api banjaramatch-admin   && RELEASE_SHA=$(git rev-parse HEAD) pm2 start ecosystem.config.js && pm2 save   # cutover only (B4 M2: old fork-mode apps must be deleted first; see docs/plans/00-master-plan.md Phase 1 step 7)
curl -fsS http://127.0.0.1:4002/health http://127.0.0.1:4000/health http://127.0.0.1:4001/health
```

After the cutover every push to `main` deploys. By hand: `bash deploy/deploy.sh`
(origin/main) or `bash deploy/deploy.sh <sha>`. A sha equal to HEAD is re-deployed
unless `SHARED/.last-good` already names it ("already live").

Rollback drill: push a commit with `throw new Error('drill')` at the top of
`apps/api/index.js` -> `deploy.log` shows the health failure, then `ROLLED BACK to <prev>`
and `/health` reports the previous sha -> `git revert` + push -> `LIVE`.

## Env files

Names are fixed (see `apps/*/.env.example`, `deploy/.env.example`, `check-env.js`):
web `PORT HOST NODE_ENV JWT_SECRET AUTH_SERVER_URL API_URL ...`; api `PORT HOST NODE_ENV
MONGODB_URI JWT_SECRET FIREBASE_SERVICE_ACCOUNT_PATH BLOG_IMAGE_DIR FRONTEND_URL SMTP_* ...`;
admin `PORT HOST NODE_ENV API_BASE_URL API_INTERNAL_URL API_PUBLIC_URL SESSION_TTL_HOURS`
(no `JWT_SECRET`); deploy `WEBHOOK_SECRET WEBHOOK_PORT BACKUP_RETENTION_DAYS` + optional
Telegram/email/rclone. `RELEASE_SHA`, `NODE_ENV`, `PORT`, `HOST` are also set by pm2 from
`ecosystem.config.js`; dotenv never overrides them.
