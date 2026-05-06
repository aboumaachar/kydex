#!/usr/bin/env bash
set -euo pipefail
echo '---PM2---'
pm2 describe kydex-web 2>&1 | head -n 40 || true
echo '---PORTS---'
ss -ltnp 2>/dev/null | grep -E '(3000|3081|:80 |:443 )' || true
echo '---NGINX PROXY---'
nginx -T 2>/dev/null | grep -nE 'server_name|listen|proxy_pass|upstream|kydex|3081|3000' | head -n 200 || true
echo '---LOCAL 3081---'
curl -sI http://127.0.0.1:3081/login 2>&1 | head -n 10 || true
echo '---LOCAL 3000---'
curl -sI http://127.0.0.1:3000/login 2>&1 | head -n 10 || true
