# SECURITY_CONTROLS

## Authentication Controls
- Refresh token rotation is active on token refresh.
- Token expiry enforcement is active via access/refresh TTL settings.
- Account lockout enforced after repeated failed logins (configurable).
- Password reset flow implemented with short-lived reset token.
- Privileged role 2FA enforcement toggle is available via REQUIRE_2FA_FOR_PRIVILEGED.

## RBAC Controls
Route protection is role-scoped for:
- SUPER_ADMIN
- COUNCIL_ADMIN
- COMPLIANCE_OFFICER
- NOTARY
- API_CLIENT

## API Security Controls
- Rate limiting via Nest throttler.
- CORS production allowlist via CORS_ORIGIN_WHITELIST.
- Request body size limit via API_BODY_LIMIT.
- Upload file size limit via MAX_UPLOAD_BYTES.
- Upload type validation for watchlist and document endpoints.

## Error Handling
- Validation and sanitization are global.
- API errors are standardized through DTO validation and guarded controller checks.

## Monitoring-Security Link
Failed login events are logged as audit actions and available for alerting.
