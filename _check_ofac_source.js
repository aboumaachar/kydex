const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const [src, logs] = await Promise.all([
    p.kydexDataSource.findUnique({ where: { code: 'OFAC' } }),
    p.sourceConnectionLog.findMany({ take: 5, orderBy: { checkedAt: 'desc' } }),
  ]);
  console.log(JSON.stringify({ source: src, logs }, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
