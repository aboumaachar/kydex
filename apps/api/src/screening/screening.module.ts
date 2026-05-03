import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MatchingModule } from '../matching/matching.module';
import { ScoringModule } from '../scoring/scoring.module';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';

@Module({
  imports: [MatchingModule, ScoringModule, AuditLogsModule],
  controllers: [ScreeningController],
  providers: [ScreeningService],
  exports: [ScreeningService],
})
export class ScreeningModule {}
