import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ScreeningSearchDto } from './dto/screening-search.dto';
import { ScreeningService } from './screening.service';

@Controller('api/v1/screening')
export class ScreeningController {
  constructor(private readonly screening: ScreeningService) {}

  @Post('search')
  search(@Body() body: ScreeningSearchDto) {
    return this.screening.search({
      ...body,
      source: body.source ?? 'dashboard',
      screeningType: body.screeningType ?? 'ofac',
    });
  }

  @Get('audit/:id')
  audit(@Param('id') id: string) {
    return this.screening.audit(id);
  }
}
