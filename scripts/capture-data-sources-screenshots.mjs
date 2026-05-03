import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const outputDir = join(process.cwd(), '.snapshots', 'data-sources-control-surface');
mkdirSync(outputDir, { recursive: true });

const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = browserCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error('No Chrome/Edge executable found for screenshot capture');
}

const baseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000/api/v1';

const browser = await chromium.launch({
  headless: true,
  executablePath,
});

const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

async function waitForStableTable() {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

try {
  const loginResponse = await page.request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      email: 'admin@kydex.local',
      password: 'KydexPass123!',
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`Login failed for screenshot capture: ${loginResponse.status()}`);
  }

  const session = await loginResponse.json();
  const authHeaders = { Authorization: `Bearer ${session.accessToken}` };
  const versionsResponse = await page.request.get(`${apiBaseUrl}/data-sources/OFAC_SDN/versions`, {
    headers: authHeaders,
  });
  const recordsResponse = await page.request.get(`${apiBaseUrl}/data-sources/OFAC_SDN/records?page=1&limit=5`, {
    headers: authHeaders,
  });

  if (!versionsResponse.ok() || !recordsResponse.ok()) {
    throw new Error('Failed to fetch source versions or records for screenshot capture');
  }

  const versions = await versionsResponse.json();
  const recordPage = await recordsResponse.json();
  const targetVersionId = versions[0]?.id;
  const firstRecord = recordPage.records?.[0];

  await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((loginPayload) => {
    window.localStorage.setItem('kydex_access_token', loginPayload.accessToken);
    window.localStorage.setItem('kydex_access_token_exp', String(Date.now() + 15 * 60 * 1000));
    window.localStorage.setItem('kydex_user', JSON.stringify(loginPayload.user));
  }, session);
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle');

  await page.goto(`${baseUrl}/admin/data-sources`, { waitUntil: 'domcontentloaded' });
  await waitForStableTable();
  await page.screenshot({ path: join(outputDir, 'admin-data-sources.png'), fullPage: true });

  await page.goto(`${baseUrl}/admin/data-sources/OFAC_SDN/versions`, { waitUntil: 'domcontentloaded' });
  await waitForStableTable();
  await page.screenshot({ path: join(outputDir, 'data-source-versions.png'), fullPage: true });

  await page.goto(`${baseUrl}/admin/data-sources/OFAC_SDN/records`, { waitUntil: 'domcontentloaded' });
  await waitForStableTable();
  await page.screenshot({ path: join(outputDir, 'data-source-records.png'), fullPage: true });

  const firstRecordName = firstRecord?.primaryName?.trim() ?? '';
  if (firstRecordName) {
    await page.goto(`${baseUrl}/admin/data-sources/OFAC_SDN/records?q=${encodeURIComponent(firstRecordName)}`, {
      waitUntil: 'domcontentloaded',
    });
    await waitForStableTable();
    await page.screenshot({ path: join(outputDir, 'data-source-records-filtered.png'), fullPage: true });

    if (firstRecord?.id) {
      await page.goto(`${baseUrl}/admin/data-sources/OFAC_SDN/records/${firstRecord.id}`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(outputDir, 'data-source-record-detail.png'), fullPage: true });
    }
  }

  if (targetVersionId) {
    await page.goto(`${baseUrl}/admin/data-sources/OFAC_SDN/versions/${targetVersionId}/report`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: join(outputDir, 'data-source-report.png'), fullPage: true });
  }

  console.log(
    JSON.stringify(
      {
        outputDir,
        files: [
          join(outputDir, 'admin-data-sources.png'),
          join(outputDir, 'data-source-versions.png'),
          join(outputDir, 'data-source-records.png'),
          join(outputDir, 'data-source-records-filtered.png'),
          join(outputDir, 'data-source-record-detail.png'),
          join(outputDir, 'data-source-report.png'),
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}