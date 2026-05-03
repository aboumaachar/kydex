# KYDEX Frontend UI Flows

## 1. Frontend Stack

```txt
Next.js
TypeScript
Tailwind
RTL-ready layout
```

## 2. Main Web Areas

```txt
/auth/login
/dashboard
/screening/new
/screening/history
/screening/[id]
/cases
/cases/[id]
/admin/users
/admin/data-sources
/admin/audit-logs
/admin/settings
```

## 3. Notary Flow

### Screen 1 — Login

- email
- password
- 2FA later

### Screen 2 — Dashboard

Show:

- new screening
- recent screenings
- cases needing action
- system data freshness status

### Screen 3 — New Screening

Fields:

- full name
- date of birth
- nationality
- document number
- transaction type
- notes

Button:

```txt
Run Screening
```

### Screen 4 — Results

Show:

- risk level
- matches
- source
- score
- explanation
- list version

Actions:

- proceed
- add due diligence note
- escalate
- generate PDF

### Screen 5 — Compliance PDF

Download PDF with:

- query
- result
- risk level
- source versions
- timestamp
- disclaimer

## 4. Compliance Officer Flow

### Cases List

Filters:

- status
- risk level
- notary
- date
- source

### Case Detail

Show:

- screening details
- matches
- documents
- notes
- full audit trail

Actions:

- clear
- request more information
- escalate internally
- prepare SIC package
- reject/block

## 5. Admin Flow

### User Management

- create user
- assign role
- deactivate user
- reset password

### Data Source Management

- view source status
- upload list
- trigger ingestion
- view versions
- view failures

### Audit Logs

- filter by user/action/date
- export logs

## 6. UX Rules

- Risk levels must be visually clear.
- HIGH/CRITICAL must block unsafe finalization.
- Every action must create audit log.
- Arabic RTL support must be planned from the start.
- Desktop-first layout.
