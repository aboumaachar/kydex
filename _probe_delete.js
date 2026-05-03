const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const src = await p.kydexDataSource.findUnique({ where: { code: 'OFAC' } });
  if (!src) {
    console.log('No source');
    return;
  }
  try {
    const r = await p.sourceNameVariant.deleteMany({
      where: {
        sourceName: {
          entity: {
            sourceId: src.id,
          },
        },
      },
    });
    console.log('OK', r);
  } catch (e) {
    console.error('ERR', e.message);
  }
}

main().finally(async () => {
  await p.$disconnect();
});
