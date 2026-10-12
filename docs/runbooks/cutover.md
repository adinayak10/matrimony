# Cutover runbook: old directories → monorepo (`/var/www/banjaramatch`)

Run as root on the VPS, in this order. Every step is reversible until M2; after M2 the rollback is `bash deploy/deploy.sh <previous sha>`.
Nothing here changes a public URL. Expect zero planned 502s (bridge processes take traffic before the old apps are deleted).

## 0. Hot patches on the OLD tree (do these first, today)

```bash
# 0a. unsigned deploy webhook on the live API → 410 at nginx (the code is also gone in the monorepo)
cp -a /etc/nginx/sites-available/api.banjaramatch.com /etc/nginx/sites-available/api.banjaramatch.com.prev-$(date +%F)
python3 - <<'PY'
p='/etc/nginx/sites-available/api.banjaramatch.com'; s=open(p).read()
if 'location = /webhook' not in s:
    s=s.replace("    location / {\n        proxy_pass http://localhost:4002;", "    location = /webhook { return 410; }\n\n    location / {\n        proxy_pass http://localhost:4002;",1); open(p,'w').write(s)
PY
nginx -t && systemctl reload nginx
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://api.banjaramatch.com/webhook   # 410

# 0b. public admin test pages with the admin password → delete (already excluded from the monorepo)
rm -f /var/www/admin.banjaramatch.com/public/{debug,test-auth,flow-test,test-dashboard}.html

# 0c. rotate the admin password now (it was in those files). Example with mongosh + bcrypt via the API's node_modules:
cd /var/www/banjaramatch/apps/api && node -e "
const b=require('bcryptjs');const pw=require('crypto').randomBytes(12).toString('base64url');
console.log('NEW ADMIN PASSWORD (store it in your password manager):',pw);
console.log(b.hashSync(pw,10));" 
# then: mongosh aasd --eval 'db.users.updateOne({role:"admin"},{$set:{password:"<the hash printed above>"}})'
```

## 1. One-time server preparation (no traffic impact)

```bash
cd /var/www/banjaramatch
sudo bash deploy/server-setup.sh          # dirs/ACLs, pm2-logrotate, cron files, deploy key (prints the public key)
node deploy/check-env.js                  # expect only: "api.env JWT_SECRET is a default value" (fixed in step 4)
bash deploy/deploy.sh --link-only         # symlinks into the checkout (idempotent)
bash deploy/check-urls.sh /var/www/banjaramatch-shared/baseline/urls-before.jsonl   # refresh the live baseline
```

## 2. GitHub (laptop/browser)

1. Create the private repo `adinayak10/banjaramatch` (empty, default branch `main`).
2. Add the deploy key printed by `server-setup.sh` as a **read-only Deploy key** (or skip: root's `id_ed25519` already pushes as adinayak10).
3. On the VPS: `cd /var/www/banjaramatch && git remote add origin git@github.com:adinayak10/banjaramatch.git && git push -u origin main`.
4. Settings → Webhooks → Add: Payload URL **exactly** `https://www.banjaramatch.com/deploy-webhook`, Content type `application/json`, Secret = the `WEBHOOK_SECRET` value in `/var/www/banjaramatch-shared/env/deploy.env`, SSL verification on, "Just the push event". (It only starts working after M2 below; the ping will be 404 until then — re-deliver it after M2.)
5. Settings → Rules → new ruleset on `main`: block force pushes, block deletions, require linear history.

## 3. M1–M2: cutover (~15 minutes, no 502s)

```bash
export NVM_DIR=/root/.nvm; . $NVM_DIR/nvm.sh; nvm use 22.23.2
cd /var/www/banjaramatch && SHA=$(git rev-parse HEAD)

# M1a: bridge processes on 4100-4102 from the NEW checkout (no traffic yet)
for x in "web app.js 4100" "api index.js 4102" "admin server.js 4101"; do set -- $x
  PORT=$3 HOST=127.0.0.1 NODE_ENV=production RELEASE_SHA=$SHA pm2 start apps/$1/$2 --name bm-$1-bridge --interpreter $(command -v node) --cwd /var/www/banjaramatch/apps/$1
done
sleep 8; for p in 4102 4100 4101; do curl -fsS http://127.0.0.1:$p/health; echo; done     # all ok:true with "release":"<sha>"
curl -s -o /dev/null -w '%{http_code}\n' -H 'Host: www.banjaramatch.com' http://127.0.0.1:4100/banjara-matrimony-hyderabad   # 200

# M1b: point nginx at the bridges (install the NEW confs, then swap ports)
for f in www:banjaramatch.com api:api.banjaramatch.com admin:admin.banjaramatch.com; do n=${f%%:*}; s=${f#*:}
  cp -a /etc/nginx/sites-available/$s /etc/nginx/sites-available/$s.prev-cutover; cp deploy/nginx/$n.conf /etc/nginx/sites-available/$s; done
install -d /etc/nginx/snippets/banjaramatch && cp deploy/nginx/snippets/*.conf /etc/nginx/snippets/banjaramatch/ && cp deploy/nginx/conf.d/*.conf /etc/nginx/conf.d/
sed -i 's/127.0.0.1:4000/127.0.0.1:4100/g; s/127.0.0.1:4001/127.0.0.1:4101/g; s/127.0.0.1:4002/127.0.0.1:4102/g' /etc/nginx/sites-available/{banjaramatch.com,api.banjaramatch.com,admin.banjaramatch.com}
nginx -t && systemctl reload nginx
curl -s https://api.banjaramatch.com/health; echo      # shows the sha → traffic is on the bridges, old apps idle

# M2: final processes under the SAME pm2 names (old fork-mode apps must be deleted; startOrReload cannot change exec_mode/cwd)
pm2 delete banjaramatch-web banjaramatch-api banjaramatch-admin
rsync -a /var/www/api.banjaramatch.com/uploads/ /var/www/banjaramatch-shared/uploads/      # catch uploads made during M1
RELEASE_SHA=$SHA pm2 start ecosystem.config.js
sleep 8; for p in 4002 4000 4001; do curl -fsS http://127.0.0.1:$p/health; echo; done
for f in www:banjaramatch.com api:api.banjaramatch.com admin:admin.banjaramatch.com; do n=${f%%:*}; s=${f#*:}; cp deploy/nginx/$n.conf /etc/nginx/sites-available/$s; done
nginx -t && systemctl reload nginx
pm2 delete bm-web-bridge bm-api-bridge bm-admin-bridge; pm2 save
ss -ltnp | grep -E ':(4000|4001|4002|4003)\b'          # all 127.0.0.1

# verify the URL contract against the baseline
bash deploy/check-urls.sh /var/www/banjaramatch-shared/baseline/urls-after.jsonl
diff <(jq -c 'del(.title)' /var/www/banjaramatch-shared/baseline/urls-before.jsonl) <(jq -c 'del(.title)' /var/www/banjaramatch-shared/baseline/urls-after.jsonl)
# expected differences only: admin test pages 200→404, /health 404→200, api / 404→200, /webhook 404→410, plus the 301s listed in docs/plans/00-master-plan.md
```

## 4. M3: webhook + first push + rollback drill

```bash
# GitHub → Webhooks → Recent deliveries → Redeliver the ping → expect 200 "pong"
# laptop: touch README, commit, push → within ~2 min:
tail -f /var/www/banjaramatch-shared/logs/deploy.log     # ends with "LIVE <sha>"
# rollback drill (quiet hour): push a commit with `throw new Error('drill')` as line 1 of apps/api/index.js → deploy.log shows ROLLED BACK; git revert; push → LIVE
```

## 5. Same day: rotate the JWT secret (everyone re-logs in once; the app lands on its login screen)

```bash
NEW=$(openssl rand -hex 48)
sed -i "s/^JWT_SECRET=.*/JWT_SECRET=$NEW/" /var/www/banjaramatch-shared/env/api.env /var/www/banjaramatch-shared/env/web.env
node /var/www/banjaramatch/deploy/check-env.js            # now fully OK
bash /var/www/banjaramatch/deploy/deploy.sh --reload-only
pm2 flush                                                # old logs contain ~7,000 live tokens
rm -f /root/.pm2/logs/banjaramatch-*                     # old-tree logs (pm2 no longer references them)
```

## 6. After 24–48 h green

`mv /var/www/banjaramatch.com /var/www/banjaramatch.com.bak` (same for api./admin.), rotate the Firebase service-account key (replace `shared/secrets/serviceAccountKey.json`), revoke the APNs key, archive `adinayak10/matrimony-api` on GitHub, delete the `.bak` dirs once `ls /var/www/banjaramatch-shared/backups/mongo | wc -l` ≥ 14.

## Notes added after the code was finished

- **Index builds are off for the first boot.** `api.env` has `MONGOOSE_AUTO_INDEX=false`. Run each `apps/api/tools/cleanup/*.js` as a dry run, review, then `--apply --yes-i-know --prod` (take a `mongodump` first). After that set `MONGOOSE_AUTO_INDEX=true` and run `bash deploy/deploy.sh --reload-only`. The TTL indexes then purge old search/activity/notification/visitor rows.
- **Regional sitemap shrinks from 24 to 8 URLs once.** The 16 city pages are `noindex` until each has 300 unique words. `web.env` has `SITEMAP_ALLOW_SHRINK=1` so the first regeneration is accepted; set it to `0` after the first successful run.
- **The API refuses to boot with a JWT secret shorter than 32 characters.** Do step 5 (rotation) *before* M1, not after: the bridge processes need the new secret too. Everyone is logged out once at cutover instead of twice.
- **Admin, API and web must go live together.** The API no longer sets cookies; the web and admin servers own their sessions.
