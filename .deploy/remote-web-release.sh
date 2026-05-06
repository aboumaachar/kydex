#!/usr/bin/env bash

set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "Usage: remote-web-release.sh <release-dir> <archive-path>" >&2
  exit 1
fi

RELEASE_DIR="$1"
ARCHIVE_PATH="$2"
CURRENT_LINK="/home/kydex/apps/kydex-notary/current"
PORT="3081"

mkdir -p "$RELEASE_DIR"
tar -xzf "$ARCHIVE_PATH" -C "$RELEASE_DIR"
rm -f "$ARCHIVE_PATH"

cd "$RELEASE_DIR"
npm install
npm run build -w @kydex/web

ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

pm2 delete kydex-web >/dev/null 2>&1 || true
pm2 start "$CURRENT_LINK/node_modules/next/dist/bin/next" --name kydex-web --cwd "$CURRENT_LINK" -- start apps/web -p "$PORT"
pm2 save

sleep 2
curl -I "http://127.0.0.1:${PORT}/login"