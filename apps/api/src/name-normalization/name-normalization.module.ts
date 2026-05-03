import { Module } from '@nestjs/common';
import { NameNormalizationService } from './name-normalization.service';
import { NameNormalizationController } from './name-normalization.controller';

@Module({
  controllers: [NameNormalizationController],
  providers: [NameNormalizationService],
  exports: [NameNormalizationService],
})
export class NameNormalizationModule {}
