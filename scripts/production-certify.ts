import { createHash, createHmac } from 'node:crypto';
import { appendFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ChildProcess, spawn, spawnSync } from 'node:child_process';

type GateCommand = {
  name: string;
  command: string;
  timeoutMs: number;
};

type GateResult = {
  name: string;
  command: string;
  timeoutMs: number;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  exitCode: number;
  ok: boolean;
  attempts: number;
  timedOut: boolean;
  stdoutPath: string;
  stderrPath: string;
  notes: string[];
};

type CertificatePayload = {
  certificateVersion: string;
  certificateId: string;
  workspace: string;
  nodeEnv: string;
  signingMode: 'STRICT' | 'NON_STRICT';
  signingKeySource: 'DEPLOYMENT_CERT_SIGNING_KEY' | 'FALLBACK';
  productionValid: boolean;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  command: string;
  overallStatus: 'PASS' | 'FAIL';
  failedCount: number;
  gates: GateResult[];
};

type SigningConfig = {
  signingMode: 'STRICT' | 'NON_STRICT';
  signingKeySource: 'DEPLOYMENT_CERT_SIGNING_KEY' | 'FALLBACK';
  key: string;
  warning?: string;
  precheckFailure?: string;
};

type ManagedApiRuntime = {
  baseUrl: string;
  started: boolean;
  child?: ChildProcess;
  stdoutPath?: string;
  stderrPath?: string;
};

const API_BACKED_GATES = new Set(['smoke', 'source_verify']);

const gateCommands: GateCommand[] = [
  { name: 'api_build', command: 'npm run build -w @kydex/api', timeoutMs: 3 * 60 * 1000 },
  { name: 'web_build', command: 'npm run build -w @kydex/web', timeoutMs: 5 * 60 * 1000 },
  { name: 'i18n_verify', command: 'npm run i18n:verify', timeoutMs: 60 * 1000 },
  { name: 'api_e2e', command: 'npm run test:e2e -w @kydex/api', timeoutMs: 10 * 60 * 1000 },
  { name: 'arabic_validate', command: 'npm run arabic:validate', timeoutMs: 10 * 60 * 1000 },
  { name: 'match_validate', command: 'npm run match:validate', timeoutMs: 8 * 60 * 1000 },
  { name: 'preflight', command: 'npm run preflight', timeoutMs: 2 * 60 * 1000 },
  { name: 'smoke', command: 'npm run smoke', timeoutMs: 3 * 60 * 1000 },
  { name: 'architecture_verify', command: 'npm run architecture:verify', timeoutMs: 2 * 60 * 1000 },
  { name: 'source_verify', command: 'npm run source:verify', timeoutMs: 4 * 60 * 1000 },
  { name: 'security_check', command: 'npm run security:check', timeoutMs: 2 * 60 * 1000 },
  { name: 'backup_test', command: 'npm run backup:test', timeoutMs: 2 * 60 * 1000 },
];

type ShellRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
};

function appendChunk(target: string, chunk: string, maxLength = 16 * 1024 * 1024) {
  if (target.length >= maxLength) {
    return target;
  }

  const remaining = maxLength - target.length;
  return target + chunk.slice(0, remaining);
}

function killChildProcessTree(pid: number) {
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {
      stdio: 'ignore',
      shell: false,
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      // ignore cleanup failures
    }
  }
}

function logGateEvent(message: string) {
  // eslint-disable-next-line no-console
  console.log(`[production:certify] ${message}`);
}

function resolveGateTimeoutMs(gate: GateCommand) {
  const gateKey = gate.name.toUpperCase().replaceAll(/[^A-Z0-9]+/g, '_');
  const gateOverride = Number(process.env[`PRODUCTION_CERT_TIMEOUT_MS_${gateKey}`] ?? '');
  if (Number.isFinite(gateOverride) && gateOverride > 0) {
    return gateOverride;
  }

  const globalOverride = Number(process.env.PRODUCTION_CERT_TIMEOUT_MS ?? '');
  if (Number.isFinite(globalOverride) && globalOverride > 0) {
    return globalOverride;
  }

  return gate.timeoutMs;
}

function runShell(command: string, timeoutMs: number): Promise<ShellRunResult> {
  return new Promise((resolveRun) => {
    const child = spawn(command, {
      shell: true,
      cwd: process.cwd(),
      env: process.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let finished = false;
    let didTimeout = false;

    const finalize = (exitCode: number, timedOut: boolean) => {
      if (finished) {
        return;
      }

      finished = true;
      clearTimeout(timeoutHandle);
      resolveRun({
        stdout,
        stderr,
        exitCode,
        timedOut,
      });
    };

    child.stdout?.on('data', (chunk: Buffer | string) => {
      const text = String(chunk);
      stdout = appendChunk(stdout, text);
      process.stdout.write(text);
    });

    child.stderr?.on('data', (chunk: Buffer | string) => {
      const text = String(chunk);
      stderr = appendChunk(stderr, text);
      process.stderr.write(text);
    });

    child.on('error', (error) => {
      stderr = appendChunk(stderr, `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      finalize(1, didTimeout);
    });

    child.on('close', (code) => {
      finalize(code ?? 1, didTimeout);
    });

    const timeoutHandle = setTimeout(() => {
      didTimeout = true;
      stderr = appendChunk(stderr, `Command timed out after ${timeoutMs}ms\n`);
      killChildProcessTree(child.pid!);
    }, timeoutMs);
  });
}

function shouldRetryWebBuild(stderr: string, stdout: string) {
  const text = `${stdout}\n${stderr}`;
  return (
    text.includes('EPERM') ||
    text.includes('ENOENT') ||
    text.includes('build worker exited with code:') ||
    text.includes(String.raw`.next\trace`) ||
    text.includes(String.raw`.next\cache\webpack`)
  );
}

function resolveGateCommand(gate: GateCommand) {
  if (gate.name !== 'web_build') {
    return gate.command;
  }

  if (process.platform === 'win32') {
    return `set NODE_OPTIONS=--max-old-space-size=4096&& ${gate.command}`;
  }

  return `NODE_OPTIONS=--max-old-space-size=4096 ${gate.command}`;
}

function clearWebBuildCache(notes: string[]) {
  try {
    rmSync(resolve(process.cwd(), 'apps', 'web', '.next'), { recursive: true, force: true });
    notes.push('Cleared apps/web/.next before web build retry.');
  } catch (error) {
    notes.push(`Failed to clear apps/web/.next: ${error instanceof Error ? error.message : 'unknown'}`);
  }
}

function toMdList(items: string[]) {
  return items.map((item) => `- ${item}`).join('\n');
}

function gateNeedsApiRuntime(gate: GateCommand) {
  return API_BACKED_GATES.has(gate.name);
}

function normalizeApiBaseUrl(apiBaseUrl: string) {
  return apiBaseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
}

async function wait(ms: number) {
  await new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function isApiHealthy(apiBaseUrl: string) {
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(`${apiBaseUrl}/api/v1/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function waitForApiHealth(apiBaseUrl: string, timeoutMs: number, child?: ChildProcess) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (child?.exitCode !== null && child?.exitCode !== undefined) {
      throw new Error(`Local API runtime exited early with code ${child.exitCode}.`);
    }

    if (await isApiHealthy(apiBaseUrl)) {
      return;
    }

    await wait(1_000);
  }

  throw new Error(`Timed out waiting for API health endpoint at ${apiBaseUrl}/api/v1/health.`);
}

async function ensureApiRuntime(certDir: string): Promise<ManagedApiRuntime> {
  const baseUrl = normalizeApiBaseUrl(process.env.API_BASE_URL ?? 'http://localhost:4000');

  if (await isApiHealthy(baseUrl)) {
    return {
      baseUrl,
      started: false,
    };
  }

  const stdoutPath = resolve(certDir, 'api_runtime.stdout.log');
  const stderrPath = resolve(certDir, 'api_runtime.stderr.log');
  writeFileSync(stdoutPath, '');
  writeFileSync(stderrPath, '');

  const child = spawn('npm run start -w @kydex/api', {
    shell: true,
    cwd: process.cwd(),
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (chunk: Buffer | string) => {
    appendFileSync(stdoutPath, String(chunk));
  });

  child.stderr?.on('data', (chunk: Buffer | string) => {
    appendFileSync(stderrPath, String(chunk));
  });

  child.on('error', (error) => {
    appendFileSync(
      stderrPath,
      `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
    );
  });

  await waitForApiHealth(baseUrl, 30_000, child);

  return {
    baseUrl,
    started: true,
    child,
    stdoutPath,
    stderrPath,
  };
}

function stopApiRuntime(runtime: ManagedApiRuntime | undefined) {
  if (!runtime?.started || !runtime.child?.pid) {
    return;
  }

  killChildProcessTree(runtime.child.pid);
}

async function executeGate(gate: GateCommand, certDir: string): Promise<GateResult> {
  const notes: string[] = [];
  let attempts = 0;
  let lastStdout = '';
  let lastStderr = '';
  let lastCode = 1;
  let timedOut = false;
  const timeoutMs = resolveGateTimeoutMs(gate);
  const gateCommand = resolveGateCommand(gate);
  const gateStart = Date.now();
  const gateStartedAt = new Date(gateStart).toISOString();

  logGateEvent(`starting ${gate.name}: ${gateCommand} (timeout ${timeoutMs}ms)`);

  while (attempts < 2) {
    attempts += 1;
    const attemptStart = Date.now();
    const run = await runShell(gateCommand, timeoutMs);
    lastStdout = run.stdout ?? '';
    lastStderr = run.stderr ?? '';
    lastCode = run.exitCode;
    timedOut = run.timedOut;

    logGateEvent(
      `completed ${gate.name} attempt ${attempts} in ${Date.now() - attemptStart}ms with exit code ${lastCode}${timedOut ? ' (TIMED OUT)' : ''}`,
    );

    if (timedOut) {
      notes.push(`Command timed out after ${timeoutMs}ms and was terminated.`);
      break;
    }

    if (lastCode === 0) {
      break;
    }

    const retryableWebBuild = gate.name === 'web_build' && attempts === 1 && shouldRetryWebBuild(lastStderr, lastStdout);
    if (!retryableWebBuild) {
      break;
    }

    clearWebBuildCache(notes);
    notes.push('Retrying web build after cache cleanup.');
    logGateEvent(`retrying ${gate.name} after cache cleanup`);
  }

  const gateCompletedAt = new Date().toISOString();
  const gateDuration = Date.now() - gateStart;
  const stdoutPath = resolve(certDir, `${gate.name}.stdout.log`);
  const stderrPath = resolve(certDir, `${gate.name}.stderr.log`);
  writeFileSync(stdoutPath, lastStdout || '(no stdout)\n');
  writeFileSync(stderrPath, lastStderr || '(no stderr)\n');

  return {
    name: gate.name,
    command: gateCommand,
    timeoutMs,
    startedAt: gateStartedAt,
    completedAt: gateCompletedAt,
    durationMs: gateDuration,
    exitCode: lastCode,
    ok: lastCode === 0 && !timedOut,
    attempts,
    timedOut,
    stdoutPath,
    stderrPath,
    notes,
  };
}

function createSigningPrecheckFailureGate(certDir: string, startedAt: string, reason: string): GateResult {
  const precheckPath = resolve(certDir, 'signing-precheck.stderr.log');
  writeFileSync(precheckPath, `${reason}\n`);
  return {
    name: 'signing_precheck',
    command: 'pre-gate signing policy validation',
    timeoutMs: 0,
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: 0,
    exitCode: 1,
    ok: false,
    attempts: 1,
    timedOut: false,
    stdoutPath: precheckPath,
    stderrPath: precheckPath,
    notes: [reason],
  };
}

function createRuntimePreparationFailureGate(
  gate: GateCommand,
  certDir: string,
  startedAt: string,
  reason: string,
): GateResult {
  const stderrPath = resolve(certDir, `${gate.name}.stderr.log`);
  const stdoutPath = resolve(certDir, `${gate.name}.stdout.log`);
  writeFileSync(stdoutPath, '(no stdout)\n');
  writeFileSync(stderrPath, `${reason}\n`);
  return {
    name: gate.name,
    command: gate.command,
    timeoutMs: resolveGateTimeoutMs(gate),
    startedAt,
    completedAt: new Date().toISOString(),
    durationMs: 0,
    exitCode: 1,
    ok: false,
    attempts: 1,
    timedOut: false,
    stdoutPath,
    stderrPath,
    notes: [reason],
  };
}

function resolveSigningConfig(nodeEnv: string): SigningConfig {
  const strictSigning = (process.env.DEPLOYMENT_CERT_STRICT_SIGNING ?? '').toLowerCase() === 'true';
  const explicitKey = (process.env.DEPLOYMENT_CERT_SIGNING_KEY ?? '').trim();
  const explicitStrong = explicitKey.length >= 32;

  if (strictSigning) {
    if (!explicitStrong) {
      return {
        signingMode: 'STRICT',
        signingKeySource: 'DEPLOYMENT_CERT_SIGNING_KEY',
        key: '',
        precheckFailure:
          'Strict signing enabled: DEPLOYMENT_CERT_SIGNING_KEY is required and must be at least 32 characters.',
      };
    }

    return {
      signingMode: 'STRICT',
      signingKeySource: 'DEPLOYMENT_CERT_SIGNING_KEY',
      key: explicitKey,
    };
  }

  if (explicitStrong) {
    return {
      signingMode: 'NON_STRICT',
      signingKeySource: 'DEPLOYMENT_CERT_SIGNING_KEY',
      key: explicitKey,
      warning: 'NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION',
    };
  }

  if (nodeEnv === 'production') {
    return {
      signingMode: 'NON_STRICT',
      signingKeySource: 'FALLBACK',
      key: '',
      warning: 'NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION',
      precheckFailure:
        'Non-strict mode in production cannot use fallback signing keys. Set DEPLOYMENT_CERT_SIGNING_KEY (32+ chars).',
    };
  }

  const fallbackKey =
    process.env.BACKUP_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'kydex-dev-cert-signing-key';

  return {
    signingMode: 'NON_STRICT',
    signingKeySource: 'FALLBACK',
    key: fallbackKey,
    warning: 'NON-STRICT SIGNING MODE - NOT VALID FOR PRODUCTION',
  };
}

function buildCertificateMarkdown(
  payload: CertificatePayload,
  digest: string,
  signature: string,
  warning?: string,
) {
  const gates = payload.gates
    .map((gate) => {
      const notes = gate.notes.length > 0 ? `\nNotes:\n${toMdList(gate.notes)}` : '';
      return [
        `### ${gate.name}`,
        `Status: ${gate.ok ? 'PASS' : 'FAIL'}`,
        `Command: ${gate.command}`,
        `Attempts: ${gate.attempts}`,
        `Exit Code: ${gate.exitCode}`,
        `DurationMs: ${gate.durationMs}`,
        `Stdout: ${gate.stdoutPath}`,
        `Stderr: ${gate.stderrPath}`,
        notes,
      ]
        .filter((line) => line !== '')
        .join('\n');
    })
    .join('\n\n');

  return [
    '# KYDEX Production Deployment Certificate',
    '',
    `Certificate Version: ${payload.certificateVersion}`,
    `Certificate ID: ${payload.certificateId}`,
    `Workspace: ${payload.workspace}`,
    `Node Environment: ${payload.nodeEnv}`,
    `Signing Mode: ${payload.signingMode}`,
    `Signing Key Source: ${payload.signingKeySource}`,
    `Production Valid: ${payload.productionValid}`,
    `Started At: ${payload.startedAt}`,
    `Completed At: ${payload.completedAt}`,
    `DurationMs: ${payload.durationMs}`,
    `Command: ${payload.command}`,
    `Overall Status: ${payload.overallStatus}`,
    `Failed Count: ${payload.failedCount}`,
    ...(warning ? ['', `Warning: ${warning}`] : []),
    '',
    '## Gate Results',
    '',
    gates,
    '',
    '## Signature',
    `Payload SHA256: ${digest}`,
    `HMAC-SHA256 Signature: ${signature}`,
    '',
    payload.overallStatus === 'PASS' ? 'STATUS: CERTIFIED' : 'STATUS: NOT CERTIFIED',
  ].join('\n');
}

async function main() {
  const start = Date.now();
  const startedAt = new Date(start).toISOString();
  const root = process.cwd();
  const stamp = startedAt.replaceAll(':', '-').replaceAll('.', '-');
  const certDir = resolve(root, '.snapshots', 'production-certificates', stamp);
  mkdirSync(certDir, { recursive: true });
  const nodeEnv = process.env.NODE_ENV ?? 'unknown';
  const signingConfig = resolveSigningConfig(nodeEnv);

  const gateResults: GateResult[] = [];
  let apiRuntime: ManagedApiRuntime | undefined;

  try {
    if (signingConfig.precheckFailure) {
      gateResults.push(createSigningPrecheckFailureGate(certDir, startedAt, signingConfig.precheckFailure));
    } else {
      for (const gate of gateCommands) {
        if (gateNeedsApiRuntime(gate) && !apiRuntime) {
          try {
            apiRuntime = await ensureApiRuntime(certDir);
          } catch (error) {
            gateResults.push(
              createRuntimePreparationFailureGate(
                gate,
                certDir,
                new Date().toISOString(),
                `Failed to prepare local API runtime: ${error instanceof Error ? error.message : 'unknown'}`,
              ),
            );
            break;
          }
        }

        const gateResult = await executeGate(gate, certDir);
        if (apiRuntime?.started && gateNeedsApiRuntime(gate)) {
          gateResult.notes.push(
            `Started local API runtime at ${apiRuntime.baseUrl} for HTTP-based certification gates.`,
          );
          if (apiRuntime.stdoutPath) {
            gateResult.notes.push(`API runtime stdout: ${apiRuntime.stdoutPath}`);
          }
          if (apiRuntime.stderrPath) {
            gateResult.notes.push(`API runtime stderr: ${apiRuntime.stderrPath}`);
          }
        }

        gateResults.push(gateResult);
        if (!gateResult.ok) {
          break;
        }
      }
    }
  } finally {
    stopApiRuntime(apiRuntime);
  }

  const completedAt = new Date().toISOString();
  const failedCount = gateResults.filter((gate) => !gate.ok).length;
  const overallStatus: 'PASS' | 'FAIL' = failedCount === 0 ? 'PASS' : 'FAIL';
  const productionValid =
    overallStatus === 'PASS' &&
    signingConfig.signingMode === 'STRICT' &&
    signingConfig.signingKeySource === 'DEPLOYMENT_CERT_SIGNING_KEY';

  const payload: CertificatePayload = {
    certificateVersion: 'v1',
    certificateId: `kydex-prod-${stamp}`,
    workspace: root,
    nodeEnv,
    signingMode: signingConfig.signingMode,
    signingKeySource: signingConfig.signingKeySource,
    productionValid,
    startedAt,
    completedAt,
    durationMs: Date.now() - start,
    command: 'npm run production:certify',
    overallStatus,
    failedCount,
    gates: gateResults,
  };

  const payloadJson = JSON.stringify(payload, null, 2);
  const payloadPath = resolve(certDir, 'deployment-certificate.payload.json');
  writeFileSync(payloadPath, payloadJson);

  const digest = createHash('sha256').update(payloadJson).digest('hex');
  const signature =
    signingConfig.key.length > 0
      ? createHmac('sha256', signingConfig.key).update(payloadJson).digest('hex')
      : 'UNSIGNED_PRECHECK_FAILED';

  const markdown = buildCertificateMarkdown(payload, digest, signature, signingConfig.warning);
  const mdPath = resolve(certDir, 'DEPLOYMENT_CERTIFICATE.md');
  writeFileSync(mdPath, markdown);

  const latestDir = resolve(root, '.snapshots', 'production-certificates');
  const latestPayloadPath = resolve(latestDir, 'LATEST_DEPLOYMENT_CERTIFICATE.payload.json');
  const latestMdPath = resolve(latestDir, 'LATEST_DEPLOYMENT_CERTIFICATE.md');
  writeFileSync(latestPayloadPath, payloadJson);
  writeFileSync(latestMdPath, markdown);

  const summary = {
    status: payload.overallStatus === 'PASS' ? 'certified' : 'failed',
    certificateId: payload.certificateId,
    signingMode: payload.signingMode,
    signingKeySource: payload.signingKeySource,
    productionValid: payload.productionValid,
    payloadPath,
    certificatePath: mdPath,
    latestPayloadPath,
    latestCertificatePath: latestMdPath,
    digest,
    signature,
    failedCount,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

void main();
