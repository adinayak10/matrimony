#!/usr/bin/env bash
# autocannon baseline against the local processes (bypasses nginx):
#   127.0.0.1:4000/  127.0.0.1:4000/banjara-matrimony-hyderabad  127.0.0.1:4002/api/state-pages
# Writes SHARED/baseline/autocannon-<label>-<slug>.json and prints a summary.
#
#   deploy/loadtest.sh [label]        # label: before (default) | after | anything
#   BM_WEB=http://127.0.0.1:4100 BM_API=http://127.0.0.1:4102 deploy/loadtest.sh bridge
#
# Needs Node (npx --yes autocannon). Run in a quiet hour: 20 connections for 20 s per URL.
set -uo pipefail
LABEL="${1:-before}"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
OUT="$SHARED/baseline"
WEB="${BM_WEB:-http://127.0.0.1:4000}"
API="${BM_API:-http://127.0.0.1:4002}"
CONNS="${BM_CONNS:-20}"
DURATION="${BM_DURATION:-20}"
install -d "$OUT"

export NVM_DIR="${NVM_DIR:-/root/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then set +u; . "$NVM_DIR/nvm.sh"; nvm use "$(cat "$(dirname "$0")/../.nvmrc" 2>/dev/null || echo 22.23.2)" >/dev/null 2>&1; set -u; fi
command -v node >/dev/null 2>&1 || { echo "node not found" >&2; exit 69; }

rc=0
for url in "$WEB/" "$WEB/banjara-matrimony-hyderabad" "$API/api/state-pages"; do
  path="${url#http://*/}"; slug="_${path//\//_}"
  file="$OUT/autocannon-$LABEL-$slug.json"
  echo "==> $url -> $file" >&2
  if npx --yes autocannon -c "$CONNS" -d "$DURATION" --json "$url" > "$file" 2>/dev/null; then
    jq -r '"   req/s avg \(.requests.average)  p50 \(.latency.p50) ms  p99 \(.latency.p99) ms  non-2xx \(.non2xx)  errors \(.errors)"' "$file"
  else
    echo "   autocannon failed for $url" >&2; rc=1
  fi
done
exit "$rc"
