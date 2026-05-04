# KYDEX Design Simplification Map  
## Search-First Product Redesign + Credential Purge

**Purpose:**  
This document maps the current KYDEX public landing page and dashboard screenshots, identifies what should be removed, and rewrites the product direction into a simpler, search-first Arabic interface.

---

## 1. Core Problem

The current KYDEX UI looks like an internal operations showcase rather than a practical screening tool.

The screenshots show:

- A public landing page overloaded with operational/product language.
- A dashboard shell with too many panels, buttons, route cards, and side navigation items.
- English-heavy copy despite the requirement for Arabic language.
- Visual language that feels decorative and demo-like instead of operationally simple.
- Internal concepts exposed to the user: workflow spine, governed operations, evidence output, Phase guardrails, route-aware shell, operations console, etc.
- Too much emphasis on platform architecture before the user reaches the actual search function.
- Login credentials or demo-access hints must be fully removed from every UI instance.
- The core function — searching a name and reviewing possible matches — is not visually dominant enough.

The product must be rebuilt around one principle:

> **KYDEX is a name-screening engine. The first user action is search. Everything else supports the search result.**

---

## 2. What the User Should Experience

### Public user / visitor

The visitor should immediately understand:

1. KYDEX screens names.
2. KYDEX searches available compliance sources.
3. KYDEX returns potential matches for review.
4. KYDEX does not issue final legal conclusions.
5. Access requires login.

### Authenticated user

The authenticated user should immediately see:

1. A large name-search box.
2. Source selector defaulted to all active sources.
3. Run screening button.
4. Results list after search.
5. Filters after results appear.
6. Decision/audit details below the result list.

---

## 3. Current Screenshot Mapping

## 3.1 Public Landing Page Screenshot

### Current visible structure

The public page currently includes:

- Top navigation: Sign In, Privacy, Legal, About.
- KYDEX brand.
- Large dark hero panel.
- Operational preview card.
- Hero copy: “KYDEX unifies screening, review, and audit evidence in one operational shell.”
- Multiple technical/marketing cards:
  - Cases + Sources + Audit
  - Timeline + Package
  - Live + Batch
- “A single path from source control to case-ready evidence”
- Multiple feature cards:
  - Export Evidence
  - Run Governed Screening
  - Version and Audit
  - Ingest Official Sources
  - Case review and escalation workflows
  - Local dataset search
  - Role-aware interfaces
  - Evidence reports
- Commercial pricing tiers:
  - Enterprise
  - Professional
  - Operator
- Footer with operational boundaries.

### What is wrong

The page is too much like a product pitch deck. It is not focused on the first user need.

The user does not need to read about:

- operational shell,
- workflow spine,
- case-ready evidence,
- role-aware interfaces,
- pricing tiers,
- commercial depth,
- decorative dashboards,
- evidence output terminology,
- operational boundaries,
- internal architecture.

The user needs:

- What does KYDEX do?
- Can I search a name?
- Is access secure?
- What happens after I search?
- How do I login?

### Remove from public landing page

Remove or move to separate hidden/about pages:

- Pricing tiers.
- Enterprise/Professional/Operator cards.
- “Operational preview” visual card.
- “Workflow spine” language.
- “Governed compliance platform” badge.
- “A single path from source control to case-ready evidence” section.
- All feature-grid cards unless reduced to 3 simple steps.
- “Commercial tiers mapped to operational depth.”
- Technical modules: evidence output, screening modes, source control, role-aware interfaces.
- Long product explanations.
- Any login/demo credentials.
- Any seeded account examples.
- Any “visual only / preview” language.
- Anything that sounds like internal implementation rather than user value.

### Keep

Keep only:

- KYDEX brand.
- Sign in button.
- One-sentence product explanation.
- Main CTA.
- Simple 3-step explanation.
- Compliance disclaimer.
- Maybe a compact “request access” button.

---

## 3.2 Dashboard Screenshot

### Current visible structure

The dashboard currently includes:

- KYDEX Governed Operations header.
- “Real session / real routes / visual layer only” label.
- Multiple top nav pills.
- Huge hero section about “dashboard shell.”
- Workflow spine card.
- Control notes / Phase 4 guardrails.
- Operational summary.
- Operational directory.
- Action surface cards.
- Large right-side operations console with many route links.
- Many English labels and technical terms.
- High visual density.
- Search function is not the dominant element.

### What is wrong

The dashboard is acting like a navigation/control-center demo instead of a working screening app.

The user does not need:

- “Dashboard shell for live screening...”
- “Workflow spine.”
- “Phase 4 Guardrails.”
- “Real session / real routes / visual layer only.”
- Long route directory.
- Duplicate side navigation.
- Operations console with numbered route cards.
- Decorative operational cards.
- Dense English technical copy.
- Internal explanation that “visual hierarchy is refreshed.”

### Remove from dashboard

Remove or collapse:

- “Phase 4 Guardrails.”
- “Real session / real routes / visual layer only.”
- “Operations Shell.”
- “Governed Operations.”
- “Workflow Spine.”
- “Control Surface.”
- “Operational Directory.”
- “Action Surface” cards.
- Right-side operations console if it duplicates navigation.
- Decorative route cards with OPEN labels.
- “Public site” boundary box.
- Long dashboard hero.
- Any page section that explains the dashboard instead of helping the user perform screening.

### Keep

Keep a simple authenticated shell:

- KYDEX logo.
- Primary navigation:
  - فحص جديد
  - السجلات
  - المصادر
  - الحالات
  - الإدارة
- User/account menu.
- Logout.
- Main content area.
- Clear page title.
- Search-first panel.

---

## 4. New Public Landing Page Design

## 4.1 Public landing objective

The public landing page should be simple and Arabic-first.

It should not be a dashboard preview.  
It should not expose internal product complexity.  
It should not show credentials.

## 4.2 Recommended public landing layout

### Header

- KYDEX logo
- تسجيل الدخول
- الخصوصية
- الشروط

No demo credentials.

### Hero

**Title:**

> فحص الأسماء عبر KYDEX

**Subtitle:**

> ابحث عن اسم أو جزء من الاسم لمراجعة النتائج المحتملة عبر مصادر الفحص المتاحة.

**Primary CTA:**

> تسجيل الدخول لبدء الفحص

**Secondary CTA:**

> طلب الوصول

### Optional search-style visual

Show a non-functional visual search bar or protected search entry:

> أدخل الاسم الكامل أو جزءاً من الاسم

If user is not logged in, pressing search should redirect to login or request access.

Do not run public unauthenticated screening unless intentionally allowed.

### Three steps

1. **أدخل الاسم**  
   ابدأ بعبارة بحث بسيطة: اسم كامل، اسم عائلة، أو جزء من الاسم.

2. **راجع النتائج المحتملة**  
   تظهر الأسماء القريبة أو المدرجة مع سبب ظهور كل نتيجة.

3. **احفظ أثر التدقيق**  
   يتم حفظ رقم الحالة وسجل الفحص للمراجعة المهنية.

### Disclaimer

> نتائج KYDEX هي مخرجات مساعدة لاتخاذ القرار، ولا تُعد حكماً قانونياً نهائياً. يجب إجراء مراجعة مهنية قبل اتخاذ أي قرار قانوني أو امتثالي.

---

## 5. New Authenticated Dashboard Design

## 5.1 Dashboard default route

After login, the user should not land on a decorative dashboard.

Default route should be:

> `/screening/new`

or the dashboard should immediately show the new screening box.

### Recommended behavior

```text
/login → /screening/new
/dashboard → redirect or simplify to screening overview
```

## 5.2 Authenticated shell

Use a compact Arabic RTL shell:

### Top navigation

- KYDEX
- فحص جديد
- السجلات
- المصادر
- الحالات
- الإدارة
- تسجيل الخروج

No large side operations console by default.

### Page content

First visible section:

> فحص الأسماء

Search box:

> أدخل الاسم الكامل أو جزءاً من الاسم

Controls:

- المصادر: جميع المصادر
- تشغيل الفحص
- مسح البيانات
- خيارات متقدمة

Advanced fields collapsed:

- تاريخ الميلاد
- الجنسية
- رقم المستند
- مرجع العميل
- التحقق المباشر من المصدر

---

## 6. New Screening Result Page Logic

The result page must be results-first.

## 6.1 Result page order

1. Search summary.
2. Potential match list.
3. Filters/refinement.
4. KYDEX decision panel.
5. Decision factors collapsed.
6. Admin technical/debug section collapsed and admin-only.

## 6.2 Search summary

Example:

> نتيجة البحث عن: Ahmad  
> تم العثور على 3 نتائج محتملة تحتاج إلى مراجعة.  
> لم يتم تأكيد أي تطابق نهائي آلياً.

Badges:

- نمط المصدر: تم التحقق المباشر
- المصدر: OFAC SDN
- أعلى درجة تشابه: 67%
- رقم الحالة: [caseId]

## 6.3 Potential match card

Each card should show identity first:

```text
الاسم المدرج:
DIRIYE, Ahmed

الاسم البديل المطابق:
Ahmad'

سبب الظهور:
ظهر هذا الاسم لأن اسماً بديلاً يحتوي على Ahmad بعد التنظيم والتحويل الصوتي.

المصدر:
OFAC SDN

نسخة المصدر:
OFAC-SDN-2026-04-26

درجة التشابه:
67%

مستوى المخاطر:
متوسط

بيانات التحقق:
الجنسية: غير متوفرة
تاريخ الميلاد: غير متوفر
رقم المستند: غير متوفر

الإجراء:
مراجعة يدوية
```

## 6.4 Do not display raw logic first

Hide by default:

- raw JSON,
- weights,
- internal factor codes,
- local source version objects,
- scripts,
- technical IDs except case/audit ID.

Move those under:

> تفاصيل تقنية للمشرف

Only admin users should see this section.

---

## 7. New Source Library Page Logic

The source pages should not feel like engineering dashboards.

Show only practical controls:

### `/dashboard/sources`

- OFAC — مفعّل
- UN — غير مفعّل حالياً
- EU — غير مفعّل حالياً
- مصادر محلية — غير مفعّلة حالياً

For each active source:

- الحالة
- آخر تحديث
- النسخة المحلية
- عدد المدخلات
- زر المعاينة
- زر التنزيل
- زر المزامنة للمشرف

### `/dashboard/sources/ofac/local-lists`

Show:

- معاينة اللائحة المحلية
- اختيار اللائحة: SDN / Consolidated
- اللغة: English / Arabic-normalized / Bilingual
- بحث داخل المعاينة
- تنزيل CSV
- تنزيل JSON

Do not show raw objects or long hashes by default.

---

## 8. Credential Purge Requirements

## 8.1 Must remove from UI

Search and remove visible credentials from:

- landing page,
- login page,
- dashboard,
- help boxes,
- tooltips,
- onboarding cards,
- demo banners,
- release docs,
- public markdown rendered in app.

Remove all visible occurrences of:

- `admin@kydex.local`
- `KydexPass123!`
- demo login,
- demo credentials,
- default admin,
- seeded admin,
- copy credentials,
- test login.

## 8.2 Test/dev credentials

If test credentials are required in isolated test files, they may remain only if:

- not bundled into frontend,
- not displayed in UI,
- not included in production docs,
- clearly marked dev-only.

## 8.3 If credentials were exposed on production

Required action:

1. Rotate production admin password.
2. Invalidate active sessions.
3. Rotate any exposed API keys if applicable.
4. Remove credentials from release package.
5. Document the purge.

---

## 9. Arabic Language Policy

The interface should be Arabic-first and RTL.

Keep only technical acronyms:

- KYDEX
- OFAC
- SDN
- API
- CSV
- JSON
- OCR

Translate all visible UX labels:

| English | Arabic |
|---|---|
| Search | بحث |
| Run Screening | تشغيل الفحص |
| New Screening | فحص جديد |
| Sources | المصادر |
| Logs | السجلات |
| Cases | الحالات |
| Confidence | درجة الثقة |
| Risk Level | مستوى المخاطر |
| Possible Match | تطابق محتمل |
| Review Required | يتطلب مراجعة |
| Live Verified | تم التحقق المباشر |
| Local Fallback | النسخة المحلية الاحتياطية |
| Audit ID | رقم التدقيق |
| Case ID | رقم الحالة |
| Clear Data | مسح البيانات |
| Advanced Options | خيارات متقدمة |

---

## 10. Concrete Removal Checklist

## Public landing page

Remove:

- large operational preview card,
- compliance platform badge if decorative,
- workflow/product architecture grid,
- commercial tier cards,
- long operations copy,
- internal module explanations,
- demo credentials,
- technical implementation copy.

Keep:

- brand,
- short product explanation,
- login/request access CTA,
- 3-step explanation,
- disclaimer.

## Dashboard home

Remove:

- big dashboard hero,
- workflow spine,
- Phase guardrails,
- operational summary cards,
- route-aware shell table,
- large operations console,
- duplicated route links.

Keep:

- compact nav,
- search box,
- recent screenings,
- source health mini-card if useful.

## Screening page

Remove/collapse:

- raw JSON,
- engine weights,
- internal field names,
- excessive source version objects.

Keep visible:

- search,
- candidate names,
- match evidence,
- filters,
- case ID,
- decision summary.

## Source pages

Remove/collapse:

- raw hashes,
- raw version arrays,
- long technical object displays.

Keep visible:

- status,
- preview,
- download,
- sync date,
- local availability.

---

## 11. Implementation Prompt for Claude/Codex

```text
You are working inside C:\kydex.

Objective:
Simplify KYDEX into a search-first Arabic product and remove all visible login/demo credentials.

Problems:
1. The public landing page is overloaded with operational/product/marketing content.
2. The dashboard is overloaded with visual shell cards, route cards, operational labels, and internal guardrails.
3. The core search function is not visually dominant enough.
4. Demo/admin login credentials have appeared in the UI and must be fully removed.
5. The app should be Arabic-first and RTL.
6. The result page should show candidate match names and evidence before decision analysis.

Hard requirements:
- Remove all visible credentials from UI.
- Do not display admin@kydex.local or KydexPass123! anywhere in the browser.
- Rotate credentials if they were ever visible in production.
- Landing page must be simple.
- Dashboard must be search-first.
- Screening result page must be results-first.
- Decision analysis must remain but move below candidate results.
- Raw JSON/debug data must be admin-only and collapsed.
- Keep Arabic UI.
- Keep technical acronyms only where needed.
- Do not break screening, liveVerify, fallback, OCR, WordPress plugin, external API clients, or source library.

Target files to inspect:
- apps/web/src/app/page.tsx
- apps/web/src/app/login/page.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/screening/new/page.tsx
- apps/web/src/components/**
- apps/web/src/lib/api.ts
- docs/release files if rendered or packaged publicly

Tasks:

A. Credential purge
1. Search repo for:
   admin@kydex.local
   KydexPass
   demo credential
   demo login
   default admin
   seeded admin
2. Remove from all UI.
3. Keep only dev/test references if isolated and not rendered.
4. Add report note recommending password rotation.

B. Public landing simplification
1. Replace current landing with:
   - KYDEX brand
   - Arabic headline: فحص الأسماء عبر KYDEX
   - short subtitle
   - CTA: تسجيل الدخول لبدء الفحص
   - CTA: طلب الوصول
   - 3 steps: أدخل الاسم، راجع النتائج، احفظ أثر التدقيق
   - short disclaimer
2. Remove pricing, operational shell, feature grids, technical architecture, and demo content.

C. Login cleanup
1. Empty inputs by default.
2. No credential hints.
3. Arabic labels only.
4. Simple login card.

D. Dashboard simplification
1. Default dashboard should emphasize فحص جديد.
2. Remove decorative operational shell sections.
3. Keep compact nav.
4. Show only:
   - new screening CTA,
   - recent screenings,
   - source health summary,
   - audit/log shortcut.

E. Screening page
1. Keep search-first layout.
2. Results-first after search.
3. Candidate names/evidence before decision.
4. Filters after/around result list.
5. Decision below candidates.
6. Raw JSON hidden and admin-only.

F. Source pages
1. Keep status/preview/download/sync.
2. Collapse raw technical details.

G. Arabic/RTL
1. lang=ar
2. dir=rtl
3. Arabic labels.
4. No low contrast.
5. No page overflow.

Validation:
1. npm run build -w @kydex/web
2. npm run build -w @kydex/api
3. Browser:
   - / has no credentials and is simple Arabic
   - /login has no credentials and empty fields
   - /dashboard is simplified
   - /screening/new is search-first
   - Ahmad search shows candidate names and evidence
   - raw JSON hidden by default
4. DOM text search:
   - no admin@kydex.local
   - no KydexPass
   - no demo credential

Create:
C:\kydex\KYDEX_DESIGN_SIMPLIFICATION_AND_CREDENTIAL_PURGE_REPORT.md
```

---

## 12. Acceptance Criteria

The redesign is accepted only when:

- No credential is visible anywhere in the UI.
- Landing page explains KYDEX in less than one screen.
- Login page has no hints or prefilled values.
- Authenticated dashboard starts from screening, not decoration.
- Search box is the dominant element.
- Results show actual listed names first.
- Every match has visible evidence.
- Decision analysis appears after results.
- Technical/debug data is hidden.
- Arabic RTL is consistent.
- Builds pass.
- Production credentials are rotated if exposure occurred.

---

## 13. Final Product Direction

KYDEX should become:

```text
ابحث عن اسم
→ راجع النتائج المحتملة
→ افهم سبب ظهور كل نتيجة
→ احفظ أثر الفحص
→ صعّد للمراجعة عند الحاجة
```

It should not feel like:

```text
منصة تجريبية مليئة بالبطاقات التقنية والعبارات الداخلية
```

The product must be simpler, safer, and centered on search.
