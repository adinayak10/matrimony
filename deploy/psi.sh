#!/usr/bin/env bash
# PageSpeed Insights baseline for the four key pages (mobile + desktop).
# Writes SHARED/baseline/psi-<label>-<slug>.json (mobile) and
# psi-<label>-<slug>-desktop.json, and prints the Lighthouse scores.
#
#   PSI_API_KEY=... deploy/psi.sh [label]     # label: before (default) | after
#
# PSI_API_KEY is the owner's key (Google Cloud -> PageSpeed Insights API).
set -uo pipefail
LABEL="${1:-before}"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
OUT="$SHARED/baseline"
WWW="${BM_WWW:-https://www.banjaramatch.com}"
PAGES="/ /banjara-matrimony-hyderabad /banjara-matrimony-telangana /register"
[ -n "${PSI_API_KEY:-}" ] || { echo "PSI_API_KEY is not set" >&2; exit 64; }
command -v jq >/dev/null 2>&1 || { echo "jq is required" >&2; exit 69; }
install -d "$OUT"

rc=0
for p in $PAGES; do
  slug="${p//\//_}"
  for strategy in mobile desktop; do
    suffix=""; [ "$strategy" = desktop ] && suffix="-desktop"
    file="$OUT/psi-$LABEL-$slug$suffix.json"
    if ! curl -fsS --max-time 120 -G 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed' \
        --data-urlencode "url=$WWW$p" --data-urlencode "strategy=$strategy" \
        --data-urlencode "category=performance" --data-urlencode "category=seo" \
        --data-urlencode "category=accessibility" --data-urlencode "category=best-practices" \
        --data-urlencode "key=$PSI_API_KEY" -o "$file"; then
      echo "PSI request failed for $WWW$p ($strategy)" >&2; rc=1; continue
    fi
    jq -r --arg p "$p" --arg s "$strategy" '.lighthouseResult.categories as $c
      | "\($p) \($s): perf \(($c.performance.score*100)|round)  seo \(($c.seo.score*100)|round)  a11y \(($c.accessibility.score*100)|round)  bp \(($c["best-practices"].score*100)|round)  LCP \(.lighthouseResult.audits["largest-contentful-paint"].displayValue)  CLS \(.lighthouseResult.audits["cumulative-layout-shift"].displayValue)"' "$file" \
      || { echo "$p ($strategy): no lighthouse result in $file" >&2; rc=1; }
  done
done
exit "$rc"
