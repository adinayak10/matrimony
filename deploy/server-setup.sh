#!/usr/bin/env bash
# One-time (idempotent) preparation of the VPS for deploy/deploy.sh. Run as root:
#
#   sudo bash deploy/server-setup.sh
#
# What it makes:
#   - /var/www/banjaramatch-shared/{env,secrets} 700 and the rest 755
#     (uploads, downloads, blog-images, sitemaps, logs, baseline, backups/*)
#   - ACLs so www-data (nginx) can read uploads/downloads/blog-images/sitemaps
#   - pm2-logrotate on root's pm2 (20M / 14 / compress / daily) - rotates every
#     app on this daemon, the other tenants included
#   - a read-only deploy key (/root/.ssh/banjaramatch_deploy) + `Host
#     github-banjaramatch` alias; the public half is printed at the end
#   - /etc/cron.d/banjaramatch-backup and /etc/cron.d/banjaramatch-uptime
#   - optional: gitleaks into /usr/local/bin (--with-gitleaks)
#
# It never writes env files, nginx confs, or starts/stops any app.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "run as root: sudo bash $0" >&2
  exit 64
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
SHARED="${BM_SHARED:-/var/www/banjaramatch-shared}"
NODE_VERSION="$(cat "$REPO/.nvmrc" 2>/dev/null || echo 22.23.2)"
NODE_BIN="/root/.nvm/versions/node/v$NODE_VERSION/bin"
WITH_GITLEAKS=0
for arg in "$@"; do
  case "$arg" in
    --with-gitleaks) WITH_GITLEAKS=1 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "unknown argument '$arg'" >&2; exit 64 ;;
  esac
done

say() { echo "==> $*"; }

# ── 1. Shared tree ───────────────────────────────────────────────────────────
say "Shared tree at $SHARED"
install -d -m 755 "$SHARED"
install -d -m 700 "$SHARED/env" "$SHARED/secrets"
install -d -m 755 "$SHARED/uploads" "$SHARED/uploads/profile_images" "$SHARED/uploads/apk" "$SHARED/uploads/blog_images" \
  "$SHARED/downloads" "$SHARED/blog-images" "$SHARED/sitemaps" "$SHARED/logs" "$SHARED/baseline" \
  "$SHARED/backups" "$SHARED/backups/mongo" "$SHARED/backups/uploads" "$SHARED/backups/config"
chmod 700 "$SHARED/backups/config"
for f in deploy.log backup.log uptime.log; do [ -f "$SHARED/logs/$f" ] || : > "$SHARED/logs/$f"; done
# Anything already in env/ or secrets/ is tightened, never loosened.
find "$SHARED/env" "$SHARED/secrets" -type f -exec chmod 600 {} +

# ── 2. System packages ───────────────────────────────────────────────────────
# acl: setfacl for the nginx user; the rest is what deploy.sh/backup.sh call.
if ! command -v setfacl >/dev/null 2>&1; then
  say "Installing acl"
  apt-get install -y -qq acl >/dev/null
fi
for tool in curl git rsync flock jq mongodump nginx; do
  command -v "$tool" >/dev/null 2>&1 || echo "WARNING: $tool is not installed" >&2
done

# ── 2b. Chromium + fonts for biodata PDFs ────────────────────────────────────
# The API renders biodata PDFs with a system Chromium (puppeteer-core never
# downloads one). Fonts used by the templates are embedded by the API; the
# apt fonts are only a glyph safety net (Arabic invocation line, symbols).
# Point CHROMIUM_PATH in SHARED/env/api.env at the binary. Without it PDF
# downloads answer 503 and the builder offers Print (same document).
OS_ID="$(. /etc/os-release 2>/dev/null && echo "${ID:-}")"
if [ "$OS_ID" = "debian" ]; then
  if ! command -v chromium >/dev/null 2>&1; then
    say "Installing chromium + fonts (biodata PDF)"
    apt-get install -y -qq chromium fonts-liberation fonts-noto-core >/dev/null
  fi
  echo "    biodata PDF: set CHROMIUM_PATH=$(command -v chromium || echo /usr/bin/chromium) in $SHARED/env/api.env"
elif [ "$OS_ID" = "ubuntu" ]; then
  if command -v google-chrome-stable >/dev/null 2>&1; then
    echo "    biodata PDF: set CHROMIUM_PATH=$(command -v google-chrome-stable) in $SHARED/env/api.env"
  else
    cat <<'CHROME'
NOTE (biodata PDF): Ubuntu's "chromium" package is a snap, which cannot run
headless under pm2. Install Google Chrome from Google's apt repository instead:
  install -d -m 755 /etc/apt/keyrings
  curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/apt/keyrings/google-chrome.gpg
  echo "deb [arch=amd64 signed-by=/etc/apt/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
  apt-get update && apt-get install -y google-chrome-stable fonts-liberation fonts-noto-core
then set CHROMIUM_PATH=/usr/bin/google-chrome-stable in SHARED/env/api.env and reload the API.
CHROME
  fi
else
  echo "NOTE (biodata PDF): unknown OS '${OS_ID:-?}'; install Chromium or Chrome and set CHROMIUM_PATH in $SHARED/env/api.env" >&2
fi

# ── 3. ACLs for nginx ────────────────────────────────────────────────────────
say "ACLs for www-data on uploads/downloads/blog-images/sitemaps"
for d in uploads downloads blog-images sitemaps; do
  setfacl -R -m u:www-data:rX "$SHARED/$d"
  setfacl -R -d -m u:www-data:rX "$SHARED/$d"
done

# ── 4. Node + pm2 ────────────────────────────────────────────────────────────
if [ ! -x "$NODE_BIN/node" ]; then
  say "Installing Node $NODE_VERSION with nvm"
  export NVM_DIR=/root/.nvm
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    set +u; . "$NVM_DIR/nvm.sh"; nvm install "$NODE_VERSION" >/dev/null; set -u
  else
    echo "WARNING: nvm is not installed at $NVM_DIR; install Node $NODE_VERSION by hand" >&2
  fi
fi
PM2="$(command -v pm2 || true)"
if [ -z "$PM2" ]; then
  echo "WARNING: pm2 not found on PATH; skipping pm2-logrotate" >&2
else
  say "Configuring pm2-logrotate (root's pm2 daemon)"
  "$PM2" describe pm2-logrotate >/dev/null 2>&1 || "$PM2" install pm2-logrotate >/dev/null
  "$PM2" set pm2-logrotate:max_size 20M >/dev/null
  "$PM2" set pm2-logrotate:retain 14 >/dev/null
  "$PM2" set pm2-logrotate:compress true >/dev/null
  "$PM2" set pm2-logrotate:rotateInterval '0 0 * * *' >/dev/null
  if systemctl is-enabled pm2-root >/dev/null 2>&1; then
    say "pm2-root is enabled at boot"
  else
    echo "WARNING: pm2-root is not enabled; run: $PM2 startup systemd -u root --hp /root" >&2
  fi
fi

# ── 5. Deploy key ────────────────────────────────────────────────────────────
# One ed25519 key for GitHub (read-only Deploy key on the repo), through an
# ssh host alias so root's own user key is never offered for this repo.
KEY=/root/.ssh/banjaramatch_deploy
install -d -m 700 /root/.ssh
if [ ! -f "$KEY" ]; then
  say "Generating the read-only deploy key"
  ssh-keygen -q -t ed25519 -N '' -C "banjaramatch-deploy@$(hostname)" -f "$KEY"
fi
SSH_CONFIG=/root/.ssh/config
if ! grep -qs 'Host github-banjaramatch' "$SSH_CONFIG"; then
  cat >> "$SSH_CONFIG" <<EOT
Host github-banjaramatch
  HostName github.com
  User git
  IdentityFile $KEY
  IdentitiesOnly yes
EOT
  chmod 600 "$SSH_CONFIG"
fi
ssh-keyscan -t ed25519 github.com 2>/dev/null >> /root/.ssh/known_hosts
sort -u /root/.ssh/known_hosts -o /root/.ssh/known_hosts

# ── 6. Cron ──────────────────────────────────────────────────────────────────
say "Installing cron files"
for f in banjaramatch-backup banjaramatch-uptime; do
  install -m 644 -o root -g root "$HERE/cron/$f" "/etc/cron.d/$f"
done

# ── 7. gitleaks (optional) ───────────────────────────────────────────────────
if [ "$WITH_GITLEAKS" -eq 1 ] && ! command -v gitleaks >/dev/null 2>&1; then
  say "Installing gitleaks"
  GL_VER="8.21.2"
  TMP="$(mktemp -d)"
  curl -fsSL "https://github.com/gitleaks/gitleaks/releases/download/v${GL_VER}/gitleaks_${GL_VER}_linux_x64.tar.gz" | tar -xz -C "$TMP" gitleaks
  install -m 755 "$TMP/gitleaks" /usr/local/bin/gitleaks
  rm -rf "$TMP"
fi

cat <<EOT

Done. Still to do by hand:
  - SHARED/env/{web,api,admin,deploy}.env (600): see apps/*/.env.example and deploy/.env.example
  - add this read-only Deploy key on GitHub (repo Settings -> Deploy keys):
$(cat "$KEY.pub")
  - git -C $REPO remote set-url origin git@github-banjaramatch:adinayak10/banjaramatch.git
  - bash deploy/deploy.sh --link-only && node deploy/check-env.js
EOT
