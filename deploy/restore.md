# Restore

Backups live in `/var/www/banjaramatch-shared/backups/` (nightly, `deploy/backup.sh`, 14 days):

| what | where |
|---|---|
| MongoDB `aasd` | `mongo/aasd-<date>.archive.gz` |
| uploads (profile_images, apk, blog_images) | `uploads/<date>/` (hard-linked snapshots; `latest` -> newest) |
| env files + secrets | `config/<date>.tar.gz` (600) |
| pre-migration tarballs of the old trees | `pre-migration/` |

All commands as root on the VPS. `SHARED=/var/www/banjaramatch-shared`.

## Database

Test first into a scratch database, then swap:

```bash
F=$SHARED/backups/mongo/aasd-2026-10-12.archive.gz
mongorestore --host 127.0.0.1 --gzip --archive=$F --nsFrom 'aasd.*' --nsTo 'aasd_restoretest.*'
mongosh --quiet --eval 'db.getSiblingDB("aasd_restoretest").users.countDocuments()'
mongosh --quiet --eval 'db.getSiblingDB("aasd_restoretest").dropDatabase()'
```

Real restore (replaces every collection in `aasd`; the API keeps running, stop it
first for a consistent cut: `pm2 stop banjaramatch-api`):

```bash
mongorestore --host 127.0.0.1 --gzip --archive=$F --nsInclude 'aasd.*' --drop
pm2 start banjaramatch-api
curl -fsS http://127.0.0.1:4002/health
```

## Uploads

```bash
rsync -a $SHARED/backups/uploads/2026-10-12/ $SHARED/uploads/      # add --delete to drop files newer than the snapshot
setfacl -R -m u:www-data:rX $SHARED/uploads
```

## Env files and secrets

```bash
tar -tzf $SHARED/backups/config/2026-10-12.tar.gz                   # look first
tar -xzf $SHARED/backups/config/2026-10-12.tar.gz -C $SHARED env secrets
chmod 600 $SHARED/env/* $SHARED/secrets/*
bash /var/www/banjaramatch/deploy/deploy.sh --reload-only            # apps re-read their .env
```

## Code

The running commit is in `$SHARED/.last-good`; `/health` on each app reports it.

```bash
bash /var/www/banjaramatch/deploy/deploy.sh <older-sha>   # any ancestor of origin/main; builds, reloads, health-checks
```

A sha that is not on `origin/main` is refused (exit 65). After a `ROLLED BACK`
notification the previous commit is already live again; `git revert` the bad
commit on the laptop and push.

## Whole-box loss

1. Restore `$SHARED` from the off-box copy (`RCLONE_REMOTE` in deploy.env) or the last tarball.
2. `git clone` the repo to `/var/www/banjaramatch`, `sudo bash deploy/server-setup.sh`,
   `bash deploy/deploy.sh --link-only`, `node deploy/check-env.js`.
3. Restore the database and uploads as above; `npm ci --omit=dev && npm run build --workspaces --if-present`.
4. Install nginx confs from `deploy/nginx/` (see `deploy/README.md`), `pm2 start ecosystem.config.js`, `pm2 save`.
