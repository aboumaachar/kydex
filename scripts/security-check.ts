import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Check = {
  control: string;
  ok: boolean;
  detail: string;
};

function parseEnv(filePath: string) {
  const map = new Map<string, string>();
  if (!existsSync(filePath)) {
    return map;
  }

  const lines = readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const idx = line.indexOf('=');
    if (idx <= 0) {
      continue;
    }

    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    map.set(key, value);
  }

  return map;
}

function readFromEnvChain(key: string, envMap: Map<string, string>, fallbackMap: Map<string, string>) {
  return process.env[key] ?? envMap.get(key) ?? fallbackMap.get(key) ?? '';
}

function isJwtSecretStrong(secret: string) {
  return secret.length >= 32 && !secret.includes('change_this_in_production');
}

function parseBytes(input: string, fallback: number) {
  const text = input.trim().toLowerCase();
  if (!text) {
    return fallback;
  }

  const match = /^(\d+)(b|kb|mb|gb)?$/.exec(text);
  if (!match) {
    return fallback;
  }

  const value = Number(match[1]);
  const unit = match[2] ?? 'b';
  if (unit === 'kb') {
    return value * 1024;
  }
  if (unit === 'mb') {
    return value * 1024 * 1024;
  }
  if (unit === 'gb') {
    return value * 1024 * 1024 * 1024;
  }

  return value;
}

function main() {
  const root = process.cwd();
  const productionEnvPath = resolve(root, '.env.production');
  const productionExamplePath = resolve(root, '.env.production.example');
  const envMap = parseEnv(productionEnvPath);
  const fallbackMap = parseEnv(productionExamplePath);

  const checks: Check[] = [];

  const nodeEnv = readFromEnvChain('NODE_ENV', envMap, fallbackMap);
  checks.push({
    control: 'node_env_is_production',
    ok: nodeEnv === 'production',
    detail: `NODE_ENV=${nodeEnv || 'missing'}`,
  });

  const jwtSecret = readFromEnvChain('JWT_SECRET', envMap, fallbackMap);
  checks.push({
    control: 'jwt_secret_strength',
    ok: isJwtSecretStrong(jwtSecret),
    detail: jwtSecret ? `length=${jwtSecret.length}` : 'missing JWT_SECRET',
  });

  const corsWhitelist = readFromEnvChain('CORS_ORIGIN_WHITELIST', envMap, fallbackMap);
  const allowedOrigins = corsWhitelist
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  checks.push({
    control: 'cors_whitelist_configured',
    ok: allowedOrigins.length > 0 && !allowedOrigins.includes('*'),
    detail: allowedOrigins.length > 0 ? allowedOrigins.join(', ') : 'missing CORS_ORIGIN_WHITELIST',
  });

  const bodyLimitRaw = readFromEnvChain('API_BODY_LIMIT', envMap, fallbackMap);
  const bodyLimit = parseBytes(bodyLimitRaw, 1024 * 1024);
  checks.push({
    control: 'api_body_limit',
    ok: bodyLimit > 0 && bodyLimit <= 5 * 1024 * 1024,
    detail: `API_BODY_LIMIT=${bodyLimitRaw || 'missing'}`,
  });

  const uploadLimitRaw = readFromEnvChain('MAX_UPLOAD_BYTES', envMap, fallbackMap);
  const uploadLimit = parseBytes(uploadLimitRaw, 10 * 1024 * 1024);
  checks.push({
    control: 'upload_size_limit',
    ok: uploadLimit > 0 && uploadLimit <= 20 * 1024 * 1024,
    detail: `MAX_UPLOAD_BYTES=${uploadLimitRaw || 'missing'}`,
  });

  const rateLimitWindow = Number(readFromEnvChain('RATE_LIMIT_WINDOW_SECONDS', envMap, fallbackMap) || '0');
  const rateLimitMax = Number(readFromEnvChain('RATE_LIMIT_MAX_REQUESTS', envMap, fallbackMap) || '0');
  checks.push({
    control: 'rate_limiting',
    ok: rateLimitWindow > 0 && rateLimitMax > 0,
    detail: `window=${rateLimitWindow}s max=${rateLimitMax}`,
  });

  const lockoutAttempts = Number(readFromEnvChain('LOGIN_LOCKOUT_MAX_ATTEMPTS', envMap, fallbackMap) || '0');
  const lockoutMinutes = Number(readFromEnvChain('LOGIN_LOCKOUT_MINUTES', envMap, fallbackMap) || '0');
  checks.push({
    control: 'account_lockout_policy',
    ok: lockoutAttempts >= 3 && lockoutMinutes >= 5,
    detail: `attempts=${lockoutAttempts} minutes=${lockoutMinutes}`,
  });

  const resetTtl = readFromEnvChain('PASSWORD_RESET_TOKEN_TTL', envMap, fallbackMap);
  checks.push({
    control: 'password_reset_ttl',
    ok: resetTtl.length > 0,
    detail: resetTtl ? `PASSWORD_RESET_TOKEN_TTL=${resetTtl}` : 'missing password reset ttl',
  });

  const composeExists = existsSync(resolve(root, 'docker-compose.production.yml'));
  checks.push({
    control: 'production_compose_present',
    ok: composeExists,
    detail: composeExists ? 'docker-compose.production.yml found' : 'missing docker-compose.production.yml',
  });

  const runbookExists = existsSync(resolve(root, 'PRODUCTION_DEPLOYMENT_RUNBOOK.md'));
  checks.push({
    control: 'deployment_runbook_present',
    ok: runbookExists,
    detail: runbookExists ? 'PRODUCTION_DEPLOYMENT_RUNBOOK.md found' : 'missing runbook',
  });

  const failed = checks.filter((check) => !check.ok);
  const result = {
    status: failed.length === 0 ? 'ok' : 'failed',
    timestamp: new Date().toISOString(),
    checks,
    failedCount: failed.length,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
