import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { CasesService } from '../cases/cases.service';

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });

async function main() {
  const prisma = new PrismaClient();
  const casesService = new CasesService(
    prisma as never,
    {
      log: async () => null,
    } as never,
  );

  try {
    await prisma.$connect();
    const alerts = await casesService.detectSlaBreaches();
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          status: 'ok',
          service: 'kydex-api',
          timestamp: new Date().toISOString(),
          alertsGenerated: alerts.length,
          alerts,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify(
        {
          status: 'error',
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