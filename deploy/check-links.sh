#!/usr/bin/env bash
# Crawls every page in the live sitemaps and HEADs every same-host link on
# them; fails (exit 1) when any returns 404. Run after a deploy or before
# submitting sitemaps.
#
#   deploy/check-links.sh [base-www-url]      # default https://www.banjaramatch.com
set -uo pipefail
WWW="${1:-https://www.banjaramatch.com}"
HOST="${WWW#*://}"
UA='bm-linkcheck/1.0'
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

fetch_locs() { curl -sS --max-time 20 -A "$UA" "$1" | grep -oE '<loc>[^<]+</loc>' | sed -E 's#</?loc>##g'; }

pages=()
for sm in $(fetch_locs "$WWW/sitemap.xml"); do
  for u in $(fetch_locs "$sm"); do pages+=("$u"); done
done
[ "${#pages[@]}" -gt 0 ] || { echo "no pages found in $WWW/sitemap.xml" >&2; exit 2; }
echo "crawling ${#pages[@]} sitemap pages on $HOST" >&2

: > "$TMP/links"
for page in "${pages[@]}"; do
  body="$TMP/page"
  code="$(curl -sS -o "$body" --max-time 20 -A "$UA" -w '%{http_code}' "$page" 2>/dev/null || echo 000)"
  [ "$code" = 200 ] || { echo "PAGE $code $page"; continue; }
  grep -oiE '(href|src)="[^"#]+' "$body" | sed -E 's/^(href|src)="//' | while IFS= read -r h; do
    case "$h" in
      mailto:*|tel:*|javascript:*|data:*|\#*) continue ;;
      //"$HOST"/*) echo "https:$h" ;;
      "$WWW"/*|"$WWW") echo "$h" ;;
      /*) echo "$WWW$h" ;;
      http://*|https://*|//*) continue ;;           # other hosts
      *) echo "${page%/*}/$h" ;;                   # relative
    esac
  done >> "$TMP/links"
done
sort -u "$TMP/links" > "$TMP/uniq"
total="$(wc -l < "$TMP/uniq" | tr -d ' ')"
echo "checking $total unique same-host links" >&2

bad=0; n=0
while IFS= read -r url; do
  n=$((n+1))
  code="$(curl -sS -o /dev/null -I --max-time 20 -A "$UA" -w '%{http_code}' "$url" 2>/dev/null || echo 000)"
  # Some routes refuse HEAD; confirm with a GET before counting it.
  case "$code" in 404|405|000) code="$(curl -sS -o /dev/null --max-time 20 -A "$UA" -w '%{http_code}' "$url" 2>/dev/null || echo 000)" ;; esac
  case "$code" in
    404) echo "BROKEN 404 $url"; bad=$((bad+1)) ;;
    5*|000) echo "WARN $code $url" ;;
  esac
done < "$TMP/uniq"
echo "checked $n links: $bad broken" >&2
[ "$bad" -eq 0 ]
