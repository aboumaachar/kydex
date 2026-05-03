import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ScreeningModule } from '../screening/screening.module';
import { DocumentExtractionController } from './document-extraction.controller';
import { DocumentExtractionService } from './document-extraction.service';

@Module({
  imports: [AuditLogsModule, ScreeningModule],
  controllers: [DocumentExtractionController],
  providers: [DocumentExtractionService],
})
export class DocumentExtractionModule {}
