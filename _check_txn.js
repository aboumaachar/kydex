const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const latestTxn = await p.screeningTransaction.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  const latestInquiry = await p.incomingInquiry.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { transaction: true },
  });
  const latestSearch = await p.ofacScreeningSearch.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify({ latestTxn, latestInquiry, latestSearch }, null, 2));
  await p.$disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
