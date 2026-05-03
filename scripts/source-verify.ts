import { config as loadEnv } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnv({ path: resolve(process.cwd(), '.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env.production'), override: false });

type SyncRun = {
  source: string;
  insertedRecords: number;
  rejectedRows: number;
  duplicateRows: number;
  versionId: string;
};

type ScreenProof = {
  mode: string;
  searchedSources: string[];
  usedLocalVersions: Array<{ sourceCode: string; versionId: string; versionLabel: string }>;
  riskLevel: string;
  matchCount: number;
};

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const base = `${apiBaseUrl.replace(/\/$/, '')}/api/v1`;
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD must be configured');
  }

  const loginResponse = await requestJson(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (loginResponse.status !== 200 || !loginResponse.body?.accessToken) {
    throw new Error('Login failed for source verification');
  }

  const token = String(loginResponse.body.accessToken);
  const authHeaders = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };

  const syncRuns: SyncRun[] = [];
  syncRuns.push(await runSingleSync(base, authHeaders, 'OFAC_SDN'));
  syncRuns.push(await runSingleSync(base, authHeaders, 'OFAC_CONSOLIDATED'));
  syncRuns.push(await runSingleSync(base, authHeaders, 'UNSEC_CONSOLIDATED'));

  const screens: ScreenProof[] = [];
  screens.push(await runScreen(base, authHeaders, 'OFAC-only', ['OFAC_SDN']));
  screens.push(await runScreen(base, authHeaders, 'UNSEC-only', ['UNSEC_CONSOLIDATED']));
  screens.push(await runScreen(base, authHeaders, 'selected-sources', ['OFAC_SDN', 'UNSEC_CONSOLIDATED']));
  screens.push(await runScreen(base, authHeaders, 'ALL-sources', ['ALL']));
  screens.push(await runScreen(base, authHeaders, 'omitted-sources', undefined));

  const reportPath = resolve(process.cwd(), 'SOURCE_CONNECTIVITY_AND_LOCAL_SCREENING_REPORT.md');
  const report = buildReport(syncRuns, screens, new Date().toISOString(), base);
  writeFileSync(reportPath, report, 'utf-8');

  const output = {
    status: 'ok',
    syncRuns,
    screens,
    reportPath,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

async function runSingleSync(base: string, headers: Record<string, string>, source: string): Promise<SyncRun> {
  const response = await requestJson(`${base}/data-sources/sync-official`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ sources: [source] }),
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Sync failed for ${source}: status ${response.status}`);
  }

  const first = (response.body?.results ?? [])[0];
  if (!first) {
    throw new Error(`Sync did not return result for ${source}`);
  }

  const insertedRecords = Number(first.ingestionResult?.insertedRecords ?? 0);
  if (insertedRecords <= 0) {
    throw new Error(`Sync insertedRecords <= 0 for ${source}`);
  }

  return {
    source,
    insertedRecords,
    rejectedRows: Number(first.ingestionResult?.rejectedRows ?? 0),
    duplicateRows: Number(first.ingestionResult?.duplicateRows ?? 0),
    versionId: String(first.ingestionResult?.versionId ?? ''),
  };
}

async function runScreen(
  base: string,
  headers: Record<string, string>,
  mode: string,
  sources: string[] | undefined,
): Promise<ScreenProof> {
  const payload: Record<string, unknown> = {
    fullName: 'Mohammed Ali',
    documentNumber: '123456',
    transactionType: 'SOURCE_VERIFY',
    clientReference: `SRC-VERIFY-${mode}`,
  };

  if (sources) {
    payload.sources = sources;
  }

  const response = await requestJson(`${base}/screen`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status !== 201 && response.status !== 200) {
    throw new Error(`Screen failed for mode ${mode}: status ${response.status}`);
  }

  const searchedSources = Array.isArray(response.body?.searchedSources)
    ? (response.body.searchedSources as string[])
    : [];
  const usedLocalVersions = Array.isArray(response.body?.usedLocalVersions)
    ? (response.body.usedLocalVersions as Array<{ sourceCode: string; versionId: string; versionLabel: string }>)
    : [];

  if (searchedSources.length === 0) {
    throw new Error(`Screen did not return searchedSources for mode ${mode}`);
  }

  if (usedLocalVersions.length === 0) {
    throw new Error(`Screen did not return usedLocalVersions for mode ${mode}`);
  }

  return {
    mode,
    searchedSources,
    usedLocalVersions,
    riskLevel: String(response.body?.riskLevel ?? 'LOW'),
    matchCount: Array.isArray(response.body?.matches) ? response.body.matches.length : 0,
  };
}

function buildReport(syncRuns: SyncRun[], screens: ScreenProof[], timestamp: string, base: string) {
  const lines: string[] = [];
  lines.push('# SOURCE CONNECTIVITY AND LOCAL SCREENING REPORT');
  lines.push('');
  lines.push(`Date: ${timestamp}`);
  lines.push(`API: ${base}`);
  lines.push('');
  lines.push('## Official Source Sync Results');
  for (const run of syncRuns) {
    lines.push(`- ${run.source}: inserted=${run.insertedRecords}, rejected=${run.rejectedRows}, duplicates=${run.duplicateRows}, versionId=${run.versionId}`);
  }
  lines.push('');
  lines.push('## Local Screening Proof');
  for (const proof of screens) {
    lines.push(`- ${proof.mode}: searchedSources=${JSON.stringify(proof.searchedSources)} usedLocalVersions=${JSON.stringify(proof.usedLocalVersions)} riskLevel=${proof.riskLevel} matchCount=${proof.matchCount}`);
  }
  lines.push('');
  lines.push('## Verdict');
  lines.push('- PASS: official source sync and local-only screening verification complete.');
  lines.push('');
  return lines.join('\n');
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: Record<string, any> = {};
  if (text) {
    try {
      body = JSON.parse(text) as Record<string, any>;
    } catch {
      body = { raw: text };
    }
  }

  return {
    status: response.status,
    body,
  };
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
