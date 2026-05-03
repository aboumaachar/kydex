# KYDEX Notary Plugin Overview

## Integration Model

- WordPress plugin calls KYDEX API only
- Plugin does not call OFAC directly
- Notary key is sent server-side from trusted integration flow

## Supported Operations

- Manual screening
- Image/OCR screening
- Audit lookup
- Status and source tooling (as enabled by feature flags)

## Security Model

- Notary key validation in KYDEX guard
- WordPress site allow-list enforcement
- Membership and plan enforcement before screening
- Failed-auth logging and key abuse controls

## Operational Expectations

- Plugin must pass x-kydex-notary-key header
- Plugin should pass x-kydex-wordpress-site for allow-list checks
- Image endpoint should post multipart field name: file
