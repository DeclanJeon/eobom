#!/usr/bin/env bash
set -euo pipefail

# Production lives on ponslink at /home/declan/apps/eobom (rsync deploy; not a git checkout).
APP_DIR="${APP_DIR:-/home/declan/apps/eobom}"
BRANCH="${BRANCH:-main}"
REMOTE="${REMOTE:-ponslink}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${1:-}" == "--remote" || ! -d "$APP_DIR" ]]; then
  echo "Deploying via rsync to ${REMOTE}:${APP_DIR}"
  rsync -az --delete \
    --exclude .git \
    --exclude node_modules \
    --exclude .next \
    --exclude db \
    --exclude .env \
    --exclude data/uploads \
    ./ "${REMOTE}:${APP_DIR}/"

  ssh -o BatchMode=yes "$REMOTE" "bash -s" <<EOF
set -euo pipefail
export PATH="\$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
cd "${APP_DIR}"
bunx prisma generate
bunx prisma db push
bunx prisma db execute --file prisma/fts5-setup.sql
bun run build
bun run scripts/story-mirror/ingest-chunks.ts
mkdir -p db .next/standalone/db
sudo cp deploy/eobom.service /etc/systemd/system/eobom.service
sudo systemctl daemon-reload
sudo systemctl enable eobom
sudo systemctl reset-failed eobom || true
sudo systemctl restart eobom
sleep 3
systemctl is-active eobom
curl -sS -o /dev/null -w 'home:%{http_code}\\n' http://127.0.0.1:3120/ || true
curl -sS -o /dev/null -w 'together:%{http_code}\\n' http://127.0.0.1:3120/together || true
echo "Deployed eobom on port 3120"
EOF
  exit 0
fi

# Local-on-server path (when already on the app host)
cd "${APP_DIR}"
if [[ -d .git ]]; then
  git fetch origin
  git checkout "${BRANCH}"
  git pull --ff-only origin "${BRANCH}"
fi

export PATH="$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
bun install --frozen-lockfile || bun install
bunx prisma generate
bunx prisma db push
bunx prisma db execute --file prisma/fts5-setup.sql
bun run build
bun run scripts/story-mirror/ingest-chunks.ts
mkdir -p db .next/standalone/db
cp -f .env .next/standalone/.env 2>/dev/null || true

sudo cp deploy/eobom.service /etc/systemd/system/eobom.service
sudo systemctl daemon-reload
sudo systemctl enable eobom
sudo systemctl reset-failed eobom || true
sudo systemctl restart eobom

if [[ -f deploy/nginx-eobom.conf ]]; then
  sudo cp deploy/nginx-eobom.conf /etc/nginx/sites-available/eobom.ponslink.com
  sudo ln -sfn /etc/nginx/sites-available/eobom.ponslink.com /etc/nginx/sites-enabled/eobom.ponslink.com
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "Deployed eobom on port 3120"
