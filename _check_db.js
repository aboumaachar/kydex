const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const [src, ents, names, lists, variants, txns, inqs] = await Promise.all([
    p.kydexDataSource.count(),
    p.sourceEntity.count(),
    p.sourceName.count(),
    p.sourceImportedList.count(),
    p.sourceNameVariant.count(),
    p.screeningTransaction.count(),
    p.incomingInquiry.count(),
  ]);
  const ofacEntities = await p.ofacEntity.count();
  const ofacNames = await p.ofacName.count();
  console.log(JSON.stringify({
    kydexDataSources: src,
    sourceEntities: ents,
    sourceNames: names,
    sourceImportedLists: lists,
    sourceNameVariants: variants,
    screeningTransactions: txns,
    incomingInquiries: inqs,
    ofacEntities,
    ofacNames,
  }, null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
