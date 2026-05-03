-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "chainScope" TEXT NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN     "entryHash" TEXT,
ADD COLUMN     "previousHash" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_chainScope_createdAt_idx" ON "AuditLog"("chainScope", "createdAt");
