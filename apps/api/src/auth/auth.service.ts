import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly failedLoginState = new Map<string, { count: number; lockUntil?: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const lockState = this.failedLoginState.get(dto.email.toLowerCase());
    if (lockState?.lockUntil && Date.now() < lockState.lockUntil) {
      throw new UnauthorizedException('Account temporarily locked due to repeated failed logins');
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      this.markFailedLogin(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      const lockStateAfterFailure = this.markFailedLogin(dto.email);
      await this.auditLogsService.log({
        tenantId: user.tenantId,
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        ipAddress,
        userAgent,
        metadata: {
          lockUntil: lockStateAfterFailure.lockUntil ? new Date(lockStateAfterFailure.lockUntil).toISOString() : null,
          attempts: lockStateAfterFailure.count,
        },
      });

      if (lockStateAfterFailure.lockUntil) {
        await this.auditLogsService.log({
          tenantId: user.tenantId,
          userId: user.id,
          action: 'AUTH_LOGIN_LOCKED',
          entityType: 'USER',
          entityId: user.id,
          ipAddress,
          userAgent,
          metadata: {
            lockUntil: new Date(lockStateAfterFailure.lockUntil).toISOString(),
            attempts: lockStateAfterFailure.count,
          },
        });
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    this.failedLoginState.delete(dto.email.toLowerCase());

    const requiresPrivileged2fa = process.env.REQUIRE_2FA_FOR_PRIVILEGED === 'true';
    const privilegedRoles = new Set<UserRole>([
      UserRole.SUPER_ADMIN,
      UserRole.COUNCIL_ADMIN,
      UserRole.COMPLIANCE_OFFICER,
    ]);
    if (requiresPrivileged2fa && privilegedRoles.has(user.role) && !user.twoFactorEnabled) {
      throw new UnauthorizedException('2FA is required for privileged roles');
    }

    const accessToken = await this.issueAccessToken(user.id, user.tenantId, user.role, user.email);
    const refreshToken = await this.issueRefreshToken(user.id, user.tenantId, user.role, user.email);
    await this.persistRefreshToken(user.id, refreshToken, ipAddress, userAgent);

    await this.auditLogsService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'LOGIN',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        tenantId: user.tenantId,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string, ipAddress?: string, userAgent?: string) {
    const payload = await this.verifyRefreshToken(refreshToken);

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user?.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const activeTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    let matchedTokenId: string | undefined;
    for (const tokenRecord of activeTokens) {
      const isMatch = await argon2.verify(tokenRecord.tokenHash, refreshToken);
      if (isMatch) {
        matchedTokenId = tokenRecord.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() },
    });

    const nextAccessToken = await this.issueAccessToken(user.id, user.tenantId, user.role, user.email);
    const nextRefreshToken = await this.issueRefreshToken(user.id, user.tenantId, user.role, user.email);
    await this.persistRefreshToken(user.id, nextRefreshToken, ipAddress, userAgent);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
      tokenType: 'Bearer',
    };
  }

  async logout(refreshToken: string) {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    for (const tokenRecord of tokens) {
      const isMatch = await argon2.verify(tokenRecord.tokenHash, refreshToken);
      if (isMatch) {
        await this.prisma.refreshToken.update({
          where: { id: tokenRecord.id },
          data: { revokedAt: new Date() },
        });
        return;
      }
    }
  }

  async requestPasswordReset(email: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return {
        accepted: true,
        message: 'If the account exists, a reset link has been issued.',
      };
    }

    const resetToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
        tokenType: 'password_reset',
        jti: randomUUID(),
      },
      {
        secret: process.env.JWT_SECRET ?? 'change_this_in_production',
        expiresIn: process.env.PASSWORD_RESET_TOKEN_TTL ?? '15m',
      },
    );

    await this.auditLogsService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const exposeToken = process.env.PASSWORD_RESET_DEBUG_TOKEN === 'true';
    return {
      accepted: true,
      message: 'Password reset flow initialized.',
      ...(exposeToken ? { resetToken } : {}),
    };
  }

  async confirmPasswordReset(token: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    let payload: { sub?: string; tokenType?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET ?? 'change_this_in_production',
      });
    } catch {
      throw new UnauthorizedException('Invalid password reset token');
    }

    if (payload.tokenType !== 'password_reset' || !payload.sub) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    const nextPasswordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.auditLogsService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    return { updated: true };
  }

  private async issueAccessToken(userId: string, tenantId: string, role: string, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        tenantId,
        role,
        email,
        tokenType: 'access',
      },
      {
        expiresIn: process.env.ACCESS_TOKEN_TTL ?? process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      },
    );
  }

  private async issueRefreshToken(userId: string, tenantId: string, role: string, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        tenantId,
        role,
        email,
        tokenType: 'refresh',
        jti: randomUUID(),
      },
      {
        expiresIn: process.env.REFRESH_TOKEN_TTL ?? process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
      },
    );
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET ?? 'change_this_in_production',
      });

      if (payload?.tokenType !== 'refresh' || !payload?.sub) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload as {
        sub: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async persistRefreshToken(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const ttlMs = this.parseDurationMs(
      process.env.REFRESH_TOKEN_TTL ?? process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    );
    const expiresAt = new Date(Date.now() + ttlMs);

    const tokenHash = await argon2.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  private parseDurationMs(input: string): number {
    const match = /^(\d+)([smhd])$/i.exec(input.trim());
    if (!match) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 's') {
      return amount * 1000;
    }

    if (unit === 'm') {
      return amount * 60 * 1000;
    }

    if (unit === 'h') {
      return amount * 60 * 60 * 1000;
    }

    return amount * 24 * 60 * 60 * 1000;
  }

  private markFailedLogin(email: string) {
    const key = email.toLowerCase();
    const maxAttempts = Number(process.env.LOGIN_LOCKOUT_MAX_ATTEMPTS ?? 5);
    const lockMinutes = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? 15);

    const current = this.failedLoginState.get(key) ?? { count: 0 };
    const next = { ...current, count: current.count + 1 };
    if (next.count >= maxAttempts) {
      next.lockUntil = Date.now() + lockMinutes * 60 * 1000;
      next.count = 0;
    }

    this.failedLoginState.set(key, next);
    return next;
  }
}
