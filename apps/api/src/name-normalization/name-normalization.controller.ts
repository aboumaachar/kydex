import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NameNormalizationService } from './name-normalization.service';

class AnalyzeNameDto {
  @IsString()
  @MaxLength(300)
  query!: string;
}

@Controller('name-normalization')
@UseGuards(JwtAuthGuard)
export class NameNormalizationController {
  constructor(private readonly svc: NameNormalizationService) {}

  @Post('analyze')
  analyze(@Body() dto: AnalyzeNameDto) {
    return this.svc.analyze(dto.query);
  }
}
