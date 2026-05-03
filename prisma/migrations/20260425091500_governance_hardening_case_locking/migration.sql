DO $$
BEGIN
  CREATE TYPE "CommitteeDecision" AS ENUM (
    'CLEAR',
    'REQUEST_MORE_INFORMATION',
    'ESCALATE_AS_SUSPICIOUS',
    'REJECT_OR_BLOCK'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CasePriority" AS ENUM ('STANDARD', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "ComplianceCase"
  ADD COLUMN "priority" "CasePriority" NOT NULL DEFAULT 'STANDARD',
  ADD COLUMN "priorityRaisedAt" TIMESTAMP(3),
  ADD COLUMN "slaTargetAt" TIMESTAMP(3),
  ADD COLUMN "lockVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ComplianceCase"
  ALTER COLUMN "committeeDecision" TYPE "CommitteeDecision"
  USING (
    CASE
      WHEN "committeeDecision" = 'CLEAR' THEN 'CLEAR'
      WHEN "committeeDecision" = 'REQUEST_MORE_INFORMATION' THEN 'REQUEST_MORE_INFORMATION'
      WHEN "committeeDecision" = 'ESCALATE_AS_SUSPICIOUS' THEN 'ESCALATE_AS_SUSPICIOUS'
      WHEN "committeeDecision" = 'REJECT_OR_BLOCK' THEN 'REJECT_OR_BLOCK'
      WHEN "committeeDecision" = 'CLEARED' THEN 'CLEAR'
      ELSE NULL
    END
  )::"CommitteeDecision";

UPDATE "ComplianceCase"
SET "priority" = CASE
  WHEN "riskLevel" = 'CRITICAL' THEN 'CRITICAL'::"CasePriority"
  WHEN "riskLevel" = 'HIGH' THEN 'HIGH'::"CasePriority"
  ELSE 'STANDARD'::"CasePriority"
END;

UPDATE "ComplianceCase"
SET "priorityRaisedAt" = COALESCE("priorityRaisedAt", "createdAt")
WHERE "priority" IN ('HIGH', 'CRITICAL');

UPDATE "ComplianceCase"
SET "slaTargetAt" = COALESCE(
  "slaTargetAt",
  CASE
    WHEN "priority" = 'CRITICAL' THEN "createdAt" + INTERVAL '4 hours'
    WHEN "priority" = 'HIGH' THEN "createdAt" + INTERVAL '24 hours'
    ELSE NULL
  END
)
WHERE "priority" IN ('HIGH', 'CRITICAL');

CREATE INDEX IF NOT EXISTS "ComplianceCase_priority_slaTargetAt_idx"
  ON "ComplianceCase"("priority", "slaTargetAt");
