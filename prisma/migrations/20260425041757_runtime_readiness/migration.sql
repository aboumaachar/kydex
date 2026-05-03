-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('COUNCIL', 'LEGAL_FIRM', 'FINTECH', 'BANK', 'GOVERNMENT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COUNCIL_ADMIN', 'COMPLIANCE_OFFICER', 'REVIEW_COMMITTEE_MEMBER', 'NOTARY', 'AUDITOR', 'API_CLIENT');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('OFAC', 'UN', 'LOCAL', 'CUSTOM_CSV', 'PRIVATE_CLIENT_LIST');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('DRAFT', 'SCREENED', 'NEEDS_REVIEW', 'ESCALATED_INTERNALLY', 'PENDING_ADDITIONAL_INFORMATION', 'CLEARED', 'SIC_PACKAGE_PREPARED', 'REPORTED_TO_SIC', 'REJECTED_BLOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "MatchClassification" AS ENUM ('EXACT_MATCH', 'STRONG_PROBABLE_MATCH', 'POSSIBLE_MATCH', 'WEAK_SIMILARITY', 'NO_MATCH');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "type" "TenantType" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "country" TEXT,
    "updateFrequency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSourceVersion" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "fileHash" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importedBy" TEXT,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'IMPORTED',

    CONSTRAINT "DataSourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistRecord" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "externalReference" TEXT,
    "entityType" TEXT NOT NULL,
    "primaryName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "aliases" TEXT[],
    "dateOfBirth" TEXT,
    "nationality" TEXT,
    "country" TEXT,
    "documentNumbers" TEXT[],
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningQuery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "dateOfBirth" TEXT,
    "nationality" TEXT,
    "documentNumber" TEXT,
    "transactionType" TEXT,
    "sourcesUsed" TEXT[],
    "highestScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "riskLevel" "RiskLevel" NOT NULL,
    "clientReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,

    CONSTRAINT "ScreeningQuery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreeningMatch" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "watchlistRecordId" TEXT,
    "sourceCode" TEXT NOT NULL,
    "matchedName" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "classification" "MatchClassification" NOT NULL,
    "matchReason" TEXT NOT NULL,
    "sourceVersionLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "screeningQueryId" TEXT NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
    "riskLevel" "RiskLevel" NOT NULL,
    "assignedReviewerId" TEXT,
    "committeeDecision" TEXT,
    "decisionNotes" TEXT,
    "sicSubmissionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRunReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "dataSourceId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "insertedRecords" INTEGER NOT NULL,
    "rejectedRows" INTEGER NOT NULL,
    "duplicateRows" INTEGER NOT NULL,
    "validationErrors" JSONB NOT NULL,
    "rejectedReport" JSONB NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionRunReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvidencePackage" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "packageHash" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidencePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseAction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_code_key" ON "DataSource"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceCase_screeningQueryId_key" ON "ComplianceCase"("screeningQueryId");

-- CreateIndex
CREATE INDEX "EvidencePackage_caseId_createdAt_idx" ON "EvidencePackage"("caseId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSourceVersion" ADD CONSTRAINT "DataSourceVersion_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistRecord" ADD CONSTRAINT "WatchlistRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistRecord" ADD CONSTRAINT "WatchlistRecord_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DataSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuery" ADD CONSTRAINT "ScreeningQuery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningQuery" ADD CONSTRAINT "ScreeningQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningMatch" ADD CONSTRAINT "ScreeningMatch_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "ScreeningQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreeningMatch" ADD CONSTRAINT "ScreeningMatch_watchlistRecordId_fkey" FOREIGN KEY ("watchlistRecordId") REFERENCES "WatchlistRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCase" ADD CONSTRAINT "ComplianceCase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCase" ADD CONSTRAINT "ComplianceCase_screeningQueryId_fkey" FOREIGN KEY ("screeningQueryId") REFERENCES "ScreeningQuery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceCase" ADD CONSTRAINT "ComplianceCase_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRunReport" ADD CONSTRAINT "IngestionRunReport_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRunReport" ADD CONSTRAINT "IngestionRunReport_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "DataSourceVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidencePackage" ADD CONSTRAINT "EvidencePackage_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ComplianceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseAction" ADD CONSTRAINT "CaseAction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "ComplianceCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
