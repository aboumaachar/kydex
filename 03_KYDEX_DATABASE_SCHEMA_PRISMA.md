# KYDEX Database Schema — Prisma Draft

## 1. Prisma Schema Draft

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum TenantType {
  COUNCIL
  LEGAL_FIRM
  FINTECH
  BANK
  GOVERNMENT
  INTERNAL
}

enum UserRole {
  SUPER_ADMIN
  COUNCIL_ADMIN
  COMPLIANCE_OFFICER
  REVIEW_COMMITTEE_MEMBER
  NOTARY
  AUDITOR
  API_CLIENT
}

enum DataSourceType {
  OFAC
  UN
  LOCAL
  CUSTOM_CSV
  PRIVATE_CLIENT_LIST
}

enum RiskLevel {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum CaseStatus {
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
}

enum MatchClassification {
  EXACT_MATCH
  STRONG_PROBABLE_MATCH
  POSSIBLE_MATCH
  WEAK_SIMILARITY
  NO_MATCH
}

model Tenant {
  id        String     @id @default(cuid())
  name      String
  country   String?
  type      TenantType
  status    String     @default("ACTIVE")
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  users      User[]
  apiKeys    ApiKey[]
  screenings ScreeningQuery[]
  cases      ComplianceCase[]
}

model User {
  id                String   @id @default(cuid())
  tenantId          String
  tenant            Tenant   @relation(fields: [tenantId], references: [id])
  fullName          String
  email             String   @unique
  passwordHash      String
  role              UserRole
  twoFactorEnabled  Boolean  @default(false)
  status            String   @default("ACTIVE")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  screenings        ScreeningQuery[]
  auditLogs         AuditLog[]
  reviewedCases     ComplianceCase[] @relation("CaseReviewer")
}

model ApiKey {
  id         String   @id @default(cuid())
  tenantId   String
  tenant     Tenant   @relation(fields: [tenantId], references: [id])
  name       String
  keyHash    String
  scopes     String[]
  status     String   @default("ACTIVE")
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())
}

model DataSource {
  id              String         @id @default(cuid())
  code            String         @unique
  name            String
  type            DataSourceType
  country         String?
  updateFrequency String?
  status          String         @default("ACTIVE")
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  versions        DataSourceVersion[]
  records         WatchlistRecord[]
}

model DataSourceVersion {
  id            String     @id @default(cuid())
  dataSourceId  String
  dataSource    DataSource @relation(fields: [dataSourceId], references: [id])
  versionLabel  String
  fileHash      String?
  importedAt    DateTime   @default(now())
  importedBy    String?
  recordCount   Int        @default(0)
  status        String     @default("IMPORTED")

  records       WatchlistRecord[]
}

model WatchlistRecord {
  id                String            @id @default(cuid())
  dataSourceId       String
  dataSource         DataSource        @relation(fields: [dataSourceId], references: [id])
  versionId          String
  version            DataSourceVersion @relation(fields: [versionId], references: [id])

  externalReference  String?
  entityType         String
  primaryName        String
  originalName       String
  originalLanguage   String?
  sourceLanguage     String?
  normalizedName     String
  arabicNormalizedName String?
  latinNormalizedName String
  transliterationVariants String[]
  aliases            String[]
  arabicNormalizedAliases String[]
  latinNormalizedAliases String[]
  dateOfBirth        String?
  nationality        String?
  country            String?
  documentNumbers    String[]
  rawPayload         Json

  createdAt          DateTime          @default(now())

  matches            ScreeningMatch[]
}

model ScreeningQuery {
  id                String    @id @default(cuid())
  tenantId           String
  tenant             Tenant    @relation(fields: [tenantId], references: [id])
  userId             String?
  user               User?     @relation(fields: [userId], references: [id])

  fullName           String
  normalizedName     String
  dateOfBirth        String?
  nationality        String?
  documentNumber     String?
  transactionType    String?
  sourcesUsed        String[]
  highestScore       Float     @default(0)
  riskLevel          RiskLevel
  clientReference    String?

  createdAt          DateTime  @default(now())
  ipAddress          String?

  matches            ScreeningMatch[]
  complianceCase     ComplianceCase?
}

model ScreeningMatch {
  id                  String              @id @default(cuid())
  queryId             String
  query               ScreeningQuery      @relation(fields: [queryId], references: [id])
  watchlistRecordId   String?
  watchlistRecord     WatchlistRecord?    @relation(fields: [watchlistRecordId], references: [id])

  sourceCode          String
  matchedName         String
  score               Float
  riskLevel           RiskLevel
  classification      MatchClassification
  matchReason         String
  sourceVersionLabel  String?
  createdAt           DateTime            @default(now())
}

model ComplianceCase {
  id                 String      @id @default(cuid())
  tenantId            String
  tenant              Tenant      @relation(fields: [tenantId], references: [id])
  screeningQueryId    String      @unique
  screeningQuery      ScreeningQuery @relation(fields: [screeningQueryId], references: [id])

  status              CaseStatus  @default(NEEDS_REVIEW)
  riskLevel           RiskLevel
  assignedReviewerId  String?
  assignedReviewer    User?       @relation("CaseReviewer", fields: [assignedReviewerId], references: [id])
  committeeDecision   String?
  decisionNotes       String?
  sicSubmissionStatus String?
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt
  closedAt            DateTime?

  actions             CaseAction[]
}

model CaseAction {
  id        String   @id @default(cuid())
  caseId    String
  case      ComplianceCase @relation(fields: [caseId], references: [id])
  actorId   String?
  action    String
  notes     String?
  metadata  Json?
  createdAt DateTime @default(now())
}

model AuditLog {
  id          String   @id @default(cuid())
  tenantId    String?
  userId      String?
  user        User?    @relation(fields: [userId], references: [id])
  action      String
  entityType  String
  entityId    String?
  ipAddress   String?
  userAgent   String?
  metadata    Json?
  createdAt   DateTime @default(now())
}
```

## 2. Database Rules

- Every tenant-owned table must include `tenantId`.
- Every screening must include sources used and timestamp.
- Every match must include list version.
- Every imported watchlist record must preserve the original source name exactly as received.
- Every imported watchlist record must store Arabic-normalized, Latin-normalized, alias, and transliteration search variants.
- Name similarity alone must not be stored or presented as confirmed identity without supporting identifiers.

## 3. Locale-Aware Identity Resolution Requirements

For each imported record, the system design must retain:

- `originalName`
- `originalLanguage`
- `sourceLanguage`
- `arabicNormalizedName`
- `latinNormalizedName`
- `transliterationVariants`
- `aliases`
- `arabicNormalizedAliases`
- `latinNormalizedAliases`
- `dateOfBirth`
- `nationality`
- `documentNumbers`
- `sourceCode`
- `versionId`
- `rawPayload`

These generated fields exist to support Arabic-first search, cross-script comparison, and defensible uncertainty classification rather than literal translation.
- Audit logs must be append-only.
- High-risk cases must not be deleted.
