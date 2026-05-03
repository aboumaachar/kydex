# KYDEX API Specification

## 1. API Principles

- REST first.
- JSON responses.
- Versioned routes.
- Audit every sensitive request.
- Never return raw internal errors.
- API responses must explain regulator-facing decision and confidence, not only display match/no match.

Base path:

```http
/api/v1
```

## 2. Authentication

### Web users

```http
POST /auth/login
POST /auth/logout
POST /auth/refresh
```

### API clients

```http
Authorization: Bearer <API_KEY>
```

## 3. Screening API

### Single Screening

```http
POST /screen
```

Request:

```json
{
  "fullName": "Mohammad Ali",
  "dateOfBirth": "1985-01-01",
  "nationality": "LB",
  "documentNumber": "123456",
  "transactionType": "POWER_OF_ATTORNEY",
  "sources": ["OFAC", "UN", "LOCAL_LB"],
  "clientReference": "TX-2026-0001"
}
```

Response:

```json
{
  "queryId": "qry_123",
  "riskLevel": "HIGH",
  "highestScore": 0.87,
  "candidateClassification": "STRONG_PROBABLE_MATCH",
  "matchDecision": "POSSIBLE_MATCH",
  "decision": "POSSIBLE_MATCH",
  "confidence": 0.78,
  "decisionConfidence": 0.78,
  "reasonSummary": "High cross-language name similarity exists, but missing date of birth and document number keep the result in possible-match review.",
  "supportingFactors": [
    {
      "factor": "NAME_SIMILARITY",
      "weight": 0.34,
      "score": 0.98,
      "explanation": "Input name is highly similar to the listed primary name."
    }
  ],
  "weakeningFactors": [
    {
      "factor": "MISSING_DOB",
      "weight": -0.16,
      "explanation": "Date of birth is missing, so the engine cannot raise this to a confirmed identity decision."
    }
  ],
  "recommendedAction": "ESCALATE_FOR_REVIEW",
  "requiresEscalation": true,
  "matches": [
    {
      "source": "OFAC",
      "matchedName": "Mohammed Ali",
      "score": 0.87,
      "riskLevel": "HIGH",
      "candidateClassification": "STRONG_PROBABLE_MATCH",
      "classification": "STRONG_PROBABLE_MATCH",
      "reason": "High name similarity with transliteration overlap and nationality support",
      "sourceVersion": "OFAC-SDN-2026-04-24"
    }
  ],
  "audit": {
    "screenedAt": "2026-04-24T10:00:00Z",
    "sourcesUsed": ["OFAC-SDN-2026-04-24", "UN-2026-04-23"]
  }
}
```

Decision rule:

- `decision` / `matchDecision` is the regulator-facing machine decision.
- `confidence` / `decisionConfidence` quantifies confidence in that decision.
- `candidateClassification` is a legacy similarity band for the top candidate and must not be treated as confirmed identity by itself.
- Name similarity alone must resolve to `POSSIBLE_MATCH` or `INSUFFICIENT_DATA`, not `TRUE_MATCH`.

## 4. Bulk Screening

```http
POST /bulk-screen
```

Request:

```json
{
  "records": [
    {
      "fullName": "Mohammad Ali",
      "dateOfBirth": "1985-01-01",
      "nationality": "LB"
    }
  ],
  "sources": ["OFAC", "UN"]
}
```

Response:

```json
{
  "bulkJobId": "bulk_123",
  "status": "QUEUED"
}
```

## 5. Case API

```http
GET /cases
GET /cases/{caseId}
POST /cases/{caseId}/actions
POST /cases/{caseId}/escalate-internal
POST /cases/{caseId}/prepare-sic-package
```

Case action request:

```json
{
  "action": "REQUEST_MORE_INFORMATION",
  "notes": "Need additional ID document."
}
```

## 6. Data Source API

```http
GET /data-sources
POST /data-sources/upload
GET /data-sources/{id}/versions
```

Upload supports CSV, XML, JSON.

## 7. Audit API

```http
GET /audit-logs
GET /screen/{queryId}/audit-trail
```

Only allowed for SUPER_ADMIN, COUNCIL_ADMIN, AUDITOR, COMPLIANCE_OFFICER.

## 8. API Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "fullName is required",
    "requestId": "req_123"
  }
}
```
