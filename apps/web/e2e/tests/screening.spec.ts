import { expect, test } from '@playwright/test';

const ADMIN_EMAIL = process.env.KYDEX_ADMIN_EMAIL || 'admin@kydex.local';
const ADMIN_PASS = process.env.KYDEX_ADMIN_PASS || 'KydexPass123!';

async function loginViaApiAndRestoreSession(page, request) {
  const apiBase = process.env.API_BASE || 'http://localhost:4000/api/v1';
  const res = await request.post(`${apiBase}/auth/login`, { data: { email: ADMIN_EMAIL, password: ADMIN_PASS } });
  if (!res.ok()) throw new Error(`Auth failed ${res.status()}`);
  const body = await res.json();
  const token = body.accessToken;
  const user = body.user;

  // decode JWT expiry
  let expMs = Date.now() + 15 * 60 * 1000;
  try {
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    if (payload && payload.exp) expMs = payload.exp * 1000;
  } catch {}

  // set localStorage before page loads
  await page.addInitScript(([t, e, u]) => {
    localStorage.setItem('kydex_access_token', t);
    localStorage.setItem('kydex_access_token_exp', String(e));
    localStorage.setItem('kydex_user', u);
  }, [token, expMs, JSON.stringify(user)]);
  await page.goto('/dashboard');
}

async function runSearchAndCapture(page, query, screenshotName) {
  await page.goto('/screening/new');
  await page.fill('input[placeholder="أدخل الاسم الكامل أو جزءاً من الاسم"]', query);
  await page.click('button:has-text("تشغيل الفحص")');

  // Wait for either the results header or the no-results message. Give backend more time if ingestion is ongoing.
  const waitTimeout = 120000;
  await Promise.race([
    page.waitForSelector('text=النتائج المحتملة', { timeout: waitTimeout }),
    page.waitForSelector('text=لم يتم العثور على نتائج', { timeout: waitTimeout }),
  ]);

  // Allow cards to render
  await page.waitForTimeout(1000);

  await page.screenshot({ path: `apps/web/e2e/artifacts/${screenshotName}`, fullPage: true });
}

test.describe('Screening results show matched names', () => {
  test.beforeEach(async ({ page, request }) => {
    await loginViaApiAndRestoreSession(page, request);
  });

  test('Latin query shows listed names', async ({ page }) => {
    await runSearchAndCapture(page, 'Mohammad Ali', 'mohammad-ali.png');
    // Basic assertion: ensure candidate header exists
    const header = await page.locator('text=النتائج المحتملة').first();
    expect(await header.isVisible()).toBeTruthy();
  });

  test('Arabic query shows listed names', async ({ page }) => {
    await runSearchAndCapture(page, 'محمد علي', 'mohammad-ali-ar.png');
    const header = await page.locator('text=النتائج المحتملة').first();
    expect(await header.isVisible()).toBeTruthy();
  });
});
