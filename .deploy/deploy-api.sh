#!/bin/bash
set -e

RELEASE_DIR="/home/kydex/apps/kydex-notary/current"
API_DIST_TAR="/tmp/kydex-api-dist.tgz"
ENV_FILE="$RELEASE_DIR/.env"

echo "=== Extracting API dist ==="
cd "$RELEASE_DIR"
tar -xzf "$API_DIST_TAR"
echo "Extracted to $RELEASE_DIR/apps/api/dist"

echo "=== Checking postgres user and database ==="
PG_USER="kydex"
PG_PASS="Kydex_Prod_2026!"
PG_DB="kydex"

# Try to connect via Unix socket as postgres (peer auth as root, or trust)
PG_CMD="psql -U postgres -h /var/run/postgresql"
# Try finding the socket directory
SOCK_DIR=$(find /var/run/postgresql /tmp -name '.s.PGSQL.5432' 2>/dev/null | head -1 | xargs -I{} dirname {} 2>/dev/null || echo "")

if [ -z "$SOCK_DIR" ]; then
  # Fallback: try TCP on localhost
  echo "No Unix socket found, trying 127.0.0.1..."
  PG_CMD="psql -U postgres -h 127.0.0.1 -p 5432"
else
  PG_CMD="psql -U postgres -h $SOCK_DIR"
fi

# Try runuser or su approach
run_psql() {
  runuser -u postgres -- psql "$@" 2>/dev/null || \
  su -s /bin/bash postgres -c "psql $*" 2>/dev/null || \
  psql -U postgres "$@" 2>/dev/null
}

# Create user if not exists
run_psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" 2>/dev/null | grep -q 1 || \
  run_psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';" 2>&1 | grep -v '^$' || \
  echo "Note: Could not create user (may already exist)"

# Create database if not exists
run_psql -tc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" 2>/dev/null | grep -q 1 || \
  run_psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;" 2>&1 | grep -v '^$' || \
  echo "Note: Could not create database (may already exist)"

# Grant privileges
run_psql -d "$PG_DB" -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;" 2>/dev/null || true
run_psql -d "$PG_DB" -c "GRANT ALL ON SCHEMA public TO $PG_USER;" 2>/dev/null || true

# Reset password to match .env (in case user existed with different password)
run_psql -c "ALTER USER $PG_USER WITH PASSWORD '$PG_PASS';" 2>&1 | grep -v '^$' || \
  echo "Note: Could not alter user password"

echo "Postgres setup attempted"

echo "=== Creating .env file ==="
cat > "$ENV_FILE" << 'ENVEOF'
NODE_ENV=production
API_PORT=4051
DATABASE_URL=postgresql://kydex:Kydex_Prod_2026!@127.0.0.1:5432/kydex?schema=public
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=kydex_jwt_prod_secret_2026_changeme
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_SECONDS=60
RATE_LIMIT_MAX_REQUESTS=100
API_BODY_LIMIT=10mb
MAX_UPLOAD_BYTES=10485760
CORS_ORIGIN_WHITELIST=https://kydex.me,https://www.kydex.me
LOGIN_LOCKOUT_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15
REQUIRE_2FA_FOR_PRIVILEGED=false
DEFAULT_TENANT_COUNTRY=LB
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=kydex_minio
MINIO_SECRET_KEY=kydex_minio_password
MINIO_BUCKET=kydex-files
MINIO_USE_SSL=false
UPLOAD_DEBUG_LOGS=false
BACKUP_ENCRYPTION_KEY=kydex_backup_key_2026_changeme
ENVEOF

echo "Created $ENV_FILE"

echo "=== Installing API production dependencies ==="
cd "$RELEASE_DIR/apps/api"
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -5

echo "=== Rebuilding native modules for Linux ==="
cd "$RELEASE_DIR/apps/api"
npm rebuild argon2 2>&1 | tail -5 || echo "argon2 rebuild warning (may be ok)"

echo "=== Running Prisma migrations ==="
cd "$RELEASE_DIR"
export $(cat "$ENV_FILE" | grep -v '^#' | grep '=' | xargs)
PRISMA_BIN="apps/api/node_modules/.bin/prisma"
# Resolve any previously failed migration
"$PRISMA_BIN" migrate resolve --rolled-back 20260502103000_phase9_security_commercial --schema=prisma/schema.prisma 2>&1 | grep -v "^$" || true
"$PRISMA_BIN" migrate deploy --schema=prisma/schema.prisma 2>&1

echo "=== Starting kydex-api with PM2 ==="
pm2 delete kydex-api 2>/dev/null || true
pm2 start apps/api/dist/main.js \
  --name kydex-api \
  --cwd "$RELEASE_DIR" \
  
pm2 save
echo ""
echo "=== PM2 kydex-api status ==="
pm2 describe kydex-api 2>&1 | head -30

echo ""
echo "=== Waiting 3s then checking port 4051 ==="
sleep 3
ss -ltnp | grep 4051 || echo "WARNING: nothing on 4051 yet"

echo ""
echo "=== Checking PM2 error log ==="
tail -20 ~/.pm2/logs/kydex-api-error.log 2>/dev/null || echo "no error log yet"

echo "DONE"
