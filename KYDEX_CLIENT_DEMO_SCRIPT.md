# KYDEX Client Demo Script

## 1. Open KYDEX public page

- Introduce KYDEX as a compliance screening decision-support platform.

## 2. Explain source library and OFAC connection

- Show that KYDEX maintains a local source-library copy for resilient screening.

## 3. Show OFAC status

- Open OFAC status page and confirm health and sync state.

## 4. Show local SDN list preview

- Open local list preview and point to imported entities.

## 5. Show fallback capability

- Explain that KYDEX can continue screening if upstream source is unavailable.

## 6. Run manual search

- Use a benign name and show "No material match found" wording.

## 7. Run Arabic name search

- Demonstrate Arabic/Latin variant matching.

## 8. Run single-name search

- Demonstrate robust token/variant handling.

## 9. Show audit log

- Open screening logs and highlight requester/source metadata.

## 10. Open Sandra WordPress dashboard

- Confirm authenticated dashboard access.

## 11. Run manual screening from WordPress

- Show result card and audit identifier.

## 12. Run image/OCR screening

- Show OCR extraction and screening output.

## 13. Show WordPress isolation from OFAC

- Explain plugin talks only to KYDEX API, never directly to OFAC.

## 14. Show KYDEX dashboard receiving the request

- Open KYDEX logs and match the transaction.

## 15. Explain subscription model

- Trial/Active/Past-due/Suspended lifecycle
- Plan limits for manual/image usage
- Key lifecycle controls (rotate/suspend/revoke)

## Required safe wording during demo

Use:
- No material match found.
- Possible match - review required.
- Strong potential match - manual verification required.
- Screening completed using local KYDEX copy.
- Original source unavailable at search time.

Avoid:
- Any definitive sanctions declaration about an individual.
- Any automated blocking declaration as a final outcome.
- Any wording that implies a confirmed list determination without human review.
