import { Module } from '@nestjs/common';
import { MatchDecisionService } from './match-decision.service';
import { ScoringService } from './scoring.service';

@Module({
  providers: [ScoringService, MatchDecisionService],
  exports: [ScoringService, MatchDecisionService],
})
export class ScoringModule {}
