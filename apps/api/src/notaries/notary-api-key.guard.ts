import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MembershipStatus, NotaryApiKeyStatus } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

const ALLOWED_CLIENT_HEADERS = new Set(['wordpress-notary-plugin', 'external-api-client']);

@Injectable()
export class NotaryApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug: string | undefined =
      (request.params?.slug as string | undefined) ||
      (request.body?.notarySlug as string | undefined);
    const apiKey = request.headers['x-kydex-notary-key'] as string | undefined;
    const clientId = request.headers['x-kydex-client'] as string | undefined;
    const wordpressSite = request.headers['x-kydex-wordpress-site'] as string | undefined;
    const ipAddress = (request.headers['x-forwarded-for'] as string | undefined) ?? request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'] as string | undefined;
    const keyHash = apiKey ? sha256(apiKey) : undefined;

    if (!slug || !apiKey) {
      await this.logAuthAttempt({
        notarySlug: slug ?? null,
        keyHash: keyHash ?? null,
        success: false,
        reason: 'MISSING_SLUG_OR_KEY',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      throw new UnauthorizedException('Missing notary slug or API key.');
    }

    // Require the plugin client identifier when calling from the WordPress plugin.
    // Requests from other trusted server-side integrations may omit this header.
    if (clientId && !ALLOWED_CLIENT_HEADERS.has(clientId)) {
      await this.logAuthAttempt({
        notarySlug: slug,
        keyHash,
        success: false,
        reason: 'INVALID_CLIENT_HEADER',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId,
      });
      throw new UnauthorizedException('Unrecognised x-kydex-client value.');
    }

    const record = await this.prisma.notaryApiKey.findFirst({
      where: {
        notarySlug: slug,
        keyHash,
      },
      include: {
        notary: true,
      },
    });

    if (!record) {
      await this.logAuthAttempt({
        notarySlug: slug,
        keyHash,
        success: false,
        reason: 'INVALID_KEY',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      throw new UnauthorizedException('Invalid or inactive notary API key.');
    }

    if (!record.isActive || record.status === NotaryApiKeyStatus.REVOKED || record.status === NotaryApiKeyStatus.SUSPENDED) {
      await this.logAuthAttempt({
        notarySlug: slug,
        apiKeyId: record.id,
        keyHash,
        success: false,
        reason: record.status === NotaryApiKeyStatus.REVOKED ? 'KEY_REVOKED' : 'KEY_SUSPENDED_OR_INACTIVE',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      await this.bumpFailedAuth(record.id);
      throw new UnauthorizedException('Invalid or inactive notary API key.');
    }

    // Fetch the notary profile for membership + WP site + feature checks.
    const profile = record.notary;

    if (!profile) {
      await this.logAuthAttempt({
        notarySlug: slug,
        apiKeyId: record.id,
        keyHash,
        success: false,
        reason: 'NOTARY_PROFILE_NOT_FOUND',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      await this.bumpFailedAuth(record.id);
      throw new UnauthorizedException('Notary profile not found.');
    }

    const blockedMemberships: MembershipStatus[] = [
      MembershipStatus.PAST_DUE,
      MembershipStatus.SUSPENDED,
      MembershipStatus.CANCELLED,
      MembershipStatus.EXPIRED,
    ];

    if (blockedMemberships.includes(profile.membershipStatus)) {
      await this.logAuthAttempt({
        notarySlug: slug,
        apiKeyId: record.id,
        keyHash,
        success: false,
        reason: `MEMBERSHIP_${profile.membershipStatus}`,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      await this.bumpFailedAuth(record.id);
      throw new ForbiddenException('Notary membership is not active.');
    }

    if (profile.membershipStatus === MembershipStatus.TRIAL && profile.trialEndsAt && profile.trialEndsAt < new Date()) {
      await this.logAuthAttempt({
        notarySlug: slug,
        apiKeyId: record.id,
        keyHash,
        success: false,
        reason: 'TRIAL_EXPIRED',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      await this.bumpFailedAuth(record.id);
      throw new ForbiddenException('Notary membership trial has expired.');
    }

    if (profile.billingPeriodEnd && profile.billingPeriodEnd < new Date()) {
      await this.logAuthAttempt({
        notarySlug: slug,
        apiKeyId: record.id,
        keyHash,
        success: false,
        reason: 'BILLING_PERIOD_EXPIRED',
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        wordpressSite: wordpressSite ?? null,
        apiClient: clientId ?? null,
      });
      await this.bumpFailedAuth(record.id);
      throw new ForbiddenException('Notary membership billing period has expired.');
    }

    // Validate WordPress site origin when an allowlist is configured.
    const requiresWordpressSiteValidation =
      clientId === 'wordpress-notary-plugin' || Boolean(wordpressSite);

    if (profile.allowedWordPressSites.length > 0 && requiresWordpressSiteValidation) {
      if (!wordpressSite) {
        await this.logAuthAttempt({
          notarySlug: slug,
          apiKeyId: record.id,
          keyHash,
          success: false,
          reason: 'MISSING_WORDPRESS_SITE_HEADER',
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          wordpressSite: null,
          apiClient: clientId ?? null,
        });
        await this.bumpFailedAuth(record.id);
        throw new UnauthorizedException('Missing x-kydex-wordpress-site header.');
      }
      const normalised = wordpressSite.replace(/\/$/, '').toLowerCase();
      const allowed = profile.allowedWordPressSites.map((s) => s.replace(/\/$/, '').toLowerCase());
      if (!allowed.includes(normalised)) {
        await this.logAuthAttempt({
          notarySlug: slug,
          apiKeyId: record.id,
          keyHash,
          success: false,
          reason: 'WORDPRESS_SITE_NOT_ALLOWED',
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
          wordpressSite,
          apiClient: clientId ?? null,
        });
        await this.bumpFailedAuth(record.id);
        throw new ForbiddenException('WordPress site is not authorised for this notary key.');
      }
    }

    await this.prisma.notaryApiKey.update({
      where: { id: record.id },
      data: {
        lastUsedAt: new Date(),
      },
    });

    await this.logAuthAttempt({
      notarySlug: slug,
      apiKeyId: record.id,
      keyHash,
      success: true,
      reason: 'AUTHENTICATED',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      wordpressSite: wordpressSite ?? null,
      apiClient: clientId ?? null,
    });

    request.kydexNotaryApiKey = record;
    request.kydexNotaryProfile = profile;
    request.kydexWordPressSite = wordpressSite ?? null;
    return true;
  }

  private async logAuthAttempt(input: {
    notarySlug?: string | null;
    apiKeyId?: string | null;
    keyHash?: string | null;
    success: boolean;
    reason: string;
    ipAddress?: string | null;
    userAgent?: string | null;
    wordpressSite?: string | null;
    apiClient?: string | null;
  }) {
    try {
      await this.prisma.notaryAuthAttempt.create({
        data: {
          notarySlug: input.notarySlug ?? null,
          apiKeyId: input.apiKeyId ?? null,
          keyHash: input.keyHash ?? null,
          success: input.success,
          reason: input.reason,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
          wordpressSite: input.wordpressSite ?? null,
          apiClient: input.apiClient ?? null,
        },
      });
    } catch {
      // Auth-attempt logging must not propagate errors — a non-existent slug
      // (e.g. FK violation) or transient DB issue should never mask the real
      // auth response returned to the caller.
    }
  }

  private async bumpFailedAuth(apiKeyId: string) {
    const now = new Date();
    await this.prisma.notaryApiKey.update({
      where: { id: apiKeyId },
      data: {
        failedAuthCount: { increment: 1 },
        lastFailedAuthAt: now,
      },
    });

    const abuseWindowMs = Number(process.env.NOTARY_AUTH_ABUSE_WINDOW_MS ?? 15 * 60 * 1000);
    const abuseThreshold = Number(process.env.NOTARY_AUTH_ABUSE_THRESHOLD ?? 12);
    const windowStart = new Date(now.getTime() - abuseWindowMs);

    const recentFailures = await this.prisma.notaryAuthAttempt.count({
      where: {
        apiKeyId,
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    if (recentFailures >= abuseThreshold) {
      await this.prisma.notaryApiKey.update({
        where: { id: apiKeyId },
        data: {
          status: NotaryApiKeyStatus.SUSPENDED,
          isActive: false,
          suspendedAt: now,
        },
      });
    }
  }
}