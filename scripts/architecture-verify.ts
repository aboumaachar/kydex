import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

type Violation = {
  rule: string;
  detail: string;
};

type VerificationOutput = {
  status: 'ok' | 'failed';
  files: string[];
  checks: Array<{
    name: string;
    ok: boolean;
    detail: string;
  }>;
  violationCount: number;
  violations: Violation[];
};

function main() {
  const screeningRoot = resolve(process.cwd(), 'apps', 'api', 'src', 'screening');
  const screeningServicePath = resolve(screeningRoot, 'screening.service.ts');
  const screeningFiles = collectTsFiles(screeningRoot);
  const screeningServiceContent = readFileSync(screeningServicePath, 'utf-8');

  const checks = [
    {
      name: 'has_resolveScreeningSources',
      ok: /private\s+async\s+resolveScreeningSources\(/.test(screeningServiceContent),
      detail: 'resolveScreeningSources() must exist',
    },
    {
      name: 'has_getActiveVersionOrFail',
      ok: /private\s+async\s+getActiveVersionOrFail\(/.test(screeningServiceContent),
      detail: 'getActiveVersionOrFail() must exist',
    },
    {
      name: 'has_assertLocalOnlyScreeningContext',
      ok: /private\s+assertLocalOnlyScreeningContext\(/.test(screeningServiceContent),
      detail: 'assertLocalOnlyScreeningContext() must exist',
    },
    {
      name: 'has_screen_local_only_audit',
      ok: /action:\s*'SCREEN_LOCAL_ONLY_ENFORCED'/.test(screeningServiceContent),
      detail: 'SCREEN_LOCAL_ONLY_ENFORCED audit log must be written',
    },
  ];

  const bannedPatterns: Array<{ rule: string; pattern: RegExp; allowMatch?: RegExp }> = [
    {
      rule: 'screening module must not import axios',
      pattern: /from\s+['"]axios['"]|require\(['"]axios['"]\)/,
    },
    {
      rule: 'screening module must not import http client',
      pattern: /from\s+['"]node:http['"]|from\s+['"]http['"]|require\(['"]http['"]\)/,
    },
    {
      rule: 'screening module must not import https client',
      pattern: /from\s+['"]node:https['"]|from\s+['"]https['"]|require\(['"]https['"]\)/,
    },
    {
      rule: 'screening module must not call syncOfficialSources',
      pattern: /syncOfficialSources\s*\(/,
    },
    {
      rule: 'screening module must not call fetch',
      pattern: /\bfetch\s*\(/,
    },
    {
      rule: 'screening module must not import official connector service',
      pattern: /from\s+['"].*data-sources\.service['"]|require\(['"].*data-sources\.service['"]\)/,
    },
  ];

  const violations: Violation[] = [];
  for (const filePath of screeningFiles) {
    const content = readFileSync(filePath, 'utf-8');

    for (const entry of bannedPatterns) {
      const match = content.match(entry.pattern);
      if (!match) {
        continue;
      }

      if (entry.allowMatch?.test(match[0])) {
        continue;
      }

      violations.push({
        rule: entry.rule,
        detail: `${filePath}: detected pattern ${match[0]}`,
      });
    }
  }

  for (const check of checks) {
    if (!check.ok) {
      violations.push({
        rule: check.detail,
        detail: `Missing check: ${check.name}`,
      });
    }
  }

  const output: VerificationOutput = {
    status: violations.length === 0 ? 'ok' : 'failed',
    files: screeningFiles,
    checks,
    violationCount: violations.length,
    violations,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));

  if (violations.length > 0) {
    process.exitCode = 1;
  }
}

function collectTsFiles(root: string) {
  const files: string[] = [];
  const entries = readdirSync(root);

  for (const entry of entries) {
    const absolute = resolve(root, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      files.push(...collectTsFiles(absolute));
      continue;
    }

    if (absolute.endsWith('.ts')) {
      files.push(absolute);
    }
  }

  return files;
}

main();
