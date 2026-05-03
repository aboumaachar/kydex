import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { ScreeningService } from '../screening/screening.service';
import { ConfirmDocumentExtractionDto } from './dto/confirm-document-extraction.dto';

type Actor = {
  id?: string;
  tenantId?: string;
  role?: string;
};

type UploadedFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size?: number;
};

type ExtractedFields = {
  fullName?: string;
  dateOfBirth?: string;
  nationality?: string;
  documentNumber?: string;
  issuingCountry?: string;
  expiryDate?: string;
};

interface OcrProvider {
  name: string;
  extract(file: UploadedFile): Promise<{ fields: ExtractedFields; confidence: number; rawText: string }>;
}

class MockOcrProvider implements OcrProvider {
  name = 'mock-ocr-v1';

  async extract(file: UploadedFile) {
    const rawText = file.buffer.toString('utf-8');
    const normalized = rawText.replaceAll('\r', '\n');
    const lines = normalized.split('\n').map((line) => line.trim());

    const fields: ExtractedFields = {
      fullName: this.matchValue(lines, ['full name', 'name', 'holder']) ?? this.matchNameFallback(lines),
      dateOfBirth: this.matchValue(lines, ['date of birth', 'dob', 'birth']) ?? undefined,
      nationality: this.matchValue(lines, ['nationality', 'citizenship']) ?? undefined,
      documentNumber: this.matchValue(lines, ['passport', 'document number', 'id number', 'national id']) ?? undefined,
      issuingCountry: this.matchValue(lines, ['issuing country', 'country']) ?? undefined,
      expiryDate: this.matchValue(lines, ['expiry', 'expiration']) ?? undefined,
    };

    const extractedCount = Object.values(fields).filter((value) => !!value).length;
    const confidence = Math.min(0.95, 0.2 + extractedCount * 0.13);

    return { fields, confidence, rawText: normalized.slice(0, 4000) };
  }

  private matchValue(lines: string[], labels: string[]) {
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const label of labels) {
        const prefix = `${label}:`;
        if (lower.startsWith(prefix)) {
          return line.slice(prefix.length).trim();
        }

        if (lower.includes(label) && lower.includes(':')) {
          const idx = line.indexOf(':');
          if (idx >= 0) {
            return line.slice(idx + 1).trim();
          }
        }
      }
    }

    return undefined;
  }

  private matchNameFallback(lines: string[]) {
    for (const line of lines) {
      if (/^[\p{L} .'-]{4,}$/u.test(line) && !line.includes(':')) {
        return line;
      }
    }

    return undefined;
  }
}

@Injectable()
export class DocumentExtractionService {
  private readonly ocrProvider: OcrProvider = new MockOcrProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly screeningService: ScreeningService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async extractDocument(
    file: UploadedFile | undefined,
    actor: Actor | undefined,
    documentType?: string,
    redactAfterExtract = false,
  ) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    if (!actor?.tenantId) {
      throw new BadRequestException('tenant context is required');
    }

    const extraction = await this.ocrProvider.extract(file);
    const sourceHash = createHash('sha256').update(file.buffer).digest('hex');

    const created = await this.prisma.documentExtraction.create({
      data: {
        tenantId: actor.tenantId,
        extractedById: actor.id,
        documentType: (documentType ?? this.detectDocumentType(file.originalname)).toUpperCase(),
        sourceFileName: file.originalname,
        sourceMimeType: file.mimetype,
        sourceHash,
        extractionProvider: this.ocrProvider.name,
        extractionConfidence: extraction.confidence,
        extractedFields: extraction.fields as Prisma.InputJsonValue,
        redactRequested: redactAfterExtract,
        redactedAt: redactAfterExtract ? new Date() : null,
      },
    });

    await this.auditLogsService.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: 'DOCUMENT_EXTRACTED',
      entityType: 'DOCUMENT_EXTRACTION',
      entityId: created.id,
      metadata: {
        documentType: created.documentType,
        extractionProvider: created.extractionProvider,
        extractionConfidence: created.extractionConfidence,
        redactRequested: created.redactRequested,
      },
    });

    return {
      extractionId: created.id,
      status: created.status,
      documentType: created.documentType,
      extractionProvider: created.extractionProvider,
      extractionConfidence: created.extractionConfidence,
      extractedFields: created.extractedFields,
      confirmationRequired: true,
      redactRequested: created.redactRequested,
    };
  }

  async confirmAndScreen(extractionId: string, dto: ConfirmDocumentExtractionDto, actor: Actor | undefined) {
    if (!actor?.tenantId || !actor.id) {
      throw new BadRequestException('authenticated actor is required');
    }

    if (!dto.fullName?.trim()) {
      throw new BadRequestException('fullName is required for screening confirmation');
    }

    const extraction = await this.prisma.documentExtraction.findUnique({
      where: { id: extractionId },
    });

    if (extraction?.tenantId !== actor.tenantId) {
      throw new NotFoundException('Document extraction not found');
    }

    const confirmedFields = {
      fullName: dto.fullName.trim(),
      dateOfBirth: dto.dateOfBirth?.trim() || undefined,
      nationality: dto.nationality?.trim() || undefined,
      documentNumber: dto.documentNumber?.trim() || undefined,
      issuingCountry: dto.issuingCountry?.trim() || undefined,
      expiryDate: dto.expiryDate?.trim() || undefined,
    };

    const updated = await this.prisma.documentExtraction.update({
      where: { id: extractionId },
      data: {
        status: 'CONFIRMED',
        confirmedById: actor.id,
        confirmedAt: new Date(),
        confirmedFields: confirmedFields as Prisma.InputJsonValue,
        redactRequested: dto.redactAfterExtract ?? extraction.redactRequested,
        redactedAt: dto.redactAfterExtract || extraction.redactRequested ? new Date() : extraction.redactedAt,
      },
    });

    await this.auditLogsService.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: 'DOCUMENT_EXTRACTION_CONFIRMED',
      entityType: 'DOCUMENT_EXTRACTION',
      entityId: updated.id,
      metadata: {
        confirmedFields,
      },
    });

    const screeningResult = await this.screeningService.screen(
      actor.tenantId,
      actor.id,
      {
        fullName: confirmedFields.fullName,
        dateOfBirth: confirmedFields.dateOfBirth,
        nationality: confirmedFields.nationality,
        documentNumber: confirmedFields.documentNumber,
        transactionType: dto.transactionType ?? 'DOCUMENT_SCREENING',
        clientReference: dto.clientReference ?? `DOC-${updated.id}`,
        sources: dto.sources,
      },
    );

    const screenAudit = await this.auditLogsService.log({
      tenantId: actor.tenantId,
      userId: actor.id,
      action: 'SCREEN_QUERY_FROM_DOCUMENT',
      entityType: 'DOCUMENT_EXTRACTION',
      entityId: updated.id,
      metadata: {
        queryId: screeningResult.queryId,
        caseId: screeningResult.caseId,
      },
    });

    return {
      extraction: {
        id: updated.id,
        status: updated.status,
        confirmedAt: updated.confirmedAt,
        confirmedFields: updated.confirmedFields,
      },
      screeningQuery: {
        id: screeningResult.queryId,
        classification: screeningResult.classification,
        riskLevel: screeningResult.riskLevel,
        highestScore: screeningResult.highestScore,
        matchCount: screeningResult.matches.length,
        noMatch: screeningResult.matches.length === 0,
      },
      auditRecord: {
        id: screenAudit.id,
        action: screenAudit.action,
        entityType: screenAudit.entityType,
        entityId: screenAudit.entityId,
        createdAt: screenAudit.createdAt,
      },
      screeningResult,
    };
  }

  async getExtraction(extractionId: string, actor: Actor | undefined) {
    if (!actor?.tenantId) {
      throw new BadRequestException('tenant context is required');
    }

    const extraction = await this.prisma.documentExtraction.findUnique({ where: { id: extractionId } });
    if (extraction?.tenantId !== actor.tenantId) {
      throw new NotFoundException('Document extraction not found');
    }

    return extraction;
  }

  private detectDocumentType(fileName: string) {
    const lower = fileName.toLowerCase();
    if (lower.includes('passport')) {
      return 'PASSPORT';
    }

    if (lower.includes('national') || lower.includes('nid')) {
      return 'NATIONAL_ID';
    }

    return 'ID_DOCUMENT';
  }
}
