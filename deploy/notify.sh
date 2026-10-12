#!/usr/bin/env bash
# Sends one message to the owner's Telegram chat and, when ALERT_EMAIL is set,
# by email through deploy/notify-mail.js (the box has no MTA). Used by
# deploy.sh, backup.sh and uptime-check.sh.
#
#   deploy/notify.sh "text"
#   echo "text" | deploy/notify.sh
#
# Settings come from the environment or from DEPLOY_ENV_FILE (the server's
# SHARED/env/deploy.env): TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ALERT_EMAIL.
# Without them this prints the message to stderr and exits 0. It never exits
# non-zero: a deploy must not be judged by whether Telegram was reachable.
set -u

TEXT="${1:-}"
if [ -z "$TEXT" ] && [ ! -t 0 ]; then
  TEXT="$(cat)"
fi
[ -n "$TEXT" ] || exit 0

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${DEPLOY_ENV_FILE:-}"
# One KEY=value, read as data: the file also holds WEBHOOK_SECRET and sourcing
# it would put that in this process for nothing.
env_get() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | tr -d '[:space:]"'"'"; }
if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  [ -n "${TELEGRAM_BOT_TOKEN:-}" ] || TELEGRAM_BOT_TOKEN="$(env_get TELEGRAM_BOT_TOKEN)"
  [ -n "${TELEGRAM_CHAT_ID:-}" ] || TELEGRAM_CHAT_ID="$(env_get TELEGRAM_CHAT_ID)"
  [ -n "${ALERT_EMAIL:-}" ] || ALERT_EMAIL="$(env_get ALERT_EMAIL)"
fi

# Telegram caps a message at 4096 characters; a log tail can be longer.
TEXT="${TEXT:0:4000}"
SENT=0

if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  if curl -fsS --max-time 10 \
      --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
      --data-urlencode "text=${TEXT}" \
      --data-urlencode "disable_web_page_preview=true" \
      "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" >/dev/null; then
    SENT=1
  else
    echo "[notify] Telegram send failed: $TEXT" >&2
  fi
fi

if [ -n "${ALERT_EMAIL:-}" ] && [ -f "$HERE/notify-mail.js" ]; then
  NODE_BIN="$(command -v node || true)"
  [ -x /root/.nvm/versions/node/v22.23.2/bin/node ] && NODE_BIN=/root/.nvm/versions/node/v22.23.2/bin/node
  if [ -n "$NODE_BIN" ]; then
    if printf '%s' "$TEXT" | ALERT_EMAIL="$ALERT_EMAIL" "$NODE_BIN" "$HERE/notify-mail.js"; then
      SENT=1
    else
      echo "[notify] email send failed: $TEXT" >&2
    fi
  fi
fi

[ "$SENT" -eq 1 ] || echo "[notify] (no Telegram/email configured) $TEXT" >&2
exit 0
