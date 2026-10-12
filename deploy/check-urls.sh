#!/usr/bin/env bash
# URL-contract check: fetches every <loc> from the live sitemaps plus every entry in
# deploy/url-contract.txt and writes one JSON line per URL:
#   {"url","status","location","canonical","title","expected"}
# Usage: deploy/check-urls.sh <out.jsonl> [base-www-url]
# Diff two runs with:  diff <(jq -c 'del(.title)' before) <(jq -c 'del(.title)' after)
set -uo pipefail
OUT=${1:?out file}
WWW=${2:-https://www.banjaramatch.com}
HERE=$(cd "$(dirname "$0")" && pwd)
CONTRACT=$HERE/url-contract.txt
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
UA='bm-urlcheck/1.0'

urls=()
# 1. sitemap URLs (live)
for sm in $(curl -sS --max-time 20 -A "$UA" "$WWW/sitemap.xml" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g'); do
  urls+=("$sm")
  for u in $(curl -sS --max-time 20 -A "$UA" "$sm" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g'); do urls+=("$u"); done
done
# 2. /blog/<slug> legacy form for every blog post in the sitemap (must 301)
for u in "${urls[@]}"; do
  case "$u" in */blogs/*/*) urls+=("$WWW/blog/${u##*/} 301");; esac
done
# 3. contract file
while IFS= read -r line; do
  line=${line%%#*}; line=$(echo "$line" | xargs 2>/dev/null || true)
  [ -z "$line" ] && continue
  urls+=("$line")
done < "$CONTRACT"

: > "$OUT"
n=0
for entry in "${urls[@]}"; do
  url=${entry%% *}; expected=""; [ "$entry" != "$url" ] && expected=${entry#* }
  body=$TMP/body; : > "$body"
  meta=$(curl -sS --max-redirs 0 --max-time 20 -A "$UA" -o "$body" -w '%{http_code}\t%{redirect_url}\t%{content_type}' "$url" 2>/dev/null || echo -e "000\t\t")
  status=${meta%%	*}; rest=${meta#*	}; location=${rest%%	*}; ctype=${rest#*	}
  canonical=""; title=""
  if [[ "$ctype" == text/html* ]]; then
    canonical=$(grep -oE '<link[^>]+rel="canonical"[^>]*>' "$body" | head -1 | grep -oE 'href="[^"]+"' | head -1 | sed -E 's/^href="//; s/"$//')
    title=$(tr '\n' ' ' < "$body" | grep -oE '<title[^>]*>[^<]*</title>' | head -1 | sed -E 's/<[^>]+>//g' | sed -E 's/^ +| +$//g')
  fi
  jq -nc --arg url "$url" --arg status "$status" --arg location "$location" --arg canonical "$canonical" --arg title "$title" --arg expected "$expected" \
    '{url:$url,status:($status|tonumber? // 0),location:$location,canonical:$canonical,title:$title,expected:$expected}' >> "$OUT"
  n=$((n+1))
done
echo "checked $n urls -> $OUT" >&2
# summary of contract violations: a 404/5xx on something that was not expected to be one
jq -r 'select((.status==404 or .status>=500) and (.expected!="404")) | "\(.status) \(.url)"' "$OUT" | sed 's/^/VIOLATION: /' >&2
exit 0
