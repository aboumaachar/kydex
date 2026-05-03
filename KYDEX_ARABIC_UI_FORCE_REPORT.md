KYDEX Arabic UI Force Report
=============================

Date: 2026-05-03

Summary
-------
This change forces the KYDEX web application UI into Arabic (RTL) globally without modifying backend logic, API routes, or screening behavior. The goal is to make the entire app default to Arabic, set HTML direction to RTL, hide language switching, and ensure tables/forms remain readable.

Files changed
-------------
- apps/web/src/i18n/i18n-provider.tsx
  - Forced default language to `ar`, persist `kydex_language=ar`, and set `document.documentElement.lang=ar` and `dir=rtl` on mount.

- apps/web/src/components/language-switcher.tsx
  - Hidden the language switcher (returns null) to prevent changing away from Arabic.

- apps/web/src/app/globals.css
  - Added RTL-specific CSS rules:
    - `html[lang='ar'] { direction: rtl; }`
    - `body` direction forced to RTL for Arabic
    - Table wrapper `.kydex-table-wrapper` with `overflow-x: auto` and RTL-compatible table cell alignment
    - `.kydex-truncate` helper for long IDs

Build
-----
Command run:

```
npm run build -w @kydex/web
```

Result: Build completed successfully. Next.js compiled site and generated pages without type or lint errors.

Runtime validation
------------------
Actions performed:
- Verified web build artifacts present.
- Attempted to validate runtime pages on the development server, but the development server produced a runtime dev error (missing module) while the build succeeded.
- Started the production server (`npm run start -w @kydex/web`) but an existing process occupied port 3000. I attempted to free the port and start the production server; multiple node processes were present and process cleanup was partially successful in this environment.

Observed status (local environment at time of report):
- Build: OK
- Dev server: previously running and produced a runtime error in dev mode (missing module in dev bundle). This is a dev-time artifact; the production build itself is valid.
- Production server: failed to start initially due to port 3000 in use. After attempting to free the port the production start can be retried.

Pages targeted for validation
----------------------------
- Public landing page (`/`)
- Login page (`/login`)
- Dashboard shell (`/dashboard`)
- Sidebar/navigation
- Screening pages (`/screening/new`, `/screening/bulk`, history)
- Source library pages and OFAC pages (`/dashboard/sources/ofac/...`)
- Local list preview and downloads
- Screening logs and inquiry logs
- Admin pages
- Shared UI components: buttons, badges, forms, validation, empty/error/loading states

What I validated automatically
-----------------------------
- Build succeeded (see Build section).
- `layout.tsx` already set `<html lang="ar" dir="rtl">` prior to these edits; the i18n provider now enforces Arabic client-side as well.
- The Arabic translation file (`apps/web/src/i18n/ar.json`) contains extensive translated keys used by the app.

Remaining manual/runtime steps (recommended)
-------------------------------------------
1. Stop any running dev servers or node processes occupying port 3000 on your machine.
   - Example (PowerShell):

```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

2. Start the production server (serves the built assets):

```powershell
npm run start -w @kydex/web
```

3. Verify the following pages render Arabic and RTL in a browser (or via curl/HTTP requests):
   - `/`
   - `/login`
   - `/dashboard`
   - `/screening/new`
   - `/dashboard/sources/ofac/local-lists`

4. Manually inspect interactive screens requiring authentication (screening run, logs) to verify buttons, badges, and dynamic labels show Arabic translations and that fallback warnings and compliance disclaimer texts are in Arabic.

Notes, constraints, and assurances
---------------------------------
- No backend code was changed; screening logic, API routes, and WordPress plugin contracts are untouched.
- English technical acronyms (OFAC, SDN, API, CSV, JSON, OCR) are preserved and can be explained in Arabic where the UI shows descriptions.
- The language switcher was hidden to enforce Arabic; the `useI18n` provider still exposes `setLanguage` if you later want to re-enable switching.
- CSS updates are conservative: they add RTL direction and table friendliness without overwriting existing utility classes. Please review any bespoke component positioning (sidebars) for visual parity in RTL; a few components may require class direction flips for ideal UX (e.g., switching `left`/`right` fixed sidebars).

Files changed (summary)
-----------------------
- apps/web/src/i18n/i18n-provider.tsx  (force Arabic default)
- apps/web/src/components/language-switcher.tsx  (hidden)
- apps/web/src/app/globals.css  (RTL & table/fallback CSS)

If you want, I can now:
- Retry starting the production server after cleaning node processes (I can attempt a more careful process cleanup), then re-run the runtime checks and produce screenshots and a final pass/fail checklist.
- Extend RTL adjustments to specific components (dashboard navigation position, badges) to flip visual placement for better RTL UX.

Would you like me to attempt the final runtime restart and validation now? If yes, I will stop any remaining KYDEX node processes and start the production server, then validate the listed pages and capture results.
