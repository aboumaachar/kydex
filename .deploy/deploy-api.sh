#!/bin/bash
set -euo pipefail

RELEASE_DIR="${RELEASE_DIR:-/home/kydex/apps/kydex-notary/current}"
API_DIST_TAR="${API_DIST_TAR:-/tmp/kydex-api-dist.tgz}"
ENV_SOURCE="${ENV_SOURCE:-$RELEASE_DIR/.env.production}"
ENV_FILE="${ENV_FILE:-$RELEASE_DIR/.env}"
RUNTIME_DB_HOST="${RUNTIME_DB_HOST:-127.0.0.1}"
RUNTIME_DB_PORT="${RUNTIME_DB_PORT:-5432}"
PM2_APP_NAME="${PM2_APP_NAME:-kydex-api}"

require_var() {
  local var_name="$1"
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required environment variable: $var_name" >&2
    exit 1
  fi
}

load_env_source() {
  if [ -f "$ENV_SOURCE" ]; then
    echo "=== Loading environment from $ENV_SOURCE ==="
    set -a
    # shellcheck disable=SC1090
    . "$ENV_SOURCE"
    set +a
  else
    echo "WARNING: $ENV_SOURCE not found; relying on exported environment variables" >&2
  fi
}

build_runtime_database_url() {
  local runtime_url="${DATABASE_URL:-}"
  if [ -z "$runtime_url" ]; then
    runtime_url="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${RUNTIME_DB_HOST}:${RUNTIME_DB_PORT}/${POSTGRES_DB}?schema=public"
  fi
  runtime_url="${runtime_url/@postgres:/@${RUNTIME_DB_HOST}:}"
  echo "$runtime_url"
}

get_runtime_api_port() {
  if [ -f "$ENV_FILE" ]; then
    local configured_port
    configured_port=$(grep '^API_PORT=' "$ENV_FILE" | tail -1 | cut -d'=' -f2- || true)
    if [ -n "$configured_port" ]; then
      echo "$configured_port"
      return
    fi
  fi
  echo "4000"
}

write_runtime_env() {
  if [ -f "$ENV_SOURCE" ]; then
    grep -v '^DATABASE_URL=' "$ENV_SOURCE" > "$ENV_FILE"
  else
    cat > "$ENV_FILE" <<ENVEOF
NODE_ENV=production
API_PORT=${API_PORT:-4000}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
REDIS_HOST=${REDIS_HOST:-127.0.0.1}
REDIS_PORT=${REDIS_PORT:-6379}
JWT_SECRET=${JWT_SECRET}
ACCESS_TOKEN_TTL=${ACCESS_TOKEN_TTL:-15m}
REFRESH_TOKEN_TTL=${REFRESH_TOKEN_TTL:-7d}
MINIO_ENDPOINT=${MINIO_ENDPOINT:-127.0.0.1}
MINIO_PORT=${MINIO_PORT:-9000}
MINIO_ACCESS_KEY=${MINIO_ACCESS_KEY}
MINIO_SECRET_KEY=${MINIO_SECRET_KEY}
MINIO_BUCKET=${MINIO_BUCKET:-kydex-files}
MINIO_USE_SSL=${MINIO_USE_SSL:-false}
BACKUP_ENCRYPTION_KEY=${BACKUP_ENCRYPTION_KEY}
ENVEOF
  fi

  printf '\nDATABASE_URL=%s\n' "$DATABASE_URL_RUNTIME" >> "$ENV_FILE"
}

load_env_source

POSTGRES_USER="${POSTGRES_USER:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-}"

require_var POSTGRES_USER
require_var POSTGRES_PASSWORD
require_var POSTGRES_DB
require_var JWT_SECRET
require_var MINIO_ACCESS_KEY
require_var MINIO_SECRET_KEY
require_var BACKUP_ENCRYPTION_KEY

DATABASE_URL_RUNTIME="$(build_runtime_database_url)"

echo "=== Extracting API dist ==="
cd "$RELEASE_DIR"
tar -xzf "$API_DIST_TAR"
echo "Extracted to $RELEASE_DIR/apps/api/dist"

echo "=== Checking postgres user and database ==="
PG_USER="$POSTGRES_USER"
PG_PASS="$POSTGRES_PASSWORD"
PG_DB="$POSTGRES_DB"

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
write_runtime_env

echo "Created $ENV_FILE"

echo "=== Installing API production dependencies ==="
cd "$RELEASE_DIR/apps/api"
npm install --omit=dev --no-audit --no-fund 2>&1 | tail -5

echo "=== Rebuilding native modules for Linux ==="
cd "$RELEASE_DIR/apps/api"
npm rebuild argon2 2>&1 | tail -5 || echo "argon2 rebuild warning (may be ok)"

echo "=== Running Prisma migrations ==="
cd "$RELEASE_DIR"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
PRISMA_BIN="apps/api/node_modules/.bin/prisma"
if [ ! -x "$PRISMA_BIN" ] && [ -x "node_modules/.bin/prisma" ]; then
  PRISMA_BIN="node_modules/.bin/prisma"
fi
if [ ! -x "$PRISMA_BIN" ]; then
  echo "Prisma CLI not found in apps/api/node_modules/.bin or node_modules/.bin" >&2
  exit 1
fi
# Resolve any previously failed migration
"$PRISMA_BIN" migrate resolve --rolled-back 20260502103000_phase9_security_commercial --schema=prisma/schema.prisma 2>&1 | grep -v "^$" || true
"$PRISMA_BIN" migrate deploy --schema=prisma/schema.prisma 2>&1

echo "=== Verifying Prisma database connection ==="
cd "$RELEASE_DIR/apps/api"
node <<'NODE'
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Prisma database connection verified');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
NODE

echo "=== Starting $PM2_APP_NAME with PM2 ==="
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
pm2 start apps/api/dist/main.js \
  --name "$PM2_APP_NAME" \
  --cwd "$RELEASE_DIR" \
  --update-env
pm2 save
echo ""
echo "=== PM2 $PM2_APP_NAME status ==="
pm2 describe "$PM2_APP_NAME" 2>&1 | head -30

echo ""
API_PORT_RUNTIME="$(get_runtime_api_port)"
echo "=== Waiting 3s then checking port $API_PORT_RUNTIME ==="
sleep 3
ss -ltnp | grep ":$API_PORT_RUNTIME" || echo "WARNING: nothing on $API_PORT_RUNTIME yet"

echo ""
echo "=== Checking PM2 error log ==="
tail -20 "$HOME/.pm2/logs/${PM2_APP_NAME}-error.log" 2>/dev/null || echo "no error log yet"

echo "DONE"
