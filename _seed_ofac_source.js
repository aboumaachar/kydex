const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const src = await p.kydexDataSource.upsert({
    where: {code: 'OFAC'},
    create: {
      code: 'OFAC',
      name: 'OFAC Sanctions List Service',
      baseUrl: 'https://sanctionslistservice.ofac.treas.gov',
      status: 'unknown',
      fallbackEnabled: true,
      localCopyAvailable: false,
    },
    update: {}
  });
  console.log('Seeded:', JSON.stringify({id:src.id, code:src.code, status:src.status}));
  await p.$disconnect();
}
main().catch(e=>{console.error(e.message);process.exit(1)});
