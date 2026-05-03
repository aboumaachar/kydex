import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { runInfrastructurePreflight } from '../health/preflight-checks';

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });

async function main() {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
    const result = await runInfrastructurePreflight(prisma);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(result, null, 2));

    if (result.status !== 'ok') {
      process.exitCode = 2;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify(
        {
          status: 'degraded',
          service: 'kydex-api',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'unknown',
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
