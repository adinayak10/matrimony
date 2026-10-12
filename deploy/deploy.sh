#!/usr/bin/env bash
# In-place deploy of one commit of /var/www/banjaramatch, with rollback to the
# previously running commit (B3.26, integrator #9/#18/#19). Spawned by
# deploy/webhook-listener.js on a push to main, or run by hand as root:
#
#   deploy/deploy.sh                  # deploy origin/main
#   deploy/deploy.sh <sha>            # deploy that commit (must be on origin/main; older = manual rollback)
#   deploy/deploy.sh --link-only      # only (re)create the symlinks into SHARED; no fetch, no restart
#   deploy/deploy.sh --reload-only    # pm2 startOrReload of the current checkout (after an env change)
#
# Steps: flock -> fetch -> sha must be an ancestor of origin/main -> memory gate
# -> git reset --hard -> link_shared -> npm ci (only when package-lock.json
# changed or node_modules is missing) -> npm run build (every deploy)
# -> install_nginx (nginx -t, .prev restore) -> pm2 startOrReload --update-env
# -> wait_healthy ("release":"<sha>" on 4002, 4000, 4001) -> URL-contract gate
# -> hook reload (only if the listener changed) -> .last-good -> pm2 save -> notify.
# Any failure after `git reset --hard` runs rollback(): same steps on the
# previous sha. Exit codes: 0 ok, 1 rolled back, 2 manual intervention,
# 64 usage, 65 unknown/foreign sha, 69 fetch failed, 71 low memory,
# 75 lock timeout, 78 shared env file missing.
set -uo pipefail
# The listener never passes these, and a hand-run shell must not leak them
# into pm2 --update-env either.
unset WEBHOOK_SECRET WEBHOOK_PORT

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
LOG_FILE="$SHARED/logs/deploy.log"
LAST_GOOD_FILE="$SHARED/.last-good"
NOTIFY="$REPO/deploy/notify.sh"
APPS="banjaramatch-web,banjaramatch-api,banjaramatch-admin"
HOOK_APP="banjaramatch-deploy-hook"
HEALTH_PORTS="4002 4000 4001"
MIN_MEM_KB=614400   # 600 MB MemAvailable before npm ci / npm run build
NGINX_SITES=/etc/nginx/sites-available
NGINX_ENABLED=/etc/nginx/sites-enabled
NGINX_CONFD=/etc/nginx/conf.d
NGINX_SNIPPETS=/etc/nginx/snippets/banjaramatch
SITEMAP_FILES="sitemap.xml sitemap-main.xml sitemap-blogs.xml sitemap-regional.xml"

MODE=deploy
SHA_ARG=""
for arg in "$@"; do
  case "$arg" in
    --link-only) MODE=link ;;
    --reload-only) MODE=reload ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    -*) echo "unknown option '$arg'" >&2; exit 64 ;;
    *) SHA_ARG="$arg" ;;
  esac
done

for d in "$SHARED/env" "$SHARED/logs"; do
  if [ ! -d "$d" ]; then
    echo "$d does not exist; run deploy/server-setup.sh first" >&2
    exit 78
  fi
done

# ── Logging ──────────────────────────────────────────────────────────────────
# From a terminal the log is shown as well; the listener spawns this script
# with stdout already on deploy.log, so teeing there would double every line.
if [ -t 1 ]; then
  exec > >(tee -a "$LOG_FILE") 2>&1
else
  exec >>"$LOG_FILE" 2>&1
fi
log() { echo "[$(date -Is)] [deploy] $*"; }
notify() {
  # A notification failure never changes the deploy's outcome.
  [ -f "$NOTIFY" ] || return 0
  DEPLOY_ENV_FILE="$SHARED/env/deploy.env" bash "$NOTIFY" "$1" || true
}

# ── Node (pinned in .nvmrc; the pm2 daemon runs Node 18) ─────────────────────
export NVM_DIR="${NVM_DIR:-/root/.nvm}"
PINNED="$(cat "$REPO/.nvmrc" 2>/dev/null || echo 22.23.2)"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  set +u
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use "$PINNED" >/dev/null 2>&1 || nvm install "$PINNED" >/dev/null 2>&1 || true
  set -u
fi
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"
BM_NODE="$(command -v node || true)"
export BM_NODE
cd "$REPO" || exit 78

# ── Shared files ─────────────────────────────────────────────────────────────
# Everything that outlives a commit is linked in, so the apps' relative paths
# keep working and `git reset --hard` can never destroy it. A symlink is
# replaced; a real non-empty directory at the spot is never deleted (it would
# be data that belongs in SHARED) and aborts the link instead.
link_shared() {
  local target="$1" at="$2"
  if [ -L "$at" ]; then
    [ "$(readlink "$at")" = "$target" ] && return 0
    rm -f "$at"
  elif [ -d "$at" ]; then
    if [ -n "$(ls -A "$at")" ]; then
      log "ABORT: $at is a real non-empty directory; move its contents into $target first"
      return 1
    fi
    rmdir "$at"
  elif [ -e "$at" ]; then
    rm -f "$at"
  fi
  mkdir -p "$(dirname "$at")"
  ln -sfn "$target" "$at"
}

check_env_files() {
  local x
  for x in web api admin deploy; do
    if [ ! -f "$SHARED/env/$x.env" ]; then
      log "ABORT: $SHARED/env/$x.env is missing"
      return 78
    fi
  done
}

link_all() {
  local x d f
  check_env_files || return 78
  for x in web api admin; do
    link_shared "$SHARED/env/$x.env" "$REPO/apps/$x/.env" || return 1
  done
  link_shared "$SHARED/env/deploy.env" "$REPO/deploy/.env" || return 1
  for d in uploads downloads blog-images sitemaps; do
    [ -d "$SHARED/$d" ] || install -d -m 755 "$SHARED/$d"
  done
  link_shared "$SHARED/uploads"     "$REPO/apps/api/uploads"             || return 1
  link_shared "$SHARED/downloads"   "$REPO/apps/web/public/downloads"    || return 1
  link_shared "$SHARED/blog-images" "$REPO/apps/web/public/images/blog"  || return 1
  # The four sitemap files individually: the web app rewrites them through
  # the symlinks at boot and every 6 h. Placeholders so the links resolve.
  for f in $SITEMAP_FILES; do
    if [ ! -f "$SHARED/sitemaps/$f" ]; then
      printf '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n' > "$SHARED/sitemaps/$f"
    fi
    link_shared "$SHARED/sitemaps/$f" "$REPO/apps/web/public/$f" || return 1
  done
  # A gitignore pattern with a trailing slash does not match a symlink, so
  # the directory links are also excluded locally; keeps `git status` clean.
  if [ -d "$REPO/.git/info" ]; then
    for f in apps/api/uploads apps/web/public/downloads apps/web/public/images/blog; do
      grep -qxF "$f" "$REPO/.git/info/exclude" 2>/dev/null || echo "$f" >> "$REPO/.git/info/exclude"
    done
  fi
  log "linked shared env files, uploads, downloads, blog-images and sitemaps"
}

# ── Dependencies and build ───────────────────────────────────────────────────
mem_available_kb() { awk '/^MemAvailable:/ {print $2}' /proc/meminfo; }
install_deps() {
  log "npm ci (package-lock.json changed or node_modules missing)"
  NODE_OPTIONS=--max-old-space-size=768 npm ci --omit=dev --no-audit --no-fund
}
build_all() {
  log "npm run build --workspaces --if-present"
  NODE_OPTIONS=--max-old-space-size=768 npm run build --workspaces --if-present
}

# ── nginx (copies, never symlinks; .prev kept for restore) ───────────────────
NGINX_CHANGED=0
NGINX_BACKUPS=()
install_conf() {
  local src="$1" dest="$2"
  if [ -f "$dest" ] && cmp -s "$src" "$dest"; then return 0; fi
  if [ -f "$dest" ]; then
    cp -p "$dest" "$dest.prev"
    NGINX_BACKUPS+=("$dest")
  else
    NGINX_BACKUPS+=("NEW:$dest")
  fi
  install -m 644 "$src" "$dest" || return 1
  NGINX_CHANGED=1
  log "nginx: installed $dest"
}
restore_nginx() {
  [ "$NGINX_CHANGED" -eq 1 ] || return 0
  local e
  for e in "${NGINX_BACKUPS[@]}"; do
    case "$e" in
      NEW:*) rm -f "${e#NEW:}" ;;
      *) [ -f "$e.prev" ] && cp -p "$e.prev" "$e" ;;
    esac
  done
  NGINX_CHANGED=0
  NGINX_BACKUPS=()
  log "nginx: previous confs restored"
  nginx -t && systemctl reload nginx
}
install_nginx() {
  [ -d "$REPO/deploy/nginx" ] || return 0
  local f name
  install -d -m 755 "$NGINX_SNIPPETS"
  # Snippets and conf.d first: the site files include them, and one nginx -t
  # covers everything.
  for f in "$REPO"/deploy/nginx/snippets/*.conf; do
    [ -f "$f" ] && { install_conf "$f" "$NGINX_SNIPPETS/$(basename "$f")" || return 1; }
  done
  for f in "$REPO"/deploy/nginx/conf.d/*.conf; do
    [ -f "$f" ] && { install_conf "$f" "$NGINX_CONFD/$(basename "$f")" || return 1; }
  done
  for f in "$REPO"/deploy/nginx/*.conf; do
    [ -f "$f" ] || continue
    case "$(basename "$f" .conf)" in
      www)   name=banjaramatch.com ;;
      api)   name=api.banjaramatch.com ;;
      admin) name=admin.banjaramatch.com ;;
      *) log "nginx: skipping unknown file $f"; continue ;;
    esac
    install_conf "$f" "$NGINX_SITES/$name" || return 1
    [ -e "$NGINX_ENABLED/$name" ] || ln -s "$NGINX_SITES/$name" "$NGINX_ENABLED/$name"
  done
  if [ "$NGINX_CHANGED" -eq 0 ]; then
    log "nginx: confs unchanged"
    return 0
  fi
  if ! nginx -t; then
    log "nginx -t rejected the new confs"
    restore_nginx
    return 1
  fi
  systemctl reload nginx || { log "nginx reload failed"; restore_nginx; return 1; }
  log "nginx: reloaded"
}

# ── pm2 and readiness ────────────────────────────────────────────────────────
pm2_reload() {
  # RELEASE_SHA and BM_NODE are read by ecosystem.config.js; --update-env makes
  # pm2 take the new env (and the env files the apps load from cwd).
  RELEASE_SHA="$1" BM_NODE="$BM_NODE" pm2 startOrReload "$REPO/ecosystem.config.js" --only "$APPS" --update-env
}
wait_healthy() {
  # 40 x 3 s per port; the API first (it is what web and admin call).
  local sha="$1" port i body
  for port in $HEALTH_PORTS; do
    body=""
    for i in $(seq 1 40); do
      body="$(curl -fsS --max-time 5 "http://127.0.0.1:$port/health" 2>/dev/null || true)"
      case "$body" in
        *"\"release\":\"$sha\""*) log "healthy: 127.0.0.1:$port reports $sha"; continue 2 ;;
      esac
      sleep 3
    done
    log "UNHEALTHY: 127.0.0.1:$port did not report $sha within 120 s (last body: ${body:0:200})"
    return 1
  done
}

# ── URL-contract gate (integrator #18) ───────────────────────────────────────
# Rolls back only for a URL whose baseline status was not 404 that now 404s
# or redirects to a host outside banjaramatch.com. 5xx/unreachable: notify.
check_urls_gate() {
  local before="$REPO/deploy/url-contract.baseline.jsonl" after="$SHARED/baseline/urls-after.jsonl" report warn
  if [ ! -f "$before" ] || [ ! -x "$REPO/deploy/check-urls.sh" ] || ! command -v jq >/dev/null 2>&1; then
    log "check-urls: baseline, script or jq missing; gate skipped"
    return 0
  fi
  install -d "$SHARED/baseline"
  bash "$REPO/deploy/check-urls.sh" "$after" || true
  [ -s "$after" ] || { log "check-urls produced no output; gate skipped"; return 0; }
  report="$(jq -rn --slurpfile b "$before" --slurpfile a "$after" '
    ($a | map({key: .url, value: .}) | from_entries) as $after
    | $b[] | . as $old | ($after[$old.url] // null) as $new
    | select($new != null)
    | if ($old.status != 404 and $new.status == 404) then
        "REGRESSION 404 \($old.url) (was \($old.status))"
      elif ($old.status != 404 and $new.status >= 300 and $new.status < 400 and $new.location != ""
            and ($new.location | test("^https?://([a-z0-9-]+\\.)*banjaramatch\\.com(/|$)") | not)) then
        "REGRESSION redirect-out \($old.url) -> \($new.location)"
      elif ($new.status >= 500) then "WARN \($new.status) \($old.url)"
      elif ($new.status == 0) then "WARN unreachable \($old.url)"
      elif ($old.status != $new.status) then "CHANGED \($old.url) \($old.status) -> \($new.status)"
      else empty end')"
  [ -n "$report" ] && printf '%s\n' "$report"
  if printf '%s\n' "$report" | grep -q '^REGRESSION'; then
    return 1
  fi
  warn="$(printf '%s\n' "$report" | grep -c '^WARN' || true)"
  if [ "${warn:-0}" -gt 0 ]; then
    notify "⚠️ banjaramatch ${SHA:0:7}: $warn contract URL(s) 5xx/unreachable after deploy (not rolled back): $(printf '%s\n' "$report" | grep '^WARN' | head -5 | tr '\n' ' ')"
  fi
  log "check-urls: no contract regression"
}

# ── Rollback ─────────────────────────────────────────────────────────────────
GOOD=""
SHA=""
LOCK_CHANGED=0
ROLLING_BACK=0
manual() {
  log "!! MANUAL INTERVENTION: $1"
  notify "🚨 banjaramatch MANUAL INTERVENTION: $1 (wanted ${SHA:0:7}, previous ${GOOD:0:7}); see deploy.log"
  exit 2
}
rollback() {
  local reason="$1"
  [ "$ROLLING_BACK" -eq 0 ] || manual "rollback itself failed: $reason"
  ROLLING_BACK=1
  log "!! $reason - rolling back to $GOOD"
  notify "❌ banjaramatch deploy ${SHA:0:7} failed: $reason - rolling back to ${GOOD:0:7}"
  git reset --hard "$GOOD" || manual "git reset --hard $GOOD failed"
  link_all || manual "link_shared failed during rollback"
  if [ "$LOCK_CHANGED" -eq 1 ] || [ ! -d "$REPO/node_modules" ]; then
    install_deps || manual "npm ci failed during rollback"
  fi
  build_all || manual "build failed during rollback"
  restore_nginx || manual "nginx restore failed"
  pm2_reload "$GOOD" || manual "pm2 reload failed during rollback"
  wait_healthy "$GOOD" || manual "health check failed on the previous release $GOOD"
  pm2 save >/dev/null 2>&1 || true
  log "ROLLED BACK to $GOOD"
  notify "↩️ banjaramatch ROLLED BACK to ${GOOD:0:7} (deploy of ${SHA:0:7} failed: $reason)"
  exit 1
}

# ── Queue: one deploy at a time, in order ────────────────────────────────────
exec 9>"$SHARED/.deploy.lock"
if ! flock -w 600 9; then
  log "ABORT: another deploy has held the lock for ten minutes"
  notify "❌ banjaramatch deploy skipped: lock held for 10 min"
  exit 75
fi

case "$MODE" in
  link)
    log "=== link-only"
    link_all; rc=$?
    [ "$rc" -eq 0 ] && log "link-only done"
    exit "$rc"
    ;;
  reload)
    GOOD="$(git rev-parse HEAD)"; SHA="$GOOD"
    log "=== reload-only of $SHA"
    link_all || exit $?
    pm2_reload "$SHA" || manual "pm2 reload failed (reload-only)"
    wait_healthy "$SHA" || manual "health check failed after reload-only (env change?)"
    echo "$SHA" > "$LAST_GOOD_FILE"
    pm2 save >/dev/null 2>&1 || true
    log "RELOADED $SHA"
    notify "🔄 banjaramatch reloaded ${SHA:0:7}"
    exit 0
    ;;
esac

# ── Deploy ───────────────────────────────────────────────────────────────────
log "=== deploy requested: ${SHA_ARG:-origin/main}"
check_env_files || exit 78
GOOD="$(git rev-parse HEAD)"
if ! git fetch --quiet --prune origin; then
  log "ABORT: git fetch failed"
  notify "❌ banjaramatch deploy: git fetch failed"
  exit 69
fi
SHA="$(git rev-parse --verify --quiet "${SHA_ARG:-origin/main}^{commit}" || true)"
if [ -z "$SHA" ]; then
  log "ABORT: ${SHA_ARG:-origin/main} is not a commit origin knows about"
  notify "❌ banjaramatch deploy refused: ${SHA_ARG:-origin/main} is not a known commit"
  exit 65
fi
if ! git merge-base --is-ancestor "$SHA" origin/main; then
  log "ABORT: $SHA is not on origin/main"
  notify "❌ banjaramatch deploy refused: ${SHA:0:7} is not on main"
  exit 65
fi
if [ "$SHA" = "$GOOD" ] && [ "$(cat "$LAST_GOOD_FILE" 2>/dev/null)" = "$SHA" ]; then
  log "already live: $SHA"
  exit 0
fi
MEM_KB="$(mem_available_kb)"
if [ "${MEM_KB:-0}" -lt "$MIN_MEM_KB" ]; then
  log "ABORT: MemAvailable is $((MEM_KB / 1024)) MB (< 600 MB); keeping $GOOD running"
  notify "❌ banjaramatch deploy of ${SHA:0:7} aborted: only $((MEM_KB / 1024)) MB free; ${GOOD:0:7} stays live. Free memory and re-run deploy/deploy.sh $SHA"
  exit 71
fi
git diff --quiet "$GOOD" "$SHA" -- package-lock.json || LOCK_CHANGED=1
HOOK_CHANGED=0
git diff --quiet "$GOOD" "$SHA" -- deploy/webhook-listener.js || HOOK_CHANGED=1
log "deploying $SHA (previous $GOOD, node $(node -v 2>/dev/null || echo '?'), lockfile changed: $LOCK_CHANGED)"

git reset --hard "$SHA" || rollback "git reset --hard $SHA failed"
link_all || rollback "link_shared failed"
if [ "$LOCK_CHANGED" -eq 1 ] || [ ! -d "$REPO/node_modules" ]; then
  install_deps || rollback "npm ci failed"
fi
build_all || rollback "build failed"
install_nginx || rollback "nginx confs rejected"
pm2_reload "$SHA" || rollback "pm2 startOrReload failed"
wait_healthy "$SHA" || rollback "health check failed"
check_urls_gate || rollback "URL contract regression"
if [ "$HOOK_CHANGED" -eq 1 ]; then
  log "deploy/webhook-listener.js changed; reloading $HOOK_APP last"
  BM_NODE="$BM_NODE" pm2 startOrReload "$REPO/ecosystem.config.js" --only "$HOOK_APP" --update-env || log "hook reload failed (deploy itself is live)"
fi
echo "$SHA" > "$LAST_GOOD_FILE"
pm2 save >/dev/null 2>&1 || true
log "LIVE $SHA ($(git log --oneline -1 | cut -c1-120))"
notify "✅ banjaramatch LIVE ${SHA:0:7}: $(git log -1 --format=%s | cut -c1-200)"
exit 0
