const baseUrl = process.env.KYDEX_API_BASE_URL || 'http://localhost:4000/api/v1';
const slug = process.env.KYDEX_NOTARY_SLUG || 'sandranassif';
const notaryKey = process.env.KYDEX_NOTARY_KEY || 'dev_sandranassif_key';
const clientName = process.env.KYDEX_CLIENT_NAME || 'local-live-smoke';

const endpoint = `${baseUrl}/notaries/${slug}/screening/search`;

const payload = {
  query: 'Mohammad Ali',
  screeningType: 'ofac',
  source: 'external_api_client',
  sources: ['OFAC'],
  liveVerify: true,
  clientReference: 'live-test-001',
};

async function main() {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-kydex-notary-key': notaryKey,
      'x-kydex-client': 'external-api-client',
      'x-kydex-client-name': clientName,
    },
    body: JSON.stringify(payload),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    data = { message: await response.text() };
  }

  const summary = {
    httpStatus: response.status,
    status: data?.status ?? null,
    query: data?.query ?? null,
    sourceMode: data?.sourceMode ?? null,
    liveSourceChecked: data?.liveSourceChecked ?? null,
    usedFallback: data?.usedFallback ?? null,
    auditId: data?.auditId ?? null,
    warning: data?.warning ?? null,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!response.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
