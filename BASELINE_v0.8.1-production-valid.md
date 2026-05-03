# BASELINE v0.8.1-production-valid

Version: v0.8.1-production-valid
Certification command: npm run production:certify
Certification date: 2026-04-26

Certification state:
- Signing Mode: STRICT
- Signing Key Source: DEPLOYMENT_CERT_SIGNING_KEY
- Production Valid: TRUE
- Certificate ID: kydex-prod-2026-04-26T07-13-19-155Z

Certificate artifacts:
- Certificate: .snapshots/production-certificates/2026-04-26T07-13-19-155Z/DEPLOYMENT_CERTIFICATE.md
- Payload: .snapshots/production-certificates/2026-04-26T07-13-19-155Z/deployment-certificate.payload.json
- Latest Certificate: .snapshots/production-certificates/LATEST_DEPLOYMENT_CERTIFICATE.md
- Latest Payload: .snapshots/production-certificates/LATEST_DEPLOYMENT_CERTIFICATE.payload.json

Validated gates:
- npm run build -w @kydex/api
- npm run build -w @kydex/web
- npm run test:e2e -w @kydex/api
- npm run source:verify
- npm run smoke
- npm run production:certify

Production trust status:
- Certification pipeline emits live gate logging with start, completion, duration, and exit code.
- Gate timeouts are enforced and written as FAIL certificates.
- Silent certification hangs are eliminated.

Operational note:
- The strict signing key used for this certification was provided at runtime through DEPLOYMENT_CERT_SIGNING_KEY and must be stored in the deployment secret store for repeatable production-valid certification.

Verdict:
KYDEX is now production-valid at the certification layer. The platform is functionally complete, technically defensible, and now externally defensible at the certificate-signing boundary.