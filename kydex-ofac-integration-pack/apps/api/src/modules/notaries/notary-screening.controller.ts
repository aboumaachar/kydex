import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ScreeningSearchDto } from '../screening/dto/screening-search.dto';
import { ScreeningService } from '../screening/screening.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotaryApiKeyGuard } from './notary-api-key.guard';

@Controller('api/v1/notaries/:slug/screening')
export class NotaryScreeningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly screening: ScreeningService,
  ) {}

  @Get('config')
  async config(@Param('slug') slug: string) {
    const notary = await this.prisma.notaryProfile.findUnique({
      where: { slug },
      select: {
        slug: true,
        displayName: true,
        isScreeningEnabled: true,
      },
    });

    return {
      slug,
      displayName: notary?.displayName ?? slug,
      enabled: Boolean(notary?.isScreeningEnabled),
      requiredHeader: 'x-kydex-notary-key',
      supportedScreeningTypes: ['ofac'],
      disclaimer:
        'KYDEX screening results are decision-support outputs and require professional review before any legal or compliance decision.',
    };
  }

  @Post('search')
  @UseGuards(NotaryApiKeyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  async search(@Param('slug') slug: string, @Body() body: ScreeningSearchDto, @Req() req: any) {
    const notary = await this.prisma.notaryProfile.findUnique({
      where: { slug },
    });

    if (!notary?.isScreeningEnabled) {
      return {
        status: 'disabled',
        message: 'KYDEX screening is not enabled for this notary page.',
      };
    }

    const result = await this.screening.search(
      {
        ...body,
        notarySlug: slug,
        source: body.source ?? 'notary_webpage',
        screeningType: 'ofac',
      },
      {
        apiKeyId: req.kydexNotaryApiKey?.id,
      },
    );

    await this.prisma.notaryScreeningUsage.create({
      data: {
        notarySlug: slug,
        apiKeyId: req.kydexNotaryApiKey?.id ?? null,
        screeningSearchId: result.auditId,
      },
    });

    return result;
  }
}
