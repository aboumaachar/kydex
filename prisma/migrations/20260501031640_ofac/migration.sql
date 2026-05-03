-- DropForeignKey
ALTER TABLE "NotaryApiKey" DROP CONSTRAINT "NotaryApiKey_notarySlug_fkey";

-- DropForeignKey
ALTER TABLE "NotaryScreeningUsage" DROP CONSTRAINT "NotaryScreeningUsage_apiKeyId_fkey";

-- DropForeignKey
ALTER TABLE "NotaryScreeningUsage" DROP CONSTRAINT "NotaryScreeningUsage_notarySlug_fkey";

-- DropForeignKey
ALTER TABLE "NotaryScreeningUsage" DROP CONSTRAINT "NotaryScreeningUsage_screeningSearchId_fkey";

-- DropForeignKey
ALTER TABLE "OfacAddress" DROP CONSTRAINT "OfacAddress_entityId_fkey";

-- DropForeignKey
ALTER TABLE "OfacFeature" DROP CONSTRAINT "OfacFeature_entityId_fkey";

-- DropForeignKey
ALTER TABLE "OfacName" DROP CONSTRAINT "OfacName_entityId_fkey";

-- DropForeignKey
ALTER TABLE "OfacScreeningMatch" DROP CONSTRAINT "OfacScreeningMatch_matchedNameId_fkey";

-- DropForeignKey
ALTER TABLE "OfacScreeningMatch" DROP CONSTRAINT "OfacScreeningMatch_ofacEntityDbId_fkey";

-- DropForeignKey
ALTER TABLE "OfacScreeningMatch" DROP CONSTRAINT "OfacScreeningMatch_searchId_fkey";

-- DropForeignKey
ALTER TABLE "OfacScreeningSearch" DROP CONSTRAINT "OfacScreeningSearch_notarySlug_fkey";

-- AlterTable
ALTER TABLE "NotaryProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OfacEntity" ALTER COLUMN "programs" DROP DEFAULT,
ALTER COLUMN "sanctionsTypes" DROP DEFAULT,
ALTER COLUMN "legalAuthorities" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OfacScreeningMatch" ALTER COLUMN "programs" DROP DEFAULT;

-- AlterTable
ALTER TABLE "OfacSyncRun" ALTER COLUMN "files" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "OfacName" ADD CONSTRAINT "OfacName_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "OfacEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacAddress" ADD CONSTRAINT "OfacAddress_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "OfacEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacFeature" ADD CONSTRAINT "OfacFeature_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "OfacEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryApiKey" ADD CONSTRAINT "NotaryApiKey_notarySlug_fkey" FOREIGN KEY ("notarySlug") REFERENCES "NotaryProfile"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacScreeningSearch" ADD CONSTRAINT "OfacScreeningSearch_notarySlug_fkey" FOREIGN KEY ("notarySlug") REFERENCES "NotaryProfile"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacScreeningMatch" ADD CONSTRAINT "OfacScreeningMatch_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "OfacScreeningSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacScreeningMatch" ADD CONSTRAINT "OfacScreeningMatch_ofacEntityDbId_fkey" FOREIGN KEY ("ofacEntityDbId") REFERENCES "OfacEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfacScreeningMatch" ADD CONSTRAINT "OfacScreeningMatch_matchedNameId_fkey" FOREIGN KEY ("matchedNameId") REFERENCES "OfacName"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryScreeningUsage" ADD CONSTRAINT "NotaryScreeningUsage_notarySlug_fkey" FOREIGN KEY ("notarySlug") REFERENCES "NotaryProfile"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryScreeningUsage" ADD CONSTRAINT "NotaryScreeningUsage_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "NotaryApiKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaryScreeningUsage" ADD CONSTRAINT "NotaryScreeningUsage_screeningSearchId_fkey" FOREIGN KEY ("screeningSearchId") REFERENCES "OfacScreeningSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
