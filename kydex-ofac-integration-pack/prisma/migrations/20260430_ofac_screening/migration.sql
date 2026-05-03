-- PostgreSQL migration for KYDEX OFAC + screening models.
-- Use Prisma migrate if your repo is Prisma-based. This SQL is included for direct DB migration/reference.

CREATE TABLE IF NOT EXISTS "OfacEntity" (
  "id" TEXT PRIMARY KEY,
  "ofacEntityId" TEXT NOT NULL UNIQUE,
  "identityId" TEXT,
  "entityType" TEXT,
  "primaryName" TEXT,
  "normalizedPrimaryName" TEXT,
  "listName" TEXT,
  "programs" TEXT[] NOT NULL DEFAULT '{}',
  "sanctionsTypes" TEXT[] NOT NULL DEFAULT '{}',
  "legalAuthorities" TEXT[] NOT NULL DEFAULT '{}',
  "rawJson" JSONB,
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OfacEntity_normalizedPrimaryName_idx" ON "OfacEntity" ("normalizedPrimaryName");
CREATE INDEX IF NOT EXISTS "OfacEntity_listName_idx" ON "OfacEntity" ("listName");

CREATE TABLE IF NOT EXISTS "OfacName" (
  "id" TEXT PRIMARY KEY,
  "entityId" TEXT NOT NULL REFERENCES "OfacEntity"("id") ON DELETE CASCADE,
  "fullName" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "firstName" TEXT,
  "middleName" TEXT,
  "lastName" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isLowQuality" BOOLEAN NOT NULL DEFAULT false,
  "aliasType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OfacName_normalizedName_idx" ON "OfacName" ("normalizedName");
CREATE INDEX IF NOT EXISTS "OfacName_fullName_idx" ON "OfacName" ("fullName");

CREATE TABLE IF NOT EXISTS "OfacAddress" (
  "id" TEXT PRIMARY KEY,
  "entityId" TEXT NOT NULL REFERENCES "OfacEntity"("id") ON DELETE CASCADE,
  "country" TEXT,
  "rawJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "OfacFeature" (
  "id" TEXT PRIMARY KEY,
  "entityId" TEXT NOT NULL REFERENCES "OfacEntity"("id") ON DELETE CASCADE,
  "type" TEXT,
  "value" TEXT,
  "rawJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "OfacFeature_type_idx" ON "OfacFeature" ("type");

CREATE TABLE IF NOT EXISTS "OfacSyncRun" (
  "id" TEXT PRIMARY KEY,
  "mode" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "files" TEXT[] NOT NULL DEFAULT '{}',
  "importedEntities" INTEGER NOT NULL DEFAULT 0,
  "importedNames" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "ScreeningSearch" (
  "id" TEXT PRIMARY KEY,
  "notarySlug" TEXT,
  "userId" TEXT,
  "apiKeyId" TEXT,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "screeningType" TEXT NOT NULL,
  "clientReference" TEXT,
  "resultStatus" TEXT NOT NULL,
  "highestScore" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ScreeningSearch_notarySlug_idx" ON "ScreeningSearch" ("notarySlug");
CREATE INDEX IF NOT EXISTS "ScreeningSearch_createdAt_idx" ON "ScreeningSearch" ("createdAt");
CREATE INDEX IF NOT EXISTS "ScreeningSearch_resultStatus_idx" ON "ScreeningSearch" ("resultStatus");

CREATE TABLE IF NOT EXISTS "ScreeningMatch" (
  "id" TEXT PRIMARY KEY,
  "searchId" TEXT NOT NULL REFERENCES "ScreeningSearch"("id") ON DELETE CASCADE,
  "ofacEntityId" TEXT NOT NULL,
  "ofacEntityDbId" TEXT,
  "matchedNameId" TEXT,
  "primaryName" TEXT,
  "matchedName" TEXT,
  "listName" TEXT,
  "programs" TEXT[] NOT NULL DEFAULT '{}',
  "score" INTEGER NOT NULL,
  "riskLevel" TEXT NOT NULL,
  "matchReason" TEXT NOT NULL,
  "rawMatch" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ScreeningMatch_searchId_idx" ON "ScreeningMatch" ("searchId");
CREATE INDEX IF NOT EXISTS "ScreeningMatch_ofacEntityId_idx" ON "ScreeningMatch" ("ofacEntityId");
CREATE INDEX IF NOT EXISTS "ScreeningMatch_riskLevel_idx" ON "ScreeningMatch" ("riskLevel");

CREATE TABLE IF NOT EXISTS "NotaryProfile" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "isScreeningEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "NotaryApiKey" (
  "id" TEXT PRIMARY KEY,
  "notarySlug" TEXT NOT NULL REFERENCES "NotaryProfile"("slug") ON DELETE CASCADE,
  "keyHash" TEXT NOT NULL UNIQUE,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "NotaryApiKey_notarySlug_idx" ON "NotaryApiKey" ("notarySlug");

CREATE TABLE IF NOT EXISTS "NotaryScreeningUsage" (
  "id" TEXT PRIMARY KEY,
  "notarySlug" TEXT NOT NULL,
  "apiKeyId" TEXT,
  "screeningSearchId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "NotaryScreeningUsage_notarySlug_idx" ON "NotaryScreeningUsage" ("notarySlug");
CREATE INDEX IF NOT EXISTS "NotaryScreeningUsage_apiKeyId_idx" ON "NotaryScreeningUsage" ("apiKeyId");
CREATE INDEX IF NOT EXISTS "NotaryScreeningUsage_createdAt_idx" ON "NotaryScreeningUsage" ("createdAt");
