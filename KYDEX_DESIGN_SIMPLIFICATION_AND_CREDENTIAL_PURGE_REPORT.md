# KYDEX Design Simplification And Credential Purge Report

## Objective

Execute the simplification plan from `KYDEX_DESIGN_SIMPLIFICATION_MAP.md` by:

- removing visible credentials from the browser UI,
- reducing decorative operational-shell copy,
- making the product more search-first and Arabic-first,
- preserving the real authentication and screening flows.

## Implemented Changes

### 1. Public landing simplified

Updated the public landing page to a compact Arabic-first presentation focused on one action: sign in and start screening.

Changed:

- removed workflow-spine / pricing / trust-pillar marketing sections,
- replaced the hero with a short Arabic explanation of the screening product,
- kept only direct CTAs: sign in and request access,
- added a short three-step explanation and a decision-support disclaimer.

File:

- `apps/web/src/app/page.tsx`

### 2. Login credential exposure removed

Updated the login page to remove prefilled credentials from the rendered UI.

Changed:

- removed default values for email and password inputs,
- replaced the decorative shell copy with a plain Arabic login form,
- preserved real API-backed authentication,
- redirected successful login to `/screening/new` instead of the old dashboard shell.

File:

- `apps/web/src/app/login/page.tsx`

### 3. Public shell translated and reduced

Simplified public header/footer content so the unauthenticated experience no longer reads like an internal operations console.

Changed:

- Arabic public navigation labels,
- simpler KYDEX product labeling,
- shorter compliance disclaimer in footer,
- removed unnecessary public-shell marketing language.

Files:

- `apps/web/src/components/public-header.tsx`
- `apps/web/src/components/public-footer.tsx`

### 4. Authenticated shell redirected to screening-first flow

Simplified the authenticated shell and made screening the primary destination.

Changed:

- authenticated users visiting public routes now redirect to `/screening/new`,
- compact Arabic top navigation for the key working routes,
- simplified branding and removed decorative “operations shell” language,
- preserved the existing session/auth logic.

File:

- `apps/web/src/components/auth-shell.tsx`

### 5. Dashboard simplified

Replaced the previous decorative dashboard overview with a short Arabic summary and direct links to the main work areas.

Changed:

- removed the large “governed operations / workflow spine” presentation,
- kept only quick actions and a small operational summary,
- aligned visual treatment with the simplified landing/login surfaces.

File:

- `apps/web/src/app/dashboard/page.tsx`

### 6. Source pages moved onto the same lighter shell

Simplified the shared dashboard shell and translated the main source overview pages so they no longer feel like a separate dark technical console.

Changed:

- removed the sidebar dependency from the shared dashboard shell,
- shifted shared dashboard cards, status pills, and action buttons to the lighter simplified theme,
- translated the main `/dashboard/sources` and `/dashboard/sources/ofac` pages into Arabic-first copy.

Files:

- `apps/web/src/app/dashboard/_components/dashboard-shell.tsx`
- `apps/web/src/app/dashboard/sources/page.tsx`
- `apps/web/src/app/dashboard/sources/ofac/page.tsx`

## Credential Purge Result

Visible browser credentials were removed from the UI-facing source.

Confirmed removed from `apps/web/src`:

- `admin@kydex.local`
- `KydexPass123!`

Note:

- credentials may still exist in non-UI development/test locations such as seed data or E2E test files, but they are no longer rendered by the login UI.

## Validation Performed

### Static validation

- targeted frontend error checks passed for all edited files,
- `npm run build -w @kydex/web` passed successfully.

### Live runtime validation

Validated in the browser on `http://localhost:3000`:

- `/` renders the simplified Arabic landing page,
- `/login` renders blank login inputs with no visible seeded credentials,
- successful login redirects to `/screening/new`,
- `/screening/new` renders the search-first authenticated experience,
- `/dashboard` renders the simplified Arabic dashboard,
- `/dashboard/sources` renders the lighter simplified source overview.

### Environment note

The provided VS Code task `Launch KYDEX Web Stable 3000` is currently misquoted and fails before launch in PowerShell. For runtime validation, the web server was started directly with the equivalent command in a terminal:

`cmd /c "set NODE_OPTIONS=--max-old-space-size=4096&& npm run dev -w @kydex/web -- -p 3000"`

## Outcome

The visible KYDEX browser experience is now materially simpler, Arabic-first, and centered on starting a screening workflow rather than presenting a decorative operational shell. Visible seeded credentials were removed from the rendered login experience without changing the underlying authentication/session behavior.