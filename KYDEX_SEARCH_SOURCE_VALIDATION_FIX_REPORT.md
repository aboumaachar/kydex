Summary: Fixes to ensure UI can show “جميع المصادر” while API receives valid enabled source codes.

Files changed:
- apps/web/src/app/screening/new/page.tsx
  - Map UI placeholder "ALL" to actual enabled source codes before calling the API.
  - Send only active source codes in `sources` payload (fallback to ['OFAC'] if none active).
  - Preserve Arabic search-first UX, reset behavior, advanced collapse, and filters.
- apps/web/src/lib/api.ts
  - (no changes required; existing types already accept aliases)
- apps/api/src/common/pipes/zod-validation.pipe.ts
  - Return structured Arabic validation response with `status: "validation_failed"`, Arabic `message`, `acceptedFields`, and `acceptedSources`.
- apps/api/src/ofac-screening/ofac-screening.service.ts
  - Normalize missing query errors to Arabic structured validation response.
  - Normalize incoming `sources` that include 'ALL' into ['OFAC'] for the OFAC endpoint.

Builds:
- API build: `npm run build -w @kydex/api` — succeeded (tsc).
- Web build: `npm run build -w @kydex/web` — succeeded (Next.js production build).

Runtime tests (against http://localhost:4000):
A) POST /api/v1/screening/search with sources:["OFAC"] — PASSED (201)
  - Payload: {"query":"محمد علي","screeningType":"ofac","source":"dashboard","liveVerify":true,"sources":["OFAC"]}
  - Response: 201, status e.g. "review_required", matches returned.

B) POST ... with sources:["ALL"] — PASSED (201)
  - Payload: sources:["ALL"] normalized server-side; response 201 and results returned.

C) POST ... with { "fullName": "Hassan Ali", "sources": ["ALL"] } — PASSED (201)
  - Query aliasing (fullName → query) worked; results returned.

D) POST ... with invalid input {"query":"","sources":["BAD_SOURCE"]} — FAILED (400) with clear structured error — PASSED
  - Response body:
    {
      "status": "validation_failed",
      "message": "مصدر الفحص غير صالح أو عبارة البحث مفقودة.",
      "acceptedFields": ["query","fullName","subject","name"],
      "acceptedSources": ["ALL","OFAC"]
    }

Notes & rationale:
- Frontend now displays "جميع المصادر" but never sends the literal 'ALL' to API; instead it resolves to the currently ACTIVE data-source codes and falls back to ['OFAC'] if none are active. This preserves UX while keeping the API contract valid.
- Backend already supported normalization for general screening via `resolveScreeningSources`; the OFAC-specific service now defensively converts 'ALL' → ['OFAC'].
- Validation errors are now returned as structured Arabic responses to help the Arabic UI surface friendlier errors.

Runtime validation commands used:
- `curl` and `node -e` with `fetch` (examples used in session). For local manual testing run:

```powershell
# API health
curl http://localhost:4000/api/v1/health

# Example POST (use Node or curl)
node -e "(async()=>{const res=await fetch('http://localhost:4000/api/v1/screening/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:'محمد علي',screeningType:'ofac',source:'dashboard',liveVerify:true,sources:['ALL']})}); console.log(await res.text());})()"
```

Browser validation checklist (manual):
- Open /screening/new
- Confirm input is empty, examples appear below as helper text
- Default source shows "جميع المصادر"
- Run Arabic and English searches — no "Request validation failed" errors
- Confirm filters appear after results
- Click "مسح البيانات" and confirm page resets

Next steps (optional):
- I can start `Launch KYDEX Web` and run the manual browser checks, capturing screenshots and creating `KYDEX_ARABIC_SEARCH_FIRST_UX_REPORT.md` with visual proof. Would you like me to run the web server and perform the browser validation now?

-- End of report
