#!/usr/bin/env bash
# Probes the public endpoints and alerts (Telegram/email via notify.sh) only
# when a target changes state, so a long outage is one message and a recovery
# is one message. Cron: deploy/cron/banjaramatch-uptime (every 5 min).
#
#   deploy/uptime-check.sh          # prints one line per target, exit 1 if any is DOWN
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
STATE_FILE="$SHARED/logs/uptime.state"
NOTIFY="$HERE/notify.sh"
TARGETS="
https://www.banjaramatch.com/health
https://api.banjaramatch.com/health
https://admin.banjaramatch.com/health
https://www.banjaramatch.com/
"

log() { echo "[$(date -Is)] [uptime] $*"; }
notify() { DEPLOY_ENV_FILE="$SHARED/env/deploy.env" bash "$NOTIFY" "$1" || true; }

install -d "$SHARED/logs"
touch "$STATE_FILE"
NEW_STATE="$(mktemp)"
trap 'rm -f "$NEW_STATE"' EXIT

ANY_DOWN=0
CHANGES=""
for url in $TARGETS; do
  # 2 retries, 10 s each; a 2xx/3xx is UP (the home page may redirect).
  code="$(curl -sS -o /dev/null --max-time 10 --retry 2 --retry-delay 2 --retry-all-errors -A bm-uptime -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
  case "$code" in
    2*|3*) status=UP ;;
    *) status=DOWN; ANY_DOWN=1 ;;
  esac
  prev="$(grep -F "$url " "$STATE_FILE" | tail -n1 | awk '{print $2}')"
  echo "$url $status $code" >> "$NEW_STATE"
  if [ "${prev:-UP}" != "$status" ]; then
    CHANGES="$CHANGES
$status $url (HTTP $code)"
  fi
  log "$status $code $url"
done

if [ -n "$CHANGES" ]; then
  notify "🩺 banjaramatch uptime change:$CHANGES"
fi
cp "$NEW_STATE" "$STATE_FILE"
exit "$ANY_DOWN"
