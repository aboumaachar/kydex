# BASELINE v0.8.0-production-certifiable

Version: v0.8.0-production-certifiable
Certification command: npm run production:certify
Strict signing: required for production

Required env:
- DEPLOYMENT_CERT_STRICT_SIGNING=true
- DEPLOYMENT_CERT_SIGNING_KEY=<32+ chars>

Latest artifacts:
- LATEST_DEPLOYMENT_CERTIFICATE.md
- LATEST_DEPLOYMENT_CERTIFICATE.payload.json

Production validity:
- NON_STRICT = demo/dev only
- STRICT = production-valid

Mandatory architecture gates:
- npm run architecture:verify
- npm run source:verify

Certification validity rule:
Production certification is invalid unless architecture:verify and source:verify both pass.

Verdict:
KYDEX is now production-certifiable when strict signing is enabled and all gates pass, including architecture/source verification.
Notary Council online launch still requires final UAT/signoff, but the technical production gate is now credible.
