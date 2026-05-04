# KYDEX Admin Navigation Discoverability Report

Date: 2026-05-04
Workspace: c:\kydex

## Objective
Improve production feature discoverability by exposing enhanced admin capabilities in Arabic navigation and dashboard flow, without backend changes.

## Scope Completed
- Updated authenticated navigation to clearly expose admin routes for admin roles.
- Updated dashboard landing page to show explicit management cards and source links.
- Aligned dashboard side-nav labels and IA to Arabic admin/source language.
- Kept existing routes and backend logic intact.

## Files Updated
- apps/web/src/components/auth-shell.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/components/dashboard-nav.tsx

## What Changed

### 1) Authenticated Main Navigation (Arabic + Discoverability)
File: apps/web/src/components/auth-shell.tsx

- Added explicit primary links:
  - فحص جديد -> /screening/new
  - السجلات -> /dashboard/screening/logs
  - المصادر -> /dashboard/sources
  - الحالات -> /cases
- Added visible admin entry badge/button:
  - الإدارة -> /admin/system-health
- Added an admin menu block (shown only for admin roles) with:
  - المستخدمون -> /admin/users
  - كتاب العدل ومفاتيح API -> /dashboard/admin/notaries
  - مصادر البيانات -> /admin/data-sources
  - سجلات التدقيق -> /admin/audit-logs
  - صحة النظام -> /admin/system-health
  - مراقبة النظام -> /dashboard/admin/monitoring

### 2) Role-based Visibility
File: apps/web/src/components/auth-shell.tsx

- Added role detection from local session user (`getStoredUser()`), then admin visibility gate:
  - admin roles: `SUPER_ADMIN`, `COUNCIL_ADMIN`, `ADMIN`
- Admin links are hidden for non-admin users.

### 3) Dashboard Landing Cards (Arabic + Actionable)
File: apps/web/src/app/dashboard/page.tsx

- Updated dashboard hero text to emphasize management access discoverability.
- Added/updated visible cards:
  - فحص جديد -> /screening/new
  - سجلات الفحص -> /dashboard/screening/logs
  - مصادر البيانات -> /admin/data-sources
- Added admin-only cards:
  - المستخدمون -> /admin/users
  - كتاب العدل ومفاتيح API -> /dashboard/admin/notaries
  - سجلات التدقيق -> /admin/audit-logs
- Added explicit source surface links:
  - /dashboard/sources
  - /dashboard/sources/ofac
  - /dashboard/sources/ofac/local-lists
  - /dashboard/sources/ofac/downloads

### 4) Side Navigation IA Alignment (Arabic)
File: apps/web/src/components/dashboard-nav.tsx

- Renamed groups and links to Arabic IA labels to match admin/source language.
- Included admin route labels matching discoverability objective.
- No route removals; all links point to existing known paths.

## Security / Safety Constraints Check
- Arabic RTL preserved.
- No credentials added or exposed.
- No backend logic changed.
- No route removals.
- Existing screening/source/admin paths preserved.

## Build Validation
Command run:
- `npm run build -w @kydex/web`

Result:
- Build successful.
- Type/lint and page generation completed.

## Runtime Verification Notes
- Current public production still reflects pre-change nav until deployment is performed.
- After deployment, verify these pages from main dashboard/nav flow:
  - /dashboard
  - /admin/users
  - /admin/data-sources
  - /admin/audit-logs
  - /dashboard/admin/notaries

## Deployment Commands
Local git:
```powershell
cd C:\kydex
git add .
git commit -m "Expose KYDEX admin features in Arabic navigation"
git push origin main
```

Server:
```bash
cd /home/kydex/apps/kydex-notary/current
git fetch origin
git pull --ff-only origin main
npm install
npm run build -w @kydex/web
pm2 restart kydex-web --update-env
pm2 save
```

Public URL checks:
```bash
curl -I https://kydex.me/dashboard
curl -I https://kydex.me/admin/users
curl -I https://kydex.me/admin/data-sources
curl -I https://kydex.me/admin/audit-logs
curl -I https://kydex.me/dashboard/admin/notaries
```

## Outcome
Navigation discoverability issue is fixed in code: admin capabilities are now explicit in Arabic navigation and dashboard cards, with role-based visibility for admin users.
