import { PrismaClient, TenantType, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-council' },
    update: {},
    create: {
      id: 'seed-tenant-council',
      name: 'Lebanese Notary Council',
      country: 'LB',
      type: TenantType.COUNCIL,
    },
  });

  const passwordHash = await argon2.hash('KydexPass123!');

  await prisma.user.upsert({
    where: { email: 'admin@kydex.local' },
    update: {
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      tenantId: tenant.id,
    },
    create: {
      tenantId: tenant.id,
      fullName: 'KYDEX Super Admin',
      email: 'admin@kydex.local',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });

  const source = await prisma.dataSource.upsert({
    where: { code: 'OFAC' },
    update: {},
    create: {
      code: 'OFAC',
      name: 'OFAC SDN',
      type: 'OFAC',
      country: 'US',
    },
  });

  const version = await prisma.dataSourceVersion.create({
    data: {
      dataSourceId: source.id,
      versionLabel: `OFAC-SDN-${new Date().toISOString().slice(0, 10)}`,
      recordCount: 1,
    },
  });

  await prisma.watchlistRecord.create({
    data: {
      dataSourceId: source.id,
      versionId: version.id,
      entityType: 'PERSON',
      primaryName: 'Mohammed Ali',
      normalizedName: 'mohammed ali',
      aliases: ['mohammad ali'],
      nationality: 'LB',
      documentNumbers: ['123456'],
      rawPayload: { source: 'seed' },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
