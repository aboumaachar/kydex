import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

type EndpointUsageSummary = {
  dayManual: number;
  dayImage: number;
  monthManual: number;
  monthImage: number;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function nowUtc(): Date {
  return new Date();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

@Injectable()
export class NotaryAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listNotaryKeys() {
    const keys = await this.prisma.notaryApiKey.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        notary: true,
      },
    });

    return keys.map((key) => ({
      id: key.id,
      notarySlug: key.notarySlug,
      label: key.label,
      status: key.status,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt,
      suspendedAt: key.suspendedAt,
      revokedAt: key.revokedAt,
      rotatedAt: key.rotatedAt,
      failedAuthCount: key.failedAuthCount,
      lastFailedAuthAt: key.lastFailedAuthAt,
      membershipStatus: key.notary.membershipStatus,
      planName: key.notary.planName,
      monthlyUsageManual: key.notary.monthlyUsageManual,
      monthlyUsageImage: key.notary.monthlyUsageImage,
      billingPeriodStart: key.notary.billingPeriodStart,
      billingPeriodEnd: key.notary.billingPeriodEnd,
      allowedWordPressSites: key.notary.allowedWordPressSites,
    }));
  }

  async createNotaryKey(input: { notarySlug: string; displayName?: string; label?: string }) {
    const notarySlug = input.notarySlug.trim().toLowerCase();
    if (!notarySlug) {
      throw new BadRequestException('notarySlug is required');
    }

    const displayName = input.displayName?.trim() || notarySlug;
    const billingStart = startOfUtcMonth(nowUtc());
    const billingEnd = endOfUtcMonth(nowUtc());

    await this.prisma.notaryProfile.upsert({
      where: { slug: notarySlug },
      create: {
        slug: notarySlug,
        displayName,
        isScreeningEnabled: true,
        membershipStatus: MembershipStatus.ACTIVE,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
      },
      update: {
        displayName,
        isScreeningEnabled: true,
      },
    });

    const rawKey = `kydex_notary_${randomBytes(24).toString('hex')}`;

    const record = await this.prisma.notaryApiKey.create({
      data: {
        notarySlug,
        label: input.label?.trim() || 'Notary webpage key',
        keyHash: sha256(rawKey),
        isActive: true,
        status: 'ACTIVE',
      },
    });

    return {
      id: record.id,
      notarySlug: record.notarySlug,
      label: record.label,
      status: record.status,
      rawKey,
      createdAt: record.createdAt,
      message: 'Store the plaintext API key securely. KYDEX stores only its SHA-256 hash.',
    };
  }

  async rotateKey(id: string) {
    const key = await this.requireKey(id);
    const rawKey = `kydex_notary_${randomBytes(24).toString('hex')}`;

    await this.prisma.notaryApiKey.update({
      where: { id },
      data: {
        keyHash: sha256(rawKey),
        status: 'ACTIVE',
        isActive: true,
        suspendedAt: null,
        revokedAt: null,
        rotatedAt: nowUtc(),
        failedAuthCount: 0,
        lastFailedAuthAt: null,
        lastUsedAt: null,
      },
    });

    return {
      id: key.id,
      notarySlug: key.notarySlug,
      status: 'ACTIVE',
      rawKey,
      rotatedAt: nowUtc().toISOString(),
      message: 'This key secret will not be shown again.',
    };
  }

  async revokeKey(id: string) {
    await this.requireKey(id);
    return this.prisma.notaryApiKey.update({
      where: { id },
      data: {
        status: 'REVOKED',
        isActive: false,
        revokedAt: nowUtc(),
      },
      select: {
        id: true,
        notarySlug: true,
        status: true,
        revokedAt: true,
      },
    });
  }

  async suspendKey(id: string) {
    await this.requireKey(id);
    return this.prisma.notaryApiKey.update({
      where: { id },
      data: {
        status: 'SUSPENDED',
        isActive: false,
        suspendedAt: nowUtc(),
      },
      select: {
        id: true,
        notarySlug: true,
        status: true,
        suspendedAt: true,
      },
    });
  }

  async activateKey(id: string) {
    await this.requireKey(id);
    return this.prisma.notaryApiKey.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isActive: true,
        suspendedAt: null,
      },
      select: {
        id: true,
        notarySlug: true,
        status: true,
      },
    });
  }

  async keyUsage(id: string) {
    const key = await this.requireKey(id);
    const now = nowUtc();
    const dayStart = startOfUtcDay(now);
    const monthStart = startOfUtcMonth(now);

    const [dayManual, dayImage, monthManual, monthImage, failedAuth, successfulAuth] = await Promise.all([
      this.prisma.ofacScreeningSearch.count({
        where: {
          apiKeyId: key.id,
          source: 'notary_webpage',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          apiKeyId: key.id,
          source: 'notary_image_screening',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          apiKeyId: key.id,
          source: 'notary_webpage',
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          apiKeyId: key.id,
          source: 'notary_image_screening',
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.notaryAuthAttempt.count({
        where: {
          apiKeyId: key.id,
          success: false,
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.notaryAuthAttempt.count({
        where: {
          apiKeyId: key.id,
          success: true,
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      keyId: key.id,
      notarySlug: key.notarySlug,
      status: key.status,
      day: {
        manualSearches: dayManual,
        imageSearches: dayImage,
      },
      month: {
        manualSearches: monthManual,
        imageSearches: monthImage,
        authFailures: failedAuth,
        authSuccesses: successfulAuth,
      },
      lastUsedAt: key.lastUsedAt,
      resetAt: key.notary.billingPeriodEnd ?? endOfUtcMonth(now),
    };
  }

  async listNotaries() {
    const profiles = await this.prisma.notaryProfile.findMany({
      orderBy: { slug: 'asc' },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return profiles.map((profile) => ({
      slug: profile.slug,
      displayName: profile.displayName,
      membershipStatus: profile.membershipStatus,
      planName: profile.planName,
      planLimitManualSearches: profile.planLimitManualSearches,
      planLimitImageSearches: profile.planLimitImageSearches,
      monthlyUsageManual: profile.monthlyUsageManual,
      monthlyUsageImage: profile.monthlyUsageImage,
      billingPeriodStart: profile.billingPeriodStart,
      billingPeriodEnd: profile.billingPeriodEnd,
      trialEndsAt: profile.trialEndsAt,
      suspendedAt: profile.suspendedAt,
      cancelledAt: profile.cancelledAt,
      isScreeningEnabled: profile.isScreeningEnabled,
      allowedWordPressSites: profile.allowedWordPressSites,
      keys: profile.apiKeys.map((key) => ({
        id: key.id,
        label: key.label,
        status: key.status,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
      })),
    }));
  }

  async getNotaryBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    const profile = await this.prisma.notaryProfile.findUnique({
      where: { slug: normalizedSlug },
      include: {
        apiKeys: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Notary profile not found for slug: ${normalizedSlug}`);
    }

    const usage = await this.computeNotaryUsage(profile.slug);

    return {
      slug: profile.slug,
      displayName: profile.displayName,
      membershipStatus: profile.membershipStatus,
      planName: profile.planName,
      planLimitManualSearches: profile.planLimitManualSearches,
      planLimitImageSearches: profile.planLimitImageSearches,
      monthlyUsageManual: profile.monthlyUsageManual,
      monthlyUsageImage: profile.monthlyUsageImage,
      billingPeriodStart: profile.billingPeriodStart,
      billingPeriodEnd: profile.billingPeriodEnd,
      trialEndsAt: profile.trialEndsAt,
      suspendedAt: profile.suspendedAt,
      cancelledAt: profile.cancelledAt,
      isScreeningEnabled: profile.isScreeningEnabled,
      allowedWordPressSites: profile.allowedWordPressSites,
      keys: profile.apiKeys,
      usage,
    };
  }

  async usageSummary() {
    const notaries = await this.prisma.notaryProfile.findMany({
      orderBy: { slug: 'asc' },
      select: {
        slug: true,
        displayName: true,
        membershipStatus: true,
        planName: true,
        planLimitManualSearches: true,
        planLimitImageSearches: true,
        monthlyUsageManual: true,
        monthlyUsageImage: true,
        billingPeriodEnd: true,
      },
    });

    const totals = notaries.reduce(
      (acc, notary) => {
        acc.manual += notary.monthlyUsageManual;
        acc.image += notary.monthlyUsageImage;
        return acc;
      },
      { manual: 0, image: 0 },
    );

    return {
      totalNotaries: notaries.length,
      totals,
      items: notaries,
    };
  }

  async monitoringSummary() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      ofacStatus,
      latestSyncRuns,
      failedAuthLastHour,
      failedAuthLast24h,
      fallbackActivations24h,
      ocrReviewRequired24h,
      highRisk24h,
      wordpressErrors24h,
      dbHealth,
    ] = await Promise.all([
      this.prisma.kydexDataSource.findUnique({ where: { code: 'OFAC' } }),
      this.prisma.sourceSyncRun.findMany({
        where: {
          source: {
            code: 'OFAC',
          },
        },
        orderBy: { startedAt: 'desc' },
        take: 20,
      }),
      this.prisma.notaryAuthAttempt.count({
        where: {
          success: false,
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.notaryAuthAttempt.count({
        where: {
          success: false,
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.screeningTransaction.count({
        where: {
          usedFallback: true,
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.screeningTransaction.count({
        where: {
          status: 'ocr_review_required',
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          resultStatus: 'strong_potential_match',
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.screeningTransaction.count({
        where: {
          requesterType: 'notary',
          status: 'error',
          createdAt: { gte: oneDayAgo },
        },
      }),
      this.prisma.$queryRawUnsafe('SELECT 1 as ok')
        .then(() => ({ ok: true }))
        .catch((error: unknown) => ({ ok: false, error: error instanceof Error ? error.message : String(error) })),
    ]);

    const syncFailures24h = latestSyncRuns.filter((run) => run.status === 'failed' && run.startedAt >= oneDayAgo).length;

    return {
      generatedAt: now.toISOString(),
      apiHealth: dbHealth.ok ? 'ok' : 'degraded',
      database: dbHealth,
      ofac: {
        status: ofacStatus?.status ?? 'unknown',
        lastHealthCheckAt: ofacStatus?.lastHealthCheckAt ?? null,
        lastSuccessfulSyncAt: ofacStatus?.lastSuccessfulSyncAt ?? null,
        lastError: ofacStatus?.lastError ?? null,
        syncFailures24h,
      },
      alerts: {
        failedNotaryAuthLastHour: failedAuthLastHour,
        failedNotaryAuthLast24h: failedAuthLast24h,
        fallbackActivations24h,
        ocrErrors24h: ocrReviewRequired24h,
        wordpressPluginErrors24h: wordpressErrors24h,
        highRiskMatchEvents24h: highRisk24h,
      },
      recentSyncRuns: latestSyncRuns,
    };
  }

  private async computeNotaryUsage(notarySlug: string): Promise<EndpointUsageSummary> {
    const now = nowUtc();
    const dayStart = startOfUtcDay(now);
    const monthStart = startOfUtcMonth(now);

    const [dayManual, dayImage, monthManual, monthImage] = await Promise.all([
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug,
          source: 'notary_webpage',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug,
          source: 'notary_image_screening',
          createdAt: { gte: dayStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug,
          source: 'notary_webpage',
          createdAt: { gte: monthStart },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug,
          source: 'notary_image_screening',
          createdAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      dayManual,
      dayImage,
      monthManual,
      monthImage,
    };
  }

  private async requireKey(id: string) {
    const key = await this.prisma.notaryApiKey.findUnique({
      where: { id },
      include: {
        notary: true,
      },
    });

    if (!key) {
      throw new NotFoundException(`Notary key not found: ${id}`);
    }

    return key;
  }
}
