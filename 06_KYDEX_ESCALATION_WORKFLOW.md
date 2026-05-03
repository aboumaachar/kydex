# KYDEX Escalation Workflow

## 1. Purpose

The escalation workflow turns KYDEX from a basic search tool into a defensible compliance system.

It handles:

- suspected matches
- uncertain matches
- high-risk cases
- audit documentation
- SIC-ready reporting package preparation

## 2. Correct Institutional Structure

KYDEX should not assume automatic direct reporting to the Central Bank.

The proper workflow is:

```txt
Notary
  ↓
Council Compliance Officer
  ↓
Council Review / Audit Committee
  ↓
Official SIC / BDL reporting path, when legally required and authorized
```

The system prepares evidence and documentation.

The authorized human body decides.

## 3. Risk Levels and Actions

| Risk Level | Trigger | Action |
|---|---|---|
| LOW | No meaningful match | Proceed and log |
| MEDIUM | Possible weak/partial match | Require enhanced due diligence note |
| HIGH | Strong probable match | Lock finalization and escalate internally |
| CRITICAL | Exact/near-exact match | Freeze workflow and prepare SIC-ready package |

## 4. Case Statuses

```txt
DRAFT
SCREENED
NEEDS_REVIEW
ESCALATED_INTERNALLY
PENDING_ADDITIONAL_INFORMATION
CLEARED
SIC_PACKAGE_PREPARED
REPORTED_TO_SIC
REJECTED_BLOCKED
CLOSED
```

## 5. Detailed Workflow

### Step 1 — Screening

The notary enters party details and runs screening.

### Step 2 — Classification

KYDEX classifies the risk.

### Step 3 — Automatic Action

- LOW: allow compliance PDF.
- MEDIUM: require user note.
- HIGH: create case.
- CRITICAL: create case + lock transaction.

### Step 4 — Internal Review

Council Compliance Officer reviews:

- match evidence
- uploaded documents
- notary notes
- list source
- list version
- scoring explanation

### Step 5 — Committee Decision

Possible decisions:

```txt
CLEAR
REQUEST_MORE_INFORMATION
ESCALATE_AS_SUSPICIOUS
REJECT_OR_BLOCK
```

### Step 6 — SIC-Ready Package

If escalation is needed, KYDEX creates:

- case summary
- identity details
- transaction details
- screening results
- match reasons
- audit trail
- supporting documents
- reviewer notes

## 6. What KYDEX Must Not Do

KYDEX must not:

- make final legal decisions
- automatically accuse anyone
- automatically report without institutional authorization
- allow users to delete high-risk history
- hide uncertain results

## 7. Compliance PDF Contents

The PDF should include:

- screening ID
- notary user
- timestamp
- party screened
- sources used
- list versions
- result summary
- risk classification
- required action
- disclaimer
