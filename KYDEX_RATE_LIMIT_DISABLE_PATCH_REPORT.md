# KYDEX Rate Limit Disable Patch Report

Date: 2026-05-06

## Objective

Honor `KYDEX_DISABLE_RATE_LIMITS=true` in the API so valid active notary API keys are not blocked by usage quota or rate-limit enforcement, while preserving authentication, revoked/suspended key blocking, audit logging, and transaction logging.

## Root Cause

The production environment variable was present, but the notary quota enforcement path in `apps/api/src/notaries/notary-usage-policy.service.ts` did not read or honor it. That service emitted the observed `HTTP 429` response with `status: rate_limit_exceeded`.

## Changes Applied

### 1. Added shared helper

Created `apps/api/src/notaries/rate-limits-disabled.ts`:

```ts
export function rateLimitsDisabled(): boolean {
  return process.env.KYDEX_DISABLE_RATE_LIMITS === 'true' || process.env.KYDEX_DISABLE_RATE_LIMITS === '1';
}
```

### 2. Bypassed quota blocking only

Updated `apps/api/src/notaries/notary-usage-policy.service.ts` so `enforceMembershipAndRateLimit()`:

- still runs membership validation
- still initializes billing window metadata
- returns early when rate limits are disabled
- skips all monthly/daily quota and `rate_limit_exceeded` checks only when the env flag is enabled

This preserves:

- invalid key rejection
- revoked key rejection
- suspended key rejection
- membership/auth checks
- downstream audit and transaction logging
- usage counter increments after successful searches

### 3. Exposed admin status

Updated `apps/api/src/notaries/notary-admin.service.ts` so admin summary responses include:

```json
{
  "rateLimits": {
    "disabled": true,
    "message": "Rate limits disabled by environment."
  }
}
```

Added to:

- `usageSummary()`
- `monitoringSummary()`

## Files Changed

- `apps/api/src/notaries/rate-limits-disabled.ts`
- `apps/api/src/notaries/notary-usage-policy.service.ts`
- `apps/api/src/notaries/notary-admin.service.ts`
- `KYDEX_RATE_LIMIT_DISABLE_PATCH_REPORT.md`

## Expected Runtime Behavior

When `KYDEX_DISABLE_RATE_LIMITS=true` or `KYDEX_DISABLE_RATE_LIMITS=1`:

- valid active notary API keys continue through search flow even above monthly or daily limits
- API no longer returns `429 rate_limit_exceeded` from notary quota enforcement
- usage counters may continue incrementing
- admin summaries can report that rate limits are disabled by environment

When the flag is not enabled:

- existing quota enforcement remains unchanged

## Validation Performed

Successful local validation:

```bash
cd C:/kydex/apps/api
npm run build
```

Result:

- TypeScript build completed successfully for `@kydex/api`.

Note:

- `npm run build -w @kydex/api` did not resolve correctly in the current shell session even though the workspace manifest declares `@kydex/api`. The package-local build was used to validate the patch directly.

Post-deploy validation to run on server:

```bash
pm2 env 51 | grep KYDEX_DISABLE_RATE_LIMITS
```

Sandra verification request:

```bash
curl -i -b /tmp/sandra-cookies.txt \
  -H "Content-Type: application/json" \
  -X POST https://kydex.me/sandra/api/kydex-search.php \
  --data '{"query":"محمد","searchType":"mixed","sourceScope":"local"}'
```

Expected result:

- `HTTP 200`
- not `HTTP 429`