# WEB LIVE TEST REPORT

Date: 2026-04-25
Environment: local Windows, API http://localhost:4000, Web http://localhost:3000

## Closure Evidence (Final)
- screenshotsCreated: 3 PNG files
- screenshotDirectory: .snapshots/screenshots
- buildWeb: PASS
- preflightStatus: ok
- smokeStatus: ok
- closureStatus: PASS

## Scope
- Validate new web route for document extraction.
- Validate admin source sync screen behavior.
- Confirm build and type checks for web app.

## Commands Executed
- npm run build -w @kydex/web
- npm run dev:web
- npx --yes playwright@1.59.1 install chromium
- npx --yes playwright@1.59.1 screenshot http://localhost:3000/login .snapshots/screenshots/01-login.png
- npx --yes playwright@1.59.1 screenshot http://localhost:3000/admin/data-sources .snapshots/screenshots/02-admin-data-sources.png
- npx --yes playwright@1.59.1 screenshot http://localhost:3000/screening/document-extraction .snapshots/screenshots/03-document-extraction.png

## Results
1. Web build passed successfully.
2. Route generation includes:
- /admin/data-sources
- /screening/document-extraction
3. Development server started successfully on port 3000.

## UI Coverage Performed
1. Login page reachable at /login.
2. Admin data sources page reachable at /admin/data-sources.
3. Document extraction page reachable at /screening/document-extraction.
4. Navigation links added to:
- authenticated shell top navigation
- dashboard quick action card

## Screenshot Evidence
- Expected directory: .snapshots/screenshots
- Current state: directory contains PNG artifacts.
- Files:
	- 01-login.png (258811 bytes)
	- 02-admin-data-sources.png (245219 bytes)
	- 03-document-extraction.png (197395 bytes)
- Last capture time window: 2026-04-25 10:28 local

## Bugs / Risks Found
1. No functional UI runtime errors were observed in startup/build logs for tested routes.

## Recommended Follow-up
1. Keep a dedicated non-restarting API/web process during long validation batches to avoid intermittent transport disconnects.
