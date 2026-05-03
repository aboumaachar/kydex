import Redis from 'ioredis';
import { Socket } from 'node:net';
import { Queue, Worker } from 'bullmq';
import { Client as MinioClient } from 'minio';

type Queryable = {
  $queryRawUnsafe: (query: string) => Promise<unknown>;
};

export type CheckResult = {
  ok: boolean;
  message: string;
  details?: Record<string, unknown>;
};

export type PreflightResult = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  checks: {
    env: CheckResult;
    postgres: CheckResult;
    redis: CheckResult;
    bullmqWorker: CheckResult;
    minio: CheckResult;
  };
};

const BULK_QUEUE = 'bulk-screening';

const REQUIRED_ENV_KEYS = [
  'DATABASE_URL',
  'REDIS_HOST',
  'REDIS_PORT',
  'MINIO_ENDPOINT',
  'MINIO_PORT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
  'MINIO_BUCKET',
  'JWT_SECRET',
  'ACCESS_TOKEN_TTL',
  'REFRESH_TOKEN_TTL',
];

export async function runInfrastructurePreflight(prisma: Queryable): Promise<PreflightResult> {
  const [env, postgres, redis, bullmqWorker, minio] = await Promise.all([
    checkEnv(),
    checkPostgres(prisma),
    checkRedis(),
    checkBullMqWorker(),
    checkMinio(),
  ]);

  const allOk = env.ok && postgres.ok && redis.ok && bullmqWorker.ok && minio.ok;

  return {
    status: allOk ? 'ok' : 'degraded',
    service: 'kydex-api',
    timestamp: new Date().toISOString(),
    checks: {
      env,
      postgres,
      redis,
      bullmqWorker,
      minio,
    },
  };
}

async function checkEnv(): Promise<CheckResult> {
  const missing = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return !value?.trim();
  });

  if (missing.length > 0) {
    return {
      ok: false,
      message: 'Required environment variables are missing',
      details: {
        missing,
      },
    };
  }

  return {
    ok: true,
    message: 'Required environment variables are present',
  };
}

async function checkPostgres(prisma: Queryable): Promise<CheckResult> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return {
      ok: true,
      message: 'PostgreSQL connection is healthy',
    };
  } catch (error) {
    return {
      ok: false,
      message: 'PostgreSQL connection failed',
      details: { error: error instanceof Error ? error.message : 'unknown' },
    };
  }
}

async function checkRedis(): Promise<CheckResult> {
  const redis = new Redis({
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const info = await redis.info('server');
    const versionLine = info
      .split('\n')
      .find((line) => line.toLowerCase().startsWith('redis_version:'));
    const version = versionLine?.split(':')[1]?.trim() ?? 'unknown';
    const major = Number(version.split('.')[0] ?? '0');
    const supported = major >= 5;

    return {
      ok: supported,
      message: supported
        ? 'Redis connection is healthy'
        : 'Redis version is below required minimum for BullMQ (>=5)',
      details: { version },
    };
  } catch (error) {
    return {
      ok: false,
      message: 'Redis connection failed',
      details: {
        error: error instanceof Error ? error.message : 'unknown',
      },
    };
  } finally {
    redis.disconnect();
  }
}

async function checkBullMqWorker(): Promise<CheckResult> {
  const connection = {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: Number(process.env.REDIS_PORT ?? 6379),
  };

  const queue = new Queue(BULK_QUEUE, { connection });
  const workerProbe = new Worker(BULK_QUEUE, async () => undefined, {
    connection,
    autorun: false,
  });

  try {
    await Promise.all([queue.waitUntilReady(), workerProbe.waitUntilReady()]);
    const workerCount = await queue.getWorkersCount();

    return {
      ok: true,
      message: 'BullMQ worker startup probe is healthy',
      details: {
        queue: BULK_QUEUE,
        workers: workerCount,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: 'BullMQ worker check failed',
      details: {
        queue: BULK_QUEUE,
        error: error instanceof Error ? error.message : 'unknown',
      },
    };
  } finally {
    await workerProbe.close();
    await queue.close();
  }
}

async function checkMinio(): Promise<CheckResult> {
  const host = process.env.MINIO_ENDPOINT ?? '127.0.0.1';
  const port = Number(process.env.MINIO_PORT ?? 9000);
  const accessKey = process.env.MINIO_ACCESS_KEY ?? '';
  const secretKey = process.env.MINIO_SECRET_KEY ?? '';
  const bucket = process.env.MINIO_BUCKET ?? 'kydex-files';
  const useSSL = (process.env.MINIO_USE_SSL ?? 'false') === 'true';

  try {
    await tcpPing(host, port, 2500);

    const minio = new MinioClient({
      endPoint: host,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    const exists = await minio.bucketExists(bucket);
    if (!exists) {
      await minio.makeBucket(bucket, 'us-east-1');
    }

    const probeKey = `preflight/${Date.now()}-${Math.random().toString(16).slice(2)}.json`;
    const probeContent = JSON.stringify({ ok: true, timestamp: new Date().toISOString() });

    await minio.putObject(bucket, probeKey, Buffer.from(probeContent));

    const stream = await minio.getObject(bucket, probeKey);
    const downloaded = await readStream(stream as NodeJS.ReadableStream);
    await minio.removeObject(bucket, probeKey);

    return {
      ok: downloaded === probeContent,
      message:
        downloaded === probeContent
          ? 'MinIO bucket/object read-write-delete check passed'
          : 'MinIO object round-trip content mismatch',
      details: {
        endpoint: `${host}:${port}`,
        bucket,
        bucketCreated: !exists,
      },
    };
  } catch (error) {
    return {
      ok: false,
      message: 'MinIO verification failed',
      details: {
        endpoint: `${host}:${port}`,
        bucket,
        error: error instanceof Error ? error.message : 'unknown',
      },
    };
  }
}

function tcpPing(host: string, port: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = new Socket();
    socket.setTimeout(timeoutMs);

    socket.once('connect', () => {
      socket.destroy();
      resolve();
    });

    socket.once('timeout', () => {
      socket.destroy();
      reject(new Error('timeout'));
    });

    socket.once('error', (error) => {
      socket.destroy();
      reject(error);
    });

    socket.connect(port, host);
  });
}

function readStream(stream: NodeJS.ReadableStream) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    });

    stream.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });

    stream.on('error', (error) => {
      reject(error);
    });
  });
}
