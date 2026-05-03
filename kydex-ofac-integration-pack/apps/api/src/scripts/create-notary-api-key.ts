// Usage with ts-node after Prisma is configured:
// npx ts-node apps/api/src/scripts/create-notary-api-key.ts sandranassif "Sandra Nassif Kallab" dev_sandranassif_key

import { createHash } from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function main() {
  const [slug, displayName, apiKey] = process.argv.slice(2);

  if (!slug || !displayName || !apiKey) {
    throw new Error('Usage: ts-node create-notary-api-key.ts <slug> <displayName> <apiKey>');
  }

  await prisma.notaryProfile.upsert({
    where: { slug },
    create: {
      slug,
      displayName,
      isScreeningEnabled: true,
    },
    update: {
      displayName,
      isScreeningEnabled: true,
    },
  });

  const record = await prisma.notaryApiKey.create({
    data: {
      notarySlug: slug,
      keyHash: sha256(apiKey),
      label: 'Initial webpage key',
      isActive: true,
    },
  });

  console.log({
    slug,
    displayName,
    apiKeyPlaintext: apiKey,
    apiKeyRecordId: record.id,
    message: 'Store the plaintext API key securely. KYDEX stores only its SHA-256 hash.',
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
