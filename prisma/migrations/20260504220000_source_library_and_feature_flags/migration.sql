-- Migration: source_library_and_feature_flags
-- Adds KydexDataSource table family, feature flags on NotaryProfile,
-- ScreeningTransaction, IncomingInquiry, ApiAccessLog

-- ─── Enums ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "SourceStatus" AS ENUM ('connected','degraded','offline','sync_required','fallback_available','fallback_unavailable','unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SourceSyncStatus" AS ENUM ('pending','running','completed','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SourceFileStatus" AS ENUM ('pending','downloaded','imported','failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NameVariantType" AS ENUM ('original','normalized_latin','normalized_arabic','arabic_to_latin','latin_to_arabic','phonetic','alias','token','single_name');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Feature flags on NotaryProfile ─────────────────────────

ALTER TABLE "NotaryProfile"
  ADD COLUMN IF NOT EXISTS "featureManualScreening"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureImageScreening"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featureAuditLookup"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featureAdminStatusTools" BOOLEAN NOT NULL DEFAULT false;

-- ─── KydexDataSource ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "KydexDataSource" (
  "id"                   TEXT NOT NULL,
  "code"                 TEXT NOT NULL,
  "name"                 TEXT NOT NULL,
  "baseUrl"              TEXT,
  "status"               "SourceStatus" NOT NULL DEFAULT 'unknown',
  "fallbackEnabled"      BOOLEAN NOT NULL DEFAULT true,
  "localCopyAvailable"   BOOLEAN NOT NULL DEFAULT false,
  "lastSuccessfulSyncAt" TIMESTAMP(3),
  "lastAttemptedSyncAt"  TIMESTAMP(3),
  "lastHealthCheckAt"    TIMESTAMP(3),
  "lastError"            TEXT,
  "lastLatencyMs"        INTEGER,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3) NOT NULL,
  CONSTRAINT "KydexDataSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KydexDataSource_code_key" ON "KydexDataSource"("code");

-- ─── SourceConnectionLog ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceConnectionLog" (
  "id"         TEXT NOT NULL,
  "sourceId"   TEXT NOT NULL,
  "status"     "SourceStatus" NOT NULL,
  "endpoint"   TEXT,
  "latencyMs"  INTEGER,
  "httpStatus" INTEGER,
  "error"      TEXT,
  "checkedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceConnectionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceConnectionLog_sourceId_checkedAt_idx" ON "SourceConnectionLog"("sourceId","checkedAt");
ALTER TABLE "SourceConnectionLog" ADD CONSTRAINT "SourceConnectionLog_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KydexDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SourceSyncRun ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceSyncRun" (
  "id"               TEXT NOT NULL,
  "sourceId"         TEXT NOT NULL,
  "status"           "SourceSyncStatus" NOT NULL DEFAULT 'pending',
  "syncType"         TEXT NOT NULL DEFAULT 'manual',
  "startedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"       TIMESTAMP(3),
  "recordsImported"  INTEGER NOT NULL DEFAULT 0,
  "recordsUpdated"   INTEGER NOT NULL DEFAULT 0,
  "recordsFailed"    INTEGER NOT NULL DEFAULT 0,
  "sourceFileName"   TEXT,
  "publicationId"    TEXT,
  "error"            TEXT,
  CONSTRAINT "SourceSyncRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceSyncRun_sourceId_startedAt_idx" ON "SourceSyncRun"("sourceId","startedAt");
ALTER TABLE "SourceSyncRun" ADD CONSTRAINT "SourceSyncRun_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KydexDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SourceFile ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceFile" (
  "id"               TEXT NOT NULL,
  "sourceId"         TEXT NOT NULL,
  "syncRunId"        TEXT,
  "fileName"         TEXT NOT NULL,
  "fileType"         TEXT NOT NULL,
  "downloadUrl"      TEXT,
  "sha256"           TEXT,
  "sizeBytes"        INTEGER,
  "downloadedAt"     TIMESTAMP(3),
  "importedAt"       TIMESTAMP(3),
  "status"           "SourceFileStatus" NOT NULL DEFAULT 'pending',
  "rawStoragePath"   TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceFile_sourceId_fileName_idx" ON "SourceFile"("sourceId","fileName");
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KydexDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_syncRunId_fkey"
  FOREIGN KEY ("syncRunId") REFERENCES "SourceSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SourceImportedList ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceImportedList" (
  "id"               TEXT NOT NULL,
  "sourceId"         TEXT NOT NULL,
  "syncRunId"        TEXT,
  "sourceFileId"     TEXT,
  "listName"         TEXT NOT NULL,
  "programName"      TEXT,
  "recordCount"      INTEGER NOT NULL DEFAULT 0,
  "languageCoverage" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "localAvailable"   BOOLEAN NOT NULL DEFAULT false,
  "lastImportedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceImportedList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceImportedList_sourceId_listName_idx" ON "SourceImportedList"("sourceId","listName");
ALTER TABLE "SourceImportedList" ADD CONSTRAINT "SourceImportedList_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KydexDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceImportedList" ADD CONSTRAINT "SourceImportedList_syncRunId_fkey"
  FOREIGN KEY ("syncRunId") REFERENCES "SourceSyncRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceImportedList" ADD CONSTRAINT "SourceImportedList_sourceFileId_fkey"
  FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SourceEntity ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceEntity" (
  "id"               TEXT NOT NULL,
  "sourceId"         TEXT NOT NULL,
  "sourceFileId"     TEXT,
  "externalEntityId" TEXT NOT NULL,
  "entityType"       TEXT NOT NULL,
  "primaryName"      TEXT NOT NULL,
  "normalizedLatin"  TEXT,
  "normalizedArabic" TEXT,
  "listName"         TEXT NOT NULL,
  "programs"         TEXT[] DEFAULT ARRAY[]::TEXT[],
  "countries"        TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rawRecord"        JSONB,
  "datePublished"    TIMESTAMP(3),
  "importedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceEntity_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SourceEntity_sourceId_externalEntityId_key" ON "SourceEntity"("sourceId","externalEntityId");
CREATE INDEX IF NOT EXISTS "SourceEntity_normalizedLatin_idx" ON "SourceEntity"("normalizedLatin");
CREATE INDEX IF NOT EXISTS "SourceEntity_listName_idx" ON "SourceEntity"("listName");
ALTER TABLE "SourceEntity" ADD CONSTRAINT "SourceEntity_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "KydexDataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceEntity" ADD CONSTRAINT "SourceEntity_sourceFileId_fkey"
  FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── SourceName ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceName" (
  "id"               TEXT NOT NULL,
  "entityId"         TEXT NOT NULL,
  "sourceId"         TEXT NOT NULL,
  "originalName"     TEXT NOT NULL,
  "isPrimary"        BOOLEAN NOT NULL DEFAULT false,
  "isAlias"          BOOLEAN NOT NULL DEFAULT false,
  "aliasType"        TEXT,
  "language"         TEXT,
  "script"           TEXT,
  "normalizedLatin"  TEXT,
  "normalizedArabic" TEXT,
  "tokens"           TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceName_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceName_entityId_idx" ON "SourceName"("entityId");
CREATE INDEX IF NOT EXISTS "SourceName_normalizedLatin_idx" ON "SourceName"("normalizedLatin");
ALTER TABLE "SourceName" ADD CONSTRAINT "SourceName_entityId_fkey"
  FOREIGN KEY ("entityId") REFERENCES "SourceEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── SourceNameVariant ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS "SourceNameVariant" (
  "id"           TEXT NOT NULL,
  "sourceNameId" TEXT NOT NULL,
  "entityId"     TEXT NOT NULL,
  "variant"      TEXT NOT NULL,
  "variantType"  "NameVariantType" NOT NULL,
  "language"     TEXT,
  "phoneticKey"  TEXT,
  "tokens"       TEXT[] DEFAULT ARRAY[]::TEXT[],
  "quality"      DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SourceNameVariant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "SourceNameVariant_sourceNameId_idx" ON "SourceNameVariant"("sourceNameId");
CREATE INDEX IF NOT EXISTS "SourceNameVariant_variant_idx" ON "SourceNameVariant"("variant");
CREATE INDEX IF NOT EXISTS "SourceNameVariant_variantType_idx" ON "SourceNameVariant"("variantType");
ALTER TABLE "SourceNameVariant" ADD CONSTRAINT "SourceNameVariant_sourceNameId_fkey"
  FOREIGN KEY ("sourceNameId") REFERENCES "SourceName"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ScreeningTransaction ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ScreeningTransaction" (
  "id"                  TEXT NOT NULL,
  "query"               TEXT NOT NULL,
  "normalizedQuery"     TEXT,
  "queryVariants"       TEXT[] DEFAULT ARRAY[]::TEXT[],
  "requesterType"       TEXT,
  "requesterSlug"       TEXT,
  "sourceMode"          TEXT,
  "usedFallback"        BOOLEAN NOT NULL DEFAULT false,
  "liveSourceChecked"   BOOLEAN NOT NULL DEFAULT false,
  "sourceStatus"        JSONB,
  "warning"             TEXT,
  "ipAddress"           TEXT,
  "userAgent"           TEXT,
  "apiClient"           TEXT,
  "apiKeyId"            TEXT,
  "wordpressSite"       TEXT,
  "wpUserId"            TEXT,
  "clientReference"     TEXT,
  "status"              TEXT NOT NULL DEFAULT 'pending',
  "highestScore"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "matchCount"          INTEGER NOT NULL DEFAULT 0,
  "responseTimeMs"      INTEGER,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScreeningTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ScreeningTransaction_requesterSlug_createdAt_idx" ON "ScreeningTransaction"("requesterSlug","createdAt");
CREATE INDEX IF NOT EXISTS "ScreeningTransaction_status_idx" ON "ScreeningTransaction"("status");
CREATE INDEX IF NOT EXISTS "ScreeningTransaction_sourceMode_idx" ON "ScreeningTransaction"("sourceMode");

-- ─── IncomingInquiry ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "IncomingInquiry" (
  "id"              TEXT NOT NULL,
  "transactionId"   TEXT UNIQUE,
  "clientType"      TEXT,
  "clientId"        TEXT,
  "notarySlug"      TEXT,
  "wordpressSite"   TEXT,
  "originalPayload" JSONB,
  "responsePayload" JSONB,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncomingInquiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IncomingInquiry_notarySlug_createdAt_idx" ON "IncomingInquiry"("notarySlug","createdAt");
CREATE INDEX IF NOT EXISTS "IncomingInquiry_clientType_createdAt_idx" ON "IncomingInquiry"("clientType","createdAt");
ALTER TABLE "IncomingInquiry" ADD CONSTRAINT "IncomingInquiry_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "ScreeningTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── ApiAccessLog ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "ApiAccessLog" (
  "id"             TEXT NOT NULL,
  "apiKeyId"       TEXT,
  "notarySlug"     TEXT,
  "ipAddress"      TEXT,
  "userAgent"      TEXT,
  "path"           TEXT,
  "method"         TEXT,
  "statusCode"     INTEGER,
  "responseTimeMs" INTEGER,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiAccessLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ApiAccessLog_apiKeyId_createdAt_idx" ON "ApiAccessLog"("apiKeyId","createdAt");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_notarySlug_createdAt_idx" ON "ApiAccessLog"("notarySlug","createdAt");
CREATE INDEX IF NOT EXISTS "ApiAccessLog_createdAt_idx" ON "ApiAccessLog"("createdAt");
