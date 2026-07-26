#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/eobom}"
REPO_URL="${REPO_URL:-}"
BRANCH="${BRANCH:-main}"

if [[ -n "${REPO_URL}" && ! -d "${APP_DIR}/.git" ]]; then
  sudo mkdir -p "$(dirname "${APP_DIR}")"
  sudo git clone -b "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
  sudo chown -R "$USER":"$USER" "${APP_DIR}"
fi

cd "${APP_DIR}"
git fetch origin
git checkout "${BRANCH}"
git pull --ff-only origin "${BRANCH}"

bun install --frozen-lockfile || bun install
bunx prisma generate
bunx prisma db push
bun run build

# ensure runtime db path exists beside standalone if needed
mkdir -p db
mkdir -p .next/standalone/db || true

sudo cp deploy/eobom.service /etc/systemd/system/eobom.service
sudo systemctl daemon-reload
sudo systemctl enable eobom
sudo systemctl restart eobom

if [[ -f deploy/nginx-eobom.conf ]]; then
  sudo cp deploy/nginx-eobom.conf /etc/nginx/sites-available/eobom.ponslink.com
  sudo ln -sfn /etc/nginx/sites-available/eobom.ponslink.com /etc/nginx/sites-enabled/eobom.ponslink.com
  sudo nginx -t
  sudo systemctl reload nginx
fi

echo "Deployed eobom on port 3100"
