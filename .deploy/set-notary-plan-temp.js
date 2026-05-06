const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const slug = process.argv[2] || 'sandranassif';
  const newPlan = process.argv[3] || 'ENTERPRISE';

  const before = await prisma.notaryProfile.findUnique({ where: { slug } });
  if (!before) {
    throw new Error(`notary not found: ${slug}`);
  }

  console.log(`BEFORE_PLAN=${before.planName}`);
  console.log(`BEFORE_STATUS=${before.membershipStatus}`);

  const after = await prisma.notaryProfile.update({
    where: { slug },
    data: {
      planName: newPlan,
      membershipStatus: 'ACTIVE',
      isScreeningEnabled: true,
    },
  });

  console.log(`AFTER_PLAN=${after.planName}`);
  console.log(`AFTER_STATUS=${after.membershipStatus}`);
}

main()
  .catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
