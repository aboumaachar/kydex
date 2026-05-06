import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { MembershipStatus, NotaryApiKey, NotaryProfile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rateLimitsDisabled } from './rate-limits-disabled';

type EndpointType = 'manual' | 'image';

type BillingWindow = {
  start: Date;
  end: Date;
};

type PlanLimits = {
  manualMonthly: number;
  imageMonthly: number;
  manualDaily: number;
  imageDaily: number;
};

function utcNow(): Date {
  return new Date();
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
}

function endOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
}

function startOfDayUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

@Injectable()
export class NotaryUsagePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async enforceMembershipAndRateLimit(input: {
    profile: NotaryProfile;
    apiKey: NotaryApiKey;
    endpointType: EndpointType;
    ipAddress?: string | null;
    wordpressSite?: string | null;
  }) {
    const now = utcNow();

    this.assertMembership(input.profile, now);

    const billing = await this.ensureBillingWindow(input.profile, now);

    if (rateLimitsDisabled()) {
      return;
    }

    const limits = this.resolvePlanLimits(input.profile.planName);

    const [manualMonth, imageMonth, apiKeyDaily, siteDaily, ipDaily, endpointDaily] = await Promise.all([
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug: input.profile.slug,
          source: 'notary_webpage',
          createdAt: { gte: billing.start, lt: billing.end },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug: input.profile.slug,
          source: 'notary_image_screening',
          createdAt: { gte: billing.start, lt: billing.end },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          apiKeyId: input.apiKey.id,
          createdAt: { gte: startOfDayUtc(now) },
        },
      }),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug: input.profile.slug,
          wordpressSite: input.wordpressSite ?? undefined,
          createdAt: { gte: startOfDayUtc(now) },
        },
      }),
      input.ipAddress
        ? this.prisma.ofacScreeningSearch.count({
            where: {
              notarySlug: input.profile.slug,
              ipAddress: input.ipAddress,
              createdAt: { gte: startOfDayUtc(now) },
            },
          })
        : Promise.resolve(0),
      this.prisma.ofacScreeningSearch.count({
        where: {
          notarySlug: input.profile.slug,
          source: input.endpointType === 'manual' ? 'notary_webpage' : 'notary_image_screening',
          createdAt: { gte: startOfDayUtc(now) },
        },
      }),
    ]);

    if (input.endpointType === 'manual' && manualMonth >= limits.manualMonthly) {
      this.throwRateLimitExceeded(billing.end);
    }

    if (input.endpointType === 'image' && imageMonth >= limits.imageMonthly) {
      this.throwRateLimitExceeded(billing.end);
    }

    if (apiKeyDaily >= Number(process.env.NOTARY_KEY_DAILY_LIMIT ?? 250)) {
      this.throwRateLimitExceeded(endOfMonthUtc(now));
    }

    if (siteDaily >= Number(process.env.NOTARY_SITE_DAILY_LIMIT ?? 300)) {
      this.throwRateLimitExceeded(endOfMonthUtc(now));
    }

    if (ipDaily >= Number(process.env.NOTARY_IP_DAILY_LIMIT ?? 500)) {
      this.throwRateLimitExceeded(endOfMonthUtc(now));
    }

    if (input.endpointType === 'manual' && endpointDaily >= limits.manualDaily) {
      this.throwRateLimitExceeded(endOfMonthUtc(now));
    }

    if (input.endpointType === 'image' && endpointDaily >= limits.imageDaily) {
      this.throwRateLimitExceeded(endOfMonthUtc(now));
    }
  }

  async incrementUsage(slug: string, endpointType: EndpointType) {
    const profile = await this.prisma.notaryProfile.findUnique({ where: { slug } });
    if (!profile) return;

    const now = utcNow();
    const billing = await this.ensureBillingWindow(profile, now);

    const shouldReset =
      (profile.billingPeriodEnd && profile.billingPeriodEnd <= now) ||
      (profile.billingPeriodStart && profile.billingPeriodStart < billing.start);

    const data: {
      monthlyUsageManual?: { increment: number } | number;
      monthlyUsageImage?: { increment: number } | number;
      billingPeriodStart?: Date;
      billingPeriodEnd?: Date;
    } = {};

    if (shouldReset) {
      data.monthlyUsageManual = endpointType === 'manual' ? 1 : 0;
      data.monthlyUsageImage = endpointType === 'image' ? 1 : 0;
      data.billingPeriodStart = billing.start;
      data.billingPeriodEnd = billing.end;
    } else {
      if (endpointType === 'manual') {
        data.monthlyUsageManual = { increment: 1 };
      } else {
        data.monthlyUsageImage = { increment: 1 };
      }
      if (!profile.billingPeriodStart || !profile.billingPeriodEnd) {
        data.billingPeriodStart = billing.start;
        data.billingPeriodEnd = billing.end;
      }
    }

    await this.prisma.notaryProfile.update({
      where: { slug },
      data,
    });
  }

  private assertMembership(profile: NotaryProfile, now: Date) {
    if (!profile.isScreeningEnabled) {
      throw new ForbiddenException('KYDEX screening is not enabled for this notary page.');
    }

    const blockedStates: MembershipStatus[] = [
      MembershipStatus.PAST_DUE,
      MembershipStatus.SUSPENDED,
      MembershipStatus.CANCELLED,
      MembershipStatus.EXPIRED,
    ];

    if (blockedStates.includes(profile.membershipStatus)) {
      throw new ForbiddenException('Notary membership is not active.');
    }

    if (profile.membershipStatus === MembershipStatus.TRIAL && profile.trialEndsAt && profile.trialEndsAt < now) {
      throw new ForbiddenException('Notary membership trial has expired.');
    }

    if (profile.billingPeriodEnd && profile.billingPeriodEnd < now) {
      throw new ForbiddenException('Notary membership billing period has expired.');
    }
  }

  private resolvePlanLimits(planName: string): PlanLimits {
    const normalized = planName.trim().toUpperCase();

    if (normalized === 'FREE' || normalized === 'DEMO') {
      return {
        manualMonthly: 20,
        imageMonthly: 5,
        manualDaily: 20,
        imageDaily: 5,
      };
    }

    if (normalized === 'BASIC') {
      return {
        manualMonthly: 300,
        imageMonthly: 90,
        manualDaily: 60,
        imageDaily: 20,
      };
    }

    if (normalized === 'PROFESSIONAL' || normalized === 'PRO') {
      return {
        manualMonthly: 2000,
        imageMonthly: 400,
        manualDaily: 300,
        imageDaily: 75,
      };
    }

    return {
      manualMonthly: Number.MAX_SAFE_INTEGER,
      imageMonthly: Number.MAX_SAFE_INTEGER,
      manualDaily: Number.MAX_SAFE_INTEGER,
      imageDaily: Number.MAX_SAFE_INTEGER,
    };
  }

  private async ensureBillingWindow(profile: NotaryProfile, now: Date): Promise<BillingWindow> {
    const start = profile.billingPeriodStart ?? startOfMonthUtc(now);
    const end = profile.billingPeriodEnd ?? endOfMonthUtc(now);

    if (!profile.billingPeriodStart || !profile.billingPeriodEnd) {
      await this.prisma.notaryProfile.update({
        where: { slug: profile.slug },
        data: {
          billingPeriodStart: start,
          billingPeriodEnd: end,
        },
      });
    }

    return { start, end };
  }

  private throwRateLimitExceeded(resetAt: Date): never {
    throw new HttpException({
      status: 'rate_limit_exceeded',
      message: 'Your KYDEX usage limit has been reached for this billing period.',
      resetAt: resetAt.toISOString(),
    }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
