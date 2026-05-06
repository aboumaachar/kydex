-- Patch migration: add missing columns not covered by previous migrations
-- OfacScreeningSearch: wordpressSite, wpUserId, sourceMode, usedFallback, queryVariants, ipAddress, userAgent, responseTimeMs
-- NotaryProfile: allowedWordPressSites

-- OfacScreeningSearch additional columns
ALTER TABLE "OfacScreeningSearch"
  ADD COLUMN IF NOT EXISTS "wordpressSite" TEXT,
  ADD COLUMN IF NOT EXISTS "wpUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceMode" TEXT,
  ADD COLUMN IF NOT EXISTS "usedFallback" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "queryVariants" TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "ipAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "responseTimeMs" INTEGER;

-- NotaryProfile: allowedWordPressSites
ALTER TABLE "NotaryProfile"
  ADD COLUMN IF NOT EXISTS "allowedWordPressSites" TEXT[] NOT NULL DEFAULT '{}';
