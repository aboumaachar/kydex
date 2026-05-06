// Production seed script - plain JS, runs with node
// Usage: node seed-prod.js
const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding production database...');

  const tenant = await prisma.tenant.upsert({
    where: { id: 'seed-tenant-council' },
    update: {},
    create: {
      id: 'seed-tenant-council',
      name: 'Lebanese Notary Council',
      country: 'LB',
      type: 'COUNCIL',
    },
  });
  console.log('Tenant:', tenant.id);

  const passwordHash = await argon2.hash('KydexPass123!');

  const user = await prisma.user.upsert({
    where: { email: 'admin@kydex.local' },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      tenantId: tenant.id,
    },
    create: {
      tenantId: tenant.id,
      fullName: 'KYDEX Super Admin',
      email: 'admin@kydex.local',
      passwordHash,
      role: 'SUPER_ADMIN',
    },
  });
  console.log('Admin user:', user.email);

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
  console.log('DataSource:', source.code);

  console.log('Seed complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
