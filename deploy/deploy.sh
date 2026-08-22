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
    --exclude .data/uploads \
    --exclude public/story-mirror/vis \
    ./ "${REMOTE}:${APP_DIR}/"

  ssh -o BatchMode=yes "$REMOTE" "bash -s" <<EOF
set -euo pipefail
export PATH="\$HOME/.bun/bin:/usr/local/bin:/usr/bin:/bin"
cd "${APP_DIR}"
bun install --frozen-lockfile || bun install
if [[ -f db/eobom.db ]]; then
  cp -a db/eobom.db "db/eobom.db.pre-schema-\$(date +%Y%m%d-%H%M%S)"
fi
bunx prisma generate
echo "DROP TRIGGER IF EXISTS story_chunk_ai; DROP TRIGGER IF EXISTS story_chunk_ad; DROP TRIGGER IF EXISTS story_chunk_au; DROP TABLE IF EXISTS StoryChunkFts; DROP TABLE IF EXISTS StoryChunkFts_config; DROP TABLE IF EXISTS StoryChunkFts_content; DROP TABLE IF EXISTS StoryChunkFts_data; DROP TABLE IF EXISTS StoryChunkFts_docsize; DROP TABLE IF EXISTS StoryChunkFts_idx;" | bunx prisma db execute --stdin --schema prisma/schema.prisma
bunx prisma db push
# remove_diacritics 2 requires SQLite >=3.53; fallback to plain unicode61 on older (3.46)
bunx prisma db execute --file prisma/fts5-setup.sql --schema prisma/schema.prisma || bunx prisma db execute --file prisma/fts5-setup-fallback.sql --schema prisma/schema.prisma
bun run build
bun run scripts/story-mirror/ingest-chunks.ts
mkdir -p db .next/standalone/db
sudo cp deploy/eobom.service /etc/systemd/system/eobom.service
sudo cp deploy/eobom-events-cleanup.service /etc/systemd/system/eobom-events-cleanup.service
sudo cp deploy/eobom-events-cleanup.timer /etc/systemd/system/eobom-events-cleanup.timer
sudo systemctl daemon-reload
sudo systemctl enable eobom
sudo systemctl enable --now eobom-events-cleanup.timer
sudo systemctl reset-failed eobom || true
sudo systemctl restart eobom
sleep 3
systemctl is-active eobom
curl -sS -o /dev/null -w 'home:%{http_code}\\n' http://127.0.0.1:3120/ || true
curl -sS -o /dev/null -w 'together:%{http_code}\\n' http://127.0.0.1:3120/together || true
echo "Deployed eobom on port 3120"
if [[ -f deploy/nginx-eobom.conf ]]; then
  sudo cp deploy/nginx-eobom.conf /etc/nginx/sites-available/eobom.ponslink.com
  sudo ln -sfn /etc/nginx/sites-available/eobom.ponslink.com /etc/nginx/sites-enabled/eobom.ponslink.com
  sudo nginx -t
  sudo systemctl reload nginx
fi
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
if [[ -f db/eobom.db ]]; then
  cp -a db/eobom.db "db/eobom.db.pre-schema-$(date +%Y%m%d-%H%M%S)"
fi
bunx prisma generate
echo "DROP TRIGGER IF EXISTS story_chunk_ai; DROP TRIGGER IF EXISTS story_chunk_ad; DROP TRIGGER IF EXISTS story_chunk_au; DROP TABLE IF EXISTS StoryChunkFts; DROP TABLE IF EXISTS StoryChunkFts_config; DROP TABLE IF EXISTS StoryChunkFts_content; DROP TABLE IF EXISTS StoryChunkFts_data; DROP TABLE IF EXISTS StoryChunkFts_docsize; DROP TABLE IF EXISTS StoryChunkFts_idx;" | bunx prisma db execute --stdin --schema prisma/schema.prisma
bunx prisma db push
# remove_diacritics 2 requires SQLite >=3.53; fallback to plain unicode61 on older (3.46)
bunx prisma db execute --file prisma/fts5-setup.sql --schema prisma/schema.prisma || bunx prisma db execute --file prisma/fts5-setup-fallback.sql --schema prisma/schema.prisma
bun run build
bun run scripts/story-mirror/ingest-chunks.ts
mkdir -p db .next/standalone/db
sudo cp deploy/eobom.service /etc/systemd/system/eobom.service
sudo cp deploy/eobom-events-cleanup.service /etc/systemd/system/eobom-events-cleanup.service
sudo cp deploy/eobom-events-cleanup.timer /etc/systemd/system/eobom-events-cleanup.timer
sudo systemctl daemon-reload
sudo systemctl enable eobom
sudo systemctl enable --now eobom-events-cleanup.timer
sudo systemctl reset-failed eobom || true
sudo systemctl restart eobom

if [[ -f deploy/nginx-eobom.conf ]]; then
  sudo cp deploy/nginx-eobom.conf /etc/nginx/sites-available/eobom.ponslink.com
  sudo ln -sfn /etc/nginx/sites-available/eobom.ponslink.com /etc/nginx/sites-enabled/eobom.ponslink.com
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "Deployed eobom on port 3120"
