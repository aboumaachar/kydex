import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'crypto';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class NotaryApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const slug = request.params.slug;
    const apiKey = request.headers['x-kydex-notary-key'] as string | undefined;

    if (!slug || !apiKey) {
      throw new UnauthorizedException('Missing notary slug or API key.');
    }

    const record = await this.prisma.notaryApiKey.findFirst({
      where: {
        notarySlug: slug,
        keyHash: sha256(apiKey),
        isActive: true,
      },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid or inactive notary API key.');
    }

    request.kydexNotaryApiKey = record;
    return true;
  }
}
