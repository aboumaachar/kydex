# Phase 5 Legacy KYDEX Quarantine

Date: Thursday, April 30, 2026

Quarantined folders:
- apps/web/src/app/kydex
- apps/web/src/components/kydex

Reason:
These folders belonged to the legacy donor KYDEX subtree.

Current canonical KYDEX routes:
- / = real KYDEX landing page
- /login = real KYDEX login
- /dashboard = real KYDEX dashboard
- /kydex = redirect to /

Important:
Do not restore these folders unless a future audit proves a real dependency exists.
The /kydex redirect must remain in next.config.js.