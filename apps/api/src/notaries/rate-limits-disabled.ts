export function rateLimitsDisabled(): boolean {
  return process.env.KYDEX_DISABLE_RATE_LIMITS === 'true' || process.env.KYDEX_DISABLE_RATE_LIMITS === '1';
}