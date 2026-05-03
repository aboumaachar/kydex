import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: Prisma.AuditLogUncheckedCreateInput) {
    const createdAt = new Date();
    const chainScope = input.tenantId ?? 'GLOBAL';

    const previousEntry = await this.prisma.auditLog.findFirst({
      where: { chainScope },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { entryHash: true },
    });

    const previousHash = previousEntry?.entryHash ?? null;
    const entryHash = createHash('sha256')
      .update(
        JSON.stringify({
          chainScope,
          previousHash,
          tenantId: input.tenantId ?? null,
          userId: input.userId ?? null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId ?? null,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          metadata: input.metadata ?? null,
          createdAt: createdAt.toISOString(),
        }),
      )
      .digest('hex');

    return this.prisma.auditLog.create({
      data: {
        ...input,
        createdAt,
        chainScope,
        previousHash,
        entryHash,
      },
    });
  }

  list(limit = 100) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
