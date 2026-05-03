ALTER TABLE "ComplianceCase"
  ADD COLUMN "slaBreachedAt" TIMESTAMP(3),
  ADD COLUMN "slaAlertedAt" TIMESTAMP(3),
  ADD COLUMN "reviewerLockedById" TEXT,
  ADD COLUMN "reviewerLockAcquiredAt" TIMESTAMP(3),
  ADD COLUMN "reviewerLockExpiresAt" TIMESTAMP(3),
  ADD COLUMN "finalAuthorityUserId" TEXT,
  ADD COLUMN "finalAuthorityRole" "UserRole",
  ADD COLUMN "finalAuthoritySignedAt" TIMESTAMP(3),
  ADD COLUMN "finalAuthoritySignatureHash" TEXT;

UPDATE "ComplianceCase"
SET
  "reviewerLockedById" = COALESCE("reviewerLockedById", "assignedReviewerId"),
  "reviewerLockAcquiredAt" = CASE
    WHEN "assignedReviewerId" IS NOT NULL THEN COALESCE("reviewerLockAcquiredAt", "updatedAt")
    ELSE "reviewerLockAcquiredAt"
  END,
  "reviewerLockExpiresAt" = CASE
    WHEN "assignedReviewerId" IS NOT NULL THEN COALESCE("reviewerLockExpiresAt", "updatedAt" + INTERVAL '30 minutes')
    ELSE "reviewerLockExpiresAt"
  END;

CREATE INDEX IF NOT EXISTS "ComplianceCase_reviewerLockExpiresAt_idx"
  ON "ComplianceCase"("reviewerLockExpiresAt");

CREATE INDEX IF NOT EXISTS "ComplianceCase_slaTargetAt_slaBreachedAt_idx"
  ON "ComplianceCase"("slaTargetAt", "slaBreachedAt");