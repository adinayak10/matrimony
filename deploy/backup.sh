#!/usr/bin/env bash
# Nightly local backup (B3.29): the Mongo database, a hard-linked snapshot of
# uploads, and the env/secrets tarball, under SHARED/backups. Cron:
# deploy/cron/banjaramatch-backup (21:00 UTC). Restore: deploy/restore.md.
#
#   deploy/backup.sh            # a backup, now
#   deploy/backup.sh --check    # tools and settings only; writes nothing
#
# What it writes:
#   backups/mongo/aasd-<YYYY-MM-DD>.archive.gz      mongodump --archive --gzip
#   backups/uploads/<YYYY-MM-DD>/ (+ latest ->)     rsync --link-dest: unchanged files share inodes
#   backups/config/<YYYY-MM-DD>.tar.gz (600)        SHARED/env + SHARED/secrets
#
# Size floor: the archive must be >= BACKUP_MIN_BYTES and >= 50 % of the
# previous one, else the run fails and nothing is pruned. Pruning
# (BACKUP_RETENTION_DAYS, default 14) happens only after everything succeeded.
# When RCLONE_REMOTE is set (and rclone installed) the three files of the
# night are also copied off-box. Failures go to notify.sh.
#
# Settings are read as data (never sourced): MONGODB_URI from api.env;
# BACKUP_RETENTION_DAYS, BACKUP_MIN_BYTES, RCLONE_REMOTE from deploy.env.
set -euo pipefail

CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "unknown argument '$arg'" >&2; exit 64 ;;
  esac
done

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
API_ENV="$SHARED/env/api.env"
DEPLOY_ENV="$SHARED/env/deploy.env"
NOTIFY="$HERE/notify.sh"
BACKUPS="$SHARED/backups"
TODAY="$(date -u +%F)"

log() { echo "[$(date -Is)] [backup] $*"; }
env_get() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2- | sed -E "s/^[[:space:]]*['\"]?//; s/['\"]?[[:space:]]*$//; s/[[:space:]]+#.*$//"
}
setting() { # name file default
  local v="${!1:-}"
  [ -n "$v" ] || v="$(env_get "$2" "$1")"
  printf '%s' "${v:-${3:-}}"
}
fail() {
  log "FAILED: $*" >&2
  DEPLOY_ENV_FILE="$DEPLOY_ENV" bash "$NOTIFY" "❌ banjaramatch backup $TODAY failed: $* (see SHARED/logs/backup.log)" || true
  exit 1
}

MONGODB_URI="$(setting MONGODB_URI "$API_ENV" mongodb://127.0.0.1:27017/aasd)"
RETENTION_DAYS="$(setting BACKUP_RETENTION_DAYS "$DEPLOY_ENV" 14)"
MIN_BYTES="$(setting BACKUP_MIN_BYTES "$DEPLOY_ENV" 262144)"
RCLONE_REMOTE="$(setting RCLONE_REMOTE "$DEPLOY_ENV")"
# Database name from the URI path (aasd today).
DB_NAME="$(printf '%s' "$MONGODB_URI" | sed -E 's#^[a-z+]+://[^/]+/?##; s#[?].*$##')"
DB_NAME="${DB_NAME:-aasd}"

for tool in mongodump rsync tar flock find; do
  command -v "$tool" >/dev/null 2>&1 || fail "$tool is not installed"
done
case "$RETENTION_DAYS" in ''|*[!0-9]*) fail "BACKUP_RETENTION_DAYS must be a number" ;; esac
[ "$RETENTION_DAYS" -ge 7 ] || fail "BACKUP_RETENTION_DAYS=$RETENTION_DAYS is below the 7-day floor"
case "$MIN_BYTES" in ''|*[!0-9]*) fail "BACKUP_MIN_BYTES must be a number" ;; esac
[ -d "$SHARED/uploads" ] || fail "$SHARED/uploads does not exist"
install -d -m 755 "$BACKUPS/mongo" "$BACKUPS/uploads"
install -d -m 700 "$BACKUPS/config"

exec 9>"$SHARED/.backup.lock"
flock -n 9 || fail "another backup is still running"

if [ "$CHECK_ONLY" -eq 1 ]; then
  if [ -n "$RCLONE_REMOTE" ]; then
    command -v rclone >/dev/null 2>&1 || fail "RCLONE_REMOTE is set but rclone is not installed"
    rclone lsf --max-depth 1 "${RCLONE_REMOTE%/}/" >/dev/null 2>&1 || fail "cannot reach $RCLONE_REMOTE"
  fi
  log "check ok: db $DB_NAME, retention $RETENTION_DAYS d, floor $MIN_BYTES bytes, remote ${RCLONE_REMOTE:-none}"
  exit 0
fi

# ── 1. Database ──────────────────────────────────────────────────────────────
# The URI goes through a --config file, not argv, so credentials (if the URI
# ever gains them) never show in `ps`.
MONGO_CFG="$(umask 077 && mktemp)"
trap 'rm -f "$MONGO_CFG"' EXIT
printf "uri: '%s'\n" "${MONGODB_URI//\'/\'\'}" > "$MONGO_CFG"
MONGO_FILE="$BACKUPS/mongo/$DB_NAME-$TODAY.archive.gz"
log "dumping $DB_NAME to $MONGO_FILE"
if ! mongodump --config="$MONGO_CFG" --db "$DB_NAME" --gzip --archive="$MONGO_FILE.part" --quiet; then
  rm -f "$MONGO_FILE.part"
  fail "mongodump failed"
fi
mv -f "$MONGO_FILE.part" "$MONGO_FILE"
chmod 600 "$MONGO_FILE"
SIZE="$(stat -c %s "$MONGO_FILE")"
[ "$SIZE" -ge "$MIN_BYTES" ] || fail "$MONGO_FILE is only $SIZE bytes (floor $MIN_BYTES)"
PREV="$(ls -1 "$BACKUPS/mongo/$DB_NAME-"*.archive.gz 2>/dev/null | grep -v -- "-$TODAY.archive.gz$" | sort | tail -n1 || true)"
if [ -n "$PREV" ]; then
  PREV_SIZE="$(stat -c %s "$PREV")"
  [ $((SIZE * 2)) -ge "$PREV_SIZE" ] || fail "$MONGO_FILE is $SIZE bytes, less than half of $(basename "$PREV") ($PREV_SIZE bytes)"
fi
log "database ok: $SIZE bytes"

# ── 2. Uploads (hard-linked snapshot) ────────────────────────────────────────
SNAP="$BACKUPS/uploads/$TODAY"
LINK_DEST=()
if [ -d "$BACKUPS/uploads/latest" ]; then LINK_DEST=(--link-dest="$(readlink -f "$BACKUPS/uploads/latest")"); fi
rc=0
rsync -a --delete "${LINK_DEST[@]}" "$SHARED/uploads/" "$SNAP/" || rc=$?
# 24 = a file vanished while rsync ran (an upload replaced mid-copy): not a failure.
[ "$rc" -eq 0 ] || [ "$rc" -eq 24 ] || fail "rsync of uploads failed (exit $rc)"
ln -sfn "$TODAY" "$BACKUPS/uploads/latest"
log "uploads ok: $(find "$SNAP" -type f | wc -l) files in $SNAP"

# ── 3. Config (env + secrets) ────────────────────────────────────────────────
CFG_FILE="$BACKUPS/config/$TODAY.tar.gz"
( umask 077 && tar -czf "$CFG_FILE" -C "$SHARED" env secrets ) || fail "config tarball failed"
log "config ok: $(stat -c %s "$CFG_FILE") bytes"

# ── 4. Off-box copy (optional) ───────────────────────────────────────────────
if [ -n "$RCLONE_REMOTE" ]; then
  if command -v rclone >/dev/null 2>&1; then
    DEST="${RCLONE_REMOTE%/}"
    rclone copy "$MONGO_FILE" "$DEST/mongo/" || fail "rclone copy of the database failed"
    rclone copy "$CFG_FILE" "$DEST/config/" || fail "rclone copy of the config failed"
    rclone sync "$SNAP/" "$DEST/uploads/" || fail "rclone sync of uploads failed"
    rclone delete --min-age "${RETENTION_DAYS}d" "$DEST/mongo" || true
    rclone delete --min-age "${RETENTION_DAYS}d" "$DEST/config" || true
    log "off-box copy ok: $DEST"
  else
    log "RCLONE_REMOTE is set but rclone is not installed; skipped"
  fi
fi

# ── 5. Retention (only after success) ────────────────────────────────────────
find "$BACKUPS/mongo" -maxdepth 1 -type f -name "$DB_NAME-*.archive.gz" -mtime +"$RETENTION_DAYS" -delete
find "$BACKUPS/config" -maxdepth 1 -type f -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUPS/uploads" -mindepth 1 -maxdepth 1 -type d -name '20*' -mtime +"$RETENTION_DAYS" -exec rm -rf {} +
KEPT="$(ls -1 "$BACKUPS/mongo/$DB_NAME-"*.archive.gz 2>/dev/null | wc -l | tr -d ' ')"
log "done: $KEPT database backups kept ($RETENTION_DAYS days)"
