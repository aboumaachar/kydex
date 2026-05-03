CREATE TABLE "DocumentExtraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "extractedById" TEXT,
    "confirmedById" TEXT,
    "documentType" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceMimeType" TEXT NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "extractionProvider" TEXT NOT NULL,
    "extractionConfidence" DOUBLE PRECISION NOT NULL,
    "extractedFields" JSONB NOT NULL,
    "confirmedFields" JSONB,
    "status" TEXT NOT NULL DEFAULT 'EXTRACTED',
    "redactRequested" BOOLEAN NOT NULL DEFAULT false,
    "redactedAt" TIMESTAMP(3),
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentExtraction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentExtraction_tenantId_createdAt_idx" ON "DocumentExtraction"("tenantId", "createdAt");
CREATE INDEX "DocumentExtraction_status_confirmedAt_idx" ON "DocumentExtraction"("status", "confirmedAt");

ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_extractedById_fkey" FOREIGN KEY ("extractedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DocumentExtraction" ADD CONSTRAINT "DocumentExtraction_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
