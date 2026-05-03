# KYDEX Live Demo Script
## Goal: prove, not explain

## Opening — 20 seconds
Today I will not ask you to trust a slide. I will show you a complete compliance lifecycle and then verify the exported record outside the KYDEX system.

KYDEX is not a search engine. It is a compliance workflow and audit-evidence system for regulated decisions.

---

## Step 1 — Screening
I enter a party name and basic identifiers.

What KYDEX does now is not just a lookup. It screens the party against multiple data sources, applies Arabic-aware matching logic, assigns a risk level, and records exactly which source versions were used.

Point to screen:
- input name
- sources used
- risk score
- match explanation
- list version

Say:
This proves what was screened, when it was screened, and against which data version.

---

## Step 2 — Case Creation
Because this result is HIGH or CRITICAL, KYDEX automatically creates a governed case.

Say:
The user cannot silently proceed. The case moves from detection into controlled review.

Point to:
- case ID
- risk level
- status
- priority
- SLA target

---

## Step 3 — Reviewer Assignment and Lock
Now I assign a reviewer.

Say:
KYDEX locks the case to prevent two reviewers from making conflicting decisions at the same time. If the reviewer becomes inactive, the lock expires and can be reassigned.

Point to:
- reviewer
- lock expiry
- assigned state

---

## Step 4 — Committee Decision
The reviewer records a committee decision.

Say:
A decision is not just a note. It is structured, role-controlled, justified, and written into the case timeline.

Point to:
- decision type
- justification
- actor
- timestamp

---

## Step 5 — Evidence Package
Now I generate the evidence package.

Say:
KYDEX captures the screening input, matches, list versions, reviewer actions, decision, and audit trail into one evidence package.

Point to:
- exportHash
- exportSignature
- final authority fields

---

## Step 6 — Independent Verification
Now I leave the KYDEX interface and verify the export independently.

Command:

```bash
KYDEX_EXPORT_SECRET='demo-secret-change-me' node verifier/kydex-verify.js Case_C_ESCALATE_SIC_READY/timeline-export.json
```

Expected output:

```txt
✔ Hash valid
✔ Signature valid
STATUS: VERIFIED
```

Say:
This is the proof point. The exported record can be verified outside the system. If the file is changed, verification fails.

---

## Closing — 30 seconds
KYDEX proves four things:

1. What was screened.
2. What the system found.
3. Who reviewed and decided.
4. Whether the evidence was altered after export.

That is why KYDEX is not only software. It is compliance infrastructure.
