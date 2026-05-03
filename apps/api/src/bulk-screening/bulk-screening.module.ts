import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ScreeningModule } from '../screening/screening.module';
import { BulkScreeningController } from './bulk-screening.controller';
import { BulkScreeningService } from './bulk-screening.service';

@Module({
  imports: [ScreeningModule, AuditLogsModule],
  controllers: [BulkScreeningController],
  providers: [BulkScreeningService],
  exports: [BulkScreeningService],
})
export class BulkScreeningModule {}
