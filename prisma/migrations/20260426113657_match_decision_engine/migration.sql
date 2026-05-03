-- CreateEnum
CREATE TYPE "MatchDecision" AS ENUM ('TRUE_MATCH', 'POSSIBLE_MATCH', 'FALSE_MATCH', 'NO_MATCH', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "MatchRecommendedAction" AS ENUM ('BLOCK_OR_ESCALATE', 'ESCALATE_FOR_REVIEW', 'ALLOW_WITH_NOTE', 'ALLOW', 'REQUEST_MORE_INFORMATION');

-- AlterTable
ALTER TABLE "ComplianceCase" ADD COLUMN     "originalDecision" "MatchDecision",
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewerDecision" "MatchDecision",
ADD COLUMN     "reviewerJustification" TEXT;

-- AlterTable
ALTER TABLE "ScreeningQuery" ADD COLUMN     "decisionConfidence" DOUBLE PRECISION,
ADD COLUMN     "matchDecision" "MatchDecision",
ADD COLUMN     "reasonSummary" TEXT,
ADD COLUMN     "recommendedAction" "MatchRecommendedAction",
ADD COLUMN     "supportingFactors" JSONB,
ADD COLUMN     "weakeningFactors" JSONB;
