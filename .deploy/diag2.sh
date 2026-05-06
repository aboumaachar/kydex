#!/bin/sh
echo "=== PM2 STATUS ==="
pm2 status 2>&1

echo ""
echo "=== LOCAL CURL 3081 ==="
curl -sI http://127.0.0.1:3081/login 2>&1 | head -n 10

echo ""
echo "=== NGINX KYDEX.ME CONFIG ==="
nginx -T 2>/dev/null | grep -i -E "server_name|kydex|proxy_pass|3081|3000" -A 3 | head -n 100

echo ""
echo "=== NGINX ERROR LOG (last 60 lines) ==="
tail -n 60 /var/log/nginx/error.log 2>/dev/null || echo "No error log at /var/log/nginx/error.log"

echo ""
echo "=== KYDEX.ME CONF FILES ==="
grep -rl "kydex" /etc/nginx/ 2>/dev/null | head -n 20

echo ""
echo "=== ALL PROXY_PASS POINTING TO 3000 OR 3081 ==="
grep -rn "proxy_pass.*:30" /etc/nginx/ 2>/dev/null | head -n 30
