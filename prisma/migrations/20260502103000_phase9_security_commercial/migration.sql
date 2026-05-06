-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotaryApiKeyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');

-- AlterTable
ALTER TABLE "NotaryProfile"
  ADD COLUMN "planName" TEXT NOT NULL DEFAULT 'BASIC',
  ADD COLUMN "planLimitManualSearches" INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN "planLimitImageSearches" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN "monthlyUsageManual" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "monthlyUsageImage" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "billingPeriodStart" TIMESTAMP(3),
  ADD COLUMN "billingPeriodEnd" TIMESTAMP(3),
  ADD COLUMN "trialEndsAt" TIMESTAMP(3),
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Convert membership status string -> enum (or add column fresh if not exists)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='NotaryProfile' AND column_name='membershipStatus'
  ) THEN
    -- Column already exists as TEXT, convert to ENUM
    ALTER TABLE "NotaryProfile" ALTER COLUMN "membershipStatus" DROP DEFAULT;
    ALTER TABLE "NotaryProfile"
      ALTER COLUMN "membershipStatus" TYPE "MembershipStatus"
      USING (
        CASE UPPER("membershipStatus")
          WHEN 'TRIAL' THEN 'TRIAL'
          WHEN 'ACTIVE' THEN 'ACTIVE'
          WHEN 'PAST_DUE' THEN 'PAST_DUE'
          WHEN 'SUSPENDED' THEN 'SUSPENDED'
          WHEN 'CANCELLED' THEN 'CANCELLED'
          WHEN 'EXPIRED' THEN 'EXPIRED'
          ELSE 'ACTIVE'
        END
      )::"MembershipStatus";
    ALTER TABLE "NotaryProfile" ALTER COLUMN "membershipStatus" SET DEFAULT 'ACTIVE'::"MembershipStatus";
  ELSE
    -- Fresh database: add column directly as ENUM
    ALTER TABLE "NotaryProfile" ADD COLUMN "membershipStatus" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE'::"MembershipStatus";
  END IF;
END $$;

-- AlterTable
ALTER TABLE "NotaryApiKey"
  ADD COLUMN "status" "NotaryApiKeyStatus",
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "rotatedAt" TIMESTAMP(3),
  ADD COLUMN "failedAuthCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastFailedAuthAt" TIMESTAMP(3);

UPDATE "NotaryApiKey"
SET "status" = CASE WHEN "isActive" = true THEN 'ACTIVE'::"NotaryApiKeyStatus" ELSE 'SUSPENDED'::"NotaryApiKeyStatus" END
WHERE "status" IS NULL;

ALTER TABLE "NotaryApiKey"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "NotaryAuthAttempt" (
  "id" TEXT NOT NULL,
  "notarySlug" TEXT,
  "apiKeyId" TEXT,
  "keyHash" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "reason" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "wordpressSite" TEXT,
  "apiClient" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "NotaryAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaryProfile_membershipStatus_idx" ON "NotaryProfile"("membershipStatus");

-- CreateIndex
CREATE INDEX "NotaryProfile_planName_idx" ON "NotaryProfile"("planName");

-- CreateIndex
CREATE INDEX "NotaryApiKey_status_idx" ON "NotaryApiKey"("status");

-- CreateIndex
CREATE INDEX "NotaryAuthAttempt_notarySlug_createdAt_idx" ON "NotaryAuthAttempt"("notarySlug", "createdAt");

-- CreateIndex
CREATE INDEX "NotaryAuthAttempt_apiKeyId_createdAt_idx" ON "NotaryAuthAttempt"("apiKeyId", "createdAt");

-- CreateIndex
CREATE INDEX "NotaryAuthAttempt_ipAddress_createdAt_idx" ON "NotaryAuthAttempt"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "NotaryAuthAttempt_success_createdAt_idx" ON "NotaryAuthAttempt"("success", "createdAt");

-- AddForeignKey
ALTER TABLE "NotaryAuthAttempt" ADD CONSTRAINT "NotaryAuthAttempt_notarySlug_fkey" FOREIGN KEY ("notarySlug") REFERENCES "NotaryProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryAuthAttempt" ADD CONSTRAINT "NotaryAuthAttempt_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "NotaryApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
