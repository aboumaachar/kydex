Playwright E2E

Install Playwright and run tests:

1. From repo root (or apps/web), install dependencies:

```bash
npm install
# or to install just Playwright in the web workspace
npm install @playwright/test --workspace=@kydex/web
```

2. (Optional) Install browser binaries:

```bash
npx playwright install --with-deps
```

3. Run tests:

```bash
npm run test:e2e -w @kydex/web
```

Artifacts (screenshots) are written to `apps/web/e2e/artifacts/` by default.
