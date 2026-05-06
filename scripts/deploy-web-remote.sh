#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/home/kydex/apps/kydex-notary/current}"
BRANCH="${BRANCH:-main}"
PM2_APP_NAME="${PM2_APP_NAME:-kydex-web}"

for command_name in git npm pm2; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

if [ ! -d "$APP_DIR" ]; then
  echo "Deployment directory not found: $APP_DIR" >&2
  exit 1
fi

cd "$APP_DIR"

echo "Fetching latest changes for $BRANCH..."
git fetch origin

echo "Fast-forwarding to origin/$BRANCH..."
git pull --ff-only origin "$BRANCH"

echo "Installing dependencies..."
npm install

echo "Building @kydex/web..."
npm run build -w @kydex/web

echo "Restarting PM2 app $PM2_APP_NAME..."
pm2 restart "$PM2_APP_NAME" --update-env

echo "Saving PM2 process list..."
pm2 save

echo "Deployment completed successfully."