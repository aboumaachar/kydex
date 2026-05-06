#!/bin/sh
set -e
# Find the nginx conf file containing the kydex proxy_pass on port 3000
CONF=$(grep -rl 'proxy_pass http://54.39.157.227:3000' /etc/nginx/ 2>/dev/null | head -n 1)
if [ -z "$CONF" ]; then
  # Try 127.0.0.1:3000 variant
  CONF=$(grep -rl 'proxy_pass http://127.0.0.1:3000' /etc/nginx/ 2>/dev/null | head -n 1)
fi
if [ -z "$CONF" ]; then
  echo "ERROR: could not find nginx conf with kydex proxy_pass. Searching all proxy_pass lines in /etc/nginx:"
  grep -rn 'proxy_pass' /etc/nginx/ 2>/dev/null | grep '3000\|3081' | head -n 30
  exit 1
fi
echo "Found conf: $CONF"
echo "Before:"
grep -n 'proxy_pass\|server_name\|3000\|3081\|kydex\|notary' "$CONF" | head -n 30
# Replace port 3000 with 3081 for the kydex proxy (both IP variants)
sed -i 's|proxy_pass http://54.39.157.227:3000|proxy_pass http://127.0.0.1:3081|g' "$CONF"
sed -i 's|proxy_pass http://127.0.0.1:3000|proxy_pass http://127.0.0.1:3081|g' "$CONF"
echo "After:"
grep -n 'proxy_pass\|3081' "$CONF" | head -n 20
echo "Testing nginx config..."
nginx -t
echo "Reloading nginx..."
nginx -s reload
echo "Done. nginx reloaded."
