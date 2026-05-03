const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const src = await p.kydexDataSource.update({
    where: { code: 'OFAC' },
    data: { status: 'offline', lastError: 'simulated outage for fallback test' },
  });
  console.log(JSON.stringify({ code: src.code, status: src.status, fallbackEnabled: src.fallbackEnabled }));
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
