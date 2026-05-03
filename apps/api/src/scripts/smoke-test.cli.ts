import { config as loadEnv } from 'dotenv';
import { unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import request from 'supertest';

loadEnv({ path: resolve(process.cwd(), '../../.env'), override: true });
loadEnv({ path: resolve(process.cwd(), '.env'), override: true });

type StepResult = {
  step: string;
  ok: boolean;
  status?: number;
  details?: Record<string, unknown>;
  error?: string;
};

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const base = `${apiBaseUrl.replace(/\/$/, '')}/api/v1`;
  const email = process.env.SMOKE_TEST_EMAIL;
  const password = process.env.SMOKE_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error('SMOKE_TEST_EMAIL and SMOKE_TEST_PASSWORD must be configured');
  }

  const steps: StepResult[] = [];
  const smokeSourceCode = `SMOKE_LOCAL_${Date.now()}`;
  const smokeSourceName = 'Smoke Test Local Source';

  try {
    const loginResponse = await requestJson(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    steps.push({ step: 'POST /auth/login', ok: loginResponse.status === 200, status: loginResponse.status });
    if (loginResponse.status !== 200) {
      throw new Error('Login failed');
    }

    const loginBody = loginResponse.body as { accessToken?: string };
    const token = loginBody.accessToken;
    if (!token) {
      throw new Error('Missing access token in login response');
    }

    const authHeaders = { authorization: `Bearer ${token}` };

    const tempCsvPath = resolve(tmpdir(), `kydex-smoke-${Date.now()}.csv`);
    writeFileSync(
      tempCsvPath,
      'name,documentNumber,nationality,dateOfBirth\nMohammed Ali,123456,LB,1990-01-01\n',
      'utf-8',
    );

    const uploadResponse = await request(apiBaseUrl.replace(/\/$/, ''))
      .post('/api/v1/data-sources/upload')
      .set('Authorization', authHeaders.authorization)
      .field('code', smokeSourceCode)
      .field('name', smokeSourceName)
      .field('type', 'LOCAL')
      .attach('file', tempCsvPath);
    unlinkSync(tempCsvPath);
    const uploadBody = uploadResponse.body as { versionId?: string } | null;
    steps.push({
      step: 'POST /data-sources/upload',
      ok: uploadResponse.status === 201,
      status: uploadResponse.status,
      details: {
        versionId: uploadBody?.versionId ?? null,
        response: uploadBody,
      },
    });
    const sessionUser = (loginBody as { user?: { id?: string; role?: string } }).user;
    const actorId = sessionUser?.id;
    const actorRole = sessionUser?.role;

    const screenResponse = await requestJson(`${base}/screen`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Mohammed Ali',
        documentNumber: '123456',
        nationality: 'LB',
        dateOfBirth: '1990-01-01',
        sources: [smokeSourceCode],
      }),
    });
    const screenBody = screenResponse.body as {
      caseId?: string;
      caseStatus?: string;
      riskLevel?: string;
      requiresEscalation?: boolean;
    };
    steps.push({
      step: 'POST /screen',
      ok: screenResponse.status === 201,
      status: screenResponse.status,
      details: {
        caseId: screenBody.caseId ?? null,
        riskLevel: screenBody.riskLevel ?? null,
        caseStatus: screenBody.caseStatus ?? null,
        requiresEscalation: screenBody.requiresEscalation ?? null,
      },
    });

    type ReviewCase = {
      id?: string;
      caseId?: string;
      status?: string;
      riskLevel?: string;
      assignedReviewerId?: string | null;
    };

    let resolvedCase: ReviewCase | undefined;
    let caseSource = 'screen';

    if (screenBody.caseId) {
      const caseDetailResponse = await requestJson(`${base}/cases/${screenBody.caseId}`, {
        method: 'GET',
        headers: authHeaders,
      });
      if (caseDetailResponse.status === 200 && caseDetailResponse.body) {
        resolvedCase = caseDetailResponse.body as ReviewCase;
      }
    }

    if (!resolvedCase?.id && !resolvedCase?.caseId) {
      const reviewQueueResponse = await requestJson(`${base}/cases/review-queue`, {
        method: 'GET',
        headers: authHeaders,
      });
      const reviewBody = Array.isArray(reviewQueueResponse.body)
        ? (reviewQueueResponse.body as ReviewCase[])
        : [];
      steps.push({
        step: 'GET /cases/review-queue',
        ok: reviewQueueResponse.status === 200,
        status: reviewQueueResponse.status,
        details: { queueSize: reviewBody.length },
      });

      const candidates = reviewBody
        .filter((entry) => entry.riskLevel === 'CRITICAL' || entry.riskLevel === 'HIGH')
        .sort((a, b) => reviewQueueRank(a) - reviewQueueRank(b));
      resolvedCase = candidates[0];
      caseSource = 'review-queue';
    }

    const caseId = resolvedCase?.id ?? resolvedCase?.caseId;
    const caseRisk = resolvedCase?.riskLevel ?? screenBody.riskLevel ?? null;
    const caseStatus = resolvedCase?.status ?? screenBody.caseStatus ?? null;

    steps.push({
      step: 'resolve-reviewable-case',
      ok: !!caseId,
      details: {
        caseId: caseId ?? null,
        riskLevel: caseRisk,
        status: caseStatus,
        source: caseSource,
        assignedReviewerId: resolvedCase?.assignedReviewerId ?? null,
      },
      error: caseId ? undefined : 'No CRITICAL/HIGH reviewable case available after /screen + review-queue lookup',
    });

    if (caseId) {
      if (caseRisk === 'HIGH' && !resolvedCase?.assignedReviewerId && actorId) {
        const assignResponse = await requestJson(`${base}/cases/${caseId}/assign-reviewer`, {
          method: 'POST',
          headers: { ...authHeaders, 'content-type': 'application/json' },
          body: JSON.stringify({ reviewerId: actorId, notes: 'Smoke test self-assignment' }),
        });
        steps.push({
          step: 'POST /cases/:id/assign-reviewer',
          ok: assignResponse.status === 200 || assignResponse.status === 201,
          status: assignResponse.status,
        });
      }

      const evidenceResponse = await requestJson(`${base}/cases/${caseId}/evidence-package`, {
        method: 'POST',
        headers: authHeaders,
      });
      const evidenceBody = (evidenceResponse.body ?? {}) as {
        evidencePackageId?: string;
        id?: string;
      };
      steps.push({
        step: 'POST /cases/:id/evidence-package',
        ok: evidenceResponse.status === 201,
        status: evidenceResponse.status,
        details: {
          screenedName: 'Mohammed Ali',
          riskLevel: caseRisk,
          caseId,
          caseStatus,
          evidencePackageId: evidenceBody.evidencePackageId ?? evidenceBody.id ?? null,
          roleUsed: actorRole ?? null,
        },
      });
    } else {
      steps.push({
        step: 'POST /cases/:id/evidence-package',
        ok: false,
        error: 'No reviewable caseId available for evidence package generation',
      });
    }

    const bulkResponse = await requestJson(`${base}/bulk-screen`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify({
        records: [
          {
            fullName: 'Mohammed Ali',
            documentNumber: '123456',
            nationality: 'LB',
            dateOfBirth: '1990-01-01',
          },
        ],
        sources: [smokeSourceCode],
      }),
    });
    const bulkBody = bulkResponse.body as { bulkJobId?: string };
    steps.push({
      step: 'POST /bulk-screen',
      ok: bulkResponse.status === 201,
      status: bulkResponse.status,
      details: { bulkJobId: bulkBody.bulkJobId ?? null },
    });

    if (bulkBody.bulkJobId) {
      await wait(1000);
      const bulkStatusResponse = await requestJson(`${base}/bulk-screen/${bulkBody.bulkJobId}`, {
        method: 'GET',
        headers: authHeaders,
      });
      const bulkStatusBody = bulkStatusResponse.body as { status?: string };
      steps.push({
        step: 'GET /bulk-screen/:id',
        ok: bulkStatusResponse.status === 200,
        status: bulkStatusResponse.status,
        details: { state: bulkStatusBody.status ?? null },
      });
    } else {
      steps.push({
        step: 'GET /bulk-screen/:id',
        ok: false,
        error: 'No bulk job id available for status check',
      });
    }
  } catch (error) {
    steps.push({
      step: 'smoke-runner',
      ok: false,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  const failed = steps.filter((step) => !step.ok);
  const result = {
    status: failed.length === 0 ? 'ok' : 'failed',
    steps,
    failedCount: failed.length,
    timestamp: new Date().toISOString(),
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const body = await safeJson(response);
  return { status: response.status, body };
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type ReviewCaseRanked = {
  status?: string;
  riskLevel?: string;
};

function reviewQueueRank(entry: ReviewCaseRanked): number {
  let risk = 2;
  if (entry.riskLevel === 'CRITICAL') {
    risk = 0;
  } else if (entry.riskLevel === 'HIGH') {
    risk = 1;
  }

  let status = 2;
  if (entry.status === 'ESCALATED_INTERNALLY' || entry.status === 'SIC_PACKAGE_PREPARED') {
    status = 0;
  } else if (entry.status === 'NEEDS_REVIEW') {
    status = 1;
  }

  return risk * 10 + status;
}

main();